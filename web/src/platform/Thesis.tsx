import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, FileText, Loader2, ShieldCheck, Trash2, Upload } from "lucide-react";
import { Action, Panel } from "@/design-system";
import { PageBody, PageHeader } from "./AppShell";
import { ApiError, buyDefensePack, countRealQuestions, deleteThesis, fetchThesis, syncDefensePack, uploadThesis } from "@/lib/api";
import type { DefenseAllowance, DefenseFormatInfo, DefenseProgressPoint, PackKind, PackOffer, PackOfferDetail } from "@/lib/api";
import type { StoredThesis, ThesisAnalysis, ThesisCited } from "@/lib/api";
import { useThesisT } from "@/lib/thesis-copy";
import { ThesisSlides } from "./ThesisSlides";
import { ThesisStudy } from "./ThesisStudy";
import { DefenseDate } from "./DefenseDate";
import { ShareRealQuestions } from "./ShareRealQuestions";
import { AdvisorCard } from "./AdvisorCard";

const ACCEPT = ".pdf,.docx,.jpg,.jpeg,.png,.webp";

/**
 * The thesis and what a jury will see in it.
 *
 * The first thing a student gets before any rehearsal: their own weak points,
 * each with the page and the question it will turn into. It is the moment the
 * product proves it read *their* thesis — which a chatbot they paste a
 * chapter into does not — so it comes before anything is asked of them.
 */
export function Thesis() {
  const t = useThesisT();
  const [thesis, setThesis] = useState<StoredThesis | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchThesis()
      .then((result) => setThesis(result.thesis))
      .catch(() => setThesis(null));
  }, []);

  const upload = async (file: File) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      setThesis((await uploadThesis(file)).thesis);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t("error"));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const remove = async () => {
    setError(null);
    try {
      await deleteThesis();
      setThesis(null);
      setNotice(t("deleted"));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t("error"));
    }
  };

  const picker = (
    <input
      ref={fileRef}
      type="file"
      accept={ACCEPT}
      className="sr-only"
      onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) void upload(file);
      }}
    />
  );

  return (
    <>
      <PageHeader title={t("title")} meta={t("meta")} />
      <PageBody className="flex flex-col gap-6">
        {picker}
        {error && (
          <p role="alert" className="rounded-2xl bg-step-soft px-4 py-3 text-sm text-step-text">
            {error}
          </p>
        )}
        {notice && <p className="text-sm text-cream-dim">{notice}</p>}

        {busy ? (
          <Panel variant="raised" className="flex items-center gap-3 p-6 sm:p-8">
            <Loader2 aria-hidden className="h-5 w-5 shrink-0 animate-spin text-accent-text" />
            <p className="text-base text-cream">{t("uploading")}</p>
          </Panel>
        ) : thesis === null ? (
          <Panel variant="raised" className="flex flex-col items-start gap-4 p-6 sm:p-8">
            <h2 className="text-title font-semibold text-cream-bright">{t("uploadTitle")}</h2>
            <p className="max-w-prose text-base leading-relaxed text-cream">{t("uploadBody")}</p>
            <button type="button" onClick={() => fileRef.current?.click()} className="focus-ring rounded-full">
              <Action>
                <Upload aria-hidden className="h-4 w-4" />
                {t("uploadCta")}
              </Action>
            </button>
            <Privacy />
          </Panel>
        ) : thesis ? (
          <Diagnosis
            thesis={thesis}
            onChange={setThesis}
            onReplace={() => fileRef.current?.click()}
            onDelete={() => void remove()}
          />
        ) : null}
      </PageBody>
    </>
  );
}

function Privacy() {
  const t = useThesisT();
  return (
    <p className="flex max-w-prose gap-2 text-sm text-cream-dim">
      <ShieldCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
      {t("privacy")}
    </p>
  );
}

function PageRef({ page }: { page: number | null }) {
  const t = useThesisT();
  if (page === null) return null;
  return (
    <span className="ml-1.5 whitespace-nowrap rounded-full bg-surface-lift px-2 py-0.5 text-xs font-semibold tabular-nums text-cream-dim">
      {t("page", { page })}
    </span>
  );
}

const SEVERITY = {
  alta: { key: "severityAlta", tone: "bg-step-soft text-step-text" },
  media: { key: "severityMedia", tone: "bg-accent-soft text-accent-text" },
  baja: { key: "severityBaja", tone: "bg-surface-lift text-cream-dim" },
} as const;

const STATUS = {
  coherente: { key: "statusCoherente", tone: "bg-grow-soft text-grow-text" },
  debil: { key: "statusDebil", tone: "bg-accent-soft text-accent-text" },
  incoherente: { key: "statusIncoherente", tone: "bg-step-soft text-step-text" },
} as const;

function Diagnosis({
  thesis,
  onChange,
  onReplace,
  onDelete,
}: {
  thesis: StoredThesis;
  onChange: (next: StoredThesis) => void;
  onReplace: () => void;
  onDelete: () => void;
}) {
  const t = useThesisT();
  const a = thesis.analysis;
  const severityOrder = { alta: 0, media: 1, baja: 2 };
  const risks = [...a.risks].sort((x, y) => severityOrder[x.severity] - severityOrder[y.severity]);

  const [tab, setTab] = useState<ThesisTab>(() => {
    const hash = window.location.hash.slice(1);
    return (TABS as readonly string[]).includes(hash) ? (hash as ThesisTab) : "ensayar";
  });
  // Follows the address too: a link to #diagnostico from anywhere — or the
  // back button — opens that tab, not whichever was open before.
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const hash = location.hash.slice(1);
    if ((TABS as readonly string[]).includes(hash)) setTab(hash as ThesisTab);
  }, [location.hash]);
  const go = (next: ThesisTab) => {
    setTab(next);
    navigate({ hash: `#${next}` }, { replace: true });
  };
  const serious = risks.filter((risk) => risk.severity === "alta").length;

  return (
    <>
      {/* The thesis in one compact card: what was read, when it is defended,
          and the two file actions as small buttons — not a page of its own. */}
      <Panel variant="raised" className="flex flex-col gap-3 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <FileText aria-hidden className="mt-1 h-5 w-5 shrink-0 text-accent-text" />
          <div className="min-w-0 flex-1">
            <h2 className="text-balance text-lg font-semibold leading-snug text-cream-bright">{a.title}</h2>
            <p className="mt-0.5 text-xs text-cream-dim">
              {thesis.fileName} · {t("pages", { count: thesis.pageCount })} · {a.field}
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={onReplace}
              title={t("replace")}
              aria-label={t("replace")}
              className="focus-ring grid h-9 w-9 place-items-center rounded-full bg-surface-lift text-cream-bright active:scale-[0.95]"
            >
              <Upload aria-hidden className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              title={t("delete")}
              aria-label={t("delete")}
              className="focus-ring grid h-9 w-9 place-items-center rounded-full bg-surface-lift text-step-text active:scale-[0.95]"
            >
              <Trash2 aria-hidden className="h-4 w-4" />
            </button>
          </div>
        </div>
        <details className="group">
          <summary className="cursor-pointer list-none text-sm text-cream">
            <span className="line-clamp-2 group-open:line-clamp-none">{a.summary}</span>
          </summary>
        </details>
        <DefenseDate thesis={thesis} onChange={onChange} />
      </Panel>

      {/* Four tabs instead of one long page: each fits a screen. */}
      <div role="tablist" aria-label={t("title")} className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        {TABS.map((entry) => (
          <button
            key={entry}
            type="button"
            role="tab"
            aria-selected={tab === entry}
            onClick={() => go(entry)}
            className={`focus-ring inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-[background-color,color,transform] duration-150 active:scale-[0.97] ${
              tab === entry ? "bg-cream-bright text-surface-base" : "bg-surface-card text-cream-dim shadow-card hover:text-cream-bright"
            }`}
          >
            {t(TAB_LABEL[entry])}
            {entry === "diagnostico" && serious > 0 && (
              <span className="rounded-full bg-step-soft px-1.5 text-xs text-step-text">{serious}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "ensayar" && <Rehearse thesis={thesis} />}

      {tab === "diagnostico" && (
        <div className="flex flex-col gap-4">
          <section aria-labelledby="risks" className="flex flex-col gap-2">
            <p id="risks" className="text-sm font-semibold text-cream-bright">
              {t("risksTitle")}
            </p>
            {/* One line per risk; the likely question opens on tap. */}
            <ol className="flex flex-col gap-2">
              {risks.map((risk, index) => (
                <li key={index}>
                  <details className="group rounded-2xl bg-surface-card shadow-card">
                    <summary className="focus-ring flex cursor-pointer list-none items-start gap-2 rounded-2xl p-3.5">
                      <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${SEVERITY[risk.severity].tone}`}>
                        {t(SEVERITY[risk.severity].key)}
                      </span>
                      <span className="min-w-0 flex-1 text-sm text-cream-bright">
                        <span className="line-clamp-2 group-open:line-clamp-none">{risk.issue}</span>
                      </span>
                      <PageRef page={risk.page} />
                    </summary>
                    <p className="mx-3.5 mb-3.5 flex gap-2 rounded-xl bg-surface-lift px-3 py-2.5 text-sm text-cream">
                      <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-accent-text" />
                      <span>
                        <span className="font-semibold">{t("likely")}: </span>“{risk.likely_question}”
                      </span>
                    </p>
                  </details>
                </li>
              ))}
            </ol>
          </section>

          {a.consistency.length > 0 && (
            <section aria-labelledby="matrix" className="flex flex-col gap-2">
              <p id="matrix" className="text-sm font-semibold text-cream-bright">
                {t("matrixTitle")}
              </p>
              <ul className="flex flex-col gap-2">
                {a.consistency.map((row, index) => (
                  <li key={index}>
                    <details className="group rounded-2xl bg-surface-card shadow-card">
                      <summary className="focus-ring flex cursor-pointer list-none items-start justify-between gap-3 rounded-2xl p-3.5">
                        <span className="min-w-0 text-sm text-cream-bright">
                          <span className="line-clamp-1 group-open:line-clamp-none">{row.objective}</span>
                        </span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS[row.status].tone}`}>
                          {t(STATUS[row.status].key)}
                        </span>
                      </summary>
                      <div className="flex flex-col gap-2 px-3.5 pb-3.5">
                        <dl className="grid gap-2 text-sm sm:grid-cols-3">
                          {(
                            [
                              ["hypothesis", row.hypothesis],
                              ["result", row.result],
                              ["conclusion", row.conclusion],
                            ] as const
                          ).map(([label, value]) => (
                            <div key={label} className="min-w-0">
                              <dt className="text-xs font-semibold text-cream-dim">{t(label)}</dt>
                              <dd className={value ? "text-cream" : "italic text-step-text"}>{value ?? t("none")}</dd>
                            </div>
                          ))}
                        </dl>
                        <p className="text-xs text-cream-dim">{row.note}</p>
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <Ficha analysis={a} />
        </div>
      )}

      {tab === "repaso" && <ThesisStudy thesis={thesis} onChange={onChange} />}

      {tab === "diapositivas" && <ThesisSlides thesis={thesis} onChange={onChange} />}

      {tab === "mas" && (
        <div className="flex flex-col gap-3">
          <AdvisorCard />
          <ShareRealQuestions country={a.language === "pt" ? "BR" : "PE"} />
          <Privacy />
          <p className="max-w-prose text-xs text-cream-dim">{t("disclaimer")}</p>
        </div>
      )}
    </>
  );
}

const TABS = ["ensayar", "diagnostico", "repaso", "diapositivas", "mas"] as const;
type ThesisTab = (typeof TABS)[number];
const TAB_LABEL = {
  ensayar: "tabRehearse",
  diagnostico: "tabDiagnosis",
  repaso: "tabStudy",
  diapositivas: "tabSlides",
  mas: "tabMore",
} as const;

function Ficha({ analysis }: { analysis: ThesisAnalysis }) {
  const t = useThesisT();
  const f = analysis.ficha;
  const rows: [Parameters<typeof t>[0], ThesisCited | ThesisCited[]][] = [
    ["problem", f.problem],
    ["generalObjective", f.general_objective],
    ["specificObjectives", f.specific_objectives],
    ["hypotheses", f.hypotheses],
    ["variables", f.variables],
    ["design", f.design],
    ["sample", f.population_sample],
    ["instruments", f.instruments],
    ["results", f.main_results],
    ["conclusions", f.conclusions],
  ];
  return (
    <details className="group rounded-3xl bg-surface-card p-5 shadow-card sm:p-6">
      <summary className="focus-ring cursor-pointer list-none rounded-xl text-base font-semibold text-cream-bright">
        {t("fichaTitle")}
      </summary>
      <dl className="mt-4 flex flex-col gap-4">
        {rows.map(([label, value]) => {
          const items = Array.isArray(value) ? value : [value];
          if (items.length === 0) return null;
          return (
            <div key={label}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-cream-dim">{t(label)}</dt>
              {items.map((item, index) => (
                <dd key={index} className="mt-1 text-sm text-cream">
                  {item.text}
                  <PageRef page={item.page} />
                </dd>
              ))}
            </div>
          );
        })}
        {analysis.chapters.length > 0 && (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-cream-dim">{t("chapters")}</dt>
            {analysis.chapters.map((chapter, index) => (
              <dd key={index} className="mt-1 text-sm text-cream">
                {chapter.name}
                <PageRef page={chapter.page} />
              </dd>
            ))}
          </div>
        )}
      </dl>
    </details>
  );
}

type Difficulty = "calentamiento" | "estandar" | "exigente" | "hostil";
const DIFFICULTY_LABEL = {
  calentamiento: "diffCalentamiento",
  estandar: "diffEstandar",
  exigente: "diffExigente",
  hostil: "diffHostil",
} as const;

/**
 * Where the rehearsal starts: the university, how hard, and which panel.
 *
 * Free gets the express rehearsal; the panel of three is the pack. The
 * university is remembered on this device — it does not change between
 * rehearsals, and asking every time is the kind of friction that makes the
 * second rehearsal not happen.
 */
function Rehearse({ thesis }: { thesis: StoredThesis }) {
  const t = useThesisT();
  const navigate = useNavigate();
  const [allowance, setAllowance] = useState<DefenseAllowance | null>(null);
  const [pack, setPack] = useState<PackOffer | null>(null);
  const [formats, setFormats] = useState<DefenseFormatInfo[]>([]);
  const [offers, setOffers] = useState<PackOfferDetail[]>([]);
  const [progress, setProgress] = useState<DefenseProgressPoint[]>([]);
  const [focus, setFocus] = useState<Focus>("completa");
  const [setting, setSetting] = useState<"presencial" | "virtual" | null>(null);
  const [material, setMaterial] = useState("");
  const [members, setMembers] = useState(["", "", ""]);
  const [fluencyNeutral, setFluencyNeutral] = useState(() => {
    try {
      return localStorage.getItem("mockio.fluencyNeutral") === "1";
    } catch {
      return false;
    }
  });

  /** Remembered on this device, else guessed from the thesis's language. */
  const [country, setCountry] = useState(() => {
    try {
      const saved = localStorage.getItem("mockio.defenseCountry");
      if (saved) return saved;
    } catch {
      // Private mode: guessed every time.
    }
    return thesis.analysis.language === "pt" ? "BR" : "PE";
  });
  const [buying, setBuying] = useState(false);
  const [packNotice, setPackNotice] = useState<string | null>(null);
  const [packError, setPackError] = useState<string | null>(null);
  const [university, setUniversity] = useState(() => {
    try {
      return localStorage.getItem("mockio.university") ?? "";
    } catch {
      return "";
    }
  });
  const [difficulty, setDifficulty] = useState<Difficulty>("estandar");
  const [full, setFull] = useState(false);
  /** Verified questions from real juries at the university typed above. */
  const [realCount, setRealCount] = useState(0);
  useEffect(() => {
    const name = university.trim();
    if (name.length < 4) {
      setRealCount(0);
      return;
    }
    const id = window.setTimeout(() => {
      countRealQuestions(name)
        .then((result) => setRealCount(result.verified))
        .catch(() => setRealCount(0));
    }, 500);
    return () => window.clearTimeout(id);
  }, [university]);

  useEffect(() => {
    let cancelled = false;
    const apply = (next: DefenseAllowance) => {
      if (cancelled) return;
      setAllowance(next);
      setFull(next.credits > 0);
    };
    fetchThesis()
      .then((result) => {
        if (result.pack && !cancelled) setPack(result.pack);
        if (result.formats && !cancelled) setFormats(result.formats);
        if (result.offers && !cancelled) setOffers(result.offers);
        if (result.progress && !cancelled) setProgress(result.progress);
        if (result.allowance) apply(result.allowance);
      })
      .catch(() => apply({ credits: 0, freeLeft: 0 }));

    /**
     * Back from Mercado Pago. The payment is settled from here as well as by
     * the webhook, which can be late — and the payer is looking at this
     * screen now. The query is then removed, so a reload does not ask again.
     */
    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get("payment_id") ?? params.get("collection_id");
    if (paymentId && /^\d+$/.test(paymentId)) {
      syncDefensePack(paymentId)
        .then((result) => {
          apply(result.allowance);
          if (!cancelled) setPackNotice(t(result.outcome === "not-yet" ? "packPending" : "packDone"));
        })
        .catch((caught) => {
          if (!cancelled) setPackError(caught instanceof ApiError ? caught.message : t("error"));
        })
        .finally(() => window.history.replaceState(null, "", window.location.pathname));
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const buy = async (kind: PackKind) => {
    setBuying(true);
    setPackError(null);
    try {
      window.location.assign((await buyDefensePack(kind)).initPoint);
    } catch (caught) {
      setPackError(caught instanceof ApiError ? caught.message : t("error"));
      setBuying(false);
    }
  };

  const hasCredits = (allowance?.credits ?? 0) > 0;
  const needsMaterial = focus === "estadistica" || focus === "observaciones";
  const canBegin = (hasCredits || (allowance?.freeLeft ?? 0) > 0) && (!needsMaterial || material.trim().length >= 40);
  const named = members.map((entry) => entry.trim()).filter(Boolean);
  /** The offers that would add something to what they hold. */
  const worthOffering = offers.filter((offer) => offer.kind !== "asesor_pro").filter((offer) =>
    !hasCredits ? true : offer.group ? !allowance?.group : offer.modes ? !allowance?.modes : false,
  );
  const money = (amount: number, currency: string) =>
    new Intl.NumberFormat(currency === "PEN" ? "es-PE" : undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);

  const begin = () => {
    const place = university.trim();
    try {
      if (place) localStorage.setItem("mockio.university", place);
    } catch {
      // Private mode: asked again next time.
    }
    // A mode is a full-panel rehearsal; the passes that unlock them carry credits.
    const stage = full || focus !== "completa" ? "sustentacion-pe" : "sustentacion-express";
    const format = formats.find((entry) => entry.country === country);
    try {
      localStorage.setItem("mockio.defenseCountry", country);
    } catch {
      // Private mode: guessed again next time.
    }
    // The country's language wins over the thesis's: a thesis written in
    // Spanish and defended at a Brazilian university is defended in Portuguese.
    const language = format?.language ?? thesis.analysis.language;
    navigate("/app/session", {
      state: {
        company: place || "Universidad",
        role: thesis.analysis.field,
        stage,
        stages: [stage],
        language,
        bcp47: language === "pt" ? "pt-BR" : language === "en" ? "en-US" : `es-${country}`,
        mode: "real",
        defense: {
          university: place || (language === "pt" ? "a universidade" : "la universidad"),
          difficulty,
          country,
          ...(format ? { jurors: format.jurors } : {}),
          focus,
          ...(setting ? { setting } : {}),
          ...(needsMaterial ? { material: material.trim() } : {}),
          ...(allowance?.group && named.length > 1 ? { members: named } : {}),
          ...(fluencyNeutral ? { fluencyNeutral: true } : {}),
        },
      },
    });
  };

  const select =
    "focus-ring w-full rounded-xl bg-surface-lift px-3 py-2.5 text-sm text-cream-bright disabled:opacity-50";
  const label = "flex min-w-0 flex-col gap-1 text-xs font-semibold text-cream-dim";
  const locked = (entry: string) => entry !== "completa" && !allowance?.modes;

  return (
    <Panel variant="raised" className="flex flex-col gap-4 p-5 sm:p-6">
      {progress.length > 0 && <ProgressStrip points={progress} />}
      {/* Where and how — one compact grid instead of a column of chip rows,
          so the whole form and its button fit on one screen. */}
      <div className="grid grid-cols-2 gap-3">
        <label className={`${label} col-span-2 sm:col-span-1`}>
          {t("university")}
          <input
            value={university}
            onChange={(event) => setUniversity(event.target.value)}
            placeholder={t("universityPlaceholder")}
            maxLength={120}
            className={`${select} placeholder:text-cream-faint`}
          />
          {realCount > 0 && <span className="font-normal text-grow-text">{t("realQuestions", { count: realCount })}</span>}
        </label>
        {formats.length > 0 && (
          <label className={label}>
            {t("country")}
            <select value={country} onChange={(event) => setCountry(event.target.value)} className={select}>
              {formats.map((format) => (
                <option key={format.country} value={format.country}>
                  {format.countryName} · {format.scale.min}–{format.scale.max}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className={label}>
          {t("difficulty")}
          <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty)} className={select}>
            {(Object.keys(DIFFICULTY_LABEL) as Difficulty[]).map((entry) => (
              <option key={entry} value={entry}>
                {t(DIFFICULTY_LABEL[entry])}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          {t("mode")}
          <select value={focus} onChange={(event) => setFocus(event.target.value as Focus)} className={select}>
            {FOCUS_OPTIONS.map((entry) => (
              <option key={entry} value={entry} disabled={locked(entry)}>
                {locked(entry) ? "🔒 " : ""}
                {t(FOCUS_LABEL[entry])}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          {t("setting")}
          <select
            value={setting ?? ""}
            onChange={(event) => setSetting(event.target.value === "" ? null : (event.target.value as "presencial" | "virtual"))}
            className={select}
          >
            <option value="">{t("settingAny")}</option>
            <option value="presencial" disabled={!allowance?.modes}>
              {!allowance?.modes ? "🔒 " : ""}
              {t("settingPresencial")}
            </option>
            <option value="virtual" disabled={!allowance?.modes}>
              {!allowance?.modes ? "🔒 " : ""}
              {t("settingVirtual")}
            </option>
          </select>
        </label>
        {/* Express or the full panel, side by side. */}
        <div className={`${label} col-span-2 sm:col-span-1`}>
          {t("panelChoice")}
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-lift p-1">
            {([false, true] as const).map((option) => (
              <button
                key={String(option)}
                type="button"
                aria-pressed={full === option}
                disabled={option && allowance !== null && !hasCredits}
                onClick={() => setFull(option)}
                className={`focus-ring rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  full === option ? "bg-surface-card text-cream-bright shadow-card" : "text-cream-dim"
                }`}
              >
                {t(option ? "fullShort" : "expressShort")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {needsMaterial && (
        <textarea
          value={material}
          onChange={(event) => setMaterial(event.target.value)}
          rows={4}
          maxLength={20_000}
          placeholder={t(focus === "estadistica" ? "materialStats" : "materialObs")}
          className="focus-ring rounded-xl bg-surface-lift px-3 py-2.5 font-mono text-sm text-cream-bright placeholder:font-sans placeholder:text-cream-faint"
        />
      )}

      {/* Accessibility: free for everyone, remembered on this device. */}
      <label className="flex items-start gap-2 text-sm text-cream">
        <input
          type="checkbox"
          className="mt-1"
          checked={fluencyNeutral}
          onChange={(event) => {
            setFluencyNeutral(event.target.checked);
            try {
              localStorage.setItem("mockio.fluencyNeutral", event.target.checked ? "1" : "0");
            } catch {
              // Private mode: asked again next time.
            }
          }}
        />
        <span>
          {t("fluencyNeutral")} <span className="text-xs text-cream-dim">{t("fluencyNeutralNote")}</span>
        </span>
      </label>

      {allowance?.group && (
        <div className={label}>
          {t("members")}
          <div className="grid grid-cols-3 gap-2">
            {members.map((entry, index) => (
              <input
                key={index}
                value={entry}
                maxLength={40}
                onChange={(event) =>
                  setMembers((current) => current.map((value, at) => (at === index ? event.target.value : value)))
                }
                placeholder={t("memberPlaceholder", { n: index + 1 })}
                className={`${select} placeholder:text-cream-faint`}
              />
            ))}
          </div>
        </div>
      )}

      {packNotice && <p className="rounded-xl bg-grow-soft px-3 py-2 text-sm text-grow-text">{packNotice}</p>}
      {packError && (
        <p role="alert" className="rounded-xl bg-step-soft px-3 py-2 text-sm text-step-text">
          {packError}
        </p>
      )}

      {/* The way in, with what it will spend beside it. On a phone it stays
          pinned above the tab bar, so it is never a scroll away. */}
      <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] z-30 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line bg-surface-card/95 px-4 py-2.5 backdrop-blur md:static md:z-auto md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        {canBegin && (
          <Action withArrow onClick={begin} className="px-6 py-3 text-base">
            {t("rehearse")}
          </Action>
        )}
        {allowance && (
          <p className="text-sm text-cream-dim">
            {hasCredits
              ? `${t("creditsLeft", { count: allowance.credits })}${allowance.sponsor ? ` (${t("sponsoredBy", { name: allowance.sponsor.name })})` : ""}`
              : allowance.freeLeft > 0
                ? t("freeAvailable")
                : t("freeUsed")}
          </p>
        )}
      </div>
      {allowance && (!allowance.modes || !allowance.group) && (
        <p className="-mt-2 text-xs text-cream-dim">{t("lockedSummary")}</p>
      )}

      {allowance && pack?.available && worthOffering.length > 0 && (
        <section className="flex flex-col gap-2 border-t border-line pt-4">
          <div className="grid gap-2 sm:grid-cols-3">
            {worthOffering.map((offer) => (
              <button
                key={offer.kind}
                type="button"
                disabled={buying}
                onClick={() => void buy(offer.kind)}
                className="focus-ring flex flex-col items-start gap-0.5 rounded-xl bg-surface-card px-3 py-2.5 text-left shadow-card transition-transform duration-150 active:scale-[0.98] disabled:opacity-60"
              >
                <span className="flex w-full items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-cream-bright">{t(OFFER_LABEL[offer.kind as Exclude<PackKind, "asesor_pro">].name)}</span>
                  <span className="text-base font-bold text-cream-bright">{money(offer.amount, offer.currency)}</span>
                </span>
                <span className="text-xs text-cream-dim">{t(OFFER_LABEL[offer.kind as Exclude<PackKind, "asesor_pro">].body)}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-cream-dim">{buying ? t("buying") : t("beforePay")}</p>
        </section>
      )}
      {/* Room for the pinned bar on a phone, so it never covers the plans. */}
      <div aria-hidden className="h-16 md:hidden" />
    </Panel>
  );
}

type Focus = "completa" | "autoria" | "trampa" | "estadistica" | "observaciones" | "divulgacion";
const FOCUS_OPTIONS: Focus[] = ["completa", "autoria", "trampa", "estadistica", "observaciones", "divulgacion"];
const FOCUS_LABEL = {
  completa: "modeCompleta",
  autoria: "modeAutoria",
  trampa: "modeTrampa",
  estadistica: "modeEstadistica",
  observaciones: "modeObservaciones",
  divulgacion: "modeDivulgacion",
} as const;
const OFFER_LABEL: Record<Exclude<PackKind, "asesor_pro">, { name: Parameters<ReturnType<typeof useThesisT>>[0]; body: Parameters<ReturnType<typeof useThesisT>>[0] }> = {
  sustentacion: { name: "offerSustentacion", body: "offerSustentacionBody" },
  intensivo: { name: "offerIntensivo", body: "offerIntensivoBody" },
  grupal: { name: "offerGrupal", body: "offerGrupalBody" },
} as const;

/**
 * The last rehearsals as a row of bars, each the grade against the pass
 * mark: one glance says whether the practice is working. A line under it
 * gives the readiness from the first to the latest.
 */
function ProgressStrip({ points }: { points: DefenseProgressPoint[] }) {
  const t = useThesisT();
  const first = points[0]!;
  const last = points.at(-1)!;
  const grade = (value: number) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value);
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-surface-lift p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-cream-bright">{t("progressTitle")}</p>
        <p className="text-xs text-cream-dim">
          {t("progressReadiness", { from: first.readiness, to: last.readiness })} · {t("progressPass", { mark: grade(last.passMark) })}
        </p>
      </div>
      <div className="flex h-20 items-end gap-1.5" role="img" aria-label={points.map((p) => `${grade(p.grade)}/${p.gradeMax}`).join(", ")}>
        {points.map((point) => {
          const passed = point.grade >= point.passMark;
          return (
            <div key={point.id} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span className="text-xs font-semibold tabular-nums text-cream-dim">{grade(point.grade)}</span>
              <span
                className={`block w-full max-w-10 rounded-t-md ${passed ? "bg-grow" : "bg-step"}`}
                style={{ height: `${Math.max(8, (point.grade / point.gradeMax) * 44)}px` }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
