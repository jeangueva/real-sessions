import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { privacyFor, termsFor, legalLocale } from "@/legal/content";
import { useLocale } from "@/hooks/useLocale";
import { LogOut, Mic, Send, Users } from "lucide-react";
import { Action, Panel } from "@/design-system";
import { AuthLayout } from "./AuthLayout";
import { CallStage } from "./CallStage";
import { DefenseClock } from "./DefenseClock";
import type { JurorSeat } from "./CallPeople";
import { ActaCard } from "./ActaCard";
import { resumeAudio } from "@/lib/audio-level";
import {
  CallError,
  fetchCallReport,
  initialsOf,
  joinCallRoom,
  previewCallRoom,
  useGroupCall,
  type CallReport,
  type CallSeat,
  type RoomState,
} from "@/lib/group-call";
import { createSpeechInput, createSpeechOutput, takeSpeakablePhrases, type JurorTag } from "@/lib/voice";
import { useThesisT } from "@/lib/thesis-copy";

/** Silence that ends a spoken answer, as in the host's own rehearsal. */
const SILENCE_MS = 3_500;

/**
 * Where a classmate lands from the invitation link of a group defence.
 *
 * No account: they pick their name, allow the camera and microphone, and are
 * in the same room as the person who invited them — the same three jurors,
 * the same question on screen, the same clock. When it is their turn they
 * answer by voice (or typing), and the answer reaches the jury through the
 * host's device, which is where the interview runs.
 */
export function JoinCall() {
  const t = useThesisT();
  const { locale } = useLocale();
  const { roomId = "" } = useParams();
  const [preview, setPreview] = useState<{ hostName: string; members: string[]; full: boolean } | null | undefined>();
  /** Remembered for this tab, so a reload does not ask who you are again. */
  const remembered = `mockio.call.${roomId}`;
  const [name, setName] = useState(() => {
    try {
      return sessionStorage.getItem(remembered) ?? "";
    } catch {
      return "";
    }
  });
  const [joining, setJoining] = useState(false);
  const [problem, setProblem] = useState<"gone" | "full" | null>(null);
  const [seat, setSeat] = useState<CallSeat | null>(null);
  const [local, setLocal] = useState<MediaStream | null>(null);

  useEffect(() => {
    previewCallRoom(roomId)
      .then((found) => {
        setPreview(found);
        if (found.full) setProblem("full");
      })
      .catch(() => setPreview(null));
  }, [roomId]);

  // The camera and microphone go when the page does.
  useEffect(() => () => local?.getTracks().forEach((track) => track.stop()), [local]);

  const join = async () => {
    const chosen = name.trim();
    if (!chosen || joining) return;
    setJoining(true);
    // The click is the gesture browsers want before sound plays and the
    // audio graph starts.
    resumeAudio();
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch {
      // No camera, or refused: joining with the microphone alone still works,
      // and joining with neither still lets them watch and type.
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true } });
      } catch {
        stream = null;
      }
    }
    // Closed until they take the floor, as the host's is.
    stream?.getAudioTracks().forEach((track) => (track.enabled = false));
    try {
      setSeat(await joinCallRoom(roomId, chosen));
      setLocal(stream);
      try {
        sessionStorage.setItem(remembered, chosen);
      } catch {
        // Private mode: they type it again after a reload.
      }
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop());
      setProblem(error instanceof CallError && error.code === "roomFull" ? "full" : "gone");
    } finally {
      setJoining(false);
    }
  };

  /**
   * Sits back down after the server let this device go — the usual cause is
   * a phone put away mid-call, whose page stopped asking while hidden. Same
   * name, same camera, a new seat; the others' screens reconnect to it.
   */
  const rejoin = async () => {
    try {
      setSeat(await joinCallRoom(roomId, name.trim()));
    } catch (error) {
      local?.getTracks().forEach((track) => track.stop());
      setSeat(null);
      setProblem(error instanceof CallError && error.code === "roomFull" ? "full" : "gone");
    }
  };

  if (seat) {
    return (
      <InCall
        key={seat.participantId}
        seat={seat}
        name={name.trim()}
        local={local}
        hostName={preview?.hostName ?? ""}
        onDropped={() => void rejoin()}
      />
    );
  }

  const others = (preview?.members ?? []).filter((member) => member !== preview?.hostName);

  return (
    <AuthLayout>
      {preview === undefined ? (
        <p aria-busy="true" className="text-sm text-cream-dim">
          …
        </p>
      ) : preview === null || problem === "gone" ? (
        <p className="text-base text-cream-bright">{t("joinGone")}</p>
      ) : problem === "full" ? (
        <p className="text-base text-cream-bright">{t("joinFull")}</p>
      ) : (
        <div className="flex flex-col gap-5">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent-soft text-accent-text">
            <Users className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-cream-bright">
              {t("joinTitle", { host: preview.hostName })}
            </h1>
            <p className="mt-2 text-base text-cream-dim">{t("joinBody", { host: preview.hostName })}</p>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-semibold text-cream-bright">{t("joinWho")}</legend>
            {others.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {others.map((member) => (
                  <button
                    key={member}
                    type="button"
                    aria-pressed={name === member}
                    onClick={() => setName(member)}
                    className={`focus-ring rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-150 ease-press ${
                      name === member ? "bg-accent text-accent-ink" : "bg-surface-lift text-cream-bright"
                    }`}
                  >
                    {member}
                  </button>
                ))}
              </div>
            )}
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("joinName")}
              maxLength={60}
              autoComplete="name"
              className="focus-ring rounded-xl bg-surface-lift px-4 py-3 text-base text-cream-bright placeholder:text-cream-faint"
            />
          </fieldset>

          <div className="flex flex-col gap-2">
            <Action onClick={() => void join()} disabled={!name.trim() || joining}>
              {t("joinCta")}
            </Action>
            <p className="text-sm text-cream-faint">{t("joinPermission")}</p>
            {/* They join without an account, so this is where they meet the
                terms — the account holder's sign-up screen never reached them. */}
            <p className="text-xs leading-relaxed text-cream-faint">
              {t("joinAccept")}{" "}
              <Link to="/terms" className="focus-ring rounded underline underline-offset-4 hover:text-cream-bright">
                {termsFor(legalLocale(locale)).title}
              </Link>{" "}
              {t("joinAnd")}{" "}
              <Link to="/privacy" className="focus-ring rounded underline underline-offset-4 hover:text-cream-bright">
                {privacyFor(legalLocale(locale)).title}
              </Link>
              .
            </p>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}

function InCall({
  seat,
  name,
  local,
  hostName,
  onDropped,
}: {
  seat: CallSeat;
  name: string;
  local: MediaStream | null;
  hostName: string;
  onDropped: () => void;
}) {
  const t = useThesisT();
  const [room, setRoom] = useState<RoomState | null>(null);
  const tracks = useMemo(() => local?.getTracks() ?? [], [local]);
  const call = useGroupCall({ seat, tracks, onState: setRoom });

  const [listening, setListening] = useState(false);
  const [caption, setCaption] = useState("");
  const [typed, setTyped] = useState("");
  const [sent, setSent] = useState(false);
  const input = useMemo(() => createSpeechInput(room?.bcp47 ?? "es-PE"), [room?.bcp47]);
  const hush = useRef(0);

  // The microphone the others hear is open exactly while answering.
  useEffect(() => {
    local?.getAudioTracks().forEach((track) => (track.enabled = listening));
  }, [local, listening]);

  const floorOpen = Boolean(room && room.floorSince !== null && !room.complete);
  const someoneElse = room?.answering && room.answering !== seat.participantId ? room.answering : null;

  const deliver = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    call.say(trimmed);
    setSent(true);
    window.setTimeout(() => setSent(false), 2500);
  };

  const startAnswer = () => {
    if (!input.supported || listening) return;
    setCaption("");
    setListening(true);
    input.start({
      onInterim: (text) => {
        setCaption(text);
        window.clearTimeout(hush.current);
        if (text.trim() !== "") hush.current = window.setTimeout(() => input.stop(), SILENCE_MS);
      },
      onFinal: (text) => {
        window.clearTimeout(hush.current);
        setListening(false);
        deliver(text);
      },
      onError: () => {
        window.clearTimeout(hush.current);
        setListening(false);
      },
    });
  };
  const stopAnswer = () => {
    window.clearTimeout(hush.current);
    input.stop();
  };
  useEffect(() => () => input.stop(), [input]);

  /**
   * The jury's voice. Normally it arrives with the host's call audio; when the
   * host's device cannot pass it on (the browser voice, or Safari), it is read
   * here instead, once each question is complete.
   */
  const spoken = useRef("");
  const output = useMemo(() => createSpeechOutput(room?.bcp47 ?? "es-PE"), [room?.bcp47]);
  useEffect(() => {
    if (!room || room.juryAudio || room.floorSince === null || !room.turnText) return;
    if (spoken.current === room.turnText) return;
    spoken.current = room.turnText;
    const { phrases, rest } = takeSpeakablePhrases(`${room.turnText} `);
    void (async () => {
      for (const phrase of [...phrases, rest]) if (phrase.trim()) await output.speak(phrase.trim());
    })();
  }, [room, output]);

  const jury: JurorSeat[] | undefined = room
    ? (Object.keys(room.jurors) as JurorTag[]).map((tag) => ({
        tag,
        name: room.jurors[tag].name,
        title: room.jurors[tag].title,
        initials: initialsOf(room.jurors[tag].name),
      }))
    : undefined;

  const answeringName = someoneElse ? call.participants.find((entry) => entry.id === someoneElse)?.name : null;

  // Let go, not ended: take a new seat rather than show the end.
  const dropped = call.gone === "seat";
  useEffect(() => {
    if (dropped) onDropped();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropped]);

  if (call.gone === "room" || room?.complete) {
    return <CallEnded seat={seat} name={name} hostName={hostName} local={local} />;
  }

  return (
    <main className="flex min-h-dvh flex-col gap-3 bg-surface-deep px-4 py-4 sm:gap-4 sm:px-6 sm:py-6">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight text-cream-bright sm:text-2xl">
            {room?.university ?? hostName}
          </h1>
          {answeringName && <p className="text-sm text-cream-dim">{t("answeringNow", { name: answeringName })}</p>}
        </div>
        <button
          type="button"
          onClick={() => {
            local?.getTracks().forEach((track) => track.stop());
            window.location.assign("/");
          }}
          className="focus-ring inline-flex shrink-0 items-center gap-2 rounded-full bg-surface-lift px-4 py-2 text-sm font-semibold text-cream-bright"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">{t("leaveCall")}</span>
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        <CallStage
          initials="…"
          name=""
          title=""
          speaking={room?.juryTalking ?? false}
          voiceLevel={() => 0}
          voiceMeasured={() => false}
          cameraStream={local?.getVideoTracks().length ? local : null}
          cameraError={null}
          screenStream={null}
          status={room?.status ?? t("joinWaitingHost", { host: hostName })}
          caption={caption}
          listening={listening}
          turnText={room?.turnText || undefined}
          jury={jury ?? []}
          activeJuror={room?.juror ?? null}
          selfName={name}
          selfAnswering={listening}
          selfMuted={!listening}
          people={call.participants.map((person) => ({
            id: person.id,
            name: person.name,
            stream: call.remotes[person.id] ?? null,
            answering: room?.answering === person.id,
            // The host's connection carries the jury's voice too.
            listenFor: person.role !== "host" || !room?.juryTalking,
          }))}
        />
      </div>

      <p className="hidden min-h-[3.5rem] text-[clamp(1rem,1.6vw,1.5rem)] leading-snug text-cream-bright sm:block" aria-live="polite">
        {room?.turnText || <span className="text-cream-faint">{t("joinWaitingHost", { host: hostName })}</span>}
      </p>

      {room && room.floorSince !== null && (
        <DefenseClock since={room.floorSince} limitSeconds={room.floorSeconds} label={room.floorLabel} />
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {input.supported ? (
          <button
            type="button"
            disabled={!floorOpen && !listening}
            onClick={listening ? stopAnswer : startAnswer}
            className={`focus-ring inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-base font-semibold transition-transform duration-150 ease-press active:scale-[0.97] disabled:opacity-40 ${
              listening ? "bg-cream-bright text-surface-base" : "bg-grow text-surface-base"
            }`}
          >
            <Mic className="h-5 w-5" aria-hidden />
            {listening ? t("answerSend") : t("answerCta")}
          </button>
        ) : (
          <p className="text-sm text-cream-dim">{t("answerNoVoice")}</p>
        )}
        <form
          className="flex flex-1 items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            deliver(typed);
            setTyped("");
          }}
        >
          <input
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            disabled={!floorOpen}
            placeholder={t("answerType")}
            className="focus-ring min-w-0 flex-1 rounded-full bg-surface-lift px-4 py-3 text-base text-cream-bright placeholder:text-cream-faint disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={!floorOpen || !typed.trim()}
            aria-label={t("answerSend")}
            className="focus-ring grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent text-accent-ink disabled:opacity-40"
          >
            <Send className="h-5 w-5" aria-hidden />
          </button>
        </form>
      </div>
      {sent && (
        <p className="text-sm text-grow-text" aria-live="polite">
          {t("answerSent")}
        </p>
      )}
    </main>
  );
}

/** How long the end screen waits for the jury's report before giving up. */
const REPORT_WAIT_MS = 10 * 60 * 1000;
const REPORT_POLL_MS = 4_000;

/**
 * The end of a group defence, for a member who joined from the link.
 *
 * The report is written on the host's device once the call ends, and the
 * member has no account to find it in later. So this screen waits for it —
 * the jury "deliberating", which is what is actually happening — and then
 * shows their own grade and the jury's words about them first, with the
 * whole record underneath. If it never arrives (the host closed the tab
 * before the report was written), it says who to ask.
 */
function CallEnded({
  seat,
  name,
  hostName,
  local,
}: {
  seat: CallSeat;
  name: string;
  hostName: string;
  local: MediaStream | null;
}) {
  const t = useThesisT();
  const [report, setReport] = useState<CallReport | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  // The call is over: the camera light goes off.
  useEffect(() => {
    local?.getTracks().forEach((track) => track.stop());
  }, [local]);

  useEffect(() => {
    let stopped = false;
    let timer = 0;
    const started = Date.now();
    const ask = async () => {
      try {
        const found = await fetchCallReport(seat);
        if (stopped) return;
        if (found.ready) {
          setReport(found);
          return;
        }
      } catch (error) {
        if (stopped) return;
        if (error instanceof CallError && (error.status === 404 || error.status === 403)) {
          setUnavailable(true);
          return;
        }
      }
      if (Date.now() - started > REPORT_WAIT_MS) {
        setUnavailable(true);
        return;
      }
      timer = window.setTimeout(ask, REPORT_POLL_MS);
    };
    void ask();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [seat]);

  if (report?.ready) {
    const member = report.acta.members?.find((entry) => entry.name === name) ?? null;
    const grade = (value: number) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value);
    return (
      <main className="min-h-dvh bg-surface-deep px-4 py-8 sm:px-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          <h1 className="text-2xl font-semibold tracking-tight text-cream-bright sm:text-3xl">
            {t("sharedDefenseTitle", { university: report.university })}
          </h1>
          {member && (
            <Panel variant="raised" className="flex gap-4 p-6 sm:p-8">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-accent text-2xl font-bold tabular-nums text-accent-ink">
                {grade(member.grade)}
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-cream-bright">{t("sharedYourPart", { name: member.name })}</h2>
                <p className="mt-1 text-base leading-relaxed text-cream">{member.feedback}</p>
              </div>
            </Panel>
          )}
          <ActaCard acta={report.acta} publicView {...(member ? { highlight: member.name } : {})} />
        </div>
      </main>
    );
  }

  return (
    <AuthLayout>
      <div className="flex flex-col gap-3" aria-live="polite">
        <p className="text-base font-semibold text-cream-bright">{t("callEnded", { host: hostName })}</p>
        {unavailable ? (
          <p className="text-sm text-cream-dim">{t("reportUnavailable", { host: hostName })}</p>
        ) : (
          <p className="flex items-center gap-2 text-sm text-cream-dim">
            <span aria-hidden className="h-2 w-2 animate-pulse rounded-full bg-accent" />
            {t("reportWaiting")}
          </p>
        )}
      </div>
    </AuthLayout>
  );
}
