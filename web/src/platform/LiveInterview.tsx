import { useEffect, useMemo, useRef, useState } from "react";
import { SCENARIO_OPTIONS, type DefenseScenario } from "@/lib/defense-scenarios";
import { useLocation, useNavigate } from "react-router-dom";
import { Lightbulb, Volume2, Zap } from "lucide-react";
import { Action, Badge, Panel, Waveform } from "@/design-system";
import { useVoice } from "@/hooks/useVoice";
import { PageBody, PageHeader } from "./AppShell";
import { uploadPresence,
  ApiError,
  fetchThesis,
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
  SlideReview,
} from "@/lib/api";
import { JURORS, NEUTRAL_VOICE, primeVoiceUnlock, showJurors, type JurorTag } from "@/lib/voice";
import { useThesisT } from "@/lib/thesis-copy";
import { useFrameSampler } from "@/hooks/useFrameSampler";
import { DefenseClock } from "./DefenseClock";
import { useCamera, useScreenShare } from "@/hooks/useMediaStream";
import { useRehearsalRecorder, type RecordedCall } from "@/hooks/useRehearsalRecorder";
import { CallControls } from "./CallControls";
import { CallStage } from "./CallStage";
import { TranscriptPanel, type TranscriptLine } from "./TranscriptPanel";
import { juryBusSupported, juryBusTrack, resumeAudio } from "@/lib/audio-level";
import { initialsOf, openCallRoom, useGroupCall, type CallParticipant, type CallSeat } from "@/lib/group-call";
import type { JurorSeat } from "./CallPeople";
import type { RoomState } from "@/lib/group-call";

type RoomStateJurors = RoomState["jurors"];
import { GroupInvite } from "./GroupInvite";
import { useLocale, useT } from "@/hooks/useLocale";
import type { MessageKey } from "@/lib/i18n";

interface SetupState {
  company?: string;
  role?: string;
  stage?: string;
  mode?: SessionMode;
  personaId?: string;
  /** The rounds this session covers, in order. */
  stages?: string[];
  /** What the interviewer speaks. */
  language?: string;
  bcp47?: string;
  /** Stress mode: the interviewer interrupts and pushes back. */
  pressure?: boolean;
  /** The advertisement this interview is for, pasted on the setup screen. */
  jobPosting?: string;
  /** Set when this rehearses for a tracked application. */
  applicationId?: string;
  /** A thesis defence, started from the thesis screen. */
  defense?: {
    university: string;
    difficulty: "calentamiento" | "estandar" | "exigente" | "hostil";
    country?: string;
    /** The panel of that country's format, for the names on screen. */
    jurors?: Record<JurorTag, { name: string; role: string }>;
    focus?: string;
    setting?: "presencial" | "virtual";
    material?: string;
    members?: string[];
    fluencyNeutral?: boolean;
    scenario?: DefenseScenario;
    /** Film it, on this device only, for the replay on the report. */
    record?: boolean;
  };
}

/** Until the session says otherwise. The round decides the real number. */
const DEFAULT_MAX_TURNS = 7;

const TIP_LABEL: Record<CoachTip["kind"], MessageKey> = {
  structure: "tip.structure",
  specificity: "tip.specificity",
  vocabulary: "tip.vocabulary",
  grammar: "tip.grammar",
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
  const t = useT();
  const { locale } = useLocale();
  const tt = useThesisT();
  const navigate = useNavigate();
  const { state } = useLocation() as { state: SetupState | null };
  const setup = state ?? {};
  const company = setup.company ?? "Stripe";
  const role = setup.role ?? "Senior Product Designer";
  const stage = setup.stage ?? "Behavioral";
  const mode: SessionMode = setup.mode ?? "practice";
  const personaId = setup.personaId ?? "";
  const stages = setup.stages ?? [];
  const pressure = setup.pressure ?? false;
  const jobPosting = setup.jobPosting ?? "";
  const applicationId = setup.applicationId ?? "";
  const defense = setup.defense ?? null;
  const [defenseSlides, setDefenseSlides] = useState<SlideReview | null>(null);
  useEffect(() => {
    if (!defense) return;
    let alive = true;
    fetchThesis()
      .then((res) => {
        if (alive && res.thesis?.slides?.review) {
          setDefenseSlides(res.thesis.slides.review);
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [Boolean(defense)]);
  /** That country's names for the three tags, for every line on screen. */
  const jurorNames = defense?.jurors
    ? {
        presidente: defense.jurors.presidente.name,
        metodologo: defense.jurors.metodologo.name,
        especialista: defense.jurors.especialista.name,
      }
    : undefined;
  /**
   * The language the server actually ran, not the one requested — free plans
   * get English whatever was asked for, and the voice has to match the words.
   */
  const [language, setLanguage] = useState(setup.language ?? "en");
  const bcp47 = setup.bcp47 ?? "en-US";

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [turn, setTurn] = useState<InterviewerTurn | null>(null);
  /** Text accumulated from the open stream, before the turn is finalized. */
  const [streaming, setStreaming] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /**
   * On from the first frame, so the interviewer introduces themselves.
   *
   * This used to start off, which meant the opening turn — the one that sets
   * up the whole rehearsal — arrived in silence and waited for a button. A
   * call does not do that: you join and the other person is already talking.
   *
   * It works because the click on "Begin" is the gesture Chrome asks for
   * before audio may play, and it carries across a route change inside the
   * same document. Someone who reloads straight onto this URL has no such
   * gesture, the browser refuses, and `voice.blocked` already puts the
   * unmute control in front of them — so the failing case is the one that
   * was the only case before.
   */
  const [voiceOn, setVoiceOn] = useState(true);
  /**
   * Whether the microphone is being held shut. Starts that way.
   *
   * The interviewer speaks on arrival, but nobody's microphone should open
   * because they opened a page: a candidate lands here with a room around
   * them and no reason to expect they are already being listened to. Opening
   * it is the one gesture worth asking for — and it doubles as the moment
   * they choose to start.
   *
   * After that it behaves like a call: cleared by the first press, and every
   * turn from then on opens by itself. Pressing it closed means closed, and
   * nothing reopens it.
   */
  const [micOff, setMicOff] = useState(true);
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
  const [panelOpen, setPanelOpen] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= 1024,
  );
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
    const trimmed = (speaker === "interviewer" ? showJurors(text, jurorNames) : text).trim();
    if (trimmed === "") return;
    // Every juror's turn is a chapter of the replay; the first gives the
    // floor for the exposition, so it is marked as that rather than a question.
    if (speaker === "interviewer") {
      recorder.mark(lineSeq.current === 0 ? null : trimmed);
    }
    lineSeq.current += 1;
    setLines((current) => [
      ...current,
      { id: `l${lineSeq.current}`, speaker, text: trimmed },
    ]);
  };

  /**
   * The opening turn's text, waiting for a voice to say it in.
   *
   * The server picks the interviewer when none was chosen, and announces it
   * in the session event — but that arrives as React state, so the speech
   * output is still the one built from the empty id when the first words
   * stream in a moment later. Spoken then, the opening turn came out in the
   * default voice and every turn after it in Sofía's: the interview changed
   * person after its first sentence.
   *
   * So the chunks are held until a render knows who is speaking, which is the
   * very next one. The text is on screen throughout — only the audio waits.
   */
  const held = useRef<string[]>([]);
  const heldComplete = useRef(false);
  /**
   * Gives up waiting and speaks anyway.
   *
   * Holding the opening turn assumes the session event arrives. If it does
   * not — an older session restored without one, a server that changes what
   * it announces — the words would sit in the buffer and the interview would
   * open in silence. A turn in the wrong voice is a smaller failure than a
   * turn nobody hears, so the wait has an end.
   */
  const [releaseHeld, setReleaseHeld] = useState(false);

  const camera = useCamera();
  /** Still frames for the presence reading, only while the camera is on. */
  const sampler = useFrameSampler(camera.stream);
  /**
   * In a group defence the film is the whole call. One object for the whole
   * session, filled in below once the call knows who is in it: the recorder
   * reads it on every frame, so a classmate who joins later is in the film.
   */
  const [filmedCall] = useState<RecordedCall | null>(() =>
    (setup.defense?.members?.length ?? 0) > 1
      ? { selfName: setup.defense!.members![0]!, people: [], extraAudio: [] }
      : null,
  );
  const recorder = useRehearsalRecorder(Boolean(setup.defense?.record), camera.stream, filmedCall);
  const finishRecording = recorder.finish;
  // Asked to be filmed: the camera opens with the call rather than waiting
  // for the button, or the exposition would be missing from the replay.
  const wantsFilm = Boolean(setup.defense?.record);
  useEffect(() => {
    if (wantsFilm && camera.supported && !camera.on && !camera.starting) camera.start();
    // Once, on arrival: turning the camera off later is the student's call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const presenceSent = useRef(false);
  const screen = useScreenShare();

  const voice = useVoice({
    enabled: voiceOn,
    onFinalAnswer: (text) => submitRef.current(text),
    sessionStartedAt: startedAt.current,
    voiceProfile: persona?.voice.fallback ?? NEUTRAL_VOICE,
    // The assigned interviewer, not the requested one — on the free plan the
    // server picks, and the voice has to match whoever actually showed up.
    personaId: persona?.id ?? personaId,
    language,
    bcp47,
    // A defence opens with the student's exposition: minutes long, with
    // pauses between slides. After that, an academic answer still pauses
    // longer than an interview one.
    silenceMs: defense ? (lines.some((line) => line.speaker === "candidate") ? 3_500 : 20_000) : undefined,
    accent: defense?.country ?? null,
  });

  /**
   * A group thesis, as a call: the classmates join from a link on their own
   * devices. Only offered when the rehearsal was started as a group's.
   */
  const groupMembers = defense?.members && defense.members.length > 1 ? defense.members : null;
  const hostName = groupMembers?.[0] ?? "";
  const [seat, setSeat] = useState<CallSeat | null>(null);
  const [opening, setOpening] = useState(false);
  const [openFailed, setOpenFailed] = useState(false);
  const openRoom = () => {
    if (!groupMembers || opening || !sessionId) return;
    setOpening(true);
    setOpenFailed(false);
    // A group call is a video call: the classmates expect to see you.
    if (camera.supported && !camera.on && !camera.starting) camera.start();
    openCallRoom(groupMembers, hostName, sessionId)
      .then(setSeat)
      .catch(() => setOpenFailed(true))
      .finally(() => setOpening(false));
  };

  /** The microphone the classmates hear: open only while you hold the floor. */
  const [callMic, setCallMic] = useState<MediaStreamTrack | null>(null);
  useEffect(() => {
    if (!seat || !navigator.mediaDevices?.getUserMedia) return;
    let track: MediaStreamTrack | null = null;
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      .then((stream) => {
        track = stream.getAudioTracks()[0] ?? null;
        if (cancelled) track?.stop();
        else setCallMic(track);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      track?.stop();
    };
  }, [seat]);
  useEffect(() => {
    if (callMic) callMic.enabled = voice.listening;
  }, [callMic, voice.listening]);

  /** Who is answering now, so every screen lights the same tile. */
  const [answering, setAnswering] = useState<string | null>(null);
  useEffect(() => {
    if (!seat) return;
    if (voice.listening) setAnswering(seat.participantId);
    else setAnswering((current) => (current === seat.participantId ? null : current));
  }, [voice.listening, seat]);

  // A new question passes the floor back: nobody is answering it yet.
  const turnNumber = turn?.turnNumber;
  useEffect(() => {
    setAnswering((current) => (current === seat?.participantId ? current : null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnNumber]);

  /** The jury's real voice, passed on so the classmates hear the same panel. */
  const juryTrack = useMemo(
    () => (seat && voice.realVoice && juryBusSupported() ? juryBusTrack() : null),
    [seat, voice.realVoice],
  );
  const callTracks = useMemo(
    () => [
      ...(camera.stream?.getVideoTracks() ?? []),
      ...(callMic ? [callMic] : []),
      ...(juryTrack ? [juryTrack] : []),
    ],
    [camera.stream, callMic, juryTrack],
  );
  const group = useGroupCall({
    seat,
    tracks: callTracks,
    // A classmate's answer is the turn. Their name goes first, so the jury
    // and the report know whose it was.
    onSay: (from: CallParticipant, text: string) => {
      setAnswering(from.id);
      if (voice.listening) voice.stopListening();
      waitingSay.current = `${from.name}: ${text}`;
      setSayArrived((count) => count + 1);
    },
  });
  if (filmedCall) {
    filmedCall.people = group.participants.map((person) => ({
      id: person.id,
      name: person.name,
      stream: group.remotes[person.id] ?? null,
    }));
    filmedCall.extraAudio = juryTrack ? [juryTrack] : [];
  }
  /**
   * A classmate's answer, held until the jury can take it.
   *
   * It can land while the panel is still talking or the last turn is still
   * streaming in, and `submit` refuses then — which silently threw away a
   * whole spoken answer. It waits here and goes in the moment the floor is
   * open; a newer answer replaces an older one still waiting.
   */
  const waitingSay = useRef<string | null>(null);
  const [sayArrived, setSayArrived] = useState(0);
  useEffect(() => {
    if (!waitingSay.current || busy || !sessionId || turn?.isComplete) return;
    const text = waitingSay.current;
    waitingSay.current = null;
    submitRef.current(text);
  }, [sayArrived, busy, sessionId, turn?.isComplete]);

  // The analyser is suspended until something resumes it, and nothing here
  // will be clicked. Harmless when the browser refuses: the waveform stays
  // flat and the interview is unaffected.
  useEffect(() => resumeAudio(), []);

  useEffect(() => {
    // StrictMode double-invokes effects in dev; without this guard that bills
    // two interviews for every one the candidate starts.
    if (startedRef.current) return;
    startedRef.current = true;

    setStreaming("");
    startSessionStream(
      {
        targetRole: role,
        companyName: company,
        interviewStage: stage,
      },
      {
        mode,
        personaId,
        stages,
        language,
        pressure,
        jobPosting,
        ...(applicationId === "" ? {} : { applicationId }),
        ...(defense
          ? {
              university: defense.university,
              difficulty: defense.difficulty,
              ...(defense.country ? { country: defense.country } : {}),
              ...(defense.focus ? { focus: defense.focus } : {}),
              ...(defense.setting ? { setting: defense.setting } : {}),
              ...(defense.material ? { material: defense.material } : {}),
              ...(defense.members && defense.members.length > 1 ? { members: defense.members } : {}),
              ...(defense.fluencyNeutral ? { fluencyNeutral: true } : {}),
              ...(defense.scenario ? { scenario: defense.scenario } : {}),
            }
          : {}),
      },
      {
        // The session id arrives first so a mid-stream failure is still
        // recoverable — the interview exists server-side either way.
        onSession: (id, assigned, resolved, turns, spoken) => {
          setSessionId(id);
          // The server decides which archetype you get when none was picked,
          // so the voice profile has to come back rather than be assumed.
          setPersona(assigned);
          // And which employer, if any. On the free plan it replaced the one
          // that was picked, and the header must not keep claiming otherwise.
          setRunning(resolved);
          if (turns > 0) setMaxTurns(turns);
          if (spoken) setLanguage(spoken);
        },
        onDelta: (chunk) => {
          setStreaming((current) => current + chunk);
          // Held, not spoken. See `held` below: the voice is chosen from the
          // interviewer this session assigned, and that has not reached a
          // render yet.
          held.current.push(chunk);
        },
      },
    )
      .then((result) => {
        heldComplete.current = true;
        // The turn is complete. If the interviewer still has not been
        // announced by the time it settles, stop waiting for one.
        window.setTimeout(() => {
          if (held.current.length > 0) setReleaseHeld(true);
        }, 1500);
        setTurn(result);
        addLine("interviewer", result.text);
      })
      .catch((caught: unknown) => setError(describe(caught, t)))
      .finally(() => setBusy(false));
  }, [company, role, stage, mode, personaId, pressure, jobPosting, applicationId, stages.join(",")]);

  // Released once the assigned interviewer and voice config have reached a
  // render, so the output speaking these words is the one built from their
  // voice and is not torn down mid-sentence when `/api/voice/config` resolves.
  useEffect(() => {
    if ((!persona && !releaseHeld) || (!voice.ready && !releaseHeld) || held.current.length === 0) return;
    for (const chunk of held.current.splice(0)) voice.speakStreamed(chunk);
    if (heldComplete.current) {
      heldComplete.current = false;
      voice.flushSpeech();
    }
  }, [persona, releaseHeld, voice.ready, voice.speakStreamed, voice.flushSpeech]);

  useEffect(() => {
    if (turn && !turn.isComplete && !busy) inputRef.current?.focus();
  }, [turn, busy]);

  /**
   * Holds the microphone open across the whole call, the way one stays open.
   *
   * It opens each time the interviewer stops talking, which covers both the
   * greeting and every turn after it — the candidate never presses anything.
   *
   * Not while they are still speaking: recognition started then hears the
   * interviewer through the speakers and answers on the candidate's behalf.
   * This was a one-shot flag first, set before `startListening` had a chance
   * to refuse, and `startListening` refuses while audio is still playing — so
   * the flag burned on a call that never happened and the microphone stayed
   * shut for the whole interview.
   *
   * `micOff` is the one thing that stops it, and it starts set: the
   * interviewer introduces themselves to a closed microphone, which is the
   * only arrangement where nobody is recorded before they have agreed to
   * speak. Someone who later closes it by hand meant it too, and an effect
   * that reopened it a frame later would be a product arguing with its user.
   */
  useEffect(() => {
    if (micOff || !voiceOn || busy || voice.blocked) return;
    if (!turn || turn.isComplete) return;
    if (voice.speaking || voice.listening) return;
    voice.startListening();
  }, [
    micOff,
    voiceOn,
    busy,
    turn,
    voice.speaking,
    voice.listening,
    voice.blocked,
    voice.startListening,
  ]);

  /** The interview is over: close the microphone so nothing more is sent. */
  useEffect(() => {
    if (turn?.isComplete && voice.listening) voice.stopListening();
  }, [turn, voice.listening, voice.stopListening]);

  const speaking = busy && streaming !== "";
  /**
   * When the floor passed to the student: the clock runs from the moment the
   * jury stopped talking, not from when the turn arrived on screen.
   */
  const [floorSince, setFloorSince] = useState<number | null>(null);
  useEffect(() => {
    if (!defense || !turn || turn.isComplete || busy || voice.speaking) return;
    setFloorSince(Date.now());
  }, [defense, turn, busy, voice.speaking]);
  /** The first answer of a defence is the exposition, timed to its slot. */
  const expositionTurn = !lines.some((line) => line.speaker === "candidate");

  /** Who on the panel is speaking: the last juror tag in the turn on screen. */
  const juror = useMemo(() => {
    if (!defense) return null;
    const tags = [...(turn?.text || streaming).matchAll(/\[\[(presidente|metodologo|especialista)\]\]/g)];
    const tag = (tags.at(-1)?.[1] ?? "presidente") as JurorTag;
    const local = defense.jurors?.[tag];
    return { ...JURORS[tag], ...(local ? { name: local.name } : {}), role: tag, title: local?.role ?? null };
  }, [defense, turn?.text, streaming]);

  /** The whole panel, for the table on screen: all three sit there throughout. */
  const jury = useMemo<JurorSeat[] | undefined>(() => {
    if (!defense) return undefined;
    return (["presidente", "metodologo", "especialista"] as JurorTag[]).map((tag) => {
      const local = defense.jurors?.[tag];
      const name = local?.name ?? JURORS[tag].name;
      return { tag, name, title: local?.role ?? tt(tag), initials: initialsOf(name) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defense?.jurors, locale]);

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
    primeVoiceUnlock();
    // This click is the trusted gesture Chrome requires before it will speak,
    // and the turn already on screen arrived before any gesture existed — so
    // it can only be spoken from here.
    const current = turn?.text ?? streaming;
    if (current) voice.speakNow(current);
    // Opening the mic is the reason they pressed it.
    voice.startListening();
  };

  /** Plays or replays the current turn out loud from a direct user click. */
  const playCurrentTurn = () => {
    setVoiceOn(true);
    resumeAudio();
    primeVoiceUnlock();
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
    // The last turn is in: nothing more can be said, only the report opened.
    // A microphone still running used to send the goodbye "thank you" here,
    // the server refused it, and the candidate saw "the interview service
    // failed" at the very end of a finished interview.
    if (turn?.isComplete) return;
    // Kept so a failed turn can put the screen back as it was. Clearing it
    // and leaving it cleared lost the turn number, and with it the report:
    // leaving after an error went back to the start screen with nothing.
    const previous = turn;

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
      const next = await sendAnswerStream(
        sessionId,
        trimmed,
        timings,
        (chunk) => {
          setStreaming((current) => current + chunk);
          voice.speakStreamed(chunk);
        },
        locale,
      );
      voice.flushSpeech();
      setTurn(next);
      if (next.text.trim() !== "") addLine("interviewer", next.text);
      setAnswer("");
      fetchCoaching(sessionId);
    } catch (caught) {
      // The answer stays in the box so a retry costs nothing to the candidate.
      setTurn(previous);
      setError(describe(caught, t));
    } finally {
      setBusy(false);
    }
  };

  const showCoaching = mode === "practice";
  const finished = Boolean(turn?.isComplete);
  // The film is kept once the panel closes, under this session's id, so the
  // report can play it back against the record.
  useEffect(() => {
    if (finished && sessionId) void finishRecording(sessionId);
  }, [finished, sessionId, finishRecording]);
  // At the end, the frames go once to be read, while the report is written.
  useEffect(() => {
    if (!finished || !sessionId || presenceSent.current) return;
    const frames = sampler.take();
    if (frames.length < 2) return;
    presenceSent.current = true;
    void uploadPresence(sessionId, frames, locale).catch(() => undefined);
  }, [finished, sessionId, sampler, locale]);
  /**
   * Whether there is enough said to write a report about.
   *
   * The second interviewer turn only exists because the candidate answered
   * the first. Leaving after that used to go back to the start screen with
   * nothing, which read as the product cutting them off — they had answered
   * real questions and saw no feedback at all. The evaluator already handles
   * a short transcript honestly, so leaving early now leads to a report on
   * what there is.
   */
  const reportable = finished || (turn?.turnNumber ?? 0) >= 2;
  // A defence is titled by what it is; the university goes underneath. Both
  // in one line ran to two lines on a desktop and three on a phone, above
  // the call it was meant to introduce.
  const heading = defense
    ? tt("sessionTitle")
    : running?.generic
      ? `${running.targetRole} · ${running.interviewStage}`
      : `${running?.companyName ?? company} · ${running?.interviewStage ?? stage}`;
  const status =
    busy && !turn && !streaming
      ? t("call.connecting")
      : t("call.turnOf", { turn: turn?.turnNumber ?? "…", total: maxTurns });

  /**
   * The mic button is the call's, so it owns turning voice on as well.
   * Nobody unmutes expecting to still be muted, and the voice toggle was a
   * separate switch in the header that had to be found first.
   */
  const toggleMic = () => {
    if (voice.listening) {
      setMicOff(true);
      voice.stopListening();
      return;
    }
    setMicOff(false);
    // `blocked` as well as `!voiceOn`: voice is on from the first frame now,
    // so a browser that refused to play needs this click routed through
    // `startVoice` — that is where the pending turn gets spoken with the
    // gesture attached. Going straight to the microphone would open it and
    // leave the interviewer mute.
    if (!voiceOn || voice.blocked) {
      startVoice();
      return;
    }
    voice.startListening();
  };

  /**
   * What the report's subtitle names. Without it a report opened straight
   * from a finished interview fell back to the sample's label and called a
   * real interview "Sample report".
   */
  const reportLabel = () => ({
    company: running?.companyName ?? company,
    role: running?.targetRole ?? role,
    stage: running?.interviewStage ?? stage,
  });

  /** The floor's time limit: the exposition's slot, then ninety seconds an answer. */
  const floorSeconds = expositionTurn
    ? stages[0] === "sustentacion-express"
      ? 60
      : SCENARIO_OPTIONS[defense?.scenario ?? "titulo"].exposition * 60
    : 90;

  // What the classmates' screens mirror. Sent only when something in it
  // changed, which is a handful of times a turn.
  const publishRoom = group.publish;
  useEffect(() => {
    if (!seat || !defense || !jury) return;
    publishRoom({
      university: defense.university,
      jurors: Object.fromEntries(jury.map((seatOf) => [seatOf.tag, { name: seatOf.name, title: seatOf.title }])) as RoomStateJurors,
      juror: juror?.role ?? "presidente",
      juryTalking: voice.speaking,
      turnText: showJurors(turn?.text || streaming, jurorNames),
      status,
      floorSince: floorSince !== null && turn && !turn.isComplete && !busy ? floorSince : null,
      floorSeconds,
      floorLabel: tt(expositionTurn ? "clockExposition" : "clockAnswer"),
      complete: Boolean(turn?.isComplete),
      juryAudio: juryTrack !== null,
      bcp47,
      answering,
    });
  });

  const leave = () => {
    voice.cancelSpeech();
    voice.stopListening();
    camera.stop();
    screen.stop();
    navigate(reportable && sessionId ? `/app/feedback` : defense ? "/app" : "/app/practice", {
      state: reportable && sessionId ? { sessionId, ...reportLabel(), ...(defense ? { defense: true } : {}) } : undefined,
    });
  };

  return (
    <>
      <PageHeader
        compact
        title={heading}
        meta={
          defense
            ? defense.university
            : running?.generic
              ? t("field.generalRole")
              : (running?.targetRole ?? role)
        }
        actions={
          <div className="flex items-center gap-3">
            <Badge>{mode === "real" ? t("field.real") : t("field.practice")}</Badge>
            {/* Said out loud, because the interruptions that follow are the
                exercise. Without this the first time it talks over an answer
                reads as the product glitching. */}
            {pressure && (
              <Badge>
                <Zap className="h-3 w-3" aria-hidden />
                {t("field.pressureOn")}
              </Badge>
            )}
            {/* The turn count is not repeated here: the stage carries it, on
                the call itself, where the eye already is. */}
          </div>
        }
      />

      <PageBody className="flex flex-1 flex-col pb-4 pt-3 sm:py-6 lg:py-10">
        <div className="flex flex-1 flex-col gap-3 lg:gap-4">
          {/* The call and the transcript share one fixed height on desktop.
              It used to sit on the outer column, where `flex-1` overrode it,
              so every new line of transcript made the whole room taller and
              pushed the controls down the page. Bounded here, the transcript
              scrolls inside its own card and nothing around it moves. */}
          {groupMembers && (
            <GroupInvite
              roomId={seat?.roomId ?? null}
              opening={opening}
              failed={openFailed}
              joined={group.participants}
              onOpen={openRoom}
            />
          )}
          <div className="relative flex min-h-0 flex-1 flex-col gap-3 lg:h-[clamp(26rem,calc(100svh-16rem),46rem)] lg:flex-none lg:flex-row lg:gap-4">
            <div className="flex min-h-0 flex-1 flex-col gap-2.5 sm:gap-3">
              <CallStage
                initials={juror ? juror.name.replace(/^Dra?\.\s*/, "").slice(0, 2).toUpperCase() : (persona?.initials ?? "…")}
                name={juror?.name ?? persona?.name ?? t("call.interviewerFallback")}
                title={juror ? `${juror.title ?? tt(juror.role)} · ${defense?.university ?? ""}` : (persona?.title ?? t("call.joining"))}
                speaking={voice.speaking}
                voiceLevel={voice.voiceLevel}
                voiceMeasured={voice.voiceMeasured}
                cameraStream={camera.stream}
                cameraError={camera.error}
                screenStream={screen.stream}
                status={status}
                caption={voice.transcript}
                listening={voice.listening}
                turnText={showJurors(turn?.text || streaming, jurorNames) || undefined}
                slides={defenseSlides}
                {...(jury ? { jury, activeJuror: juror?.role ?? null } : {})}
                {...(seat
                  ? {
                      selfName: hostName || tt("callYou"),
                      selfAnswering: answering === seat.participantId,
                      selfMuted: !voice.listening,
                      people: group.participants.map((person) => ({
                        id: person.id,
                        name: person.name,
                        stream: group.remotes[person.id] ?? null,
                        answering: answering === person.id,
                      })),
                    }
                  : {})}
              />


              {/* Desktop subtitle text under stage. Not drawn at all on an
                  error: the alert below says what happened, and a lone "—"
                  in the subtitle's place read as a glitch. */}
              {!error && (
              <div className="hidden sm:block">
                <div className="flex items-start justify-between gap-3">
                  <p
                    className="min-h-[3.5rem] flex-1 text-[clamp(1rem,1.6vw,1.5rem)] leading-snug text-cream-bright"
                    aria-live="polite"
                    aria-busy={busy}
                  >
                    {showJurors(turn?.text || streaming, jurorNames) || (
                      <span className="text-cream-faint">{t("call.connectingTo")}</span>
                    )}
                  </p>
                  {voice.outputSupported && Boolean(turn?.text || streaming) && !voice.speaking && !voice.blocked && (
                    <button
                      type="button"
                      onClick={playCurrentTurn}
                      aria-label={t("call.playTurn")}
                      className="focus-ring mt-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface-lift px-3 py-1.5 text-xs font-semibold text-cream-bright transition-[background-color,transform] duration-150 ease-press hover:bg-cream/15 active:scale-[0.97]"
                    >
                      <Volume2 aria-hidden className="h-3.5 w-3.5 text-accent-text" />
                      {t("call.playTurn")}
                    </button>
                  )}
                </div>
              </div>
              )}

              {/* Mobile / universal replay button when not blocked and not speaking */}
              {voice.outputSupported && Boolean(turn?.text || streaming) && !voice.speaking && !voice.blocked && (
                <button
                  type="button"
                  onClick={playCurrentTurn}
                  className="focus-ring inline-flex self-start items-center gap-1.5 rounded-full bg-surface-lift px-3 py-1.5 text-xs font-semibold text-cream-bright transition-[background-color,transform] duration-150 ease-press hover:bg-cream/15 active:scale-[0.97] sm:hidden"
                >
                  <Volume2 aria-hidden className="h-3.5 w-3.5 text-accent-text" />
                  {t("call.playTurn")}
                </button>
              )}

              {/* In a defence an answer can run for minutes, so ending it is
                  the student's call as well as the pause's. */}
              {defense && voice.listening && voice.transcript.trim() !== "" && (
                <button
                  type="button"
                  onClick={() => voice.stopListening()}
                  className="focus-ring self-start rounded-full bg-cream-bright px-4 py-2 text-sm font-semibold text-surface-base transition-transform duration-150 ease-press active:scale-[0.97]"
                >
                  {tt("done")}
                </button>
              )}

              {defense && floorSince !== null && turn && !turn.isComplete && !busy && (
                <DefenseClock
                  since={floorSince}
                  limitSeconds={floorSeconds}
                  label={tt(expositionTurn ? "clockExposition" : "clockAnswer")}
                />
              )}

              {voice.listening && (
                <div className="flex items-start gap-2.5 sm:gap-3">
                  <Waveform
                    active
                    level={voice.micLevel}
                    measured={voice.micMeasured}
                    label={t("call.micLive")}
                    className="mt-0.5 shrink-0 text-grow"
                  />
                  <p className="line-clamp-2 text-xs text-cream-dim sm:text-sm" aria-live="polite">
                    {voice.transcript || t("call.listening")}
                  </p>
                </div>
              )}

              {(error || voice.error || camera.error || screen.error) && (
                <p role="alert" className="text-xs text-cream-bright">
                  {error ?? voice.error ?? camera.error ?? screen.error}
                </p>
              )}

              {voice.blocked && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface-card p-3 shadow-card ring-1 ring-accent/30">
                  <p role="alert" className="text-xs text-cream-bright">
                    {t("call.blocked")}
                  </p>
                  <button
                    type="button"
                    onClick={playCurrentTurn}
                    className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-ink transition-[background-color,transform] duration-150 ease-press hover:opacity-95 active:scale-[0.97]"
                  >
                    <Volume2 aria-hidden className="h-4 w-4" />
                    {t("call.playTurn")}
                  </button>
                </div>
              )}

              {finished && (
                <Action
                  withArrow
                  className="self-start"
                  onClick={() =>
                    navigate("/app/feedback", { state: { sessionId, presence: presenceSent.current, ...reportLabel() } })
                  }
                >
                  {t("call.seeFeedback")}
                </Action>
              )}
            </div>

            {panelOpen && (
              <div className="sheet-in fixed inset-x-4 bottom-[calc(6rem+env(safe-area-inset-bottom,0px))] top-[calc(5rem+env(safe-area-inset-top,0px))] z-40 flex min-h-0 flex-col shadow-float lg:static lg:inset-auto lg:z-auto lg:h-full lg:w-[26rem] lg:shrink-0 lg:shadow-none">
                <TranscriptPanel
                  lines={lines}
                  pending={busy ? showJurors(streaming, jurorNames) : ""}
                  interviewerName={defense ? null : (persona?.name ?? null)}
                  {...(defense ? { panelLabel: tt("panel") } : {})}
                  tab={tab}
                  onTab={setTab}
                  answer={answer}
                  onAnswer={setAnswer}
                  onSend={() => void submit()}
                  canSend={!busy && Boolean(sessionId) && !finished}
                  onClose={() => setPanelOpen(false)}
                  hint={
                    speaking
                      ? t("panel.speaking")
                      : busy
                        ? t("panel.thinking")
                        : t("panel.enterToSend")
                  }
                />
              </div>
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
              leaveLabel={reportable ? t("call.endAndSee") : t("call.leave")}
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
  const t = useT();
  return (
    <aside
      aria-label={t("coach.label")}
      className="w-full shrink-0 lg:w-80 xl:w-96"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-cream-dim">
        <Lightbulb className="h-4 w-4 text-step-text" aria-hidden />
        {t("coach.heading")}
      </div>

      <div className="mt-4 flex flex-col gap-3" aria-live="polite">
        {working && tips.length === 0 && (
          <p className="text-sm text-cream-faint">{t("coach.reading")}</p>
        )}

        {!working && tips.length === 0 && answered && (
          // Silence is a real result here — the coach is told to return nothing
          // when an answer was good. Leaving the intro copy up made a clean
          // answer look like a broken feature.
          <p className="text-sm text-cream-dim">
            {t("coach.nothing")}
          </p>
        )}

        {!working && tips.length === 0 && !answered && (
          <p className="text-sm text-cream-faint">
            {t("coach.intro")}
          </p>
        )}

        {tips.map((tip, index) => (
          <Panel key={`${tip.kind}-${index}`} className="p-4">
            <p className="text-xs font-semibold text-cream">
              {t(TIP_LABEL[tip.kind])}
            </p>
            <p className="mt-2 text-sm text-cream-dim">{tip.note}</p>
          </Panel>
        ))}
      </div>
    </aside>
  );
}

/** What went wrong, in the reader's language. */
function describe(error: unknown, t: ReturnType<typeof useT>): string {
  if (error instanceof ApiError) {
    if (error.status === 404) return t("call.expired");
    if (error.status === 429) return t("call.tooMany");
    // Everything else arrives already localised by the API layer when the
    // server sent a code, and as the server's own sentence when it did not.
    return error.message;
  }
  return t("call.failed");
}
