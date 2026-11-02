import { useEffect, useState } from "react";
import { Eyebrow, Panel } from "@/design-system";
import { useLocale } from "@/hooks/useLocale";

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
    eyebrow: "Professional · Product, Design & Systems Intuition",
    title: "Deliberate intuition trainer with real-world outcomes",
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
    eyebrow: "Profesional · Intuición de Producto, Diseño y Sistemas",
    title: "Entrenador de intuición de producto y diseño con feedback de realidad",
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
    eyebrow: "Profissional · Intuição de Produto, Design e Sistemas",
    title: "Treinador de intuição de produto e design com feedback da realidade",
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
} as const;

export function IntuitionTrainer() {
  const { locale } = useLocale();
  const copy = locale === "es" ? COPY.es : locale === "pt" ? COPY.pt : COPY.en;
  const isEs = locale === "es";

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
    <main className="mx-auto w-full max-w-5xl px-4 py-6 text-cream-bright sm:p-8">
      <Eyebrow>{copy.eyebrow}</Eyebrow>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{copy.title}</h1>
      <p className="mt-3 max-w-3xl text-sm text-cream-dim">{copy.intro}</p>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-card border border-step-border bg-step-soft p-4 text-sm text-cream-bright"
        >
          {error}
        </div>
      )}

      {loading ? (
        <p role="status" className="mt-6 text-sm text-cream-dim">
          {copy.loadingCases}
        </p>
      ) : (
        <div className="mt-6 space-y-6">
          <fieldset className="flex flex-wrap gap-2">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-cream-faint">
              {copy.filterLabel}
            </legend>
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
                className="focus-ring rounded-full border border-line px-4 py-2 text-xs font-medium text-cream-bright aria-pressed:border-accent-border aria-pressed:bg-accent-soft aria-pressed:text-accent-text"
              >
                {label}
              </button>
            ))}
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCases.map((item) => {
              const loc = localizeCase(item);
              const isSelected = activeCase?.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => selectCase(item.id)}
                  className="focus-ring flex flex-col justify-between rounded-card border border-line bg-surface-card p-4 text-left transition-colors hover:bg-surface-lift aria-pressed:border-accent-border aria-pressed:bg-surface-lift"
                >
                  <div>
                    <span className="inline-block rounded-full bg-surface-lift px-2.5 py-0.5 text-xs font-medium text-accent-text">
                      {kindLabel(item.kind)}
                    </span>
                    <p className="mt-2 text-sm font-semibold text-cream-bright">{loc.title}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {activeCase && localizedActive && (
            <Panel className="p-6">
              <span className="inline-block rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-text">
                {kindLabel(activeCase.kind)}
              </span>
              <h2 className="mt-3 text-xl font-semibold text-cream-bright">
                {localizedActive.title}
              </h2>
              <p className="mt-2 text-sm text-cream-dim">{localizedActive.prompt}</p>

              <fieldset className="mt-5 space-y-2.5" disabled={Boolean(result)}>
                <legend className="text-sm font-semibold text-cream-bright">
                  {copy.optionsLegend}
                </legend>
                {localizedActive.options.map((opt, idx) => (
                  <label
                    key={idx}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-surface-base p-3.5 text-sm hover:bg-surface-lift"
                  >
                    <input
                      type="radio"
                      name="intuition-choice"
                      value={idx}
                      checked={choice === idx}
                      onChange={() => setChoice(idx)}
                      className="mt-1"
                    />
                    <span className="text-cream-bright">{opt}</span>
                  </label>
                ))}
              </fieldset>

              <div className="mt-5">
                <label
                  htmlFor="confidence-range"
                  className="flex items-center justify-between text-sm font-semibold text-cream-bright"
                >
                  <span>{copy.confidenceLabel}</span>
                  <span className="text-accent-text">{confidence}%</span>
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
                  className="mt-2 w-full"
                />
              </div>

              <div className="mt-5">
                <label
                  htmlFor="intuition-reasoning"
                  className="block text-sm font-semibold text-cream-bright"
                >
                  {copy.reasoningLabel}
                </label>
                <textarea
                  id="intuition-reasoning"
                  rows={3}
                  maxLength={2000}
                  disabled={Boolean(result)}
                  value={reasoning}
                  onChange={(e) => setReasoning(e.target.value)}
                  placeholder={copy.reasoningPlaceholder}
                  className="focus-ring mt-2 w-full rounded-lg border border-line bg-surface-base p-3 text-sm text-cream-bright"
                />
              </div>

              {!result && (
                <button
                  type="button"
                  disabled={choice === null || !reasoning.trim() || submitting}
                  onClick={handleReveal}
                  className="focus-ring mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-accent-ink disabled:opacity-50"
                >
                  {submitting ? copy.revealingBtn : copy.revealBtn}
                </button>
              )}
            </Panel>
          )}

          {result && activeCase && localizedActive && (
            <Panel className="p-6">
              <Eyebrow>{copy.outcomeEyebrow}</Eyebrow>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-xl font-semibold text-cream-bright">{result.reveal.name}</h3>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    result.judgment.choice === result.recommended
                      ? "bg-ok-soft text-ok"
                      : "bg-step-soft text-step"
                  }`}
                >
                  {result.judgment.choice === result.recommended
                    ? copy.alignedBadge
                    : copy.differsBadge}
                </span>
              </div>

              <p className="mt-3 text-sm text-cream-bright">{result.reveal.outcome}</p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-line bg-surface-base p-4 text-xs">
                  <p className="font-semibold text-cream-faint">
                    {copy.yourChoice} ({result.judgment.confidence}%)
                  </p>
                  <p className="mt-1 text-sm font-medium text-cream-bright">
                    {localizedActive.options[result.judgment.choice]}
                  </p>
                </div>
                <div className="rounded-lg border border-line bg-surface-base p-4 text-xs">
                  <p className="font-semibold text-accent-text">{copy.recommendedChoice}</p>
                  <p className="mt-1 text-sm font-medium text-cream-bright">
                    {localizedActive.options[result.recommended]}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-line bg-surface-base p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-accent-text">
                  {copy.rationaleHeading}
                </h4>
                <p className="mt-1.5 text-sm text-cream-dim">{result.rationale}</p>
              </div>

              <p className="mt-4 text-xs text-cream-dim">{result.reflection}</p>
              <p className="mt-1 text-xs text-cream-faint">{result.presentation}</p>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                <a
                  href={result.reveal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-ring text-xs font-medium text-accent-text underline underline-offset-4"
                >
                  {copy.sourceLabel}: {result.reveal.source} ↗
                </a>
                <button
                  type="button"
                  onClick={handleNextCase}
                  className="focus-ring inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-ink"
                >
                  {copy.nextCaseBtn}
                </button>
              </div>
            </Panel>
          )}
        </div>
      )}
    </main>
  );
}
