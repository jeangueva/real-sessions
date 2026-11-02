import { useEffect, useState } from "react";
import { Compass, ExternalLink } from "lucide-react";
import {
  Action,
  Eyebrow,
  FadeRise,
  Field,
  Notice,
  Panel,
} from "@/design-system";
import { Chip, IconTile, Inset, MonoLabel, Widget } from "@/components/marketing";
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

const CASE_ES: Record<string, { title: string; prompt: string; options: [string, string, string] }> = {
  "case-a": {
    title: "Actividad automatizada inesperada tras un despliegue",
    prompt: "Un sistema automatizado de transacciones acaba de recibir una actualización de software. Aparecen alertas antes de la apertura y comienza una actividad inesperada. ¿Qué priorizas primero?",
    options: [
      "Contener la actividad de inmediato y verificar la consistencia de las versiones desplegadas",
      "Esperar unos minutos para observar si el volumen se estabiliza solo",
      "Aumentar la capacidad de procesamiento para vaciar la cola más rápido",
    ],
  },
  "case-b": {
    title: "Recuperación tras una interrupción de red",
    prompt: "Un servicio sufrió una breve caída de red y los estados de las bases de datos divergieron. Puedes restaurar la disponibilidad rápido aceptando posibles inconsistencias o pausar escrituras mientras reconcilias los datos. ¿Qué enfoque eliges?",
    options: [
      "Reanudar todas las escrituras de inmediato",
      "Priorizar la integridad de los datos y comunicar una recuperación más gradual",
      "Asumir que la reconexión automática reparó la divergencia",
    ],
  },
  "case-c": {
    title: "Desfase entre dos equipos en una interfaz crítica",
    prompt: "Dos equipos intercambian datos numéricos para guiar un vehículo remoto. La trayectoria observada difiere de la predicción. ¿Qué hipótesis pruebas primero en la interfaz?",
    options: [
      "Las mediciones deben ser ruido aleatorio",
      "El vehículo tiene una falla mecánica interna",
      "Quien produce el dato y quien lo consume están interpretando las unidades de forma distinta",
    ],
  },
  "case-d": {
    title: "Fricción en el registro antes de pagar",
    prompt: "Muchos compradores abandonan el carrito justo después de pulsar el botón de pago, donde se les pide registrarse o iniciar sesión antes de completar la compra. ¿Qué hipótesis de producto pruebas primero?",
    options: [
      "Reemplazar el registro obligatorio previo al pago por compra como invitado y creación opcional de cuenta al finalizar",
      "Agregar más indicaciones de validación de contraseña en el formulario de registro",
      "Enviar un correo con descuento 24 horas después del abandono",
    ],
  },
  "case-e": {
    title: "Exceso de funciones frente al flujo con tracción real",
    prompt: "Tu aplicación móvil incluye insignias de juego, planes grupales y publicación de fotos, pero la retención está estancada y solo una función — compartir fotos con filtros — muestra tracción orgánica clara. ¿Cómo asignas el siguiente ciclo de producto?",
    options: [
      "Construir más recompensas sociales para levantar las funciones rezagadas",
      "Reenfocar el producto en el único flujo de fotos con señal fuerte y recortar el resto",
      "Mantener todas las funciones y rediseñar la barra de navegación",
    ],
  },
  "case-f": {
    title: "Alto tráfico y pocas reservas en un marketplace",
    prompt: "Los anuncios de alojamiento en una ciudad principal reciben visitas, pero las reservas siguen bajas. Al revisar las publicaciones, las fotos son oscuras y tomadas con teléfonos de baja resolución. ¿Qué priorizas esta semana?",
    options: [
      "Reescribir el algoritmo de ordenamiento de búsqueda",
      "Probar fotografía de alta calidad en una muestra de anuncios para verificar si la confianza visual es el cuello de botella",
      "Reducir la comisión de la plataforma en 2%",
    ],
  },
};

const COPY = {
  en: {
    eyebrow: "",
    title: "Product intuition",
    intro: "Make the call on a real case, say how sure you are and why, then see what actually happened.",
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
    eyebrow: "",
    title: "Intuición de producto",
    intro: "Decides en un caso real, dices qué tan seguro estás y por qué, y después ves qué pasó de verdad.",
    filterLabel: "Tipo de criterio",
    filterAll: "Todos los casos",
    prioritization: "Priorización",
    tradeoffs: "Trade-offs",
    hypotheses: "Hipótesis",
    stepCommit: "1. Decide antes de ver qué pasó",
    optionsLegend: "Elige tu decisión",
    confidenceLabel: "Nivel de confianza en tu decisión",
    reasoningLabel: "¿Por qué eliges esta opción? ¿Qué señal pesa más y qué supuesto podría fallar?",
    reasoningPlaceholder: "Escribe la señal principal en la que te apoyas y qué evidencia te haría cambiar de postura…",
    revealBtn: "Confirmar y ver el caso real",
    revealingBtn: "Revelando caso documentado…",
    outcomeEyebrow: "Lo que pasó",
    yourChoice: "Tu decisión",
    recommendedChoice: "Enfoque recomendado",
    alignedBadge: "Igual que en el caso real",
    differsBadge: "Distinto del caso real",
    rationaleHeading: "Por qué se sostiene este criterio",
    sourceLabel: "Consultar fuente original",
    nextCaseBtn: "Practicar siguiente caso",
    loadingCases: "Cargando casos de intuición…",
  },
  pt: {
    eyebrow: "",
    title: "Intuição de produto",
    intro: "Você decide em um caso real, diz o quanto tem certeza e por quê, e depois vê o que aconteceu de verdade.",
    filterLabel: "Tipo de decisão",
    filterAll: "Todos os casos",
    prioritization: "Priorização",
    tradeoffs: "Trade-offs",
    hypotheses: "Hipóteses",
    stepCommit: "1. Decida antes de ver o que aconteceu",
    optionsLegend: "Escolha sua decisão",
    confidenceLabel: "Nível de confiança nesta decisão",
    reasoningLabel: "Por que esta opção? Qual sinal mais importa e qual suposição pode falhar?",
    reasoningPlaceholder: "Escreva o sinal principal em que você se apoia e que evidência mudaria sua decisão…",
    revealBtn: "Confirmar decisão e revelar caso real",
    revealingBtn: "Revelando caso documentado…",
    outcomeEyebrow: "O que aconteceu",
    yourChoice: "Sua decisão",
    recommendedChoice: "Abordagem recomendada",
    alignedBadge: "Alinhado com a lição documentada",
    differsBadge: "Diferente da abordagem recomendada",
    rationaleHeading: "Por que esse critério se sustenta",
    sourceLabel: "Consultar fonte original",
    nextCaseBtn: "Praticar próximo caso",
    loadingCases: "Carregando casos de intuição…",
  },
  fr: {
    eyebrow: "",
    title: "Intuition produit",
    intro: "Vous tranchez sur un cas réel, dites à quel point vous êtes sûr et pourquoi, puis voyez ce qui s’est vraiment passé.",
    filterLabel: "Type de décision",
    filterAll: "Tous les cas",
    prioritization: "Priorisation",
    tradeoffs: "Arbitrages",
    hypotheses: "Hypothèses",
    stepCommit: "1. Décidez avant de voir ce qui s’est passé",
    optionsLegend: "Votre décision",
    confidenceLabel: "Votre certitude",
    reasoningLabel: "Pourquoi cette option ? Quel signal compte le plus, et quelle hypothèse pourrait tomber ?",
    reasoningPlaceholder: "Écrivez le signal sur lequel vous vous appuyez et ce qui vous ferait changer d’avis…",
    revealBtn: "Valider et voir le cas réel",
    revealingBtn: "Ouverture du cas…",
    outcomeEyebrow: "Ce qui s’est passé",
    yourChoice: "Votre décision",
    recommendedChoice: "Approche recommandée",
    alignedBadge: "Comme dans le cas réel",
    differsBadge: "Différent du cas réel",
    rationaleHeading: "Pourquoi cette approche tient",
    sourceLabel: "Lire la source",
    nextCaseBtn: "Cas suivant",
    loadingCases: "Chargement des cas…",
  },
} as const;

export function IntuitionTrainer() {
  const { locale } = useLocale();
  const copy = locale === "es" ? COPY.es : locale === "pt" ? COPY.pt : locale === "fr" ? COPY.fr : COPY.en;
  const isEs = locale === "es";
  const tag = (es: string, pt: string, en: string) => (locale === "es" ? es : locale === "pt" ? pt : en);

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
        if (list[0]) setSelectedId(list[0].id);
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
    if (isEs && CASE_ES[item.id]) return CASE_ES[item.id]!;
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
          <Widget label={tag("Casos", "Casos", "Cases")} className="p-6">
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
                          <Chip>{kindLabel(item.kind)}</Chip>
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
                  label={kindLabel(activeCase.kind)}
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

                  <Inset className="mt-5 p-4">
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
                      className="mt-3 w-full accent-[#F6B733]"
                    />
                  </Inset>

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
                    <Eyebrow>{copy.outcomeEyebrow}</Eyebrow>
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
                    <Inset className="p-4">
                      <MonoLabel>
                        {copy.yourChoice} ({result.judgment.confidence}%)
                      </MonoLabel>
                      <p className="mt-2 text-sm font-medium text-cream-bright">
                        {localizedActive.options[result.judgment.choice]}
                      </p>
                    </Inset>
                    <Inset className="p-4">
                      <MonoLabel className="text-accent-text">{copy.recommendedChoice}</MonoLabel>
                      <p className="mt-2 text-sm font-medium text-cream-bright">
                        {localizedActive.options[result.recommended]}
                      </p>
                    </Inset>
                  </div>

                  <Inset className="mt-4 p-4">
                    <MonoLabel>{copy.rationaleHeading}</MonoLabel>
                    <p className="mt-2 text-sm leading-relaxed text-cream-dim">
                      {result.rationale}
                    </p>
                  </Inset>

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
