import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CASE_ES, CASE_FR, CASE_PT } from "@/lib/training-copy";
import { Compass, ExternalLink } from "lucide-react";
import { Action, Chip, FadeRise, Field, IconTile, InsetPanel, MonoLabel, Notice, Panel, Widget } from "@/design-system";
import { useLocale } from "@/hooks/useLocale";
import { PageBody, PageHeader } from "./AppShell";

export interface IntuitionCaseItem {
  id: string;
  kind: "prioritization" | "tradeoffs" | "hypotheses";
  title: string;
  prompt: string;
  options: string[];
}

interface RevealResponse {
  judgment: {
    caseId: string;
    choice: number;
    confidence: number;
    reasoning: string;
  };
  recommended: number;
  rationale: string;
  reveal: {
    name: string;
    outcome: string;
    source: string;
    url: string;
  };
  reflection: string;
  presentation: string;
}




const COPY = {
  en: {
    title: "Deliberate intuition trainer",
    intro: "Commit to a product, design or systems decision, state your confidence and write your reasoning before revealing what actually happened in the documented historical case.",
    filterLabel: "Decision type",
    filterAll: "All cases",
    prioritization: "Prioritization",
    tradeoffs: "Trade-offs",
    hypotheses: "Hypotheses",
    stepCommit: "1. Commit your judgment before the reveal",
    optionsLegend: "Choose your course of action",
    confidenceLabel: "Confidence in this decision",
    reasoningLabel: "Why this option? What signal matters most, and what assumption could fail?",
    reasoningPlaceholder: "Write the signal you are relying on and what evidence would change your mind…",
    revealBtn: "Commit judgment and reveal outcome",
    revealingBtn: "Revealing documented case…",
    outcomeEyebrow: "Documented historical outcome",
    yourChoice: "Your committed choice",
    recommendedChoice: "Recommended approach",
    alignedBadge: "Aligned with documented lesson",
    differsBadge: "Different from documented lesson",
    rationaleHeading: "Why this approach holds up",
    sourceLabel: "Read primary source",
    nextCaseBtn: "Practice next case",
    loadingCases: "Loading intuition cases…",
  },
  es: {
    title: "Entrenador de intuición",
    intro: "Compromete tu decisión de priorización, trade-offs o hipótesis, registra tu nivel de confianza y explica tu razonamiento antes de revelar qué ocurrió realmente en el caso histórico documentado.",
    filterLabel: "Tipo de criterio",
    filterAll: "Todos los casos",
    prioritization: "Priorización",
    tradeoffs: "Trade-offs",
    hypotheses: "Hipótesis",
    stepCommit: "1. Compromete tu criterio antes de ver el desenlace",
    optionsLegend: "Elige tu decisión",
    confidenceLabel: "Nivel de confianza en tu decisión",
    reasoningLabel: "¿Por qué eliges esta opción? ¿Qué señal pesa más y qué supuesto podría fallar?",
    reasoningPlaceholder: "Escribe la señal principal en la que te apoyas y qué evidencia te haría cambiar de postura…",
    revealBtn: "Confirmar decisión y revelar caso real",
    revealingBtn: "Revelando caso documentado…",
    outcomeEyebrow: "Desenlace histórico documentado",
    yourChoice: "Tu decisión comprometida",
    recommendedChoice: "Enfoque recomendado",
    alignedBadge: "Alineado con la lección del caso",
    differsBadge: "Distinto al enfoque recomendado",
    rationaleHeading: "Por qué se sostiene este criterio",
    sourceLabel: "Consultar fuente original",
    nextCaseBtn: "Practicar siguiente caso",
    loadingCases: "Cargando casos de intuición…",
  },
  pt: {
    title: "Treinador de intuição",
    intro: "Registre sua decisão de priorização, trade-offs ou hipóteses, defina sua confiança e explique seu raciocínio antes de revelar o que realmente aconteceu no caso histórico documentado.",
    filterLabel: "Tipo de decisão",
    filterAll: "Todos os casos",
    prioritization: "Priorização",
    tradeoffs: "Trade-offs",
    hypotheses: "Hipóteses",
    stepCommit: "1. Registre seu julgamento antes da revelação",
    optionsLegend: "Escolha sua decisão",
    confidenceLabel: "Nível de confiança nesta decisão",
    reasoningLabel: "Por que esta opção? Qual sinal mais importa e qual suposição pode falhar?",
    reasoningPlaceholder: "Escreva o sinal principal em que você se apoia e que evidência mudaria sua decisão…",
    revealBtn: "Confirmar decisão e revelar caso real",
    revealingBtn: "Revelando caso documentado…",
    outcomeEyebrow: "Desfecho histórico documentado",
    yourChoice: "Sua escolha registrada",
    recommendedChoice: "Abordagem recomendada",
    alignedBadge: "Alinhado com a lição documentada",
    differsBadge: "Diferente da abordagem recomendada",
    rationaleHeading: "Por que esse critério se sustenta",
    sourceLabel: "Consultar fonte original",
    nextCaseBtn: "Praticar próximo caso",
    loadingCases: "Carregando casos de intuição…",
  },
  fr: {
    title: "Entraîneur d'intuition",
    intro: "Engagez votre décision de priorisation, de compromis ou d'hypothèse, indiquez votre niveau de confiance et expliquez votre raisonnement avant de révéler ce qui s'est réellement passé dans le cas historique documenté.",
    filterLabel: "Type de décision",
    filterAll: "Tous les cas",
    prioritization: "Priorisation",
    tradeoffs: "Compromis",
    hypotheses: "Hypothèses",
    stepCommit: "1. Engagez votre jugement avant la révélation",
    optionsLegend: "Choisissez votre plan d'action",
    confidenceLabel: "Niveau de confiance dans cette décision",
    reasoningLabel: "Pourquoi cette option ? Quel signal compte le plus et quelle hypothèse pourrait échouer ?",
    reasoningPlaceholder: "Décrivez le signal principal sur lequel vous vous appuyez et quelle preuve vous ferait changer d'avis…",
    revealBtn: "Valider le jugement et révéler le cas réel",
    revealingBtn: "Révélation du cas documenté…",
    outcomeEyebrow: "Issue historique documentée",
    yourChoice: "Votre choix engagé",
    recommendedChoice: "Approche recommandée",
    alignedBadge: "Aligné avec l'enseignement documenté",
    differsBadge: "Différent de l'approche recommandée",
    rationaleHeading: "Pourquoi cette approche tient la route",
    sourceLabel: "Lire la source primaire",
    nextCaseBtn: "Pratiquer le cas suivant",
    loadingCases: "Chargement des cas d'intuition…",
  },
} as const;

export function IntuitionTrainer() {
  const { locale } = useLocale();
  const copy = locale === "es" ? COPY.es : locale === "pt" ? COPY.pt : locale === "fr" ? COPY.fr : COPY.en;

  // Opened from a card or the search: that case, preselected.
  const [params] = useSearchParams();
  const wanted = params.get("id");
  const [cases, setCases] = useState<IntuitionCaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [kindFilter, setKindFilter] = useState<"all" | IntuitionCaseItem["kind"]>("all");
  const [selectedId, setSelectedId] = useState<string>("");
  const [choice, setChoice] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<number>(70);
  const [reasoning, setReasoning] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<RevealResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch("/api/training/catalogue")
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not load intuition cases.");
        return (await res.json()) as { intuition: IntuitionCaseItem[] };
      })
      .then((data) => {
        if (!active) return;
        const list = data.intuition ?? [];
        setCases(list);
        const first = list.find((c) => c.id === wanted) ?? list[0];
        if (first) setSelectedId(first.id);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Could not load cases.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredCases = cases.filter((c) => kindFilter === "all" || c.kind === kindFilter);
  const activeCase =
    filteredCases.find((c) => c.id === selectedId) ?? filteredCases[0] ?? cases[0] ?? null;

  function localizeCase(item: IntuitionCaseItem) {
    if (locale === "es" && CASE_ES[item.id]) return CASE_ES[item.id]!;
    if (locale === "fr" && CASE_FR[item.id]) return CASE_FR[item.id]!;
    if (locale === "pt" && CASE_PT[item.id]) return CASE_PT[item.id]!;
    return item;
  }

  function kindLabel(kind: IntuitionCaseItem["kind"]) {
    return kind === "prioritization"
      ? copy.prioritization
      : kind === "tradeoffs"
        ? copy.tradeoffs
        : copy.hypotheses;
  }

  function selectCase(id: string) {
    setSelectedId(id);
    setChoice(null);
    setReasoning("");
    setResult(null);
    setError(null);
  }

  async function handleReveal() {
    if (!activeCase || choice === null || !reasoning.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/training/intuition/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: activeCase.id,
          choice,
          confidence,
          reasoning: reasoning.trim(),
        }),
      });
      const body = (await res.json()) as RevealResponse & { error?: string };
      if (!res.ok) throw new Error(body.error || "Could not reveal outcome.");
      setResult(body);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not reveal outcome.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleNextCase() {
    if (!filteredCases.length || !activeCase) return;
    const idx = filteredCases.findIndex((c) => c.id === activeCase.id);
    const next = filteredCases[(idx + 1) % filteredCases.length];
    if (next) selectCase(next.id);
  }

  const localizedActive = activeCase ? localizeCase(activeCase) : null;

  return (
    <main>
      <PageHeader
        title={copy.title}
        meta={copy.intro}
      />

      <PageBody className="space-y-6 pt-2">
        {error && <Notice tone="error">{error}</Notice>}

        {loading ? (
          <Widget label="CASES" className="p-6">
            <p role="status" className="text-sm text-cream-dim">
              {copy.loadingCases}
            </p>
          </Widget>
        ) : (
          <div className="grid gap-6 xl:grid-cols-12">
            {/* Left column: Filter + Case rail */}
            <div className="space-y-4 xl:col-span-4">
              <Widget label={copy.filterLabel} className="p-5">
                <fieldset className="flex flex-wrap gap-2">
                  <legend className="sr-only">{copy.filterLabel}</legend>
                  {(
                    [
                      ["all", copy.filterAll],
                      ["prioritization", copy.prioritization],
                      ["tradeoffs", copy.tradeoffs],
                      ["hypotheses", copy.hypotheses],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={kindFilter === id}
                      onClick={() => {
                        setKindFilter(id);
                        const nextList = cases.filter((c) => id === "all" || c.kind === id);
                        if (nextList[0]) selectCase(nextList[0].id);
                      }}
                      className="focus-ring rounded-full border border-line bg-surface-base px-3.5 py-1.5 text-sm font-medium text-cream-bright transition-colors hover:border-line-bright aria-pressed:border-accent-border aria-pressed:bg-accent-soft aria-pressed:text-accent-text"
                    >
                      {label}
                    </button>
                  ))}
                </fieldset>
              </Widget>

              <div className="space-y-2.5">
                {filteredCases.map((item, idx) => {
                  const loc = localizeCase(item);
                  const isSelected = activeCase?.id === item.id;
                  return (
                    <FadeRise key={item.id} delay={idx * 0.03}>
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => selectCase(item.id)}
                        className={`focus-ring flex w-full flex-col justify-between rounded-[1.25rem] border p-4 text-left transition-all ${
                          isSelected
                            ? "border-accent-border bg-surface-lift shadow-card"
                            : "border-line bg-surface-card hover:border-line-bright hover:bg-surface-lift"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <MonoLabel>#{String(idx + 1).padStart(2, "0")}</MonoLabel>
                          {/* The kind as words, not a chip. Six cases in a
                              narrow column used to carry six peach blocks
                              for one word each; the word is what the reader
                              needs and the colour was decoration. */}
                          <span className="text-xs text-cream-dim">{kindLabel(item.kind)}</span>
                        </div>
                        <p className="mt-2 text-sm font-medium tracking-[-0.015em] text-cream-bright">
                          {loc.title}
                        </p>
                      </button>
                    </FadeRise>
                  );
                })}
              </div>
            </div>

            {/* Right column: Active case decision + Historical reveal */}
            <div className="space-y-6 xl:col-span-8">
              {activeCase && localizedActive && (
                <Widget
                  label={`${activeCase.id.toUpperCase()} · ${kindLabel(activeCase.kind)}`}
                  className="p-6 sm:p-8"
                >
                  <div className="flex items-center gap-3">
                    <IconTile>
                      <Compass className="h-4 w-4" aria-hidden />
                    </IconTile>
                    <h2 className="text-xl font-medium tracking-[-0.025em] text-cream-bright sm:text-2xl">
                      {localizedActive.title}
                    </h2>
                  </div>

                  <p className="mt-1 text-sm leading-relaxed text-cream-dim">
                    {localizedActive.prompt}
                  </p>

                  <fieldset className="mt-5 space-y-2.5" disabled={Boolean(result)}>
                    <legend className="text-sm font-medium text-cream-bright">
                      {copy.optionsLegend}
                    </legend>
                    {localizedActive.options.map((opt, idx) => {
                      const checked = choice === idx;
                      return (
                        <label
                          key={idx}
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm transition-colors ${
                            checked
                              ? "border-accent-border bg-accent-soft text-cream-bright"
                              : "border-line bg-surface-base text-cream-bright hover:bg-surface-lift"
                          }`}
                        >
                          <input
                            type="radio"
                            name="intuition-choice"
                            value={idx}
                            checked={checked}
                            onChange={() => setChoice(idx)}
                            className="mt-1 text-sm"
                          />
                          <span className="leading-relaxed">{opt}</span>
                        </label>
                      );
                    })}
                  </fieldset>

                  <InsetPanel className="mt-5 p-4">
                    <label
                      htmlFor="confidence-range"
                      className="flex items-center justify-between text-sm font-medium text-cream-bright"
                    >
                      <span>{copy.confidenceLabel}</span>
                      <span className="font-mono text-accent-text">{confidence}%</span>
                    </label>
                    <input
                      id="confidence-range"
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      disabled={Boolean(result)}
                      value={confidence}
                      onChange={(e) => setConfidence(Number(e.target.value))}
                      className="mt-3 w-full text-sm"
                    />
                    {/* No second meter. The slider already shows where the
                        value sits and the label already says what it is; the
                        bar underneath repeated both a third time. */}
                  </InsetPanel>

                  <div className="mt-5">
                    <Field label={copy.reasoningLabel} htmlFor="intuition-reasoning">
                      <textarea
                        id="intuition-reasoning"
                        rows={3}
                        maxLength={2000}
                        disabled={Boolean(result)}
                        value={reasoning}
                        onChange={(e) => setReasoning(e.target.value)}
                        placeholder={copy.reasoningPlaceholder}
                        className="focus-ring mt-1 w-full rounded-xl border border-line bg-surface-base p-3.5 text-sm text-cream-bright"
                      />
                    </Field>
                  </div>

                  {!result && (
                    <div className="mt-5">
                      <Action
                        type="button"
                        withArrow
                        disabled={choice === null || !reasoning.trim() || submitting}
                        onClick={handleReveal}
                      >
                        {submitting ? copy.revealingBtn : copy.revealBtn}
                      </Action>
                    </div>
                  )}
                </Widget>
              )}

              {result && activeCase && localizedActive && (
                <Panel variant="raised" className="p-6 sm:p-8">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <MonoLabel>{copy.outcomeEyebrow}</MonoLabel>
                    <Chip>
                      {result.judgment.choice === result.recommended
                        ? copy.alignedBadge
                        : copy.differsBadge}
                    </Chip>
                  </div>

                  <h3 className="mt-2.5 text-xl font-medium tracking-[-0.02em] text-cream-bright">
                    {result.reveal.name}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-cream-bright">
                    {result.reveal.outcome}
                  </p>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <InsetPanel className="p-4">
                      <MonoLabel>
                        {copy.yourChoice} ({result.judgment.confidence}%)
                      </MonoLabel>
                      <p className="mt-2 text-sm font-medium text-cream-bright">
                        {localizedActive.options[result.judgment.choice]}
                      </p>
                    </InsetPanel>
                    <InsetPanel className="p-4">
                      <MonoLabel className="text-accent-text">{copy.recommendedChoice}</MonoLabel>
                      <p className="mt-2 text-sm font-medium text-cream-bright">
                        {localizedActive.options[result.recommended]}
                      </p>
                    </InsetPanel>
                  </div>

                  <InsetPanel className="mt-4 p-4">
                    <MonoLabel>{copy.rationaleHeading}</MonoLabel>
                    <p className="mt-2 text-sm leading-relaxed text-cream-dim">
                      {result.rationale}
                    </p>
                  </InsetPanel>

                  <p className="mt-4 text-xs text-cream-dim">{result.reflection}</p>
                  <p className="mt-1 text-xs text-cream-faint">{result.presentation}</p>

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
                    <a
                      href={result.reveal.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="focus-ring inline-flex items-center gap-1.5 text-xs font-medium text-accent-text underline underline-offset-4"
                    >
                      {copy.sourceLabel}: {result.reveal.source}
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </a>
                    <Action type="button" withArrow onClick={handleNextCase}>
                      {copy.nextCaseBtn}
                    </Action>
                  </div>
                </Panel>
              )}
            </div>
          </div>
        )}
      </PageBody>
    </main>
  );
}
