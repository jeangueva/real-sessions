import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, FileText, Loader2, ShieldCheck, Trash2, Upload } from "lucide-react";
import { Action, Eyebrow, FadeRise, Panel } from "@/design-system";
import { PageBody, PageHeader } from "./AppShell";
import { ApiError, buyDefensePack, deleteThesis, fetchThesis, syncDefensePack, uploadThesis } from "@/lib/api";
import type { DefenseAllowance, PackOffer } from "@/lib/api";
import type { StoredThesis, ThesisAnalysis, ThesisCited } from "@/lib/api";
import { useThesisT } from "@/lib/thesis-copy";
import { ThesisSlides } from "./ThesisSlides";
import { DefenseDate } from "./DefenseDate";

const ACCEPT = ".pdf,.docx";

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

  return (
    <>
      {/* What was read: so the student knows it is their thesis, whole. */}
      <FadeRise>
        <Panel variant="raised" className="flex flex-col gap-4 p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <FileText aria-hidden className="mt-1 h-5 w-5 shrink-0 text-accent-text" />
            <div className="min-w-0">
              <h2 className="text-balance text-title font-semibold text-cream-bright">{a.title}</h2>
              <p className="mt-1 text-sm text-cream-dim">
                {thesis.fileName} · {t("pages", { count: thesis.pageCount })}
                {thesis.approximate && ` · ${t("approx")}`} · {a.field}
              </p>
            </div>
          </div>
          <p className="max-w-prose text-base leading-relaxed text-cream">{a.summary}</p>
          <div className="flex flex-wrap items-center gap-3">
            {/* The rehearsal itself arrives with the panel; until then the
                diagnosis is the product. */}
            <button
              type="button"
              onClick={onReplace}
              className="focus-ring inline-flex items-center gap-2 rounded-full bg-surface-card px-4 py-2 text-sm font-semibold text-cream-bright shadow-card transition-transform duration-150 active:scale-[0.97]"
            >
              <Upload aria-hidden className="h-4 w-4" />
              {t("replace")}
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="focus-ring inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-step-text transition-transform duration-150 active:scale-[0.97]"
            >
              <Trash2 aria-hidden className="h-4 w-4" />
              {t("delete")}
            </button>
          </div>
        </Panel>
      </FadeRise>

      <DefenseDate thesis={thesis} onChange={onChange} />

      <section aria-labelledby="risks" className="flex flex-col gap-3">
        <div>
          <Eyebrow>
            <span id="risks">{t("risksTitle")}</span>
          </Eyebrow>
          <p className="mt-1 text-sm text-cream-dim">{t("risksBody")}</p>
        </div>
        <ol className="flex flex-col gap-3">
          {risks.map((risk, index) => (
            <li key={index}>
              <Panel className="flex flex-col gap-2 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${SEVERITY[risk.severity].tone}`}>
                    {t(SEVERITY[risk.severity].key)}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-cream-dim">
                    {risk.area.replace("-", " ")}
                  </span>
                  <PageRef page={risk.page} />
                </div>
                <p className="text-base text-cream-bright">{risk.issue}</p>
                <p className="flex gap-2 rounded-2xl bg-surface-lift px-4 py-3 text-sm text-cream">
                  <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-accent-text" />
                  <span>
                    <span className="font-semibold">{t("likely")}: </span>“{risk.likely_question}”
                  </span>
                </p>
              </Panel>
            </li>
          ))}
        </ol>
      </section>

      {a.consistency.length > 0 && (
        <section aria-labelledby="matrix" className="flex flex-col gap-3">
          <div>
            <Eyebrow>
              <span id="matrix">{t("matrixTitle")}</span>
            </Eyebrow>
            <p className="mt-1 text-sm text-cream-dim">{t("matrixBody")}</p>
          </div>
          <div className="flex flex-col gap-3">
            {a.consistency.map((row, index) => (
              <Panel key={index} className="flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-cream-bright">{row.objective}</p>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS[row.status].tone}`}>
                    {t(STATUS[row.status].key)}
                  </span>
                </div>
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
                <p className="text-sm text-cream-dim">{row.note}</p>
              </Panel>
            ))}
          </div>
        </section>
      )}

      <ThesisSlides thesis={thesis} onChange={onChange} />
      <Rehearse thesis={thesis} />
      <Ficha analysis={a} />
      <p className="max-w-prose text-xs text-cream-dim">{t("disclaimer")}</p>
      <Privacy />
    </>
  );
}

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

  const buy = async () => {
    setBuying(true);
    setPackError(null);
    try {
      window.location.assign((await buyDefensePack()).initPoint);
    } catch (caught) {
      setPackError(caught instanceof ApiError ? caught.message : t("error"));
      setBuying(false);
    }
  };

  const price = pack
    ? new Intl.NumberFormat(pack.currency === "PEN" ? "es-PE" : undefined, {
        style: "currency",
        currency: pack.currency,
        minimumFractionDigits: Number.isInteger(pack.amount) ? 0 : 2,
        maximumFractionDigits: 2,
      }).format(pack.amount)
    : "";
  const hasCredits = (allowance?.credits ?? 0) > 0;
  const canBegin = hasCredits || (allowance?.freeLeft ?? 0) > 0;

  const begin = () => {
    const place = university.trim();
    try {
      if (place) localStorage.setItem("mockio.university", place);
    } catch {
      // Private mode: asked again next time.
    }
    const stage = full ? "sustentacion-pe" : "sustentacion-express";
    const language = thesis.analysis.language;
    navigate("/app/session", {
      state: {
        company: place || "Universidad",
        role: thesis.analysis.field,
        stage,
        stages: [stage],
        language,
        bcp47: language === "pt" ? "pt-BR" : language === "en" ? "en-US" : "es-PE",
        mode: "real",
        defense: { university: place || "la universidad", difficulty },
      },
    });
  };

  return (
    <Panel variant="raised" className="flex flex-col gap-5 p-6 sm:p-8">
      <div>
        <h2 className="text-title font-semibold text-cream-bright">{t("rehearseTitle")}</h2>
        <p className="mt-1 max-w-prose text-sm text-cream-dim">{t("rehearseBody")}</p>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-cream-dim">{t("university")}</span>
        <input
          value={university}
          onChange={(event) => setUniversity(event.target.value)}
          placeholder={t("universityPlaceholder")}
          maxLength={120}
          className="focus-ring rounded-2xl bg-surface-lift px-4 py-3 text-base text-cream-bright placeholder:text-cream-faint"
        />
      </label>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-xs font-semibold text-cream-dim">{t("difficulty")}</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(DIFFICULTY_LABEL) as Difficulty[]).map((entry) => (
            <button
              key={entry}
              type="button"
              aria-pressed={difficulty === entry}
              onClick={() => setDifficulty(entry)}
              className={`focus-ring rounded-full px-4 py-2 text-sm font-semibold transition-[background-color,color,transform] duration-150 active:scale-[0.97] ${
                difficulty === entry ? "bg-cream-bright text-surface-base" : "bg-surface-lift text-cream-dim hover:text-cream-bright"
              }`}
            >
              {t(DIFFICULTY_LABEL[entry])}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        {([false, true] as const).map((option) => (
          <button
            key={String(option)}
            type="button"
            aria-pressed={full === option}
            disabled={option && allowance !== null && !hasCredits}
            onClick={() => setFull(option)}
            className={`focus-ring flex items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              full === option ? "bg-surface-lift text-cream-bright ring-2 ring-accent" : "bg-surface-card text-cream-dim shadow-card"
            }`}
          >
            {t(option ? "full" : "express")}
          </button>
        ))}
        {allowance && (
          <p className="text-sm text-cream-dim">
            {hasCredits
              ? t("creditsLeft", { count: allowance.credits })
              : allowance.freeLeft > 0
                ? `${t("freeAvailable")} ${t("fullLocked")}`
                : `${t("freeUsed")} ${t("fullLocked")}`}
          </p>
        )}
      </div>

      {packNotice && <p className="rounded-2xl bg-grow-soft px-4 py-3 text-sm text-grow-text">{packNotice}</p>}
      {packError && (
        <p role="alert" className="rounded-2xl bg-step-soft px-4 py-3 text-sm text-step-text">
          {packError}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {canBegin && (
          <Action withArrow onClick={begin} className="px-6 py-3 text-base">
            {t("rehearse")}
          </Action>
        )}
        {/* The pack is offered to everyone without one, before and after the
            free rehearsal — with the notices a buyer must read first. */}
        {allowance && !hasCredits && pack?.available && (
          <button
            type="button"
            onClick={() => void buy()}
            disabled={buying}
            className="focus-ring rounded-full bg-surface-card px-5 py-3 text-sm font-semibold text-cream-bright shadow-card transition-transform duration-150 active:scale-[0.97] disabled:opacity-60"
          >
            {buying ? t("buying") : t("buy", { price })}
          </button>
        )}
      </div>
      {allowance && !hasCredits && pack?.available && (
        <div className="flex flex-col gap-1 text-xs text-cream-dim">
          <p>{t("buyNote")}</p>
          <p>{t("beforePay")}</p>
        </div>
      )}
    </Panel>
  );
}
