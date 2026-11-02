import { useEffect, useState } from "react";
import { Eyebrow, Panel } from "@/design-system";
import { useLocale } from "@/hooks/useLocale";

export interface ScenarioItem {
  id: string;
  domain: "education" | "professional";
  personal?: boolean;
  title: string;
  role: string;
  brief: string;
  goal: string;
}

export interface CultureItem {
  id: "neutral" | "latam" | "north-america";
  label: string;
  detail: string;
}

interface Turn {
  role: "user" | "assistant";
  text: string;
}

interface ConversationState {
  token: string;
  messages: Turn[];
  answers: number;
  maxAnswers: number;
  complete: boolean;
}

interface FeedbackData {
  summary: string;
  strengths: string[];
  improvements: string[];
  suggestedReply: string;
  nextPractice: string;
}

type TrackFilter = "all" | "tech" | "personal";

const SCENARIO_ES: Record<string, { title: string; role: string; brief: string; goal: string }> = {
  "group-project": {
    title: "Trabajo grupal desbalanceado",
    role: "Un compañero de clase que no entregó dos avances",
    brief: "La exposición es la próxima semana. Acuerda una división justa y específica sin terminar haciendo todo por tu cuenta.",
    goal: "Nombra hechos observables, pregunta qué bloquea el avance y acuerda responsables con una fecha de revisión.",
  },
  "grade-review": {
    title: "Pedir explicación de una calificación",
    role: "Un docente con poco tiempo de atención",
    brief: "Tu proyecto recibió menos puntaje del que esperabas. Tienes la rúbrica, pero no entiendes cómo se evaluó un criterio.",
    goal: "Pide evidencia concreta y cómo mejorar sin exigir una nota más alta.",
  },
  "research-uncertainty": {
    title: "Resultados que no respaldan tu hipótesis",
    role: "Un asesor de investigación que esperaba un resultado contundente",
    brief: "Tu estudio muestra resultados mixtos. Conversa con honestidad sobre las limitaciones y el siguiente paso metodológico.",
    goal: "Separa la evidencia de la interpretación y evita exagerar la certeza.",
  },
  "advisor-scope": {
    title: "Negociar el alcance de la tesis con tu asesor",
    role: "Un asesor que sugiere agregar un capítulo empírico cerca de la entrega",
    brief: "Tu fecha límite es en seis semanas. Tu asesor propone un experimento adicional que retrasaría tu sustentación.",
    goal: "Reconoce el valor académico, haz explícita la restricción de tiempo y propón llevar esa extensión a trabajo futuro.",
  },
  "oral-exam-question": {
    title: "Aclarar una pregunta ambigua en examen oral",
    role: "Un jurado que plantea una pregunta teórica amplia bajo presión de tiempo",
    brief: "Durante una defensa o seminario, un miembro del jurado hace una pregunta que puede responderse desde dos marcos distintos.",
    goal: "Explica brevemente tu interpretación, confirma el enfoque con el jurado y responde con estructura.",
  },
  "founder-no": {
    title: "Decirle que no a un founder",
    role: "Un founder que pide comprometer una fecha de lanzamiento",
    brief: "El founder quiere anunciar una funcionalidad grande este viernes, pero la versión actual todavía tiene riesgos de estabilidad.",
    goal: "Pon un límite claro, explica las consecuencias y ofrece una alternativa más pequeña y reversible.",
  },
  "engineering-scope": {
    title: "Negociar alcance con ingeniería y producto",
    role: "Un líder de producto que prometió un lanzamiento amplio",
    brief: "Dos desarrolladores tienen un sprint. El alcance pedido incluye una migración y tres funciones visibles para usuarios.",
    goal: "Aclara prioridades, visibiliza dependencias y acuerda qué queda fuera de esta entrega.",
  },
  "designer-feedback": {
    title: "Dar feedback difícil a un diseñador senior",
    role: "Un diseñador senior muy comprometido con su propuesta",
    brief: "En las pruebas de usabilidad las personas no encontraron la acción principal. Conversa sobre el diseño sin atacar a quien lo creó.",
    goal: "Usa observaciones concretas, invita a interpretar la señal y propón una iteración verificable.",
  },
  "stakeholder": {
    title: "Explicar un retraso técnico a un stakeholder",
    role: "Un stakeholder no técnico con un compromiso frente a clientes",
    brief: "Una integración externa está fallando. Explica el impacto en el negocio y las opciones sin jerga ni falsas promesas.",
    goal: "Traduce el riesgo técnico a consecuencias claras, verifica entendimiento y acuerda una decisión.",
  },
  "incomplete-data": {
    title: "Decidir con datos incompletos",
    role: "Una gerencia que pide una recomendación cerrada hoy",
    brief: "Los primeros datos de conversión parecen positivos, pero la muestra es pequeña y los tickets de soporte están subiendo.",
    goal: "Declara la incertidumbre, separa hipótesis de hechos y define un umbral claro para decidir.",
  },
  "family-money": {
    title: "Hablar de dinero con la familia",
    role: "Un familiar cercano que pide apoyo económico recurrente",
    brief: "Te importa tu familiar, pero no puedes sostener el monto que te pide. Practica cómo poner un límite sin hacer promesas que no puedas cumplir.",
    goal: "Cuida el vínculo, expresa tu límite con claridad y conversa sobre alternativas realistas.",
  },
  "in-laws": {
    title: "Poner límites con los suegros",
    role: "Un familiar político que espera pasar todas las fiestas juntos",
    brief: "Tú y tu pareja quieren organizar las fechas de fin de año de otra manera. Conversa sobre las expectativas sin culpar a tu pareja.",
    goal: "Plantea un límite compartido, escucha su postura y propón un acuerdo concreto.",
  },
  "inheritance": {
    title: "Desacuerdo por una herencia familiar",
    role: "Un hermano que quiere decidir rápido sobre un bien familiar",
    brief: "Necesitas revisar documentos y tiempo antes de aceptar. Practica la conversación enfocándote en la comunicación, no en asesoría legal.",
    goal: "Separa la carga emocional de los datos pendientes y sugiere un proceso profesional neutral.",
  },
  "conflict-avoidance": {
    title: "Abordar un conflicto que vienes evitando",
    role: "Una persona cercana que cree que el tema ya estaba resuelto",
    brief: "Has evitado hablar sobre una responsabilidad compartida que se volvió desigual. Abre la conversación con calma y haz un pedido concreto.",
    goal: "Describe el patrón sin adivinar intenciones, escucha su punto de vista y acuerda un primer paso pequeño.",
  },
};

const CULTURE_ES: Record<CultureItem["id"], { label: string; detail: string }> = {
  neutral: {
    label: "Sin contexto regional específico",
    detail: "Pregunta por las preferencias individuales sin asumir normas regionales.",
  },
  latam: {
    label: "Latinoamérica",
    detail: "El contexto es Latinoamérica. Considera matices de cercanía, manejo de la armonía y respeto relacional sin caer en estereotipos.",
  },
  "north-america": {
    label: "Norteamérica",
    detail: "El contexto es Norteamérica. Considera acuerdos explícitos y comunicación directa adaptada a cada equipo o familia.",
  },
};

const COPY = {
  en: {
    eduEyebrow: "Education · Academic simulations",
    eduTitle: "Academic scenarios and high-stakes conversations",
    eduIntro: "Rehearse group project conflicts, rubric reviews, advisor scope negotiations and oral exam questions before they happen.",
    proEyebrow: "Professional · HardTalk Tech & Latam",
    proTitle: "High-stakes conversations for work and life",
    proIntro: "Practice stakeholder pushback in tech (saying no to a founder, negotiating engineering scope, giving senior design feedback) and culturally adapted personal conversations across Latin America and North America.",
    trackLabel: "Focus area",
    trackAll: "All scenarios",
    trackTech: "Tech & Stakeholder Lab",
    trackPersonal: "Personal & Cultural (HardTalk Latam / NA)",
    scenarioHeading: "1. Choose a scenario",
    cultureHeading: "2. Cultural context",
    languageHeading: "3. Rehearsal language",
    langEs: "Español",
    langEn: "English",
    langPt: "Português",
    partnerRole: "AI partner role",
    situation: "Situation",
    goal: "Your objective",
    startBtn: "Start rehearsal",
    startingBtn: "Opening conversation…",
    turnCount: (answers: number, max: number) => `Exchange ${answers} of ${max}`,
    partnerTag: "Counterpart",
    youTag: "You",
    replyLabel: "Your response",
    replyPlaceholder: "Write what you would actually say in this conversation…",
    sendBtn: "Send response",
    sendingBtn: "Responding…",
    feedbackBtn: "Get coaching feedback",
    feedbackLoading: "Preparing coaching feedback…",
    resetBtn: "Choose another scenario",
    feedbackEyebrow: "Coaching observation",
    feedbackTitle: "What worked and what to try next",
    strengths: "What worked well",
    improvements: "Where to sharpen",
    suggestedReply: "Alternative phrasing in your voice",
    nextPractice: "Next deliberate practice",
    loadingCatalogue: "Loading conversation catalogue…",
    personalBadge: "Personal & family",
    techBadge: "Tech & workplace",
    academicBadge: "Academic",
  },
  es: {
    eduEyebrow: "Educación · Simulaciones académicas",
    eduTitle: "Escenarios académicos y conversaciones de estudio",
    eduIntro: "Ensaya acuerdos en trabajos grupales, revisión de rúbricas con docentes, alcance de tesis con tu asesor y preguntas ambiguas de jurado.",
    proEyebrow: "Profesional · HardTalk Tech y Conversaciones Difíciles",
    proTitle: "Conversaciones de alto riesgo en tecnología y vida personal",
    proIntro: "Entrena conversaciones difíciles del mundo tech (decir que no a un founder, negociar alcance de ingeniería, dar feedback a un diseñador senior, alinear stakeholders con datos incompletos) y situaciones personales adaptadas al contexto cultural de Latinoamérica y Norteamérica.",
    trackLabel: "Área de práctica",
    trackAll: "Todos los escenarios",
    trackTech: "Mundo Tech · Stakeholder Lab",
    trackPersonal: "Personal y familiar · HardTalk Latam / NA",
    scenarioHeading: "1. Elige un escenario",
    cultureHeading: "2. Contexto cultural",
    languageHeading: "3. Idioma de la práctica",
    langEs: "Español",
    langEn: "English",
    langPt: "Português",
    partnerRole: "Rol de la contraparte",
    situation: "Situación",
    goal: "Tu objetivo",
    startBtn: "Comenzar simulación",
    startingBtn: "Iniciando simulación…",
    turnCount: (answers: number, max: number) => `Intercambio ${answers} de ${max}`,
    partnerTag: "Contraparte",
    youTag: "Tú",
    replyLabel: "Tu respuesta",
    replyPlaceholder: "Escribe lo que dirías con tus propias palabras…",
    sendBtn: "Enviar respuesta",
    sendingBtn: "Respondiendo…",
    feedbackBtn: "Pedir feedback de la práctica",
    feedbackLoading: "Preparando observaciones…",
    resetBtn: "Cambiar de escenario",
    feedbackEyebrow: "Observaciones de práctica",
    feedbackTitle: "Qué funcionó y qué ajustar en el siguiente intento",
    strengths: "Puntos sólidos",
    improvements: "Ajustes recomendados",
    suggestedReply: "Propuesta de respuesta con tu propia voz",
    nextPractice: "Siguiente ejercicio sugerido",
    loadingCatalogue: "Cargando catálogo de escenarios…",
    personalBadge: "Personal y familiar",
    techBadge: "Tech y trabajo",
    academicBadge: "Académico",
  },
  pt: {
    eduEyebrow: "Educação · Simulações acadêmicas",
    eduTitle: "Cenários acadêmicos e conversas de estudo",
    eduIntro: "Ensaie acordos em trabalhos em grupo, revisão de rubricas, escopo de tese com seu orientador e perguntas de banca.",
    proEyebrow: "Profissional · HardTalk Tech e Conversas Difíceis",
    proTitle: "Conversas de alto risco no trabalho e na vida pessoal",
    proIntro: "Pratique conversas difíceis em tecnologia (dizer não a um fundador, negociar escopo de engenharia, dar feedback a um designer sênior) e situações pessoais com contexto cultural da América Latina e da América do Norte.",
    trackLabel: "Área de prática",
    trackAll: "Todos os cenários",
    trackTech: "Mundo Tech · Stakeholder Lab",
    trackPersonal: "Pessoal e familiar · HardTalk Latam / NA",
    scenarioHeading: "1. Escolha um cenário",
    cultureHeading: "2. Contexto cultural",
    languageHeading: "3. Idioma da prática",
    langEs: "Español",
    langEn: "English",
    langPt: "Português",
    partnerRole: "Papel da contraparte",
    situation: "Situação",
    goal: "Seu objetivo",
    startBtn: "Iniciar simulação",
    startingBtn: "Iniciando simulação…",
    turnCount: (answers: number, max: number) => `Interação ${answers} de ${max}`,
    partnerTag: "Contraparte",
    youTag: "Você",
    replyLabel: "Sua resposta",
    replyPlaceholder: "Escreva o que você diria com suas próprias palavras…",
    sendBtn: "Enviar resposta",
    sendingBtn: "Respondendo…",
    feedbackBtn: "Solicitar feedback da prática",
    feedbackLoading: "Preparando observações…",
    resetBtn: "Escolher outro cenário",
    feedbackEyebrow: "Observações da prática",
    feedbackTitle: "O que funcionou e o que ajustar na próxima tentativa",
    strengths: "Pontos fortes",
    improvements: "Ajustes recomendados",
    suggestedReply: "Sugestão de resposta na sua voz",
    nextPractice: "Próximo exercício sugerido",
    loadingCatalogue: "Carregando catálogo de cenários…",
    personalBadge: "Pessoal e familiar",
    techBadge: "Tech e trabalho",
    academicBadge: "Acadêmico",
  },
} as const;

export function TrainingConversations({ domain }: { domain: "education" | "professional" }) {
  const { locale } = useLocale();
  const copy = locale === "es" ? COPY.es : locale === "pt" ? COPY.pt : COPY.en;
  const isEs = locale === "es";

  const [scenarios, setScenarios] = useState<ScenarioItem[]>([]);
  const [cultures, setCultures] = useState<CultureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [track, setTrack] = useState<TrackFilter>("all");
  const [selectedId, setSelectedId] = useState<string>("");
  const [culture, setCulture] = useState<CultureItem["id"]>(domain === "professional" ? "latam" : "neutral");
  const [language, setLanguage] = useState<"es" | "en" | "pt">(
    locale === "es" ? "es" : locale === "pt" ? "pt" : "en",
  );

  const [session, setSession] = useState<ConversationState | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState<"start" | "answer" | "feedback" | null>(null);
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch("/api/training/catalogue")
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not load training catalogue.");
        return (await res.json()) as { scenarios: ScenarioItem[]; cultures: CultureItem[] };
      })
      .then((data) => {
        if (!active) return;
        const domainScenarios = (data.scenarios ?? []).filter((s) => s.domain === domain);
        setScenarios(domainScenarios);
        setCultures(data.cultures ?? []);
        if (domainScenarios[0]) setSelectedId(domainScenarios[0].id);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Could not load catalogue.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [domain]);

  const filteredScenarios = scenarios.filter((s) => {
    if (domain !== "professional" || track === "all") return true;
    return track === "personal" ? Boolean(s.personal) : !s.personal;
  });

  const activeScenario =
    filteredScenarios.find((s) => s.id === selectedId) ??
    filteredScenarios[0] ??
    scenarios[0] ??
    null;

  function localizeScenario(item: ScenarioItem) {
    if (isEs && SCENARIO_ES[item.id]) return SCENARIO_ES[item.id]!;
    return item;
  }

  function localizeCulture(item: CultureItem) {
    if (isEs && CULTURE_ES[item.id]) return CULTURE_ES[item.id]!;
    return item;
  }

  async function handleStart() {
    if (!activeScenario) return;
    setBusy("start");
    setError(null);
    setFeedback(null);
    try {
      const res = await fetch("/api/training/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: activeScenario.id,
          culture,
          language,
        }),
      });
      const body = (await res.json()) as ConversationState & { error?: string };
      if (!res.ok) throw new Error(body.error || "Could not start rehearsal.");
      setSession(body);
      setDraft("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not start rehearsal.");
    } finally {
      setBusy(null);
    }
  }

  async function handleSend() {
    if (!session || !draft.trim()) return;
    setBusy("answer");
    setError(null);
    try {
      const res = await fetch("/api/training/conversations/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: session.token,
          answer: draft.trim(),
        }),
      });
      const body = (await res.json()) as ConversationState & { error?: string };
      if (!res.ok) throw new Error(body.error || "Could not send response.");
      setSession(body);
      setDraft("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not send response.");
    } finally {
      setBusy(null);
    }
  }

  async function handleFeedback() {
    if (!session) return;
    setBusy("feedback");
    setError(null);
    try {
      const res = await fetch("/api/training/conversations/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: session.token }),
      });
      const body = (await res.json()) as { feedback?: FeedbackData; error?: string };
      if (!res.ok || !body.feedback) throw new Error(body.error || "Could not prepare feedback.");
      setFeedback(body.feedback);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not prepare feedback.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 text-cream-bright sm:p-8">
      <Eyebrow>{domain === "education" ? copy.eduEyebrow : copy.proEyebrow}</Eyebrow>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        {domain === "education" ? copy.eduTitle : copy.proTitle}
      </h1>
      <p className="mt-3 max-w-3xl text-sm text-cream-dim">
        {domain === "education" ? copy.eduIntro : copy.proIntro}
      </p>

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
          {copy.loadingCatalogue}
        </p>
      ) : !session ? (
        <div className="mt-6 space-y-6">
          {domain === "professional" && (
            <fieldset className="flex flex-wrap gap-2">
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-cream-faint">
                {copy.trackLabel}
              </legend>
              {(
                [
                  ["all", copy.trackAll],
                  ["tech", copy.trackTech],
                  ["personal", copy.trackPersonal],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={track === id}
                  onClick={() => {
                    setTrack(id);
                    const nextList = scenarios.filter((s) =>
                      id === "all" ? true : id === "personal" ? Boolean(s.personal) : !s.personal,
                    );
                    if (nextList[0]) setSelectedId(nextList[0].id);
                  }}
                  className="focus-ring rounded-full border border-line px-4 py-2 text-xs font-medium text-cream-bright transition-colors aria-pressed:border-accent-border aria-pressed:bg-accent-soft aria-pressed:text-accent-text"
                >
                  {label}
                </button>
              ))}
            </fieldset>
          )}

          <section aria-labelledby="scenario-picker-heading">
            <h2 id="scenario-picker-heading" className="text-base font-semibold text-cream-bright">
              {copy.scenarioHeading}
            </h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {filteredScenarios.map((item) => {
                const localized = localizeScenario(item);
                const selected = activeScenario?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setSelectedId(item.id)}
                    className="focus-ring flex flex-col justify-between rounded-card border border-line bg-surface-card p-5 text-left transition-colors hover:bg-surface-lift aria-pressed:border-accent-border aria-pressed:bg-surface-lift"
                  >
                    <div>
                      <span className="inline-block rounded-full bg-surface-lift px-2.5 py-0.5 text-xs font-medium text-accent-text">
                        {item.domain === "education"
                          ? copy.academicBadge
                          : item.personal
                            ? copy.personalBadge
                            : copy.techBadge}
                      </span>
                      <h3 className="mt-2 text-base font-semibold text-cream-bright">
                        {localized.title}
                      </h3>
                      <p className="mt-1.5 text-xs text-cream-dim">{localized.brief}</p>
                    </div>
                    <p className="mt-3 text-xs text-cream-faint">
                      <span className="font-semibold text-cream-dim">{copy.partnerRole}:</span>{" "}
                      {localized.role}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <Panel className="p-6">
            <div className="grid gap-6 md:grid-cols-2">
              <fieldset>
                <legend className="text-sm font-semibold text-cream-bright">
                  {copy.cultureHeading}
                </legend>
                <div className="mt-3 space-y-2">
                  {cultures.map((cItem) => {
                    const loc = localizeCulture(cItem);
                    return (
                      <label
                        key={cItem.id}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border border-line p-3 text-xs hover:bg-surface-lift"
                      >
                        <input
                          type="radio"
                          name="culture-context"
                          value={cItem.id}
                          checked={culture === cItem.id}
                          onChange={() => setCulture(cItem.id)}
                          className="mt-1"
                        />
                        <span>
                          <strong className="block text-sm font-medium text-cream-bright">
                            {loc.label}
                          </strong>
                          <span className="text-cream-dim">{loc.detail}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div className="flex flex-col justify-between gap-4">
                <fieldset>
                  <legend className="text-sm font-semibold text-cream-bright">
                    {copy.languageHeading}
                  </legend>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(
                      [
                        ["es", copy.langEs],
                        ["en", copy.langEn],
                        ["pt", copy.langPt],
                      ] as const
                    ).map(([code, label]) => (
                      <button
                        key={code}
                        type="button"
                        aria-pressed={language === code}
                        onClick={() => setLanguage(code)}
                        className="focus-ring rounded-full border border-line px-4 py-2 text-xs font-medium aria-pressed:border-accent-border aria-pressed:bg-accent-soft aria-pressed:text-accent-text"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </fieldset>

                {activeScenario && (
                  <div className="rounded-lg border border-line bg-surface-base p-4 text-xs">
                    <p className="font-semibold text-cream-bright">
                      {localizeScenario(activeScenario).title}
                    </p>
                    <p className="mt-1 text-cream-dim">
                      <strong>{copy.goal}:</strong> {localizeScenario(activeScenario).goal}
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  disabled={!activeScenario || busy === "start"}
                  onClick={handleStart}
                  className="focus-ring inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-accent-ink disabled:opacity-50"
                >
                  {busy === "start" ? copy.startingBtn : copy.startBtn}
                </button>
              </div>
            </div>
          </Panel>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {activeScenario && (
            <Panel className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-accent-text">
                    {copy.turnCount(session.answers, session.maxAnswers)}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-cream-bright">
                    {localizeScenario(activeScenario).title}
                  </h2>
                  <p className="mt-1 text-xs text-cream-dim">
                    <strong>{copy.goal}:</strong> {localizeScenario(activeScenario).goal}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSession(null);
                    setFeedback(null);
                    setError(null);
                  }}
                  className="focus-ring rounded-full border border-line px-4 py-2 text-xs text-cream-dim hover:bg-surface-lift"
                >
                  {copy.resetBtn}
                </button>
              </div>
            </Panel>
          )}

          <div className="space-y-3" aria-live="polite">
            {session.messages.map((turn, idx) => (
              <div
                key={idx}
                className={`rounded-card border p-4 text-sm ${
                  turn.role === "assistant"
                    ? "border-line bg-surface-card text-cream-bright"
                    : "border-accent-border bg-accent-soft text-cream-bright"
                }`}
              >
                <p className="text-xs font-semibold text-accent-text">
                  {turn.role === "assistant" ? copy.partnerTag : copy.youTag}
                </p>
                <p className="mt-1.5 whitespace-pre-wrap">{turn.text}</p>
              </div>
            ))}
          </div>

          {!session.complete && (
            <Panel className="p-5">
              <label htmlFor="conversation-reply" className="block text-sm font-semibold text-cream-bright">
                {copy.replyLabel}
              </label>
              <textarea
                id="conversation-reply"
                rows={3}
                maxLength={2000}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={copy.replyPlaceholder}
                className="focus-ring mt-2 w-full rounded-lg border border-line bg-surface-base p-3 text-sm text-cream-bright"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={!draft.trim() || busy !== null}
                  onClick={handleSend}
                  className="focus-ring inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-ink disabled:opacity-50"
                >
                  {busy === "answer" ? copy.sendingBtn : copy.sendBtn}
                </button>
                {session.answers >= 1 && (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={handleFeedback}
                    className="focus-ring inline-flex min-h-11 items-center justify-center rounded-full border border-line bg-surface-lift px-5 py-2 text-sm font-medium text-cream-bright disabled:opacity-50"
                  >
                    {busy === "feedback" ? copy.feedbackLoading : copy.feedbackBtn}
                  </button>
                )}
              </div>
            </Panel>
          )}

          {session.complete && !feedback && (
            <div className="flex justify-end">
              <button
                type="button"
                disabled={busy !== null}
                onClick={handleFeedback}
                className="focus-ring inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-ink disabled:opacity-50"
              >
                {busy === "feedback" ? copy.feedbackLoading : copy.feedbackBtn}
              </button>
            </div>
          )}

          {feedback && (
            <Panel className="p-6">
              <Eyebrow>{copy.feedbackEyebrow}</Eyebrow>
              <h3 className="mt-2 text-xl font-semibold text-cream-bright">{copy.feedbackTitle}</h3>
              <p className="mt-2 text-sm text-cream-dim">{feedback.summary}</p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-line bg-surface-base p-4">
                  <h4 className="text-sm font-semibold text-ok">{copy.strengths}</h4>
                  <ul className="mt-2 list-disc space-y-1.5 pl-5 text-xs text-cream-dim">
                    {feedback.strengths.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border border-line bg-surface-base p-4">
                  <h4 className="text-sm font-semibold text-step">{copy.improvements}</h4>
                  <ul className="mt-2 list-disc space-y-1.5 pl-5 text-xs text-cream-dim">
                    {feedback.improvements.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-line bg-surface-base p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-accent-text">
                  {copy.suggestedReply}
                </h4>
                <p className="mt-1.5 text-sm text-cream-bright">{feedback.suggestedReply}</p>
              </div>
              <p className="mt-4 text-xs text-cream-dim">
                <strong className="text-cream-bright">{copy.nextPractice}:</strong>{" "}
                {feedback.nextPractice}
              </p>
            </Panel>
          )}
        </div>
      )}
    </main>
  );
}
