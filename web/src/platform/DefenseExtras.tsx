/**
 * What the paid defence adds around the rehearsal: the real jury, the plan to
 * the date, the real questions, the observations, the teacher, the gift link,
 * the readiness report, the replay and the look at the full panel.
 *
 * Each is a card a section of the thesis workspace places where it is used.
 * They share one read of the student's allowance, so opening a section does
 * not cost a request per card.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import SpringCheck from "@/components/bits/SpringCheck";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Check,
  Copy,
  Download,
  FileText,
  Gift,
  Lock,
  MessageCircle,
  PlayCircle,
  Trash2,
  Users,
  Video,
} from "lucide-react";
import { Action, Panel, DisclosureMark } from "@/design-system";
import {
  analyzeObservations,
  ApiError,
  buyDefensePack,
  clearObservations,
  countRealQuestions,
  fetchGiftLink,
  fetchThesis,
  markObservation,
  requestMentor,
  saveJury,
} from "@/lib/api";
import type {
  DefenseAllowance,
  DefenseProgressPoint,
  JurorSeat,
  PackOfferDetail,
  RealJuror,
  StoredThesis,
} from "@/lib/api";
import { useThesisT, type ThesisKey } from "@/lib/thesis-copy";
import { buildPlan, daysBetween, localToday, type PlanTask } from "@/lib/defense-plan";
import { deleteRecording, loadRecording, type StoredRecording } from "@/lib/recordings";
import type { Evaluation } from "@/lib/evaluation";
import { thesisPath } from "@/lib/spaces";
import { useLocale } from "@/hooks/useLocale";

/* ------------------------------------------------------------------------- */
/* The allowance, read once                                                  */
/* ------------------------------------------------------------------------- */

interface Status {
  allowance: DefenseAllowance;
  offers: PackOfferDetail[];
  progress: DefenseProgressPoint[];
  payments: boolean;
}

let cached: { at: number; value: Promise<Status> } | null = null;

/** The allowance and offers, shared by every card on the screen for a minute. */
export function useDefenseStatus(): Status | null {
  const [status, setStatus] = useState<Status | null>(null);
  useEffect(() => {
    if (!cached || Date.now() - cached.at > 60_000) {
      cached = {
        at: Date.now(),
        value: fetchThesis().then((result) => ({
          allowance: result.allowance ?? { credits: 0, freeLeft: 0 },
          offers: result.offers ?? [],
          progress: result.progress ?? [],
          payments: result.pack?.available ?? false,
        })),
      };
      cached.value.catch(() => {
        cached = null;
      });
    }
    let alive = true;
    cached.value.then((value) => alive && setStatus(value)).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return status;
}

/** Forgets the shared read, after a purchase or anything that changes it. */
export function refreshDefenseStatus() {
  cached = null;
}

const card = "flex flex-col gap-4 p-5 sm:p-6";
const field =
  "focus-ring w-full rounded-xl bg-surface-lift px-3 py-2.5 text-sm text-cream-bright placeholder:text-cream-faint";
const label = "flex min-w-0 flex-col gap-1 text-xs font-semibold text-cream-dim";

function CardHead({ icon: Icon, title, body }: { icon: typeof Lock; title: string; body?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-text">
        <Icon aria-hidden className="h-[1.125rem] w-[1.125rem]" />
      </span>
      <div className="min-w-0">
        <h2 className="text-lg font-semibold tracking-[-0.01em] text-cream-bright">{title}</h2>
        {body && <p className="mt-1 text-pretty text-sm leading-relaxed text-cream-dim">{body}</p>}
      </div>
    </div>
  );
}

function LockedNote({ children }: { children: string }) {
  return (
    <p className="flex items-center gap-2 rounded-xl bg-surface-lift px-3 py-2 text-sm text-cream-dim">
      <Lock aria-hidden className="h-4 w-4 shrink-0" />
      {children}
    </p>
  );
}

function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-xl bg-step-soft px-3 py-2 text-sm text-step-text">
      {error}
    </p>
  );
}

const message = (caught: unknown, fallback: string) => (caught instanceof ApiError ? caught.message : fallback);

/* ------------------------------------------------------------------------- */
/* 1. The real jury                                                          */
/* ------------------------------------------------------------------------- */

const SEATS: { seat: JurorSeat; key: ThesisKey }[] = [
  { seat: "presidente", key: "jurySeatPresidente" },
  { seat: "metodologo", key: "jurySeatMetodologo" },
  { seat: "especialista", key: "jurySeatEspecialista" },
];

export function RealJuryCard({
  thesis,
  onChange,
}: {
  thesis: StoredThesis;
  onChange: (next: StoredThesis) => void;
}) {
  const t = useThesisT();
  const saved = thesis.jury ?? [];
  const [draft, setDraft] = useState<RealJuror[]>(() =>
    SEATS.map(({ seat }) => saved.find((juror) => juror.seat === seat) ?? { seat, name: "", specialty: "", notes: "" }),
  );
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const named = saved.filter((juror) => juror.name.trim() !== "");

  const update = (seat: JurorSeat, key: keyof RealJuror, value: string) =>
    setDraft((current) => current.map((juror) => (juror.seat === seat ? { ...juror, [key]: value } : juror)));

  const save = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await saveJury(draft.filter((juror) => juror.name.trim() !== ""));
      onChange(result.thesis);
      setNotice(t("jurySaved"));
    } catch (caught) {
      setError(message(caught, t("error")));
    } finally {
      setBusy(false);
    }
  };

  return (
    <details className="group rounded-card bg-surface-raised shadow-card" open={false}>
      <summary className="focus-ring flex cursor-pointer list-none items-center gap-3 rounded-card p-5 sm:p-6">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-text">
          <Users aria-hidden className="h-[1.125rem] w-[1.125rem]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-semibold tracking-[-0.01em] text-cream-bright">{t("juryTitle")}</span>
          <span className="block text-sm text-cream-dim">
            {named.length > 0
              ? t("juryActive", { names: named.map((juror) => juror.name).join(", ") })
              : t("juryBody")}
          </span>
        </span>
        <DisclosureMark label={named.length > 0 ? t("juryEdit") : t("juryOpen")} openLabel={t("discClose")} />
      </summary>
      <div className="flex flex-col gap-4 px-5 pb-5 sm:px-6 sm:pb-6">
        <div className="grid gap-3 lg:grid-cols-3">
          {SEATS.map(({ seat, key }) => {
            const juror = draft.find((entry) => entry.seat === seat)!;
            return (
              <fieldset key={seat} className="flex min-w-0 flex-col gap-2 rounded-2xl bg-surface-card p-3 shadow-card">
                <legend className="sr-only">{t(key)}</legend>
                <p aria-hidden className="text-xs font-semibold text-accent-text">
                  {t(key)}
                </p>
                <input
                  value={juror.name}
                  onChange={(event) => update(seat, "name", event.target.value)}
                  placeholder={t("juryName")}
                  aria-label={`${t(key)} · ${t("juryName")}`}
                  maxLength={80}
                  className={field}
                />
                <input
                  value={juror.specialty}
                  onChange={(event) => update(seat, "specialty", event.target.value)}
                  placeholder={t("jurySpecialty")}
                  aria-label={`${t(key)} · ${t("jurySpecialty")}`}
                  maxLength={160}
                  className={field}
                />
                <textarea
                  value={juror.notes}
                  onChange={(event) => update(seat, "notes", event.target.value)}
                  placeholder={t("juryNotes")}
                  aria-label={`${t(key)} · ${t("juryNotes")}`}
                  rows={3}
                  maxLength={4000}
                  className={`${field} resize-y`}
                />
              </fieldset>
            );
          })}
        </div>
        <p className="text-xs text-cream-dim">{t("juryNoInvent")}</p>
        <ErrorNote error={error} />
        <div className="flex flex-wrap items-center gap-3">
          <Action tone="neutral" disabled={busy} onClick={() => void save()}>
            {t("jurySave")}
          </Action>
          {notice && <span className="text-sm text-grow-text">{notice}</span>}
        </div>
      </div>
    </details>
  );
}

/* ------------------------------------------------------------------------- */
/* 2. The plan to D-day                                                      */
/* ------------------------------------------------------------------------- */

function taskText(task: PlanTask, t: ReturnType<typeof useThesisT>): string {
  switch (task.kind) {
    case "diagnosis":
      return t("planDiagnosis");
    case "first-rehearsal":
      return t("planFirstRehearsal");
    case "risk":
      return t("planRisk", { question: task.question }) + (task.page ? ` (p. ${task.page})` : "");
    case "slides":
      return t("planSlides");
    case "study":
      return t("planStudy");
    case "demanding":
      return t("planDemanding");
    case "short":
      return t("planShort");
    case "real-questions":
      return t("planRealQuestions");
    case "rest":
      return t("planRest");
  }
}

function taskLink(task: PlanTask): string {
  switch (task.kind) {
    case "diagnosis":
    case "risk":
      return thesisPath("diagnostico");
    case "slides":
      return thesisPath("diapositivas");
    case "study":
    case "real-questions":
      return thesisPath("repaso");
    default:
      return thesisPath("ensayar");
  }
}

const PLAN_DONE_KEY = "mockio.planDone";

function readDone(): string[] {
  try {
    return JSON.parse(localStorage.getItem(PLAN_DONE_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function DefensePlanCard({ thesis }: { thesis: StoredThesis }) {
  const t = useThesisT();
  const { locale } = useLocale();
  const status = useDefenseStatus();
  const today = localToday();
  const [done, setDone] = useState<string[]>(readDone);
  const [all, setAll] = useState(false);
  const date = thesis.defenseDate ?? null;
  const plan = useMemo(
    () =>
      date
        ? buildPlan({
            today,
            defenseDate: date,
            risks: thesis.analysis.risks,
            hasSlides: Boolean(thesis.slides),
            hasStudy: Boolean(thesis.study),
            rehearsals: status?.progress.length ?? 0,
          })
        : [],
    [date, today, thesis, status?.progress.length],
  );
  if (!date) return null;
  const left = daysBetween(today, date);
  if (left < 0) return null;

  const toggle = (key: string) => {
    setDone((current) => {
      const next = current.includes(key) ? current.filter((entry) => entry !== key) : [...current, key].slice(-60);
      try {
        localStorage.setItem(PLAN_DONE_KEY, JSON.stringify(next));
      } catch {
        // Private mode: ticks last for this visit.
      }
      return next;
    });
  };

  const shown = all ? plan : plan.slice(0, 3);
  const weekday = (value: string) =>
    new Date(`${value}T12:00:00`).toLocaleDateString(locale, { weekday: "short", day: "numeric" });

  return (
    <Panel variant="raised" className={card}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <CardHead icon={CalendarDays} title={t("planTitle")} />
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold tabular-nums ${
            left <= 1 ? "bg-step-soft text-step-text" : "bg-accent-soft text-accent-text"
          }`}
        >
          {left === 0 ? t("planDayOf") : left === 1 ? t("planTomorrow") : t("planDaysLeft", { count: left })}
        </span>
      </div>

      {left === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-cream">{t("planDayOfBody")}</p>
          <Link to="/app/thesis/warmup">
            <Action withArrow>{t("planWarmup")}</Action>
          </Link>
        </div>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {shown.map((day, index) => {
            const key = `${date}:${day.date}`;
            const isDone = done.includes(key);
            const isToday = index === 0;
            return (
              <li
                key={day.date}
                className={`flex items-start gap-3 rounded-2xl px-3 py-2.5 ${isToday ? "bg-surface-card shadow-card" : ""}`}
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isDone}
                  aria-label={taskText(day.task, t)}
                  onClick={() => toggle(key)}
                  className={`focus-ring mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-[background-color,border-color,transform] duration-150 ease-press active:scale-[0.9] ${
                    isDone ? "border-grow bg-grow text-white" : "border-cream-faint/60"
                  }`}
                >
                  {isDone && <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={3} />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold tabular-nums text-cream-dim">
                    {isToday ? t("planToday") : weekday(day.date)}
                  </p>
                  <p className={`text-pretty text-sm ${isDone ? "text-cream-faint line-through" : "text-cream-bright"}`}>
                    {taskText(day.task, t)}
                  </p>
                </div>
                {isToday && !isDone && (
                  <Link
                    to={taskLink(day.task)}
                    className="focus-ring shrink-0 rounded-full bg-surface-lift px-3 py-1 text-xs font-semibold text-cream-bright transition-[background-color,transform] duration-150 ease-press hover:bg-cream/15 active:scale-[0.97]"
                  >
                    {t("planOpen")}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {!all && plan.length > shown.length && (
        <button
          type="button"
          onClick={() => setAll(true)}
          className="focus-ring self-start rounded-full text-sm font-semibold text-accent-text underline decoration-accent-text/40 underline-offset-4"
        >
          {t("planMoreDays", { count: plan.length - shown.length })}
        </button>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------------- */
/* 3. Real questions from the university                                     */
/* ------------------------------------------------------------------------- */

export function RealQuestionsCard() {
  const t = useThesisT();
  const [university, setUniversity] = useState(() => {
    try {
      return localStorage.getItem("mockio.university") ?? "";
    } catch {
      return "";
    }
  });
  const [result, setResult] = useState<Awaited<ReturnType<typeof countRealQuestions>> | null>(null);

  useEffect(() => {
    const name = university.trim();
    if (name.length < 4) {
      setResult(null);
      return;
    }
    const id = window.setTimeout(() => {
      countRealQuestions(name)
        .then(setResult)
        .catch(() => setResult(null));
    }, 400);
    return () => window.clearTimeout(id);
  }, [university]);

  return (
    <Panel variant="raised" className={card}>
      <CardHead icon={MessageCircle} title={t("realTitle")} body={t("realBody")} />
      <label className={label}>
        {t("university")}
        <input
          value={university}
          onChange={(event) => setUniversity(event.target.value)}
          onBlur={() => {
            try {
              if (university.trim()) localStorage.setItem("mockio.university", university.trim());
            } catch {
              // Private mode: typed again next time.
            }
          }}
          placeholder={t("universityPlaceholder")}
          maxLength={120}
          className={field}
        />
      </label>
      {!result ? (
        <p className="text-sm text-cream-dim">{t("realUniversityHint")}</p>
      ) : result.verified === 0 ? (
        <p className="text-sm text-cream-dim">{t("realNone")}</p>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-grow-soft px-3 py-1 font-semibold text-grow-text">
              {t("realCount", { count: result.verified })}
            </span>
            {result.sameField > 0 && (
              <span className="rounded-full bg-accent-soft px-3 py-1 font-semibold text-accent-text">
                {t("realSameField", { count: result.sameField })}
              </span>
            )}
          </p>
          {result.locked ? (
            <>
              {/* Shapes of questions rather than their text: what is locked
                  is not in the page at all. */}
              <ul aria-hidden className="flex flex-col gap-2">
                {Array.from({ length: Math.min(3, result.verified) }, (_, index) => (
                  <li key={index} className="rounded-2xl bg-surface-card p-3 shadow-card">
                    <span className="block h-3 w-11/12 rounded-full bg-cream-faint/25 blur-[2px]" />
                    <span className="mt-2 block h-3 w-2/3 rounded-full bg-cream-faint/25 blur-[2px]" />
                  </li>
                ))}
              </ul>
              <LockedNote>{t("realLocked")}</LockedNote>
            </>
          ) : (
            <ul className="flex flex-col gap-2">
              {result.questions.map((entry, index) => (
                <li key={index} className="flex flex-col gap-1 rounded-2xl bg-surface-card p-3 text-sm text-cream-bright shadow-card">
                  {entry.sameField && (
                    <span className="self-start rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-text">
                      {t("realYourField")}
                    </span>
                  )}
                  “{entry.question}”
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------------- */
/* 4. The observations                                                       */
/* ------------------------------------------------------------------------- */

const KIND_LABEL: Record<NonNullable<StoredThesis["observations"]>["items"][number]["kind"], ThesisKey> = {
  forma: "obsKindForma",
  fondo: "obsKindFondo",
  metodologia: "obsKindMetodologia",
  redaccion: "obsKindRedaccion",
  bibliografia: "obsKindBibliografia",
};
const EFFORT_LABEL: Record<"bajo" | "medio" | "alto", ThesisKey> = {
  bajo: "obsEffortBajo",
  medio: "obsEffortMedio",
  alto: "obsEffortAlto",
};

export function ObservationsSection({
  thesis,
  onChange,
}: {
  thesis: StoredThesis;
  onChange: (next: StoredThesis) => void;
}) {
  const t = useThesisT();
  const navigate = useNavigate();
  const status = useDefenseStatus();
  const paid = status?.allowance.paid === true;
  const modes = status?.allowance.modes === true;
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saved = thesis.observations ?? null;
  const total = saved?.items.length ?? 0;
  const doneCount = saved?.items.filter((item) => item.done).length ?? 0;

  const run = async (action: () => Promise<{ thesis: StoredThesis }>) => {
    setBusy(true);
    setError(null);
    try {
      onChange((await action()).thesis);
    } catch (caught) {
      setError(message(caught, t("error")));
    } finally {
      setBusy(false);
    }
  };

  const rehearse = () => {
    const material = (saved?.items ?? []).map((item, index) => `${index + 1}. ${item.observation}`).join("\n");
    navigate(thesisPath("ensayar"), { state: { focus: "observaciones", material } });
  };

  return (
    <div className="flex flex-col gap-4">
      <Panel variant="raised" className={card}>
        <CardHead icon={FileText} title={t("obsTitle")} body={t("obsBody")} />
        {!saved && (
          <>
            {!paid && status && <LockedNote>{t("obsLocked")}</LockedNote>}
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={7}
              maxLength={20_000}
              placeholder={t("obsPlaceholder")}
              disabled={!paid || busy}
              className={`${field} resize-y disabled:opacity-60`}
            />
            <ErrorNote error={error} />
            <div className="flex flex-wrap items-center gap-3">
              <Action disabled={!paid || busy || text.trim().length < 40} onClick={() => void run(() => analyzeObservations(text))}>
                {t("obsAnalyze")}
              </Action>
              {busy && <span className="text-sm text-cream-dim">{t("obsAnalyzing")}</span>}
              {!paid && status && (
                <Link to={thesisPath("ensayar")} className="text-sm font-semibold text-accent-text underline underline-offset-4">
                  {t("teaserCta")}
                </Link>
              )}
            </div>
          </>
        )}
        {saved && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-cream-bright">{t("obsProgress", { done: doneCount, total })}</span>
              <span className="h-1.5 w-32 overflow-hidden rounded-full bg-surface-lift" aria-hidden>
                <span
                  className="block h-full w-full origin-left rounded-full bg-grow transition-transform duration-200 ease-press"
                  style={{ transform: `scaleX(${total ? doneCount / total : 0})` }}
                />
              </span>
            </div>
            {doneCount === total && total > 0 && (
              <p className="rounded-xl bg-grow-soft px-3 py-2 text-sm text-grow-text">{t("obsAllDone")}</p>
            )}
          </div>
        )}
      </Panel>

      {saved && (
        <>
          <ol className="flex flex-col gap-2">
            {saved.items.map((item, index) => (
              <li key={index}>
                <details className="group rounded-2xl bg-surface-card shadow-card">
                  <summary className="focus-ring flex cursor-pointer list-none items-start gap-3 rounded-2xl p-3.5">
                    {/* The tick springs in: closing an observation is the
                        progress this screen exists for, so it gets a beat. The
                        wrapper keeps the click from also opening the row. */}
                    <span className="mt-0.5 shrink-0" onClick={(event) => event.preventDefault()}>
                      <SpringCheck
                        checked={item.done}
                        onChange={(next) => void run(() => markObservation(index, next))}
                        disabled={busy}
                        ariaLabel={item.observation}
                        boxSize={20}
                        boxRadius={6}
                        strike="none"
                        color="rgb(var(--cream) / 0.65)"
                        fillColor="rgb(var(--grow))"
                        checkColor="#ffffff"
                        className="!min-h-0"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm ${item.done ? "text-cream-faint line-through" : "text-cream-bright"}`}>
                        {item.observation}
                      </span>
                      <span className="mt-1 flex flex-wrap gap-1.5 text-xs">
                        <span className="rounded-full bg-surface-lift px-2 py-0.5 text-cream-dim">{t(KIND_LABEL[item.kind])}</span>
                        <span className="rounded-full bg-surface-lift px-2 py-0.5 text-cream-dim">{t(EFFORT_LABEL[item.effort])}</span>
                        <span className="rounded-full bg-surface-lift px-2 py-0.5 text-cream-dim">
                          {item.where}
                          {item.page ? ` · p. ${item.page}` : ""}
                        </span>
                      </span>
                    </span>
                    <DisclosureMark className="-my-1" />
                  </summary>
                  <p className="mx-3.5 mb-3.5 rounded-xl bg-surface-lift px-3 py-2.5 text-sm text-cream">
                    <span className="font-semibold">{t("obsHow")}: </span>
                    {item.how}
                  </p>
                </details>
              </li>
            ))}
          </ol>
          <ErrorNote error={error} />
          <div className="flex flex-wrap items-center gap-3">
            <Action withArrow disabled={!modes} onClick={rehearse}>
              {t("obsRehearse")}
            </Action>
            {!modes && <span className="text-xs text-cream-dim">{t("obsRehearseNeedsModes")}</span>}
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(clearObservations)}
              className="focus-ring rounded-full px-3 py-1.5 text-sm text-cream-dim transition-[color,transform] duration-150 ease-press hover:text-cream-bright active:scale-[0.97]"
            >
              {t("obsReset")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* 5. A real teacher                                                         */
/* ------------------------------------------------------------------------- */

export function MentorCard({ thesis, onChange }: { thesis: StoredThesis; onChange: (next: StoredThesis) => void }) {
  const t = useThesisT();
  const { locale } = useLocale();
  const status = useDefenseStatus();
  const [availability, setAvailability] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!status) return null;
  const offer = status.offers.find((entry) => entry.kind === "docente");
  const included = status.allowance.mentor === true;
  if (!included && (!offer || !status.payments)) return null;

  const money = (amount: number, currency: string) =>
    new Intl.NumberFormat(currency === "PEN" ? "es-PE" : undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      onChange((await requestMentor({ availability, phone, note })).thesis);
    } catch (caught) {
      setError(message(caught, t("error")));
    } finally {
      setBusy(false);
    }
  };

  const buy = async () => {
    setBusy(true);
    setError(null);
    try {
      refreshDefenseStatus();
      window.location.assign((await buyDefensePack("docente")).initPoint);
    } catch (caught) {
      setError(message(caught, t("error")));
      setBusy(false);
    }
  };

  return (
    <Panel variant="raised" className={card}>
      <CardHead icon={Video} title={t("mentorTitle")} body={included ? t("mentorBody") : t("mentorUpsell")} />
      {included && thesis.mentor ? (
        <p className="rounded-xl bg-grow-soft px-3 py-2 text-sm text-grow-text">
          {t("mentorRequested", { date: new Date(thesis.mentor.requestedAt).toLocaleDateString(locale) })}
        </p>
      ) : included ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={`${label} sm:col-span-2`}>
            {t("mentorAvailability")}
            <input value={availability} onChange={(event) => setAvailability(event.target.value)} maxLength={400} className={field} />
          </label>
          <label className={label}>
            {t("mentorPhone")}
            <input value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={30} inputMode="tel" className={field} />
          </label>
          <label className={label}>
            {t("mentorNote")}
            <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} className={field} />
          </label>
          <div className="sm:col-span-2">
            <Action disabled={busy || availability.trim().length < 4} onClick={() => void send()}>
              {t("mentorSend")}
            </Action>
          </div>
        </div>
      ) : (
        offer && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void buy()}
            className="focus-ring flex items-center justify-between gap-3 rounded-xl bg-surface-card px-4 py-3 text-left shadow-card transition-transform duration-150 ease-press active:scale-[0.98] disabled:opacity-60"
          >
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-cream-bright">{t("offerDocente")}</span>
              <span className="block text-xs text-cream-dim">{t("offerDocenteBody")}</span>
            </span>
            <span className="shrink-0 text-base font-bold tabular-nums text-cream-bright">{money(offer.amount, offer.currency)}</span>
          </button>
        )
      )}
      <ErrorNote error={error} />
    </Panel>
  );
}

/* ------------------------------------------------------------------------- */
/* 6. Someone else pays                                                      */
/* ------------------------------------------------------------------------- */

export function GiftCard({ compact = false }: { compact?: boolean }) {
  const t = useThesisT();
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setError(null);
    try {
      setUrl((await fetchGiftLink()).url);
    } catch (caught) {
      setError(message(caught, t("error")));
    }
  };

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_600);
    } catch {
      // No clipboard permission: the link is on screen to select.
    }
  };

  const body = (
    <>
      {url ? (
        <div className="flex flex-col gap-2">
          <p className="break-all rounded-xl bg-surface-lift px-3 py-2 font-mono text-xs text-cream-bright">{url}</p>
          <div className="flex flex-wrap gap-2">
            <Action tone="neutral" onClick={() => void copy()}>
              {copied ? <Check aria-hidden className="h-4 w-4" /> : <Copy aria-hidden className="h-4 w-4" />}
              {copied ? t("giftCopied") : t("giftCopy")}
            </Action>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${t("giftMessage")} ${url}`)}`}
              target="_blank"
              rel="noreferrer"
              className="focus-ring inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white transition-[filter,transform] duration-150 ease-press hover:brightness-105 active:scale-[0.97] sm:text-base"
            >
              <MessageCircle aria-hidden className="h-4 w-4" />
              {t("giftWhatsapp")}
            </a>
          </div>
        </div>
      ) : (
        <Action tone="neutral" onClick={() => void create()} className="self-start">
          <Gift aria-hidden className="h-4 w-4" />
          {t("giftCreate")}
        </Action>
      )}
      <ErrorNote error={error} />
    </>
  );

  if (compact) {
    return (
      <div className="flex flex-col gap-2 rounded-2xl bg-surface-lift p-3">
        <p className="text-sm font-semibold text-cream-bright">{t("giftTitle")}</p>
        <p className="text-xs text-cream-dim">{t("giftBody")}</p>
        {body}
      </div>
    );
  }
  return (
    <Panel variant="raised" className={card}>
      <CardHead icon={Gift} title={t("giftTitle")} body={t("giftBody")} />
      {body}
    </Panel>
  );
}

/* ------------------------------------------------------------------------- */
/* 7. The readiness report                                                   */
/* ------------------------------------------------------------------------- */

export function PreparationReportCard({ thesis }: { thesis: StoredThesis }) {
  const t = useThesisT();
  const { locale } = useLocale();
  const status = useDefenseStatus();
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!printing) return;
    document.documentElement.classList.add("print-report");
    const done = () => {
      document.documentElement.classList.remove("print-report");
      setPrinting(false);
    };
    window.addEventListener("afterprint", done, { once: true });
    // A frame for the portal to land before the dialog opens.
    const id = window.requestAnimationFrame(() => window.print());
    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener("afterprint", done);
      document.documentElement.classList.remove("print-report");
    };
  }, [printing]);

  const progress = status?.progress ?? [];
  const first = progress[0];
  const last = progress.at(-1);
  const order = { alta: 0, media: 1, baja: 2 };
  const risks = [...thesis.analysis.risks].sort((a, b) => order[a.severity] - order[b.severity]).slice(0, 5);
  const grade = (value: number) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value);

  return (
    <Panel variant="raised" className={card}>
      <CardHead icon={Download} title={t("reportTitle")} body={t("reportBody")} />
      <Action tone="neutral" className="self-start" disabled={!status} onClick={() => setPrinting(true)}>
        <Download aria-hidden className="h-4 w-4" />
        {t("reportDownload")}
      </Action>
      {printing &&
        createPortal(
          <div className="print-report-root hidden bg-white p-10 text-black">
            <p className="text-sm font-semibold">Mockio · {t("reportTitle")}</p>
            <h1 className="mt-3 text-2xl font-bold leading-tight">{thesis.analysis.title}</h1>
            <p className="mt-1 text-sm">{thesis.analysis.field}</p>
            <dl className="mt-6 grid grid-cols-3 gap-4 text-sm">
              <div>
                <dt className="font-semibold">{t("reportRehearsals")}</dt>
                <dd className="text-2xl font-bold">{progress.length}</dd>
              </div>
              <div>
                <dt className="font-semibold">{t("reportLatest")}</dt>
                <dd className="text-2xl font-bold">{last ? `${grade(last.grade)} / ${last.gradeMax}` : "—"}</dd>
              </div>
              <div>
                <dt className="font-semibold">{t("reportReadiness")}</dt>
                <dd className="text-2xl font-bold">{last ? `${last.readiness}%` : "—"}</dd>
                {first && last && progress.length > 1 && (
                  <dd className="text-xs">{t("reportFrom", { from: first.readiness, to: last.readiness })}</dd>
                )}
              </div>
            </dl>
            {!last && <p className="mt-4 text-sm">{t("reportNone")}</p>}
            {thesis.defenseDate && (
              <p className="mt-6 text-sm">
                <span className="font-semibold">{t("reportDate")}: </span>
                {new Date(`${thesis.defenseDate}T12:00:00`).toLocaleDateString(locale, { dateStyle: "long" })}
              </p>
            )}
            {progress.length > 1 && (
              <div className="mt-6 flex h-24 items-end gap-2">
                {progress.map((point) => (
                  <div key={point.id} className="flex flex-1 flex-col items-center gap-1 text-xs">
                    {grade(point.grade)}
                    <span className="block w-full bg-black" style={{ height: `${Math.max(6, (point.grade / point.gradeMax) * 70)}px` }} />
                  </div>
                ))}
              </div>
            )}
            <h2 className="mt-8 text-base font-semibold">{t("reportRisks")}</h2>
            <ul className="mt-2 list-disc pl-5 text-sm">
              {risks.map((risk, index) => (
                <li key={index}>
                  {risk.issue}
                  {risk.page ? ` (p. ${risk.page})` : ""}
                </li>
              ))}
            </ul>
            <p className="mt-10 text-xs">{t("reportFooter", { date: new Date().toLocaleDateString(locale) })}</p>
          </div>,
          document.body,
        )}
    </Panel>
  );
}

/* ------------------------------------------------------------------------- */
/* 8. The replay                                                             */
/* ------------------------------------------------------------------------- */

export function RehearsalReplay({ sessionId, evaluation }: { sessionId: string; evaluation: Evaluation }) {
  const t = useThesisT();
  const [recording, setRecording] = useState<StoredRecording | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let alive = true;
    let url: string | null = null;
    // The film is written as the panel closes, a moment before this screen
    // asks; a second look catches it.
    const read = (attempt: number) =>
      loadRecording(sessionId).then((found) => {
        if (!alive) return;
        if (!found && attempt < 3) {
          window.setTimeout(() => void read(attempt + 1), 1_200);
          return;
        }
        if (!found) return;
        url = URL.createObjectURL(found.blob);
        setRecording(found);
        setSrc(url);
      });
    void read(0);
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [sessionId]);

  if (!recording || !src) return null;

  // The panel's verdicts, in the order the questions were asked.
  const verdicts = (evaluation.answer_feedback ?? []).map((entry) => entry.verdict);
  let asked = 0;
  const chapters = recording.marks.map((mark) => {
    const verdict = mark.question === null ? null : (verdicts[asked++] ?? null);
    return { ...mark, verdict };
  });
  const clock = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  };

  return (
    <Panel variant="raised" className={card}>
      <CardHead icon={PlayCircle} title={t("replayTitle")} body={t("replayBody")} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <video ref={video} src={src} controls playsInline className="aspect-video w-full rounded-2xl bg-black" />
        <ol className="flex max-h-80 flex-col gap-1.5 overflow-y-auto pr-1">
          {chapters.map((chapter, index) => (
            <li key={index}>
              <button
                type="button"
                onClick={() => {
                  if (!video.current) return;
                  video.current.currentTime = chapter.at / 1000;
                  void video.current.play().catch(() => undefined);
                }}
                className={`focus-ring flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left text-sm transition-[background-color,transform] duration-150 ease-press hover:bg-surface-lift active:scale-[0.98] ${
                  chapter.verdict === "weak" ? "bg-step-soft text-step-text" : "text-cream-bright"
                }`}
              >
                <span className="shrink-0 text-xs font-semibold tabular-nums text-cream-dim">{clock(chapter.at)}</span>
                <span className="line-clamp-2 min-w-0">{chapter.question ?? t("replayExposition")}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <a
          href={src}
          download={`mockio-ensayo.${recording.mimeType.includes("mp4") ? "mp4" : "webm"}`}
          className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-surface-lift px-4 py-2 font-semibold text-cream-bright transition-[background-color,transform] duration-150 ease-press hover:bg-cream/15 active:scale-[0.97]"
        >
          <Download aria-hidden className="h-4 w-4" />
          {t("replayDownload")}
        </a>
        <button
          type="button"
          onClick={() => {
            void deleteRecording(sessionId).then(() => {
              setRecording(null);
              setSrc(null);
            });
          }}
          className="focus-ring inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-cream-dim transition-[color,transform] duration-150 ease-press hover:text-step-text active:scale-[0.97]"
        >
          <Trash2 aria-hidden className="h-4 w-4" />
          {t("replayDelete")}
        </button>
        <span className="text-xs text-cream-faint">{t("replayLocal")}</span>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------------- */
/* 9. What the full panel would have asked                                   */
/* ------------------------------------------------------------------------- */

/**
 * Shown after a defence rehearsed without a plan — the free express one.
 *
 * Not a list of features: the student's own weak points that the express
 * rehearsal did not reach, by page, with what the full panel would ask about
 * them drawn as shapes rather than text. The pitch is their thesis.
 */
export function FullPanelTeaser({ evaluation }: { evaluation: Evaluation }) {
  const t = useThesisT();
  const status = useDefenseStatus();
  const [risks, setRisks] = useState<StoredThesis["analysis"]["risks"]>([]);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    fetchThesis()
      .then((result) => setRisks(result.thesis?.analysis.risks ?? []))
      .catch(() => setRisks([]));
  }, []);

  if (!status || status.allowance.paid || status.allowance.unlimited || (status.allowance.credits ?? 0) > 0 || risks.length === 0) return null;
  // A risk counts as asked when a question named its page.
  const said = (evaluation.answer_feedback ?? []).map((entry) => entry.question).join(" ");
  const asked = risks.filter((risk) => risk.page !== null && new RegExp(`\\b${risk.page}\\b`).test(said));
  const order = { alta: 0, media: 1, baja: 2 };
  const missed = risks
    .filter((risk) => !asked.includes(risk))
    .sort((a, b) => order[a.severity] - order[b.severity])
    .slice(0, 3);
  if (missed.length === 0) return null;
  const pack = status.offers.find((offer) => offer.kind === "sustentacion");

  const buy = async () => {
    setBuying(true);
    try {
      refreshDefenseStatus();
      window.location.assign((await buyDefensePack("sustentacion")).initPoint);
    } catch {
      setBuying(false);
    }
  };

  return (
    <Panel variant="raised" className={`${card} ring-2 ring-accent`}>
      <CardHead
        icon={Users}
        title={t("teaserTitle")}
        body={t("teaserBody", { asked: asked.length, total: risks.length })}
      />
      <ul className="flex flex-col gap-2">
        {missed.map((risk, index) => (
          <li key={index} className="flex items-start gap-3 rounded-2xl bg-surface-card p-3 shadow-card">
            <span
              className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                risk.severity === "alta" ? "bg-step-soft text-step-text" : "bg-accent-soft text-accent-text"
              }`}
            >
              {risk.page ? `p. ${risk.page}` : risk.area}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-cream-bright">{risk.issue}</span>
              <span aria-hidden className="mt-2 block h-3 w-10/12 rounded-full bg-cream-faint/25 blur-[2px]" />
              <span aria-hidden className="mt-1.5 block h-3 w-1/2 rounded-full bg-cream-faint/25 blur-[2px]" />
            </span>
            <Lock aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-cream-faint" />
          </li>
        ))}
      </ul>
      {status.payments && pack ? (
        <div className="flex flex-wrap items-center gap-3">
          <Action withArrow disabled={buying} onClick={() => void buy()}>
            {t("teaserCta")}
          </Action>
          <span className="text-xs text-cream-dim">{t("teaserNote")}</span>
        </div>
      ) : (
        <Link to={thesisPath("ensayar")} className="self-start">
          <Action withArrow>{t("teaserCta")}</Action>
        </Link>
      )}
      <GiftCard compact />
    </Panel>
  );
}
