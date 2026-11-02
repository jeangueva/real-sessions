import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import BlurText from "@/components/bits/BlurText";
import Magnet from "@/components/bits/Magnet";
import {
  Action,
  AnimatedCounter,
  EASE_OUT,
  FadeRise,
  HeroVideo,
  InterviewerPresence,
  Meter,
  Waveform,
} from "@/design-system";
import { LandingNav } from "./LandingNav";
import { SiteFooter } from "./SiteFooter";
import { Chip, IconTile, Inset, Lede, MonoLabel, Screen, Title, Widget, Wrap } from "./marketing";
import { useLocale } from "@/hooks/useLocale";
import { usePracticeCopy } from "@/lib/practice-copy";
import { scrollToSection } from "@/lib/scroll-to-section";
import { Support } from "@/platform/Support";

/** The showreel footage edge-to-edge across the hero; `VITE_HERO_VIDEO` overrides it. */
const HERO_VIDEO = import.meta.env.VITE_HERO_VIDEO ?? "/hero-2.mp4";
const HERO_POSTER = "/hero-2.jpg";

const COUNTRIES = ["PE", "BR", "CO", "CL", "AR", "MX", "EC", "BO", "UY", "PA", "US", "CA"];

const COPY = {
  es: {
    countriesLabel: "Contexto académico y cultural para",
    eduTag: "01 · Educación",
    proTag: "02 · Profesional",
    howTag: "03 · Método",
    supportTag: "04 · Acceso libre y apoyo voluntario",
    privacyTag: "Privacidad y autonomía",
    eduSub: "Sustentación de tesis con jurado de 3 + Simulaciones de escenarios académicos",
    proSub: "Stakeholder Lab · Conversaciones Culturales (Latam y NA) · Intuición · Entrevistas",
    openThesis: "Entrar a Sustentación de tesis",
    openAcademic: "Practicar escenarios académicos",
    openConversations: "Entrar al simulador de conversaciones",
    openIntuition: "Entrenar intuición de producto y diseño",
    openInterviews: "Practicar entrevistas de trabajo",
    callLabel: "La videollamada con el jurado",
    mockLive: "En vivo",
    juror1: "Presidente",
    juror2: "Metodóloga",
    juror3: "Especialista",
    mockJuror1: "Dr. Ramírez · Presidente del jurado",
    mockQuestion1: "En la página 18 plantea tres objetivos específicos, pero en las conclusiones solo responde a dos. ¿Qué ocurrió con el tercero?",
    mockAnswer1: "El tercer objetivo se aborda en la conclusión 2 junto con el análisis de costos de la tabla 9…",
    mockJuror2: "Dra. Vidal · Metodóloga",
    mockQuestion2: "En la página 41 aplica Pearson. ¿Verificó antes la normalidad de sus datos? No encuentro esa prueba en su tesis.",
    mockAnswer2: "Apliqué Kolmogorov-Smirnov; está en el anexo 4, aunque faltó citarlo en el capítulo…",
    mockJuror3: "Dr. Paredes · Especialista",
    mockQuestion3: "En la discusión (p. 54) afirma que su propuesta reduce tiempos en 30%, pero no controla por estacionalidad. ¿Cómo lo sustenta?",
    mockAnswer3: "Comparamos el mismo trimestre contra el año base en la página 48 para aislar el factor estacional…",
    mockYou: "Tú",
    mockActa: "Acta simulada",
    mockVerdict: "Aprobado por mayoría",
    eduBullet1: "Jurado de 3 que leyó tu tesis completa (hasta 300 páginas) y pregunta citando la página exacta",
    eduBullet2: "Diagnóstico de riesgos metodológicos, repaso espaciado, diapositivas y observaciones del asesor",
    eduBullet3: "Escenarios académicos: grupos desbalanceados, revisión de rúbricas, alcance con tu asesor y exámenes orales",
    acad1Title: "Trabajo grupal desbalanceado",
    acad1Meta: "Compañero que incumplió dos entregas",
    acad2Title: "Explicación de calificación con rúbrica",
    acad2Meta: "Docente con pocas horas de oficina",
    acad3Title: "Resultados mixtos frente a tu hipótesis",
    acad3Meta: "Asesor que esperaba un efecto fuerte",
    acad4Title: "Negociar alcance de tesis con tu asesor",
    acad4Meta: "Pedido de nuevo capítulo a 6 semanas de entregar",
    techScenarios: [
      {
        role: "Founder · Lanzamiento de viernes",
        initials: "FD",
        prompt: "Necesitamos anunciar el flujo completo este viernes. Ya lo comprometí con dos clientes.",
        reply: "El cobro aún falla en el 4% de los intentos. Si lanzamos el piloto solo para cuentas internas el viernes, protegemos producción y cumplimos la demo.",
        coach: "Límite claro + consecuencia observable + alternativa reversible.",
      },
      {
        role: "Product Lead · Alcance de sprint",
        initials: "PL",
        prompt: "Son solo tres pantallas más y la migración de base de datos, entra en este sprint.",
        reply: "Con dos desarrolladores podemos entregar la migración y el flujo principal, o las tres pantallas sin migración. ¿Cuál destraba más valor esta semana?",
        coach: "Hace explícitas las dependencias y pide priorizar en lugar de prometer horas invisibles.",
      },
      {
        role: "Senior Designer · Crítica de usabilidad",
        initials: "SD",
        prompt: "El diseño es limpio; si los usuarios no vieron el botón en el test fue porque el prototipo era estático.",
        reply: "En 4 de 5 sesiones buscaron la acción arriba a la derecha antes de hacer scroll. ¿Probamos una variante con el CTA fijo para comparar conversión?",
        coach: "Habla desde evidencia observable sin atacar la autoría.",
      },
    ],
    culturalTitle: "Contexto cultural seleccionable: Latinoamérica y Norteamérica",
    culturalCaseRole: "Familiar cercano · Apoyo económico recurrente",
    culturalCasePrompt: "Sabes que este mes también se me complicó. ¿Me puedes volver a transferir lo mismo del mes pasado?",
    culturalCaseReply: "Quiero que estemos bien y por eso prefiero hablarte claro: este mes puedo apoyarte con la mitad por última vez, y el sábado revisamos juntos cómo ordenar las cuotas.",
    culturalCoach: "Cuida el vínculo familiar sin asumir un compromiso financiero que no puedes sostener.",
    intuitionCaseTag: "Caso real anonimizado · Hipótesis de producto",
    intuitionPrompt: "Muchos compradores abandonan el carrito justo cuando se les pide registrarse antes de pagar. ¿Qué hipótesis pruebas primero?",
    intuitionChosen: "Tu decisión comprometida: Compra como invitado + cuenta opcional al finalizar",
    intuitionConfidence: "Confianza comprometida antes de ver el desenlace",
    intuitionRevealTitle: "Desenlace histórico: UIE — The $300 Million Button",
    intuitionRevealBody: "Reemplazar el registro obligatorio previo al pago por un botón de continuar aumentó los compradores en 45% y sumó US$ 300 millones el primer año.",
    step1Title: "Elige el escenario y el contexto",
    step1Body: "Sustentación de tesis, escenario académico, conversación difícil en tech o familia (Latam / NA), intuición de producto o entrevista laboral.",
    step2Title: "Practica en vivo o compromete tu criterio",
    step2Body: "Responde por voz o texto frente a una contraparte con resistencia realista, o registra tu hipótesis y nivel de confianza antes de ver qué pasó.",
    step3Title: "Recibe un acta, coaching o verdad histórica",
    step3Body: "Revisa qué dijiste, cómo sonarías con una reformulación en tu propia voz o qué ocurrió en el caso real documentado.",
    privacyTitle: "100% gratis. Sin funciones bloqueadas.",
    privacyNote: "Mockio no bloquea modos, no limita sesiones por semana y no usa tu tesis ni tus prácticas para entrenar modelos. Quien quiera sostener el proyecto puede apoyar voluntariamente desde USD 1.",
    privacy1: "Todos los modos de Educación y Profesional abiertos desde el primer día",
    privacy2: "Apoyo voluntario único (a demanda) o mensual ($1, $2, $5, $8, $10 o personalizado)",
    privacy3: "Tus documentos y ensayos son privados y los borras con un clic",
    instTitle: "Para universidades e institutos",
    instBody: "Integra Mockio en Moodle, Canvas o Blackboard mediante LTI 1.3 para que tus estudiantes practiquen sus sustentaciones y presentaciones.",
    instCta: "Ver integración institucional",
    affTitle: "Comunidad y difusión",
    affBody: "Docentes, asesores y mentores que comparten Mockio con sus estudiantes y equipos.",
    affCta: "Ver programa de comunidad",
  },
  en: {
    countriesLabel: "Academic and cultural context across",
    eduTag: "01 · Education",
    proTag: "02 · Professional",
    howTag: "03 · Method",
    supportTag: "04 · Free access & voluntary support",
    privacyTag: "Privacy & open access",
    eduSub: "3-examiner thesis defense + Academic scenario simulations",
    proSub: "Stakeholder Lab · Cultural Conversations (Latam & NA) · Product Intuition · Job interviews",
    openThesis: "Open Thesis Defense",
    openAcademic: "Practice academic scenarios",
    openConversations: "Open conversation simulator",
    openIntuition: "Train product & design intuition",
    openInterviews: "Practice job interviews",
    callLabel: "The live jury video call",
    mockLive: "Live",
    juror1: "Chair",
    juror2: "Methodologist",
    juror3: "Specialist",
    mockJuror1: "Dr Ramírez · Chair of the panel",
    mockQuestion1: "On page 18 you set out three specific objectives, but your conclusions only answer two. What happened to the third?",
    mockAnswer1: "The third objective is addressed in conclusion 2 alongside the cost breakdown in table 9…",
    mockJuror2: "Dr Vidal · Methodologist",
    mockQuestion2: "On page 41 you use Pearson. Did you check the data were normal first? I cannot find that test in your thesis.",
    mockAnswer2: "I ran Kolmogorov-Smirnov in appendix 4, though I did not cite it in the main chapter…",
    mockJuror3: "Dr Paredes · Specialist",
    mockQuestion3: "In the discussion (p. 54) you claim a 30% time reduction without controlling for seasonality. How do you defend that?",
    mockAnswer3: "We compared the same quarter against the baseline year on page 48 to isolate seasonality…",
    mockYou: "You",
    mockActa: "Sample record",
    mockVerdict: "Passed by majority",
    eduBullet1: "Panel of 3 that read your entire thesis (up to 300 pages) and questions you citing exact pages",
    eduBullet2: "Methodological risk diagnosis, spaced review, slide checks and advisor observations",
    eduBullet3: "Academic scenarios: uneven group projects, grading rubric reviews, advisor scope and oral exams",
    acad1Title: "An uneven group project",
    acad1Meta: "Classmate who missed two milestones",
    acad2Title: "Ask for a grading rubric explanation",
    acad2Meta: "Teacher with limited office hours",
    acad3Title: "Results that do not support your hypothesis",
    acad3Meta: "Supervisor expecting a strong result",
    acad4Title: "Negotiate thesis scope with your advisor",
    acad4Meta: "New empirical chapter requested 6 weeks before deadline",
    techScenarios: [
      {
        role: "Founder · Friday launch push",
        initials: "FD",
        prompt: "We need to announce the full release this Friday. I already promised two customers.",
        reply: "Checkout still fails on 4% of retries. If we ship an internal pilot Friday, we protect production and still run the live demo.",
        coach: "Clear boundary + observable risk + reversible option.",
      },
      {
        role: "Product Lead · Sprint scope",
        initials: "PL",
        prompt: "It is just three more screens plus the database migration, we can fit both this sprint.",
        reply: "With two engineers we can ship the migration and core flow, or the three screens without the migration. Which unlocks more value this week?",
        coach: "Exposes dependencies and asks for an explicit trade-off.",
      },
      {
        role: "Senior Designer · Usability critique",
        initials: "SD",
        prompt: "The layout is clean; if testers missed the button it is only because the prototype was static.",
        reply: "In 4 of 5 sessions participants looked top-right before scrolling. Can we A/B test a sticky primary action?",
        coach: "Uses observable evidence without attacking authorship.",
      },
    ],
    culturalTitle: "Selectable cultural context: Latin America & North America",
    culturalCaseRole: "Close relative · Recurring money request",
    culturalCasePrompt: "This month got tight again. Can you wire me the same amount as last month?",
    culturalCaseReply: "I care about you and want to be honest: I can help with half this one last time, and on Saturday we can sit down together to reorganize the monthly payments.",
    culturalCoach: "Protects the family relationship while setting a firm, sustainable boundary.",
    intuitionCaseTag: "Anonymized real case · Product hypothesis",
    intuitionPrompt: "Many shoppers abandon checkout right when asked to register before paying. Which hypothesis do you test first?",
    intuitionChosen: "Your committed choice: Guest checkout + optional post-purchase account creation",
    intuitionConfidence: "Committed confidence before reveal",
    intuitionRevealTitle: "Historical outcome: UIE — The $300 Million Button",
    intuitionRevealBody: "Replacing mandatory pre-checkout registration with a simple continue button increased purchasing customers by 45% and added $300M in first-year revenue.",
    step1Title: "Choose your scenario and context",
    step1Body: "Thesis defense, academic scenario, high-stakes tech or family conversation (Latam / NA), product intuition case or job interview.",
    step2Title: "Rehearse live or commit your judgment",
    step2Body: "Respond by voice or text to a realistic counterpart, or lock in your decision, confidence and reasoning before seeing the outcome.",
    step3Title: "Review coaching or documented reality",
    step3Body: "Inspect your graded record, alternative phrasing in your own voice, or the primary historical source behind the case.",
    privacyTitle: "100% free. Zero locked features.",
    privacyNote: "Mockio never gates rehearsal modes, never caps weekly sessions and never trains models on your thesis or transcripts. If you want to help sustain it, voluntary support starts at USD 1.",
    privacy1: "Every mode in Education and Professional unlocked for everyone",
    privacy2: "Optional one-time or monthly support ($1, $2, $5, $8, $10 or custom)",
    privacy3: "Your documents and transcripts stay private and delete in one click",
    instTitle: "For universities and colleges",
    instBody: "Embed Mockio inside Moodle, Canvas or Blackboard via LTI 1.3 so students can rehearse defenses and presentations.",
    instCta: "See institutional integration",
    affTitle: "Community & educators",
    affBody: "Advisors, teachers and mentors sharing Mockio with their students and teams.",
    affCta: "See community programme",
  },
  pt: {
    countriesLabel: "Contexto acadêmico e cultural para",
    eduTag: "01 · Educação",
    proTag: "02 · Profissional",
    howTag: "03 · Método",
    supportTag: "04 · Acesso gratuito e apoio voluntário",
    privacyTag: "Privacidade e acesso aberto",
    eduSub: "Defesa de tese com banca de 3 + Simulações de cenários acadêmicos",
    proSub: "Stakeholder Lab · Conversas Culturais (Latam e NA) · Intuição · Entrevistas",
    openThesis: "Abrir Defesa de tese",
    openAcademic: "Praticar cenários acadêmicos",
    openConversations: "Abrir simulador de conversas",
    openIntuition: "Treinar intuição de produto e design",
    openInterviews: "Praticar entrevistas de emprego",
    callLabel: "A videochamada com a banca",
    mockLive: "Ao vivo",
    juror1: "Presidente",
    juror2: "Metodóloga",
    juror3: "Especialista",
    mockJuror1: "Prof. Dr. Almeida · Presidente da banca",
    mockQuestion1: "Na página 18 você propõe três objetivos específicos, mas nas conclusões responde apenas a dois. O que houve com o terceiro?",
    mockAnswer1: "O terceiro objetivo é tratado na conclusão 2 junto com a análise de custos da tabela 9…",
    mockJuror2: "Profa. Vidal · Metodóloga",
    mockQuestion2: "Na página 41 você aplica Pearson. Verificou antes a normalidade dos dados? Não encontro esse teste no trabalho.",
    mockAnswer2: "Apliquei Kolmogorov-Smirnov no anexo 4, mas faltou citar no capítulo principal…",
    mockJuror3: "Prof. Dr. Mendes · Especialista",
    mockQuestion3: "Na discussão (p. 54) você afirma que a proposta reduz prazos em 30%, mas não controla a sazonalidade. Como sustenta isso?",
    mockAnswer3: "Comparamos o mesmo trimestre com o ano-base na página 48 para isolar a sazonalidade…",
    mockYou: "Você",
    mockActa: "Ata simulada",
    mockVerdict: "Aprovado por maioria",
    eduBullet1: "Banca de 3 que leu seu trabalho inteiro (até 300 páginas) e pergunta citando a página exata",
    eduBullet2: "Diagnóstico de riscos metodológicos, revisão espaçada, slides e observações do orientador",
    eduBullet3: "Cenários acadêmicos: trabalhos em grupo desbalanceados, revisão de rubricas, escopo com orientador e provas orais",
    acad1Title: "Trabalho em grupo desbalanceado",
    acad1Meta: "Colega que perdeu duas entregas",
    acad2Title: "Explicação de nota com rubrica",
    acad2Meta: "Professor com horário restrito",
    acad3Title: "Resultados mistos diante da hipótese",
    acad3Meta: "Orientador esperando efeito forte",
    acad4Title: "Negociar escopo da tese com orientador",
    acad4Meta: "Pedido de novo capítulo a 6 semanas do prazo",
    techScenarios: [
      {
        role: "Founder · Lançamento na sexta",
        initials: "FD",
        prompt: "Precisamos anunciar o fluxo completo nesta sexta. Já prometi a dois clientes.",
        reply: "O pagamento ainda falha em 4% das tentativas. Se lançarmos um piloto interno na sexta, protegemos a produção e cumprimos a demo.",
        coach: "Limite claro + risco observável + alternativa reversível.",
      },
      {
        role: "Product Lead · Escopo da sprint",
        initials: "PL",
        prompt: "São só mais três telas e a migração do banco, cabe nesta sprint.",
        reply: "Com dois engenheiros entregamos a migração e o fluxo principal, ou as três telas sem migração. Qual destrava mais valor esta semana?",
        coach: "Torna explícitas as dependências e pede priorização real.",
      },
      {
        role: "Senior Designer · Crítica de usabilidade",
        initials: "SD",
        prompt: "O layout está limpo; se não viram o botão no teste foi porque o protótipo era estático.",
        reply: "Em 4 de 5 sessões procuraram a ação no topo antes de rolar a página. Podemos testar uma variante com o botão fixo?",
        coach: "Usa observações concretas sem atacar a autoria.",
      },
    ],
    culturalTitle: "Contexto cultural selecionável: América Latina e América do Norte",
    culturalCaseRole: "Familiar próximo · Pedido recorrente de dinheiro",
    culturalCasePrompt: "Este mês apertou de novo. Você consegue me transferir o mesmo valor do mês passado?",
    culturalCaseReply: "Quero que fiquemos bem e prefiro ser sincero: este mês consigo ajudar com metade pela última vez, e no sábado revisamos juntos como organizar as parcelas.",
    culturalCoach: "Preserva o vínculo familiar estabelecendo um limite financeiro sustentável.",
    intuitionCaseTag: "Caso real anonimizado · Hipótese de produto",
    intuitionPrompt: "Muitos compradores abandonam o carrinho quando precisam criar conta antes de pagar. Qual hipótese você testa primeiro?",
    intuitionChosen: "Sua decisão registrada: Compra como convidado + criação opcional de conta no final",
    intuitionConfidence: "Confiança registrada antes da revelação",
    intuitionRevealTitle: "Desfecho histórico: UIE — The $300 Million Button",
    intuitionRevealBody: "Substituir o cadastro obrigatório antes do pagamento por um botão de continuar aumentou os compradores em 45% e gerou US$ 300 milhões no primeiro ano.",
    step1Title: "Escolha o cenário e o contexto",
    step1Body: "Defesa de tese, cenário acadêmico, conversa difícil em tech ou família (Latam / NA), intuição de produto ou entrevista de emprego.",
    step2Title: "Ensaie ao vivo ou registre seu critério",
    step2Body: "Responda por voz ou texto diante de uma contraparte realista, ou comprometa sua decisão, confiança e raciocínio antes de ver o resultado.",
    step3Title: "Revise o feedback ou o desfecho real",
    step3Body: "Analise sua ata, sugestões de resposta na sua própria voz ou a fonte histórica primária do caso.",
    privacyTitle: "100% grátis. Sem recursos bloqueados.",
    privacyNote: "O Mockio não bloqueia modos, não limita sessões semanais e nunca treina modelos com sua tese ou transcrições. Quem quiser apoiar pode contribuir voluntariamente a partir de USD 1.",
    privacy1: "Todos os modos de Educação e Profissional abertos para todos",
    privacy2: "Apoio voluntário único ou mensal ($1, $2, $5, $8, $10 ou personalizado)",
    privacy3: "Seus documentos e ensaios são privados e você apaga com um clique",
    instTitle: "Para universidades e faculdades",
    instBody: "Integre o Mockio ao Moodle, Canvas ou Blackboard via LTI 1.3 para que seus alunos pratiquem defesas e apresentações.",
    instCta: "Ver integração institucional",
    affTitle: "Comunidade e educadores",
    affBody: "Orientadores, professores e mentores que compartilham o Mockio com seus alunos e equipes.",
    affCta: "Ver programa de comunidade",
  },
} as const;

type LandingCopy = (typeof COPY)[keyof typeof COPY];

function JuryCallScreen({ d }: { d: LandingCopy }) {
  const [active, setActive] = useState(1);
  const still = useReducedMotion();
  const turns = [
    { role: d.juror1, initials: "RA", speaker: d.mockJuror1, question: d.mockQuestion1, answer: d.mockAnswer1, turn: "2 / 12" },
    { role: d.juror2, initials: "VI", speaker: d.mockJuror2, question: d.mockQuestion2, answer: d.mockAnswer2, turn: "3 / 12" },
    { role: d.juror3, initials: "PA", speaker: d.mockJuror3, question: d.mockQuestion3, answer: d.mockAnswer3, turn: "4 / 12" },
  ];

  useEffect(() => {
    if (still) return;
    const id = window.setInterval(() => {
      setActive((current) => (current + 1) % 3);
    }, 5200);
    return () => window.clearInterval(id);
  }, [still]);

  const current = turns[active]!;

  return (
    <Screen dark>
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-xs text-white/60">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 animate-live rounded-full bg-step" />
          {d.mockLive} · 08:42
        </span>
        <span className="tabular-nums">{current.turn}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 p-3" role="tablist" aria-label={d.callLabel}>
        {turns.map((entry, index) => {
          const isSpeaking = index === active;
          return (
            <button
              key={entry.role}
              type="button"
              role="tab"
              aria-selected={isSpeaking}
              onClick={() => setActive(index)}
              className={`focus-ring flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-xl transition-[background-color,box-shadow,transform] duration-150 ease-press active:scale-[0.97] ${
                isSpeaking ? "bg-white/10 ring-2 ring-accent-text" : "bg-white/5 hover:bg-white/[0.08]"
              }`}
            >
              <span
                className={`grid h-9 w-9 place-items-center rounded-full text-xs font-semibold transition-colors duration-200 ${
                  isSpeaking ? "bg-accent text-accent-ink" : "bg-white/10 text-white/70"
                }`}
              >
                {entry.initials}
              </span>
              <span className="text-xs text-white/70">{entry.role}</span>
              <span aria-hidden className={`flex h-2.5 items-center gap-0.5 transition-opacity duration-200 ${isSpeaking ? "opacity-100" : "opacity-0"}`}>
                {[0, 150, 300, 120].map((delay, barIndex) => (
                  <span
                    key={barIndex}
                    className="h-2.5 w-0.5 origin-center rounded-full bg-accent-text motion-safe:animate-speak"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>
      <div key={active} className="flex flex-col gap-2 px-4 pb-4 motion-safe:animate-swap">
        <p className="text-xs font-semibold text-accent-text">{current.speaker}</p>
        <p className="text-base leading-snug text-white">{current.question}</p>
        <div className="mt-2 rounded-xl bg-white/5 px-3 py-2.5">
          <p className="text-xs font-semibold text-white/50">{d.mockYou} · Cam ON</p>
          <p className="text-sm text-white/80">{current.answer}</p>
        </div>
      </div>
    </Screen>
  );
}

function ActaOverlay({ d }: { d: LandingCopy }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-12% 0px" });
  const still = useReducedMotion();
  const rows = [
    { role: d.juror1, score: 16 },
    { role: d.juror2, score: 12 },
    { role: d.juror3, score: 14 },
  ];
  return (
    <Screen className="w-[17rem] p-5">
      <div ref={ref}>
        <p className="text-xs font-semibold text-cream-dim">{d.mockActa}</p>
        <p className="mt-1 flex items-baseline gap-1.5">
          <span className="text-5xl font-semibold tracking-[-0.04em] tabular-nums text-cream-bright">
            <AnimatedCounter value={14} duration={0.9} />
          </span>
          <span className="text-lg text-cream-faint">/ 20</span>
        </p>
        <p className="mt-2 inline-flex rounded-full bg-grow-soft px-2.5 py-0.5 text-xs font-semibold text-grow-text">{d.mockVerdict}</p>
        <div className="mt-4 flex flex-col gap-2.5">
          {rows.map((row, index) => (
            <div key={row.role}>
              <div className="flex justify-between text-xs">
                <span className="text-cream-dim">{row.role}</span>
                <span className="font-semibold tabular-nums text-cream-bright">{row.score}</span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-lift">
                <motion.div
                  className={`h-full origin-left rounded-full ${row.score >= 14 ? "bg-grow" : "bg-accent"}`}
                  style={{ width: `${(row.score / 20) * 100}%` }}
                  initial={still ? false : { scaleX: 0 }}
                  animate={still ? undefined : { scaleX: inView ? 1 : 0 }}
                  transition={{
                    duration: 0.7,
                    delay: 0.15 + index * 0.06,
                    ease: EASE_OUT,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Screen>
  );
}

function TechLabScreen({ d }: { d: LandingCopy }) {
  const [idx, setIdx] = useState(0);
  const current = d.techScenarios[idx]!;
  return (
    <Screen dark className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <span className="font-mono text-xs uppercase tracking-[0.06em] text-accent-text">
          ::STAKEHOLDER LAB
        </span>
        <div className="flex gap-1.5">
          {d.techScenarios.map((item, i) => (
            <button
              key={item.role}
              type="button"
              onClick={() => setIdx(i)}
              className={`focus-ring rounded-full px-2.5 py-1 font-mono text-xs transition-colors ${
                i === idx ? "bg-accent text-accent-ink font-semibold" : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
            >
              0{i + 1}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <InterviewerPresence initials={current.initials} speaking={true} size={48} />
        <div>
          <p className="text-xs font-semibold text-accent-text">{current.role}</p>
          <Waveform active={true} level={() => 0.55} label={current.role} className="mt-1 text-accent" />
        </div>
      </div>

      <p className="mt-4 rounded-xl bg-white/5 p-3.5 text-sm leading-relaxed text-white">
        “{current.prompt}”
      </p>

      <div className="mt-3 rounded-xl border border-white/15 bg-white/[0.07] p-3.5">
        <p className="font-mono text-xs uppercase tracking-[0.06em] text-white/60">{d.mockYou}</p>
        <p className="mt-1 text-sm leading-relaxed text-white/90">“{current.reply}”</p>
      </div>

      <p className="mt-3 rounded-xl bg-grow-soft px-3.5 py-2 text-xs font-medium text-grow-text">
        {current.coach}
      </p>
    </Screen>
  );
}

function CulturalLabScreen({ d }: { d: LandingCopy }) {
  return (
    <Screen className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-cream-bright">{d.culturalTitle}</p>
        <div className="flex flex-wrap gap-1.5">
          <Chip>LATAM</Chip>
          <Chip className="!bg-surface-lift !text-cream-dim">NORTH AMERICA</Chip>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-surface-lift p-4">
        <p className="font-mono text-xs uppercase tracking-[0.06em] text-accent-text">
          {d.culturalCaseRole}
        </p>
        <p className="mt-1.5 text-sm text-cream-bright">“{d.culturalCasePrompt}”</p>
      </div>

      <div className="mt-3 rounded-2xl border border-line bg-surface-base p-4">
        <p className="font-mono text-xs uppercase tracking-[0.06em] text-cream-dim">{d.mockYou}</p>
        <p className="mt-1.5 text-sm text-cream-bright">“{d.culturalCaseReply}”</p>
      </div>

      <p className="mt-3 rounded-xl bg-accent-soft px-3.5 py-2.5 text-xs font-medium text-accent-text">
        {d.culturalCoach}
      </p>
    </Screen>
  );
}

function IntuitionScreen({ d }: { d: LandingCopy }) {
  return (
    <Screen className="p-5 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs uppercase tracking-[0.06em] text-accent-text">
          {d.intuitionCaseTag}
        </span>
        <Chip>HIPÓTESIS · PRIORIZACIÓN · TRADE-OFFS</Chip>
      </div>

      <p className="mt-3 text-base font-medium leading-snug text-cream-bright">
        {d.intuitionPrompt}
      </p>

      <div className="mt-4 rounded-2xl bg-surface-lift p-3.5">
        <p className="text-xs font-semibold text-cream-bright">{d.intuitionChosen}</p>
        <div className="mt-3">
          <Meter value={75} label={d.intuitionConfidence} />
        </div>
      </div>

      <div className="mt-3 rounded-2xl bg-grow-soft p-4">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.06em] text-grow-text">
          {d.intuitionRevealTitle}
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-cream-bright">
          {d.intuitionRevealBody}
        </p>
      </div>
    </Screen>
  );
}

function FeatureRow({
  label,
  title,
  body,
  ctaLabel,
  ctaTo,
  screen,
  flip = false,
}: {
  label: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaTo: string;
  screen: React.ReactNode;
  flip?: boolean;
}) {
  return (
    <div className="grid items-stretch gap-3 md:grid-cols-2 [&>*]:min-w-0">
      <FadeRise className={`h-full ${flip ? "md:order-2" : ""}`}>
        <Widget label={label} className="h-full justify-between">
          <div className="space-y-4">
            <h3 className="text-balance text-[clamp(1.75rem,3.2vw,2.5rem)] font-light leading-[1.08] tracking-[-0.04em] text-cream-bright">
              {title}
            </h3>
            <p className="max-w-md text-pretty text-lg leading-relaxed text-cream-dim">{body}</p>
          </div>
          <Link to={ctaTo} className="mt-4 self-start">
            <Action tone="quiet" withArrow>
              {ctaLabel}
            </Action>
          </Link>
        </Widget>
      </FadeRise>
      <FadeRise delay={0.08} className={flip ? "md:order-1" : ""}>
        <Widget className="h-full justify-center">{screen}</Widget>
      </FadeRise>
    </div>
  );
}

/** Shared public entry point with full-bleed HeroVideo and editorial trail-dashboard widgets. */
export function PublicLanding() {
  const { locale } = useLocale();
  const c = usePracticeCopy();
  const d = locale === "es" ? COPY.es : locale === "pt" ? COPY.pt : COPY.en;

  useEffect(() => {
    document.title = `Mockio | ${c.title}`;
    const description = `${c.intro} ${c.free}. ${c.supportBody}`;
    document.querySelector('meta[name="description"]')?.setAttribute("content", description);
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", document.title);
    document.querySelector('meta[property="og:description"]')?.setAttribute("content", description);
  }, [c]);

  const countries = useMemo(() => {
    try {
      const names = new Intl.DisplayNames([locale], { type: "region" });
      return COUNTRIES.map((code) => names.of(code) ?? code);
    } catch {
      return COUNTRIES;
    }
  }, [locale]);

  const arrow =
    "h-4 w-4 transition-transform duration-200 ease-press group-hover:translate-x-0.5 rtl:-scale-x-100";

  return (
    <div id="top" className="bg-surface-base text-cream-bright">
      <a
        href="#content"
        className="focus-ring sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-16 focus:z-50 focus:rounded-lg focus:bg-surface-card focus:p-3"
      >
        {c.skip}
      </a>

      <LandingNav
        links={[
          { label: c.education, href: "#education" },
          { label: c.professional, href: "#professional" },
          { label: c.free, href: "#support" },
        ]}
        cta={{ label: c.start, to: "/app/education" }}
      />

      <main id="content">
        {/* 1. Full-bleed video hero: the showreel footage fills the entire first section. */}
        <section className="on-media relative isolate flex min-h-[min(100svh,56rem)] flex-col overflow-hidden bg-black pt-[calc(3.5rem+env(safe-area-inset-top,0px))]">
          <HeroVideo
            bare
            focus="object-[50%_20%] md:object-[65%_15%]"
            src={HERO_VIDEO}
            poster={HERO_POSTER}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/80 via-black/30 to-black/75 md:bg-gradient-to-r md:from-black/85 md:via-black/45 md:to-transparent"
          />

          <Wrap className="relative z-10 flex flex-1 flex-col justify-between gap-10 pb-10 pt-[clamp(2.5rem,9svh,6.5rem)]">
            <FadeRise className="max-w-2xl">
              <Chip className="mb-5">{c.free}</Chip>
              <h1 className="text-balance text-[clamp(2.75rem,6.6vw,5.5rem)] font-semibold leading-[0.98] tracking-[-0.045em] text-white">
                <span className="sr-only">{c.title}</span>
                <span aria-hidden>
                  <BlurText
                    text={c.title}
                    animateBy="words"
                    direction="bottom"
                    delay={70}
                    stepDuration={0.32}
                    trigger="load"
                  />
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-white/85 sm:text-xl">
                {c.intro}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Magnet padding={60} magnetStrength={4}>
                  <Link to="/app/education">
                    <Action withArrow className="px-6 py-3 text-base">
                      {c.start}
                    </Action>
                  </Link>
                </Magnet>
                <Link to="/app/professional">
                  <Action tone="glass" withArrow className="px-6 py-3 text-base">
                    {c.professional}
                  </Action>
                </Link>
                <a
                  href="#education"
                  onClick={(event) => {
                    if (scrollToSection("#education")) event.preventDefault();
                  }}
                  className="focus-ring group inline-flex items-center gap-1 rounded-full px-3 py-2 text-base font-semibold text-white/90 transition-colors hover:text-white"
                >
                  {c.explore}
                  <ArrowRight aria-hidden className={arrow} />
                </a>
              </div>
            </FadeRise>

            <FadeRise delay={0.18} className="grid gap-3 sm:grid-cols-2">
              <a
                href="#education"
                onClick={(event) => {
                  if (scrollToSection("#education")) event.preventDefault();
                }}
                className="focus-ring group rounded-2xl border border-white/15 bg-black/45 p-4 backdrop-blur-md transition-colors hover:bg-black/60"
              >
                <p className="font-mono text-xs uppercase tracking-[0.06em] text-accent-text">
                  ::{d.eduTag}
                </p>
                <p className="mt-1 flex items-center justify-between text-base font-medium text-white">
                  <span>{d.eduSub}</span>
                  <ArrowRight aria-hidden className={arrow} />
                </p>
              </a>
              <a
                href="#professional"
                onClick={(event) => {
                  if (scrollToSection("#professional")) event.preventDefault();
                }}
                className="focus-ring group rounded-2xl border border-white/15 bg-black/45 p-4 backdrop-blur-md transition-colors hover:bg-black/60"
              >
                <p className="font-mono text-xs uppercase tracking-[0.06em] text-accent-text">
                  ::{d.proTag}
                </p>
                <p className="mt-1 flex items-center justify-between text-base font-medium text-white">
                  <span>{d.proSub}</span>
                  <ArrowRight aria-hidden className={arrow} />
                </p>
              </a>
            </FadeRise>
          </Wrap>
        </section>

        {/* 2. Country & cultural formats band */}
        <section className="py-8">
          <Wrap className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
            <MonoLabel className="shrink-0">{d.countriesLabel}</MonoLabel>
            <ul className="flex flex-wrap gap-2">
              {countries.map((name) => (
                <li key={name}>
                  <Chip>{name}</Chip>
                </li>
              ))}
            </ul>
          </Wrap>
        </section>

        {/* 3. Section 01: Educación — Thesis jury call + Academic scenario simulations */}
        <section id="education" className="scroll-mt-16 py-12 md:py-20">
          <Wrap className="flex flex-col gap-3">
            <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
              <FadeRise className="h-full">
                <Widget label={d.eduTag} className="h-full">
                  <Title>{c.education}</Title>
                  <Lede>{c.educationBody}</Lede>
                  <ul className="mt-auto flex flex-col gap-2">
                    {[d.eduBullet1, d.eduBullet2, d.eduBullet3].map((item, index) => (
                      <li key={item}>
                        <Inset className="flex items-center gap-3 p-3">
                          <IconTile>0{index + 1}</IconTile>
                          <span className="text-base text-cream-bright">{item}</span>
                        </Inset>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link to="/app">
                      <Action withArrow>{d.openThesis}</Action>
                    </Link>
                    <Link to="/app/training/education">
                      <Action tone="quiet" withArrow>
                        {d.openAcademic}
                      </Action>
                    </Link>
                  </div>
                </Widget>
              </FadeRise>

              <FadeRise delay={0.1}>
                <Widget label={d.callLabel}>
                  <div className="relative sm:pb-10">
                    <JuryCallScreen d={d} />
                    <div className="relative -mt-5 ml-auto w-fit sm:absolute sm:-bottom-2 sm:right-3 sm:mt-0">
                      <ActaOverlay d={d} />
                    </div>
                  </div>
                </Widget>
              </FadeRise>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <FadeRise>
                <Widget label="01.1 · THESIS DEFENSE" className="h-full justify-between">
                  <div>
                    <h3 className="text-2xl font-light tracking-[-0.03em] text-cream-bright">
                      {c.thesis}
                    </h3>
                    <p className="mt-2 text-base leading-relaxed text-cream-dim">{c.thesisBody}</p>
                  </div>
                  <Link to="/app" className="mt-4 self-start">
                    <Action tone="quiet" withArrow>
                      {d.openThesis}
                    </Action>
                  </Link>
                </Widget>
              </FadeRise>

              <FadeRise delay={0.06}>
                <Widget label="01.2 · ACADEMIC LAB" className="h-full justify-between">
                  <div>
                    <h3 className="text-2xl font-light tracking-[-0.03em] text-cream-bright">
                      {c.academic}
                    </h3>
                    <p className="mt-2 text-base leading-relaxed text-cream-dim">{c.academicBody}</p>
                    <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                      {[
                        { title: d.acad1Title, meta: d.acad1Meta },
                        { title: d.acad2Title, meta: d.acad2Meta },
                        { title: d.acad3Title, meta: d.acad3Meta },
                        { title: d.acad4Title, meta: d.acad4Meta },
                      ].map((sc) => (
                        <li key={sc.title}>
                          <Inset className="p-3">
                            <p className="text-sm font-semibold text-cream-bright">{sc.title}</p>
                            <p className="mt-0.5 text-xs text-cream-dim">{sc.meta}</p>
                          </Inset>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Link to="/app/training/education" className="mt-4 self-start">
                    <Action tone="quiet" withArrow>
                      {d.openAcademic}
                    </Action>
                  </Link>
                </Widget>
              </FadeRise>
            </div>
          </Wrap>
        </section>

        {/* 4. Section 02: Profesional — HardTalk Tech, HardTalk Latam, Intuition Trainer & Interviews */}
        <section id="professional" className="scroll-mt-16 py-12 md:py-20">
          <Wrap className="flex flex-col gap-3">
            <FadeRise className="mb-4 max-w-3xl">
              <MonoLabel>{d.proTag}</MonoLabel>
              <Title className="mt-3">{c.professional}</Title>
              <Lede className="mt-3">{c.professionalBody}</Lede>
            </FadeRise>

            <FeatureRow
              label="02.1 · TECH & STAKEHOLDER LAB"
              title={c.techLab}
              body={c.techLabBody}
              ctaLabel={d.openConversations}
              ctaTo="/app/training/professional"
              screen={<TechLabScreen d={d} />}
            />

            <FeatureRow
              label="02.2 · LATAM & NORTH AMERICA"
              title={c.culturalLab}
              body={c.culturalLabBody}
              ctaLabel={d.openConversations}
              ctaTo="/app/training/professional"
              screen={<CulturalLabScreen d={d} />}
              flip
            />

            <FeatureRow
              label="02.3 · HISTORICAL OUTCOMES"
              title={c.intuition}
              body={c.intuitionBody}
              ctaLabel={d.openIntuition}
              ctaTo="/app/intuition"
              screen={<IntuitionScreen d={d} />}
            />

            <FadeRise>
              <Widget label="02.4 · LIVE INTERVIEWS">
                <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                  <div className="max-w-2xl">
                    <h3 className="text-balance text-[clamp(1.75rem,3.2vw,2.5rem)] font-light leading-[1.08] tracking-[-0.04em] text-cream-bright">
                      {c.interviews}
                    </h3>
                    <p className="mt-2 text-pretty text-lg leading-relaxed text-cream-dim">
                      {c.interviewsBody}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link to="/app/practice">
                      <Action withArrow>{d.openInterviews}</Action>
                    </Link>
                    <Link to="/app/applications">
                      <Action tone="quiet">{c.applications}</Action>
                    </Link>
                    <Link to="/app/progress">
                      <Action tone="quiet">{c.progress}</Action>
                    </Link>
                  </div>
                </div>
              </Widget>
            </FadeRise>
          </Wrap>
        </section>

        {/* 5. How it works: three trail-dashboard tiles with amber IconTiles */}
        <section id="how-it-works" className="scroll-mt-16 py-12 md:py-20">
          <Wrap>
            <FadeRise>
              <MonoLabel>{d.howTag}</MonoLabel>
              <Title className="mt-3 max-w-2xl">{c.how}</Title>
              <Lede className="mt-3 max-w-2xl">{c.howBody}</Lede>
            </FadeRise>
            <ol className="mt-8 grid gap-3 md:grid-cols-3">
              {[
                { title: d.step1Title, body: d.step1Body },
                { title: d.step2Title, body: d.step2Body },
                { title: d.step3Title, body: d.step3Body },
              ].map((step, index) => (
                <li key={step.title} className="min-w-0">
                  <FadeRise delay={index * 0.06} className="h-full">
                    <Widget className="h-full">
                      <Inset className="flex flex-col gap-4">
                        <IconTile>0{index + 1}</IconTile>
                        <h3 className="text-2xl font-light tracking-[-0.03em] text-cream-bright">
                          {step.title}
                        </h3>
                      </Inset>
                      <p className="text-pretty text-base leading-relaxed text-cream-dim">
                        {step.body}
                      </p>
                    </Widget>
                  </FadeRise>
                </li>
              ))}
            </ol>
          </Wrap>
        </section>

        {/* 6. Ink claim band + Voluntary Support section */}
        <section id="support" className="scroll-mt-16 py-12 md:py-20">
          <Wrap className="space-y-6">
            <FadeRise>
              <div className="grid gap-8 rounded-[1.375rem] bg-[#2E2D2A] p-6 text-[#F4F0E9] sm:p-10 md:grid-cols-2">
                <div>
                  <p className="font-mono text-xs font-medium uppercase tracking-[0.06em] text-[#FBD06A]">
                    <span aria-hidden className="tracking-[-0.1em]">::</span>
                    {d.privacyTag}
                  </p>
                  <h2 className="mt-3 text-balance text-[clamp(2.25rem,5vw,4rem)] font-light leading-[1.02] tracking-[-0.045em]">
                    {c.support}
                  </h2>
                  <p className="mt-5 max-w-md text-pretty text-lg leading-relaxed opacity-80">
                    {c.supportBody}
                  </p>
                </div>
                <ul className="flex flex-col gap-2 self-end">
                  {[d.privacy1, d.privacy2, d.privacy3].map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-4 rounded-2xl bg-white/[0.06] px-4 py-4 text-base sm:text-lg"
                    >
                      <span
                        aria-hidden
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#F6B733] text-[#2E2D2A]"
                      >
                        <Check className="h-4 w-4" strokeWidth={2.5} />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeRise>

            <FadeRise delay={0.08}>
              <Support />
            </FadeRise>
          </Wrap>
        </section>

        {/* 7. Institutions & community */}
        <section className="pb-16 pt-4 md:pb-24">
          <Wrap className="grid gap-3 md:grid-cols-2">
            {[
              { title: d.instTitle, body: d.instBody, to: "/instituciones", cta: d.instCta },
              { title: d.affTitle, body: d.affBody, to: "/afiliados", cta: d.affCta },
            ].map((item, index) => (
              <FadeRise key={item.title} delay={index * 0.05} className="h-full">
                <Widget label={item.title} className="h-full">
                  <p className="flex-1 text-pretty text-base text-cream-dim">{item.body}</p>
                  <Link
                    to={item.to}
                    className="focus-ring group inline-flex items-center gap-1 rounded-full text-base font-semibold text-accent-text transition-colors"
                  >
                    {item.cta}
                    <ArrowRight aria-hidden className={arrow} />
                  </Link>
                </Widget>
              </FadeRise>
            ))}
          </Wrap>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
