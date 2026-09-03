import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Lightbulb, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { Action, Badge, Panel } from "@/design-system";
import { useVoice } from "@/hooks/useVoice";
import { PageBody, PageHeader } from "./AppShell";
import {
  ApiError,
  requestCoaching,
  sendAnswerStream,
  startSessionStream,
} from "@/lib/api";
import type {
  CoachTip,
  InterviewerTurn,
  Persona,
  RunningContext,
  SessionMode,
} from "@/lib/api";
import { NEUTRAL_VOICE } from "@/lib/voice";

interface SetupState {
  company?: string;
  role?: string;
  stage?: string;
  mode?: SessionMode;
  personaId?: string;
}

const MAX_TURNS = 7;

const TIP_LABEL: Record<CoachTip["kind"], string> = {
  structure: "Structure",
  specificity: "Be specific",
  vocabulary: "Word choice",
  grammar: "Grammar",
};

/**
 * The live session, driven by the real `InterviewSession` on the server.
 *
 * Three states share one layout so the screen never jumps: opening (waiting on
 * turn 1), speaking (a turn to answer), and complete. Errors replace the input
 * rather than the whole screen — a failed turn should not discard the
 * conversation above it.
 *
 * Two loops run here. The interview itself is the blocking one. Coaching is
 * the second: it is fired after a turn lands, never awaited, and its failure
 * is silent — a coaching outage must not be able to interrupt an interview.
 */
export function LiveInterview() {
  const navigate = useNavigate();
  const { state } = useLocation() as { state: SetupState | null };
  const setup = state ?? {};
  const company = setup.company ?? "Stripe";
  const role = setup.role ?? "Senior Product Designer";
  const stage = setup.stage ?? "Behavioral";
  const mode: SessionMode = setup.mode ?? "practice";
  const personaId = setup.personaId ?? "";

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [turn, setTurn] = useState<InterviewerTurn | null>(null);
  /** Text accumulated from the open stream, before the turn is finalized. */
  const [streaming, setStreaming] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voiceOn, setVoiceOn] = useState(false);
  const [persona, setPersona] = useState<Persona | null>(null);
  /**
   * What the server is actually interviewing against. Null until the session
   * event lands, which is why the header falls back to the requested values —
   * for the second before it arrives, they are the best guess available.
   */
  const [running, setRunning] = useState<RunningContext | null>(null);
  const [tips, setTips] = useState<CoachTip[]>([]);
  const [coaching, setCoaching] = useState(false);
  /** True once the coach has answered for the turn currently on screen. */
  const [coached, setCoached] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const startedRef = useRef(false);
  /** submit() is redefined each render; voice needs a stable handle to it. */
  const submitRef = useRef<(text: string) => void>(() => undefined);
  /**
   * Every speech timing is an offset from this. Fixed at mount rather than
   * read per turn so the offsets stay comparable across the session.
   */
  const startedAt = useRef(Date.now());

  const voice = useVoice({
    enabled: voiceOn,
    onFinalAnswer: (text) => submitRef.current(text),
    sessionStartedAt: startedAt.current,
    voiceProfile: persona?.voice.fallback ?? NEUTRAL_VOICE,
    // The assigned interviewer, not the requested one — on the free plan the
    // server picks, and the voice has to match whoever actually showed up.
    personaId: persona?.id ?? personaId,
  });

  useEffect(() => {
    // StrictMode double-invokes effects in dev; without this guard that bills
    // two interviews for every one the candidate starts.
    if (startedRef.current) return;
    startedRef.current = true;

    setStreaming("");
    startSessionStream(
      {
        candidateName: "Mariana",
        targetRole: role,
        companyName: company,
        interviewStage: stage,
      },
      { mode, personaId },
      {
        // The session id arrives first so a mid-stream failure is still
        // recoverable — the interview exists server-side either way.
        onSession: (id, assigned, resolved) => {
          setSessionId(id);
          // The server decides which archetype you get when none was picked,
          // so the voice profile has to come back rather than be assumed.
          setPersona(assigned);
          // And which employer, if any. On the free plan it replaced the one
          // that was picked, and the header must not keep claiming otherwise.
          setRunning(resolved);
        },
        onDelta: (chunk) => {
          setStreaming((current) => current + chunk);
          voice.speakStreamed(chunk);
        },
      },
    )
      .then((result) => {
        voice.flushSpeech();
        setTurn(result);
      })
      .catch((caught: unknown) => setError(describe(caught)))
      .finally(() => setBusy(false));
  }, [company, role, stage, mode, personaId]);

  useEffect(() => {
    if (turn && !turn.isComplete && !busy) inputRef.current?.focus();
  }, [turn, busy]);

  const speaking = busy && streaming !== "";

  // Keep the ref pointing at the current submit so a transcript arriving from
  // the microphone never calls a stale closure with an old session id.
  submitRef.current = (text: string) => void submit(text);

  const toggleVoice = () => {
    if (voiceOn) {
      voice.cancelSpeech();
      voice.stopListening();
      setVoiceOn(false);
      return;
    }
    setVoiceOn(true);
    // This click is the trusted gesture Chrome requires before it will speak,
    // and the turn already on screen arrived before any gesture existed — so
    // it can only be spoken from here.
    const current = turn?.text ?? streaming;
    if (current) voice.speakNow(current);
  };

  /**
   * Asks for coaching on the exchange that just closed.
   *
   * Deliberately not awaited by `submit`, and deliberately swallowing its own
   * failure. The candidate is mid-interview; a slow or broken coach must cost
   * them nothing.
   */
  const fetchCoaching = (id: string) => {
    if (mode === "real") return;
    setCoaching(true);
    requestCoaching(id)
      .then(({ tips: next }) => {
        setTips(next);
        setCoached(true);
      })
      .catch(() => undefined)
      .finally(() => setCoaching(false));
  };

  const submit = async (text?: string) => {
    const trimmed = (text ?? answer).trim();
    if (trimmed === "" || !sessionId || busy) return;

    // Consumed before the request so the marks cannot be reused on a later
    // turn. A typed answer yields nulls, which is the honest result.
    const timings = voice.takeTimings();

    setBusy(true);
    setError(null);
    setStreaming("");
    setTurn(null);
    setTips([]);
    setCoached(false);
    try {
      const next = await sendAnswerStream(sessionId, trimmed, timings, (chunk) => {
        setStreaming((current) => current + chunk);
        voice.speakStreamed(chunk);
      });
      voice.flushSpeech();
      setTurn(next);
      setAnswer("");
      fetchCoaching(sessionId);
    } catch (caught) {
      // The answer stays in the box so a retry costs nothing to the candidate.
      setError(describe(caught));
    } finally {
      setBusy(false);
    }
  };

  const showCoaching = mode === "practice";

  return (
    <>
      <PageHeader
        title={
          running?.generic
            ? `${running.targetRole} · ${running.interviewStage}`
            : `${running?.companyName ?? company} · ${running?.interviewStage ?? stage}`
        }
        meta={
          running?.generic
            ? "General role interview · targeting a company is on the paid plan"
            : (running?.targetRole ?? role)
        }
        actions={
          <div className="flex items-center gap-3">
            {voice.supported && (
              <button
                onClick={toggleVoice}
                aria-pressed={voiceOn}
                aria-label={voiceOn ? "Turn voice off" : "Turn voice on"}
                className="focus-ring flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs text-cream-dim transition-colors hover:text-cream-bright"
              >
                {voiceOn ? (
                  <Volume2 className="h-4 w-4" aria-hidden />
                ) : (
                  <VolumeX className="h-4 w-4" aria-hidden />
                )}
                Voice {voiceOn ? "on" : "off"}
              </button>
            )}
            {persona && (
              <span className="flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-3">
                <span
                  aria-hidden
                  className="grid h-7 w-7 place-items-center rounded-full bg-cream/10 text-[11px] font-semibold tracking-wide text-cream-bright"
                >
                  {persona.initials}
                </span>
                <span className="text-xs leading-tight">
                  <span className="block text-cream-bright">{persona.name}</span>
                  <span className="block text-cream-dim">{persona.title}</span>
                </span>
              </span>
            )}
            <Badge>{mode === "real" ? "Real" : "Practice"}</Badge>
            <Badge tone={busy ? "live" : "neutral"}>
              {busy && !turn && !streaming
                ? "Connecting"
                : `Turn ${turn?.turnNumber ?? "…"} of ${MAX_TURNS}`}
            </Badge>
          </div>
        }
      />

      {/* The interview column and the coaching column sit side by side from
          `lg` up. Below that the coaching stacks under the answer box rather
          than competing with it for a phone's width. */}
      <PageBody className="flex flex-1 flex-col gap-8 lg:flex-row lg:gap-10">
        <div className="flex flex-1 flex-col justify-between gap-8">
          <div className="w-full">
            <p className="text-xs text-cream-faint">Interviewer</p>
            {/* The reveal is the model actually generating, not a timed effect.
                aria-live announces the finished turn once, rather than
                re-reading the sentence on every token. */}
            {/* Sized for a sentence, not a slogan: `text-headline` reaches 72px
                on a wide screen, which pushed the answer box off the viewport
                once a full question arrived. */}
            <p
              className="mt-4 min-h-[6rem] text-[clamp(1.25rem,2.2vw,2rem)] font-normal leading-[1.25] text-cream-bright"
              aria-live="polite"
              aria-busy={busy}
            >
              {turn?.text || streaming || (
                <span className="text-cream-faint">
                  {error ? "—" : "Connecting to your interviewer…"}
                </span>
              )}
              {busy && streaming && (
                <span
                  aria-hidden
                  className="ml-[2px] inline-block h-[0.9em] w-[3px] bg-cream align-middle animate-blink"
                />
              )}
            </p>
          </div>

          <div className="w-full">
            {error && (
              <Panel variant="glass" className="mb-3 flex flex-wrap items-center justify-between gap-3 p-4">
                <p role="alert" className="text-sm text-cream-bright">
                  {error}
                </p>
                <Action
                  tone="ghost"
                  onClick={() => (turn ? void submit() : window.location.reload())}
                >
                  Try again
                </Action>
              </Panel>
            )}

            {turn?.isComplete ? (
              <Panel variant="glass" className="flex flex-col gap-4 p-6">
                <p className="text-sm text-cream-dim">
                  Interview complete. Your transcript is ready to evaluate.
                </p>
                <Action
                  withArrow
                  className="self-start"
                  onClick={() =>
                    navigate("/app/feedback", {
                      state: { sessionId, company, role, stage },
                    })
                  }
                >
                  See feedback
                </Action>
              </Panel>
            ) : (
              <Panel variant="glass" className="flex flex-col gap-4 p-4 sm:p-6">
                <label htmlFor="answer" className="sr-only">
                  Your answer
                </label>
                <textarea
                  id="answer"
                  ref={inputRef}
                  value={answer}
                  disabled={busy || !sessionId}
                  onChange={(event) => setAnswer(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void submit();
                    }
                  }}
                  rows={3}
                  placeholder="Answer out loud with the mic, or type here."
                  className="focus-ring w-full resize-none bg-transparent text-sm text-cream-bright placeholder:text-cream-faint disabled:opacity-50 sm:text-base"
                />
                {voiceOn && voice.listening && (
                  <p className="text-sm text-cream-dim" aria-live="polite">
                    {voice.transcript || "Listening…"}
                  </p>
                )}
                {voice.error && (
                  <p role="alert" className="text-xs text-cream-bright">
                    {voice.error}
                  </p>
                )}
                {voice.blocked && (
                  <div className="flex flex-wrap items-center gap-3">
                    <p role="alert" className="text-xs text-cream-bright">
                      Your browser blocked audio until you interact with the page.
                    </p>
                    <button
                      onClick={() => voice.speakNow(turn?.text ?? streaming)}
                      className="focus-ring rounded-full border border-line px-3 py-1.5 text-xs text-cream-dim transition-colors hover:text-cream-bright"
                    >
                      Play this turn
                    </button>
                  </div>
                )}
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-cream-faint">
                    {voiceOn
                      ? "Tap the mic and answer out loud"
                      : "Enter to send · Shift + Enter for a new line"}
                  </span>
                  <div className="flex items-center gap-2">
                    {voiceOn && voice.inputSupported && (
                      <button
                        onClick={() =>
                          voice.listening
                            ? voice.stopListening()
                            : voice.startListening()
                        }
                        /* The mic stays shut while the interviewer talks, or it
                           transcribes the synthesised voice back into the answer. */
                        disabled={busy || voice.speaking || !sessionId}
                        title={
                          voice.speaking
                            ? "Wait for the interviewer to finish"
                            : undefined
                        }
                        aria-pressed={voice.listening}
                        aria-label={voice.listening ? "Stop recording" : "Start recording"}
                        className={`focus-ring flex h-11 w-11 items-center justify-center rounded-full transition-colors disabled:opacity-40 ${
                          voice.listening
                            ? "bg-cream text-black"
                            : "border border-line text-cream-dim hover:text-cream-bright"
                        }`}
                      >
                        {voice.listening ? (
                          <Mic className="h-4 w-4" aria-hidden />
                        ) : (
                          <MicOff className="h-4 w-4" aria-hidden />
                        )}
                      </button>
                    )}
                    <Action
                      onClick={() => void submit()}
                      disabled={busy || answer.trim() === "" || !sessionId}
                    >
                      {speaking ? "Speaking…" : busy ? "Thinking…" : "Send"}
                    </Action>
                  </div>
                </div>
              </Panel>
            )}
          </div>
        </div>

        {showCoaching && (
          <CoachPanel tips={tips} working={coaching} answered={coached} />
        )}
      </PageBody>
    </>
  );
}

/**
 * The coaching sidebar.
 *
 * Only rendered in practice mode. In real mode the server refuses to coach at
 * all — hiding the panel while still fetching the notes would make "real" a
 * cosmetic setting, and the whole point of it is that the help is not there.
 */
function CoachPanel({
  tips,
  working,
  answered,
}: {
  tips: CoachTip[];
  working: boolean;
  /** The coach has replied for this turn — an empty list means "nothing to flag". */
  answered: boolean;
}) {
  return (
    <aside
      aria-label="Coaching notes"
      className="w-full shrink-0 lg:w-80 xl:w-96"
    >
      <div className="flex items-center gap-2 text-xs text-cream-faint">
        <Lightbulb className="h-4 w-4" aria-hidden />
        Coaching
      </div>

      <div className="mt-4 flex flex-col gap-3" aria-live="polite">
        {working && tips.length === 0 && (
          <p className="text-sm text-cream-faint">Reading your last answer…</p>
        )}

        {!working && tips.length === 0 && answered && (
          // Silence is a real result here — the coach is told to return nothing
          // when an answer was good. Leaving the intro copy up made a clean
          // answer look like a broken feature.
          <p className="text-sm text-cream-dim">
            Nothing to flag on that one.
          </p>
        )}

        {!working && tips.length === 0 && !answered && (
          <p className="text-sm text-cream-faint">
            Notes on your answers appear here after each turn. The interviewer
            never sees them and will not react to them.
          </p>
        )}

        {tips.map((tip, index) => (
          <Panel key={`${tip.kind}-${index}`} className="p-4">
            <p className="text-xs tracking-[0.14em] text-cream">
              {TIP_LABEL[tip.kind]}
            </p>
            <p className="mt-2 text-sm text-cream-dim">{tip.note}</p>
          </Panel>
        ))}
      </div>
    </aside>
  );
}

function describe(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) return "This session expired. Start a new interview.";
    if (error.status === 429) {
      return "You have started a lot of interviews recently. Try again in a little while.";
    }
    if (error.status === 403) return "This beta needs an access code.";
    return error.message;
  }
  return "Something went wrong. Try again.";
}
