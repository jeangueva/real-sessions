import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { Action, Badge, Panel } from "@/design-system";
import { useVoice } from "@/hooks/useVoice";
import { PageHeader } from "./AppShell";
import {
  ApiError,
  COMPANY_CULTURE,
  COMPANY_INDUSTRY,
  sendAnswerStream,
  startSessionStream,
} from "@/lib/api";
import type { InterviewerTurn } from "@/lib/api";

interface SetupState {
  company?: string;
  role?: string;
  stage?: string;
}

const MAX_TURNS = 7;

/**
 * The live session, driven by the real `InterviewSession` on the server.
 *
 * Three states share one layout so the screen never jumps: opening (waiting on
 * turn 1), speaking (a turn to answer), and complete. Errors replace the input
 * rather than the whole screen — a failed turn should not discard the
 * conversation above it.
 */
export function LiveInterview() {
  const navigate = useNavigate();
  const { state } = useLocation() as { state: SetupState | null };
  const setup = state ?? {};
  const company = setup.company ?? "Stripe";
  const role = setup.role ?? "Senior Product Designer";
  const stage = setup.stage ?? "Behavioral";

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [turn, setTurn] = useState<InterviewerTurn | null>(null);
  /** Text accumulated from the open stream, before the turn is finalized. */
  const [streaming, setStreaming] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voiceOn, setVoiceOn] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const startedRef = useRef(false);
  /** submit() is redefined each render; voice needs a stable handle to it. */
  const submitRef = useRef<(text: string) => void>(() => undefined);

  const voice = useVoice({
    enabled: voiceOn,
    onFinalAnswer: (text) => submitRef.current(text),
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
        companyCulture: COMPANY_CULTURE[company] ?? "Craft and high standards",
        industry: COMPANY_INDUSTRY[company] ?? "Technology",
        interviewStage: stage,
      },
      {
        // The session id arrives first so a mid-stream failure is still
        // recoverable — the interview exists server-side either way.
        onSession: setSessionId,
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
  }, [company, role, stage]);

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

  const submit = async (text?: string) => {
    const trimmed = (text ?? answer).trim();
    if (trimmed === "" || !sessionId || busy) return;

    setBusy(true);
    setError(null);
    setStreaming("");
    setTurn(null);
    try {
      const next = await sendAnswerStream(sessionId, trimmed, (chunk) => {
        setStreaming((current) => current + chunk);
        voice.speakStreamed(chunk);
      });
      voice.flushSpeech();
      setTurn(next);
      setAnswer("");
    } catch (caught) {
      // The answer stays in the box so a retry costs nothing to the candidate.
      setError(describe(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title={`${company} · ${stage}`}
        meta={role}
        actions={
          <div className="flex items-center gap-3">
            {voice.supported && (
              <button
                onClick={toggleVoice}
                aria-pressed={voiceOn}
                aria-label={voiceOn ? "Turn voice off" : "Turn voice on"}
                className="focus-ring flex items-center gap-2 rounded-full border border-line px-3 py-1 text-xs text-cream-dim transition-colors hover:text-cream-bright"
              >
                {voiceOn ? (
                  <Volume2 className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <VolumeX className="h-3.5 w-3.5" aria-hidden />
                )}
                Voice {voiceOn ? "on" : "off"}
              </button>
            )}
            <Badge tone={busy ? "live" : "neutral"}>
            {busy && !turn && !streaming
              ? "Connecting"
              : `Turn ${turn?.turnNumber ?? "…"} of ${MAX_TURNS}`}
            </Badge>
          </div>
        }
      />

      <div className="flex flex-1 flex-col justify-between gap-8 px-6 py-10 lg:px-10">
        <div className="mx-auto w-full max-w-3xl">
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

        <div className="mx-auto w-full max-w-3xl">
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
                onClick={() =>
                  navigate("/app/feedback", { state: { sessionId, company, role, stage } })
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
                placeholder="Answer out loud, then type the gist — voice input is coming."
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
                    className="focus-ring rounded-full border border-line px-3 py-1 text-xs text-cream-dim transition-colors hover:text-cream-bright"
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
                      className={`focus-ring flex h-10 w-10 items-center justify-center rounded-full transition-colors disabled:opacity-40 ${
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
    </>
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
