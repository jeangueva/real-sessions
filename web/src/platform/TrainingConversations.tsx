import { useEffect, useState } from "react";
import { Globe2, GraduationCap, MessagesSquare, RotateCcw, Terminal } from "lucide-react";
import {
  Action,
  CheckItem,
  Eyebrow,
  FadeRise,
  Field,
  InterviewerPresence,
  Meter,
  Notice,
  Panel,
  Waveform,
} from "@/design-system";
import { Chip, IconTile, Inset, MonoLabel, Widget } from "@/components/marketing";
import { useLocale } from "@/hooks/useLocale";
import { PageBody, PageHeader } from "./AppShell";

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
    eduTitle: "Academic situations",
    eduIntro: "A group project, a grade you want explained, the scope talk with your advisor. Rehearse it before it happens.",
    proEyebrow: "Professional · HardTalk Tech & Latam",
    proTitle: "Difficult conversations",
    proIntro: "At work and at home: saying no, negotiating scope, talking money with family. Pick one and rehearse it out loud.",
    trackLabel: "Focus area",
    trackAll: "All scenarios",
    trackTech: "Work",
    trackPersonal: "Family and personal",
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
    eduTitle: "Situaciones académicas",
    eduIntro: "Un trabajo grupal, una nota que quieres que te expliquen, la conversación de alcance con tu asesor. Ensáyala antes de que pase.",
    proEyebrow: "Profesional · HardTalk Tech y Conversaciones Difíciles",
    proTitle: "Conversaciones difíciles",
    proIntro: "En el trabajo y en casa: decir que no, negociar alcance, hablar de plata con la familia. Elige una y ensáyala en voz alta.",
    trackLabel: "Área de práctica",
    trackAll: "Todos los escenarios",
    trackTech: "Trabajo",
    trackPersonal: "Familia y personal",
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
  fr: {
    eduEyebrow: "Éducation · Situations académiques",
    eduTitle: "Situations académiques",
    eduIntro: "Un travail de groupe, une note que vous voulez comprendre, la discussion de périmètre avec votre directeur. Répétez-la avant qu’elle arrive.",
    proEyebrow: "Professionnel · Conversations difficiles",
    proTitle: "Conversations difficiles",
    proIntro: "Au travail et à la maison : dire non, négocier un périmètre, parler d’argent en famille. Choisissez-en une et répétez-la à voix haute.",
    trackLabel: "Domaine",
    trackAll: "Toutes les situations",
    trackTech: "Travail",
    trackPersonal: "Famille et vie personnelle",
    scenarioHeading: "1. Choisissez une situation",
    cultureHeading: "2. Contexte culturel",
    languageHeading: "3. Langue de la pratique",
    langEs: "Español",
    langEn: "English",
    langPt: "Português",
    partnerRole: "Votre interlocuteur",
    situation: "Situation",
    goal: "Votre objectif",
    startBtn: "Commencer",
    startingBtn: "Ouverture de la conversation…",
    turnCount: (answers: number, max: number) => `Échange ${answers} sur ${max}`,
    partnerTag: "Interlocuteur",
    youTag: "Vous",
    replyLabel: "Votre réponse",
    replyPlaceholder: "Écrivez ce que vous diriez vraiment dans cette conversation…",
    sendBtn: "Envoyer",
    sendingBtn: "Réponse en cours…",
    feedbackBtn: "Voir le retour",
    feedbackLoading: "Préparation du retour…",
    resetBtn: "Choisir une autre situation",
    feedbackEyebrow: "Retour",
    feedbackTitle: "Ce qui a marché et quoi essayer ensuite",
    strengths: "Ce qui a marché",
    improvements: "À affiner",
    suggestedReply: "Une autre façon de le dire",
    nextPractice: "Prochaine pratique",
    loadingCatalogue: "Chargement des situations…",
    personalBadge: "Famille",
    techBadge: "Travail",
    academicBadge: "Académique",
  },
  pt: {
    eduEyebrow: "Educação · Simulações acadêmicas",
    eduTitle: "Situações acadêmicas",
    eduIntro: "Um trabalho em grupo, uma nota que você quer entender, a conversa de escopo com seu orientador. Ensaie antes que aconteça.",
    proEyebrow: "Profissional · HardTalk Tech e Conversas Difíceis",
    proTitle: "Conversas difíceis",
    proIntro: "No trabalho e em casa: dizer não, negociar escopo, falar de dinheiro com a família. Escolha uma e ensaie em voz alta.",
    trackLabel: "Área de prática",
    trackAll: "Todos os cenários",
    trackTech: "Trabalho",
    trackPersonal: "Família e pessoal",
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
  const copy = locale === "es" ? COPY.es : locale === "pt" ? COPY.pt : locale === "fr" ? COPY.fr : COPY.en;
  const isEs = locale === "es";
  /** The widgets' mono labels, in the reader's language. */
  const tag = (es: string, pt: string, en: string) => (locale === "es" ? es : locale === "pt" ? pt : en);

  const [scenarios, setScenarios] = useState<ScenarioItem[]>([]);
  const [cultures, setCultures] = useState<CultureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [track, setTrack] = useState<TrackFilter>("all");
  const [selectedId, setSelectedId] = useState<string>("");
  const [culture, setCulture] = useState<CultureItem["id"]>(domain === "professional" ? "latam" : "neutral");
  const [language, setLanguage] = useState<"es" | "en" | "pt" | "fr">(
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
    <main>
      <PageHeader
        title={domain === "education" ? copy.eduTitle : copy.proTitle}
        meta={domain === "education" ? copy.eduIntro : copy.proIntro}
      />

      <PageBody className="space-y-6 pt-2">
        {error && <Notice tone="error">{error}</Notice>}

        {loading ? (
          <Widget label={tag("Catálogo", "Catálogo", "Catalogue")} className="p-6">
            <p role="status" className="text-sm text-cream-dim">
              {copy.loadingCatalogue}
            </p>
          </Widget>
        ) : !session ? (
          <div className="grid gap-6 xl:grid-cols-12">
            {/* Left column: Track filter + Scenario catalogue */}
            <div className="space-y-5 xl:col-span-8">
              {domain === "professional" && (
                <Widget label={copy.trackLabel} className="p-5">
                  <fieldset className="flex flex-wrap gap-2">
                    <legend className="sr-only">{copy.trackLabel}</legend>
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
                        className="focus-ring rounded-full border border-line bg-surface-base px-4 py-2 text-sm font-medium text-cream-bright transition-colors hover:border-line-bright aria-pressed:border-accent-border aria-pressed:bg-accent-soft aria-pressed:text-accent-text"
                      >
                        {label}
                      </button>
                    ))}
                  </fieldset>
                </Widget>
              )}

              <section aria-labelledby="scenario-picker-heading" className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h2 id="scenario-picker-heading" className="text-base font-medium text-cream-bright">
                    {copy.scenarioHeading}
                  </h2>
                  <MonoLabel>{`${filteredScenarios.length} ${tag("escenarios", "cenários", "scenarios")}`}</MonoLabel>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {filteredScenarios.map((item, idx) => {
                    const localized = localizeScenario(item);
                    const selected = activeScenario?.id === item.id;
                    const Icon =
                      item.domain === "education"
                        ? GraduationCap
                        : item.personal
                          ? Globe2
                          : Terminal;
                    const badgeLabel =
                      item.domain === "education"
                        ? copy.academicBadge
                        : item.personal
                          ? copy.personalBadge
                          : copy.techBadge;
                    return (
                      <FadeRise key={item.id} delay={idx * 0.03}>
                        <button
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setSelectedId(item.id)}
                          className={`focus-ring flex h-full w-full flex-col justify-between rounded-[1.25rem] border p-5 text-left transition-all ${
                            selected
                              ? "border-accent-border bg-surface-lift shadow-card"
                              : "border-line bg-surface-card hover:border-line-bright hover:bg-surface-lift"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <IconTile>
                                <Icon className="h-4 w-4" aria-hidden />
                              </IconTile>
                              <Chip>{badgeLabel}</Chip>
                            </div>
                            <h3 className="mt-3 text-base font-medium tracking-[-0.02em] text-cream-bright">
                              {localized.title}
                            </h3>
                            <p className="mt-1.5 text-xs leading-relaxed text-cream-dim">
                              {localized.brief}
                            </p>
                          </div>

                          <Inset className="mt-4 px-3 py-2">
                            <p className="text-xs text-cream-dim">
                              <span className="font-medium text-cream-bright">{copy.partnerRole}:</span>{" "}
                              {localized.role}
                            </p>
                          </Inset>
                        </button>
                      </FadeRise>
                    );
                  })}
                </div>
              </section>
            </div>

            {/* Right column: Cultural context + Language + Objective + Start */}
            <div className="xl:col-span-4">
              <Widget
                label={tag("Prepara la práctica", "Prepare a prática", "Set up the practice")}
                className="space-y-6 p-6 xl:sticky xl:top-24"
              >
                <fieldset>
                  <legend className="text-sm font-medium text-cream-bright">
                    {copy.cultureHeading}
                  </legend>
                  <div className="mt-3 space-y-2">
                    {cultures.map((cItem) => {
                      const loc = localizeCulture(cItem);
                      const checked = culture === cItem.id;
                      return (
                        <label
                          key={cItem.id}
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${
                            checked
                              ? "border-accent-border bg-accent-soft"
                              : "border-line bg-surface-base hover:bg-surface-lift"
                          }`}
                        >
                          <input
                            type="radio"
                            name="culture-context"
                            value={cItem.id}
                            checked={checked}
                            onChange={() => setCulture(cItem.id)}
                            className="mt-1 text-sm"
                          />
                          <span>
                            <strong className="block text-sm font-medium text-cream-bright">
                              {loc.label}
                            </strong>
                            <span className="mt-0.5 block text-xs leading-relaxed text-cream-dim">
                              {loc.detail}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="text-sm font-medium text-cream-bright">
                    {copy.languageHeading}
                  </legend>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {(
                      [
                        ["es", copy.langEs],
                        ["en", copy.langEn],
                        ["pt", copy.langPt],
                        ["fr", "Français"],
                      ] as const
                    ).map(([code, label]) => (
                      <button
                        key={code}
                        type="button"
                        aria-pressed={language === code}
                        onClick={() => setLanguage(code)}
                        className="focus-ring rounded-full border border-line bg-surface-base px-4 py-1.5 text-sm font-medium text-cream-bright transition-colors aria-pressed:border-accent-border aria-pressed:bg-accent-soft aria-pressed:text-accent-text"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </fieldset>

                {activeScenario && (
                  <Inset className="p-4">
                    <MonoLabel>{copy.goal}</MonoLabel>
                    <p className="mt-1.5 text-sm font-medium text-cream-bright">
                      {localizeScenario(activeScenario).title}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-cream-dim">
                      {localizeScenario(activeScenario).goal}
                    </p>
                  </Inset>
                )}

                <Action
                  type="button"
                  withArrow
                  disabled={!activeScenario || busy === "start"}
                  onClick={handleStart}
                  className="w-full justify-center"
                >
                  {busy === "start" ? copy.startingBtn : copy.startBtn}
                </Action>
              </Widget>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {activeScenario && (
              <Panel variant="raised" className="p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <InterviewerPresence
                      initials="AI"
                      speaking={busy === "answer"}
                      size={52}
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Chip>
                          {copy.turnCount(session.answers, session.maxAnswers)}
                        </Chip>
                        <Waveform
                          active={busy === "answer"}
                          level={() => (busy === "answer" ? 0.55 : 0.12)}
                          measured={() => false}
                          label={copy.partnerTag}
                          className="h-4 text-accent-text"
                        />
                      </div>
                      <h2 className="mt-1.5 text-lg font-medium text-cream-bright">
                        {localizeScenario(activeScenario).title}
                      </h2>
                      <p className="mt-0.5 text-xs text-cream-dim">
                        <strong className="text-cream-bright">{copy.goal}:</strong>{" "}
                        {localizeScenario(activeScenario).goal}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="hidden w-36 sm:block">
                      <Meter
                        value={Math.round((session.answers / Math.max(1, session.maxAnswers)) * 100)}
                        label={copy.turnCount(session.answers, session.maxAnswers)}
                      />
                    </div>
                    <Action
                      type="button"
                      tone="quiet"
                      onClick={() => {
                        setSession(null);
                        setFeedback(null);
                        setError(null);
                      }}
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                      {copy.resetBtn}
                    </Action>
                  </div>
                </div>
              </Panel>
            )}

            <div className="space-y-3" aria-live="polite">
              {session.messages.map((turn, idx) => (
                <Widget
                  key={idx}
                  label={`${turn.role === "assistant" ? copy.partnerTag : copy.youTag} · #${String(idx + 1).padStart(2, "0")}`}
                  className={`p-5 ${
                    turn.role === "user" ? "border-accent-border bg-accent-soft" : ""
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-cream-bright">
                    {turn.text}
                  </p>
                </Widget>
              ))}
            </div>

            {!session.complete && (
              <Widget
                label={tag("Tu respuesta", "Sua resposta", "Your answer")}
                className="p-5 sm:p-6"
              >
                <div className="flex items-center gap-2.5">
                  <IconTile>
                    <MessagesSquare className="h-3.5 w-3.5" aria-hidden />
                  </IconTile>
                  <MonoLabel>{copy.replyLabel}</MonoLabel>
                </div>

                <Field label={copy.replyLabel} htmlFor="conversation-reply">
                  <textarea
                    id="conversation-reply"
                    rows={3}
                    maxLength={2000}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={copy.replyPlaceholder}
                    className="focus-ring mt-1 w-full rounded-xl border border-line bg-surface-base p-3.5 text-sm text-cream-bright"
                  />
                </Field>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <Action
                    type="button"
                    withArrow
                    disabled={!draft.trim() || busy !== null}
                    onClick={handleSend}
                  >
                    {busy === "answer" ? copy.sendingBtn : copy.sendBtn}
                  </Action>
                  {session.answers >= 1 && (
                    <Action
                      type="button"
                      tone="quiet"
                      disabled={busy !== null}
                      onClick={handleFeedback}
                    >
                      {busy === "feedback" ? copy.feedbackLoading : copy.feedbackBtn}
                    </Action>
                  )}
                </div>
              </Widget>
            )}

            {session.complete && !feedback && (
              <div className="flex justify-end">
                <Action
                  type="button"
                  withArrow
                  disabled={busy !== null}
                  onClick={handleFeedback}
                >
                  {busy === "feedback" ? copy.feedbackLoading : copy.feedbackBtn}
                </Action>
              </div>
            )}

            {feedback && (
              <Widget
                label={tag("Devolución", "Devolutiva", "Feedback")}
                className="p-6 sm:p-7"
              >
                <Eyebrow>{copy.feedbackEyebrow}</Eyebrow>
                <h3 className="mt-2 text-xl font-medium tracking-[-0.02em] text-cream-bright">
                  {copy.feedbackTitle}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-cream-dim">{feedback.summary}</p>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <Inset className="p-4">
                    <MonoLabel className="text-ok">{copy.strengths}</MonoLabel>
                    <ul className="mt-3 space-y-2">
                      {feedback.strengths.map((item, i) => (
                        <CheckItem key={i}>{item}</CheckItem>
                      ))}
                    </ul>
                  </Inset>
                  <Inset className="p-4">
                    <MonoLabel className="text-step">{copy.improvements}</MonoLabel>
                    <ul className="mt-3 space-y-2">
                      {feedback.improvements.map((item, i) => (
                        <CheckItem key={i}>{item}</CheckItem>
                      ))}
                    </ul>
                  </Inset>
                </div>

                <Inset className="mt-4 p-4">
                  <MonoLabel>{copy.suggestedReply}</MonoLabel>
                  <p className="mt-2 text-sm leading-relaxed text-cream-bright">
                    {feedback.suggestedReply}
                  </p>
                </Inset>

                <p className="mt-4 text-xs text-cream-dim">
                  <strong className="text-cream-bright">{copy.nextPractice}:</strong>{" "}
                  {feedback.nextPractice}
                </p>
              </Widget>
            )}
          </div>
        )}
      </PageBody>
    </main>
  );
}
