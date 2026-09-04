import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Lightbulb } from "lucide-react";
import { Action, Badge, Panel, Waveform } from "@/design-system";
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
import { useCamera, useScreenShare } from "@/hooks/useMediaStream";
import { CallControls } from "./CallControls";
import { CallStage } from "./CallStage";
import { TranscriptPanel, type TranscriptLine } from "./TranscriptPanel";
import { resumeAudio } from "@/lib/audio-level";

interface SetupState {
  company?: string;
  role?: string;
  stage?: string;
  mode?: SessionMode;
  personaId?: string;
}

/** Until the session says otherwise. The round decides the real number. */
const DEFAULT_MAX_TURNS = 7;

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
  /** How long this round runs. Behavioural is shorter than system design. */
  const [maxTurns, setMaxTurns] = useState(DEFAULT_MAX_TURNS);
  /**
   * Everything said so far, in order, attributed. The turn state holds only
   * what is on screen now; a call needs the record beside it.
   */
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [panelOpen, setPanelOpen] = useState(true);
  const [tab, setTab] = useState<"transcript" | "chat">("transcript");
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
  /** Ids for transcript rows. The index is not stable enough to be a key. */
  const lineSeq = useRef(0);

  const addLine = (speaker: TranscriptLine["speaker"], text: string) => {
    const trimmed = text.trim();
    if (trimmed === "") return;
    lineSeq.current += 1;
    setLines((current) => [
      ...current,
      { id: `l${lineSeq.current}`, speaker, text: trimmed },
    ]);
  };

  const camera = useCamera();
  const screen = useScreenShare();

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
        onSession: (id, assigned, resolved, turns) => {
          setSessionId(id);
          // The server decides which archetype you get when none was picked,
          // so the voice profile has to come back rather than be assumed.
          setPersona(assigned);
          // And which employer, if any. On the free plan it replaced the one
          // that was picked, and the header must not keep claiming otherwise.
          setRunning(resolved);
          if (turns > 0) setMaxTurns(turns);
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
        addLine("interviewer", result.text);
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

  /**
   * Turns the voice on, from a click.
   *
   * The click is load-bearing twice over: it is the trusted gesture Chrome
   * requires before anything will play, and it is what starts the audio graph
   * the waveform reads. Which is why the mic button routes through here the
   * first time rather than going straight to `startListening`.
   */
  const startVoice = () => {
    setVoiceOn(true);
    // The same click starts the audio graph. Without it the analyser stays
    // suspended and the waveform never sees the interviewer's voice.
    resumeAudio();
    // This click is the trusted gesture Chrome requires before it will speak,
    // and the turn already on screen arrived before any gesture existed — so
    // it can only be spoken from here.
    const current = turn?.text ?? streaming;
    if (current) voice.speakNow(current);
    // Opening the mic is the reason they pressed it.
    voice.startListening();
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
    // Recorded before the request, not after it: a failed turn still happened
    // as far as the candidate is concerned, and losing what they just said
    // would be the worst possible response to an error.
    addLine("candidate", trimmed);
    try {
      const next = await sendAnswerStream(sessionId, trimmed, timings, (chunk) => {
        setStreaming((current) => current + chunk);
        voice.speakStreamed(chunk);
      });
      voice.flushSpeech();
      setTurn(next);
      addLine("interviewer", next.text);
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
  const finished = Boolean(turn?.isComplete);
  const heading = running?.generic
    ? `${running.targetRole} · ${running.interviewStage}`
    : `${running?.companyName ?? company} · ${running?.interviewStage ?? stage}`;
  const status =
    busy && !turn && !streaming
      ? "Connecting"
      : `Turn ${turn?.turnNumber ?? "…"} of ${maxTurns}`;

  /**
   * The mic button is the call's, so it owns turning voice on as well.
   * Nobody unmutes expecting to still be muted, and the voice toggle was a
   * separate switch in the header that had to be found first.
   */
  const toggleMic = () => {
    if (voice.listening) {
      voice.stopListening();
      return;
    }
    if (!voiceOn) {
      startVoice();
      return;
    }
    voice.startListening();
  };

  const leave = () => {
    voice.cancelSpeech();
    voice.stopListening();
    camera.stop();
    screen.stop();
    navigate(finished && sessionId ? `/app/feedback` : "/app", {
      state: finished && sessionId ? { sessionId } : undefined,
    });
  };

  return (
    <>
      <PageHeader
        title={heading}
        meta={
          running?.generic
            ? "General role interview · targeting a company is on the paid plan"
            : (running?.targetRole ?? role)
        }
        actions={
          <div className="flex items-center gap-3">
            <Badge>{mode === "real" ? "Real" : "Practice"}</Badge>
            <Badge tone={busy ? "live" : "neutral"}>{status}</Badge>
          </div>
        }
      />

      <PageBody className="flex flex-1 flex-col">
        <div className="flex min-h-[70vh] flex-1 flex-col gap-4">
          <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
            <div className="flex min-h-0 flex-1 flex-col gap-3">
              <CallStage
                initials={persona?.initials ?? "…"}
                name={persona?.name ?? "Your interviewer"}
                title={persona?.title ?? "Joining…"}
                speaking={voice.speaking}
                voiceLevel={voice.voiceLevel}
                voiceMeasured={voice.voiceMeasured}
                cameraStream={camera.stream}
                cameraError={camera.error}
                screenStream={screen.stream}
                status={status}
              />

              {/* What the interviewer just asked, under the tile — the one
                  thing a candidate needs in front of them while answering,
                  and the one thing a scrolling transcript is bad at holding
                  still. */}
              <p
                className="min-h-[3.5rem] text-[clamp(1rem,1.6vw,1.5rem)] leading-snug text-cream-bright"
                aria-live="polite"
                aria-busy={busy}
              >
                {turn?.text || streaming || (
                  <span className="text-cream-faint">
                    {error ? "—" : "Connecting to your interviewer…"}
                  </span>
                )}
              </p>

              {voice.listening && (
                <div className="flex items-start gap-3">
                  <Waveform
                    active
                    level={voice.micLevel}
                    measured={voice.micMeasured}
                    label="Your microphone is picking you up"
                    className="mt-0.5 shrink-0 text-cream-bright"
                  />
                  <p className="text-sm text-cream-dim" aria-live="polite">
                    {voice.transcript || "Listening…"}
                  </p>
                </div>
              )}

              {(error || voice.error || camera.error || screen.error) && (
                <p role="alert" className="text-xs text-cream-bright">
                  {error ?? voice.error ?? camera.error ?? screen.error}
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

              {finished && (
                <Action
                  withArrow
                  className="self-start"
                  onClick={() =>
                    navigate("/app/feedback", { state: { sessionId } })
                  }
                >
                  See feedback
                </Action>
              )}
            </div>

            {panelOpen && (
              <TranscriptPanel
                lines={lines}
                pending={busy ? streaming : ""}
                interviewerName={persona?.name ?? null}
                tab={tab}
                onTab={setTab}
                answer={answer}
                onAnswer={setAnswer}
                onSend={() => void submit()}
                canSend={!busy && Boolean(sessionId) && !finished}
                hint={
                  speaking
                    ? "Speaking…"
                    : busy
                      ? "Thinking…"
                      : "Enter to send · Shift + Enter for a new line"
                }
              />
            )}
          </div>

          <div className="shrink-0 pt-1">
            <CallControls
              micOn={voice.listening}
              micSupported={voice.inputSupported}
              onToggleMic={toggleMic}
              cameraOn={camera.on}
              cameraSupported={camera.supported}
              onToggleCamera={() => (camera.on ? camera.stop() : camera.start())}
              sharing={screen.on}
              shareSupported={screen.supported}
              onToggleShare={() => (screen.on ? screen.stop() : screen.start())}
              panelOpen={panelOpen}
              onTogglePanel={() => setPanelOpen((open) => !open)}
              onLeave={leave}
              leaveLabel={finished ? "End and see feedback" : "Leave the interview"}
            />
          </div>

          {showCoaching && (
            <CoachPanel tips={tips} working={coaching} answered={coached} />
          )}
        </div>
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
