import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  BookOpenCheck,
  Briefcase,
  Building2,
  GraduationCap,
  FileSearch,
  Gavel,
  Grid3x3,
  Mic,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";
import { Action, AnimatedCounter, Eyebrow, FadeRise, HeroVideo, Panel, Section, WordsPullUp } from "@/design-system";
import { EASE_OUT } from "@/design-system/motion";
import { LandingNav } from "./LandingNav";
import { SiteFooter } from "./SiteFooter";
import { useLocale } from "@/hooks/useLocale";

/** The same footage as the interview landing; `VITE_HERO_VIDEO` overrides both. */
const HERO_VIDEO = import.meta.env.VITE_HERO_VIDEO ?? "/hero-2.mp4";
const HERO_POSTER = "/hero-2.jpg";

/**
 * The front page for Sustentación.
 *
 * Sold on the one moment it is for: the night before the defence, when the
 * student knows the jury will ask about page 34 and has nobody to rehearse
 * with. Everything here is in the order that student's doubts arrive — what
 * is it, will it really read my thesis, what do I get, what does it cost,
 * is my thesis safe.
 *
 * Its own copy in Spanish, Portuguese and English, like the rest of the
 * defence screens; any other interface language reads the English.
 */
const ES = {
  advisorTitle: "¿Eres asesor de tesis?",
  advisorBody: "Recomienda Mockio a tus tesistas con tu código: ves su avance (si ellos lo comparten) y ganas el 30% de cada compra.",
  advisorCta: "Crear mi código de asesor",
  institutionTitle: "¿Escuela de posgrado o facultad?",
  institutionBody: "Licencias por cohorte, rúbrica propia e informes por alumno. Escríbenos y te enviamos una propuesta.",
  navHow: "Cómo funciona",
  navPanel: "El jurado",
  navPricing: "Precios",
  cta: "Sube tu tesis gratis",
  heroTitle: "Tu jurado de 3, antes del jurado real.",
  heroSub:
    "Ensaya tu sustentación por voz con un panel que leyó tu tesis: preguntas sobre tus páginas, repreguntas como las de verdad y un acta de 0 a 20 al final.",
  heroNote: "1 ensayo gratis · sin tarjeta",
  howEyebrow: "Cómo funciona",
  howTitle: "De tu PDF a tu acta en una tarde.",
  step1Title: "Sube tu tesis",
  step1Body: "PDF o Word. En segundos ves por dónde te va a atacar el jurado, con la página de cada punto débil y tu matriz de consistencia revisada.",
  step2Title: "Sustenta por voz",
  step2Body: "Expones y respondes a un presidente, una metodóloga y un especialista. Cada uno con su voz, su rol y sus repreguntas.",
  step3Title: "Recibe el acta",
  step3Body: "Nota de 0 a 20, qué opinó cada jurado, tu índice de preparación por capítulo y la respuesta que deberías dar la próxima vez.",
  panelEyebrow: "El jurado",
  panelTitle: "Preguntan por tu página 34, no por “una tesis cualquiera”.",
  juror1: "Presidente del jurado",
  juror2: "Metodóloga",
  juror3: "Especialista",
  q1: "Bachiller, en la página 34 usted concluye que las redes sociales causan el aumento de las ventas. Su diseño es correlacional. ¿Con qué sustento afirma causalidad?",
  q2: "Usted aplicó Pearson. ¿Verificó antes la normalidad de sus datos? En la tesis no aparece esa prueba.",
  actaLabel: "Acta simulada",
  actaVerdict: "Aprobado por mayoría",
  edgeTitle: "Lo que un chatbot no hace",
  edge1Title: "Lee tu tesis completa",
  edge1Body: "Hasta 300 páginas. Cada pregunta cita de dónde sale.",
  edge2Title: "Tres jurados, tres roles",
  edge2Body: "Forma, metodología y tema. Deliberan entre ellos antes del acta.",
  edge3Title: "Tu matriz de consistencia",
  edge3Body: "Problema, objetivos, hipótesis, resultados y conclusiones: dónde no cuadran.",
  edge4Title: "El formato de tu país",
  edge4Body: "Perú, Brasil, Colombia, Chile, Argentina, Ecuador, Bolivia, Uruguay y Panamá: su jurado, su vocabulario y su escala de notas.",
  pricingEyebrow: "Precios",
  pricingTitle: "Menos que una hora de asesoría.",
  freeName: "Gratis",
  freePrice: "S/ 0",
  free1: "1 ensayo express con un jurado",
  free2: "Diagnóstico de tu tesis",
  free3: "Sin tarjeta",
  packName: "Pack Sustentación",
  packPrice: "S/ 39",
  packUnit: "pago único",
  pack1: "5 sustentaciones con el panel de 3 jurados",
  pack2: "Diagnóstico completo y matriz de consistencia",
  pack3: "Acta simulada, deliberación y respuestas sugeridas",
  pack4: "Cuatro niveles: de calentamiento a jurado hostil",
  pack5: "Válido 6 meses",
  packCta: "Empezar gratis",
  packBadge: "Recomendado",
  freeCta: "Probar gratis",
  stepLabel: "Paso",
  passes: "¿Sustentas en menos de un mes? Pase Intensivo S/ 79: 20 sustentaciones y todos los modos (verificación de autoría, preguntas trampa, coach estadístico, levantar observaciones, virtual o presencial). ¿Tesis en pareja o trío? Tesis grupal S/ 119. ¿Quieres que además te escuche una persona? Sustentación con docente S/ 189, con 30 minutos con un docente real.",
  legal1: "Mockio es una herramienta de práctica. No garantiza la aprobación de tu sustentación: la decisión es solo de tu jurado.",
  legal2: "La IA puede equivocarse. Verifica con tu asesor y con el reglamento de tu universidad.",
  privacyTitle: "Tu tesis es tuya.",
  privacyBody:
    "Es inédita y la tratamos así: solo se usa para tus ensayos, nunca para entrenar modelos, y la borras con un clic. Mockio no escribe tu tesis ni te sopla respuestas en la sustentación real: te ayuda a llegar preparado.",
  ladderTitle: "Después de sustentar",
  ladderBody: "Mockio también te prepara para lo que sigue: entrevistas de trabajo y tus primeros escenarios laborales — reuniones, presentaciones a clientes, feedback — en español o en inglés.",
  ladderCta: "Practicar entrevistas",
  docTitle: "Mockio — Ensaya tu sustentación de tesis con un jurado de 3",
  navScenarios: "Escenarios",
  scenEyebrow: "Escenarios",
  scenTitle: "Del plan de tesis al doctorado.",
  scenSub: "Cada grado tiene su jurado. Elige el tuyo y el panel ajusta la profundidad, el tiempo de exposición y la exigencia de la nota.",
  sc1Title: "Plan de tesis",
  sc1Body: "¿Es viable? Problema, objetivos, diseño y acceso a la muestra. Sin resultados aún.",
  sc2Title: "Bachiller",
  sc2Body: "Lo esencial: tu problema, tu método y cómo leer tu resultado.",
  sc3Title: "Título profesional",
  sc3Body: "Todos los capítulos: marco, diseño, instrumentos, estadística y discusión.",
  sc4Title: "Suficiencia profesional",
  sc4Body: "Tu experiencia: qué decidiste, qué aplicaste y cómo mediste el resultado.",
  sc5Title: "Maestría",
  sc5Body: "Estado del arte, diseño defendido frente a alternativas y tu aporte al campo.",
  sc6Title: "Doctorado",
  sc6Body: "Tu contribución original, frente a pares y sus objeciones más duras.",
  levelsTitle: "Y cuatro niveles de jurado",
  lv1: "Calentamiento",
  lv1Body: "Paciente. Te reformula si te trabas.",
  lv2: "Estándar",
  lv2Body: "Un jurado normal. No acepta lo vago.",
  lv3: "Exigente",
  lv3Body: "Contrasta cada respuesta con tu tesis.",
  lv4: "Hostil",
  lv4Body: "Interrumpe, cuestiona y no oculta el desacuerdo.",
};

type Key = keyof typeof ES;

const PT: Record<Key, string> = {
  advisorTitle: "Você é orientador?",
  advisorBody: "Recomende o Mockio aos seus orientandos com seu código: você acompanha o progresso (se eles compartilharem) e ganha 30% de cada compra.",
  advisorCta: "Criar meu código",
  institutionTitle: "Programa de pós-graduação ou faculdade?",
  institutionBody: "Licenças por turma, rubrica própria e relatórios por aluno. Escreva e enviamos uma proposta.",
  navHow: "Como funciona",
  navPanel: "A banca",
  navPricing: "Preços",
  cta: "Envie seu trabalho grátis",
  heroTitle: "Sua banca de 3, antes da banca de verdade.",
  heroSub:
    "Ensaie sua defesa por voz com uma banca que leu seu trabalho: perguntas sobre as suas páginas, réplicas como as reais e uma ata no final.",
  heroNote: "1 ensaio grátis · sem cartão",
  howEyebrow: "Como funciona",
  howTitle: "Do seu PDF à sua ata em uma tarde.",
  step1Title: "Envie seu trabalho",
  step1Body: "PDF ou Word. Em segundos você vê onde a banca vai pressionar, com a página de cada ponto fraco e sua matriz de consistência revisada.",
  step2Title: "Defenda por voz",
  step2Body: "Você apresenta e responde a um presidente, uma metodóloga e um especialista. Cada um com sua voz, seu papel e suas réplicas.",
  step3Title: "Receba a ata",
  step3Body: "Nota, o que cada avaliador achou, seu índice de preparação por capítulo e a resposta que você deveria dar da próxima vez.",
  panelEyebrow: "A banca",
  panelTitle: "Perguntam pela sua página 34, não por “um trabalho qualquer”.",
  juror1: "Presidente da banca",
  juror2: "Metodóloga",
  juror3: "Especialista",
  q1: "Na página 34 você conclui que as redes sociais causam o aumento das vendas. Seu delineamento é correlacional. Com que base você afirma causalidade?",
  q2: "Você aplicou Pearson. Verificou antes a normalidade dos dados? Esse teste não aparece no trabalho.",
  actaLabel: "Ata simulada",
  actaVerdict: "Aprovado por maioria",
  edgeTitle: "O que um chatbot não faz",
  edge1Title: "Lê seu trabalho inteiro",
  edge1Body: "Até 300 páginas. Cada pergunta cita de onde vem.",
  edge2Title: "Três avaliadores, três papéis",
  edge2Body: "Forma, metodologia e tema. Deliberam entre si antes da ata.",
  edge3Title: "Sua matriz de consistência",
  edge3Body: "Problema, objetivos, hipóteses, resultados e conclusões: onde não fecham.",
  edge4Title: "O formato do seu país",
  edge4Body: "A banca brasileira — orientador, avaliador interno e externo, arguição e nota de 0 a 10 — e os formatos de mais oito países da América Latina.",
  pricingEyebrow: "Preços",
  pricingTitle: "Menos que uma hora de orientação.",
  freeName: "Grátis",
  freePrice: "R$ 0",
  free1: "1 ensaio express com um avaliador",
  free2: "Diagnóstico do seu trabalho",
  free3: "Sem cartão",
  packName: "Pacote Defesa",
  packPrice: "US$ 11",
  packUnit: "pagamento único",
  pack1: "5 defesas com a banca de 3",
  pack2: "Diagnóstico completo e matriz de consistência",
  pack3: "Ata simulada, deliberação e respostas sugeridas",
  pack4: "Quatro níveis: do aquecimento à banca hostil",
  pack5: "Válido por 6 meses",
  packCta: "Começar grátis",
  packBadge: "Recomendado",
  freeCta: "Testar grátis",
  stepLabel: "Passo",
  passes: "Defende em menos de um mês? Passe Intensivo US$ 23: 20 defesas e todos os modos (verificação de autoria, perguntas armadilha, coach estatístico, responder às observações, virtual ou presencial). Trabalho em dupla ou trio? Trabalho em grupo US$ 35. Quer que uma pessoa também ouça você? Defesa com professor US$ 55, com 30 minutos com um professor de verdade.",
  legal1: "O Mockio é uma ferramenta de prática. Não garante a aprovação da sua defesa: a decisão é só da sua banca.",
  legal2: "A IA pode errar. Confirme com seu orientador e com o regulamento da sua universidade.",
  privacyTitle: "Seu trabalho é seu.",
  privacyBody:
    "É inédito e tratamos assim: usado só nos seus ensaios, nunca para treinar modelos, e você apaga com um clique. O Mockio não escreve seu trabalho nem sopra respostas na defesa real: ajuda você a chegar preparado.",
  ladderTitle: "Depois da defesa",
  ladderBody: "O Mockio também prepara você para o que vem depois: entrevistas de emprego e suas primeiras situações de trabalho — reuniões, apresentações a clientes, feedback — em português ou em inglês.",
  ladderCta: "Praticar entrevistas",
  docTitle: "Mockio — Ensaie sua defesa com uma banca de 3",
  navScenarios: "Cenários",
  scenEyebrow: "Cenários",
  scenTitle: "Do projeto ao doutorado.",
  scenSub: "Cada nível tem sua banca. Escolha o seu e a banca ajusta a profundidade, o tempo de apresentação e o rigor da nota.",
  sc1Title: "Projeto de pesquisa",
  sc1Body: "É viável? Problema, objetivos, desenho e acesso à amostra. Sem resultados ainda.",
  sc2Title: "Bacharelado (TCC)",
  sc2Body: "O essencial: seu problema, seu método e como ler seu resultado.",
  sc3Title: "Graduação",
  sc3Body: "Todos os capítulos: referencial, desenho, instrumentos, estatística e discussão.",
  sc4Title: "Relatório profissional",
  sc4Body: "Sua experiência: o que decidiu, o que aplicou e como mediu o resultado.",
  sc5Title: "Mestrado",
  sc5Body: "Estado da arte, desenho defendido frente às alternativas e sua contribuição.",
  sc6Title: "Doutorado",
  sc6Body: "Sua contribuição original, diante de pares e das objeções mais duras.",
  levelsTitle: "E quatro níveis de banca",
  lv1: "Aquecimento",
  lv1Body: "Paciente. Reformula se você travar.",
  lv2: "Padrão",
  lv2Body: "Uma banca normal. Não aceita o vago.",
  lv3: "Exigente",
  lv3Body: "Confere cada resposta com o trabalho.",
  lv4: "Hostil",
  lv4Body: "Interrompe, questiona e discorda abertamente.",
};

const EN: Record<Key, string> = {
  advisorTitle: "Are you a thesis advisor?",
  advisorBody: "Recommend Mockio to your students with your code: follow their progress (if they share it) and earn 30% of every purchase.",
  advisorCta: "Create my advisor code",
  institutionTitle: "A graduate school or faculty?",
  institutionBody: "Licences per cohort, your own rubric and reports per student. Write to us for a proposal.",
  navHow: "How it works",
  navPanel: "The panel",
  navPricing: "Pricing",
  cta: "Upload your thesis free",
  heroTitle: "Your panel of three, before the real one.",
  heroSub:
    "Rehearse your thesis defence by voice with a panel that read your thesis: questions about your pages, follow-ups like the real ones, and a graded record at the end.",
  heroNote: "1 free rehearsal · no card",
  howEyebrow: "How it works",
  howTitle: "From your PDF to your record in an afternoon.",
  step1Title: "Upload your thesis",
  step1Body: "PDF or Word. In seconds you see where the panel will press, with the page of every weak point and your consistency matrix checked.",
  step2Title: "Defend it out loud",
  step2Body: "You present and answer a chair, a methodologist and a subject specialist, each with their own voice, role and follow-ups.",
  step3Title: "Get the record",
  step3Body: "A grade, what each juror thought, your readiness by chapter, and the answer to give next time.",
  panelEyebrow: "The panel",
  panelTitle: "They ask about your page 34, not about “a thesis”.",
  juror1: "Chair of the panel",
  juror2: "Methodologist",
  juror3: "Subject specialist",
  q1: "On page 34 you conclude that social media causes the rise in sales. Your design is correlational. On what basis do you claim causation?",
  q2: "You used Pearson. Did you check your data for normality first? That test is not in the thesis.",
  actaLabel: "Simulated record",
  actaVerdict: "Passed by majority",
  edgeTitle: "What a chatbot does not do",
  edge1Title: "Reads your whole thesis",
  edge1Body: "Up to 300 pages. Every question cites where it comes from.",
  edge2Title: "Three jurors, three roles",
  edge2Body: "Form, methodology and subject. They deliberate before the record.",
  edge3Title: "Your consistency matrix",
  edge3Body: "Problem, objectives, hypotheses, results and conclusions: where they do not line up.",
  edge4Title: "Your country's format",
  edge4Body: "Peru, Brazil, Colombia, Chile, Argentina, Ecuador, Bolivia, Uruguay and Panama: each one's panel, vocabulary and grading scale.",
  pricingEyebrow: "Pricing",
  pricingTitle: "Less than an hour with a tutor.",
  freeName: "Free",
  freePrice: "US$ 0",
  free1: "1 express rehearsal with one juror",
  free2: "Your thesis diagnosis",
  free3: "No card",
  packName: "Defence Pack",
  packPrice: "US$ 11",
  packUnit: "one-time",
  pack1: "5 defences with the panel of three",
  pack2: "Full diagnosis and consistency matrix",
  pack3: "Simulated record, deliberation and suggested answers",
  pack4: "Four levels, from warm-up to a hostile panel",
  pack5: "Valid for 6 months",
  packCta: "Start free",
  packBadge: "Recommended",
  freeCta: "Try it free",
  stepLabel: "Step",
  passes: "Defending within a month? Intensive Pass US$ 23: 20 defences and every mode (authorship check, trick questions, statistics coach, answering reviewers, online or in person). A thesis by two or three? Group thesis US$ 35. Want a person to hear you too? Defence with a teacher US$ 55, with 30 minutes with a real teacher.",
  legal1: "Mockio is a practice tool. It does not guarantee you pass your defence: that decision is your jury's alone.",
  legal2: "AI can be wrong. Check with your advisor and your university's regulations.",
  privacyTitle: "Your thesis is yours.",
  privacyBody:
    "It is unpublished and we treat it that way: used only for your rehearsals, never to train models, and deleted with one click. Mockio does not write your thesis or feed you answers in the real defence: it helps you arrive prepared.",
  ladderTitle: "After the defence",
  ladderBody: "Mockio also prepares you for what comes next: job interviews and your first workplace scenes — meetings, client presentations, feedback — in your language or in English.",
  ladderCta: "Practise interviews",
  docTitle: "Mockio — Rehearse your thesis defence with a panel of three",
  navScenarios: "Scenarios",
  scenEyebrow: "Scenarios",
  scenTitle: "From the proposal to the doctorate.",
  scenSub: "Every degree has its own panel. Pick yours and the jury adjusts its depth, the presentation time and how strictly it grades.",
  sc1Title: "Thesis proposal",
  sc1Body: "Is it feasible? Problem, aims, design and access to the sample. No results yet.",
  sc2Title: "Bachelor's",
  sc2Body: "The essentials: your problem, your method and how to read your result.",
  sc3Title: "Undergraduate thesis",
  sc3Body: "Every chapter: framework, design, instruments, statistics and discussion.",
  sc4Title: "Professional report",
  sc4Body: "Your work: what you decided, what you applied and how you measured the result.",
  sc5Title: "Master's",
  sc5Body: "State of the art, a design defended against alternatives, and what you add.",
  sc6Title: "Doctorate",
  sc6Body: "Your original contribution, before peers and their hardest objections.",
  levelsTitle: "And four levels of panel",
  lv1: "Warm-up",
  lv1Body: "Patient. Rephrases if you get stuck.",
  lv2: "Standard",
  lv2Body: "A normal panel. Vague gets a follow-up.",
  lv3: "Demanding",
  lv3Body: "Checks every answer against your thesis.",
  lv4: "Hostile",
  lv4Body: "Interrupts, challenges and disagrees openly.",
};

const BY_LOCALE: Record<string, Record<Key, string>> = { es: ES, pt: PT, en: EN };

/**
 * The three jurors' marks on the sample record, filled as the card arrives.
 *
 * `scaleX` from the left edge rather than `width`, so the fill composites
 * instead of laying the card out again on every frame; a short stagger so the
 * eye reads them as three marks, not one block. Under reduced motion Motion
 * skips straight to the end.
 */
function ActaBars({ rows }: { rows: { label: string; score: number }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  // Drawn full rather than parked at zero: a bar waiting for a scroll that a
  // reduced-motion reader's browser never animates would read as no grade.
  const still = useReducedMotion();
  return (
    <div ref={ref} className="flex flex-col gap-2.5">
      {rows.map(({ label, score }, index) => (
        <div key={label} className="flex flex-col gap-1">
          <span className="flex items-baseline justify-between text-xs">
            <span className="text-cream-dim">{label}</span>
            <span className="font-semibold tabular-nums text-cream-bright">{score}</span>
          </span>
          <span className="block h-1.5 overflow-hidden rounded-full bg-surface-lift">
            <motion.span
              className={`block h-full origin-left rounded-full ${score >= 14 ? "bg-grow" : "bg-accent"}`}
              style={{ width: `${(score / 20) * 100}%` }}
              initial={still ? false : { scaleX: 0 }}
              animate={{ scaleX: still || inView ? 1 : 0 }}
              transition={{ duration: 0.7, delay: 0.15 + index * 0.06, ease: EASE_OUT }}
            />
          </span>
        </div>
      ))}
    </div>
  );
}

/** One of the four cards that close the page. */
function ClosingCard({
  icon,
  tone,
  title,
  body,
  children,
}: {
  icon: typeof Mic;
  tone?: "accent" | "grow";
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <Panel variant="raised" className="flex h-full flex-col items-start gap-3 p-7 shadow-lift">
      <span className="flex items-center gap-4">
        <IconTile icon={icon} tone={tone} />
        <h2 className="text-lg font-semibold tracking-[-0.01em] text-cream-bright">{title}</h2>
      </span>
      <p className="text-pretty text-sm leading-relaxed text-cream-dim">{body}</p>
      {children}
    </Panel>
  );
}

/** The icon in a soft tile — one shape for every icon on the page. */
function IconTile({ icon: Icon, tone = "accent" }: { icon: typeof Mic; tone?: "accent" | "grow" }) {
  return (
    <span
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
        tone === "grow" ? "bg-grow-soft text-grow-text" : "bg-accent-soft text-accent-text"
      }`}
    >
      <Icon aria-hidden className="h-[1.125rem] w-[1.125rem]" />
    </span>
  );
}

export function DefenseLanding() {
  const { locale } = useLocale();
  const c = BY_LOCALE[locale] ?? EN;
  const start = "/app";

  // An advisor's link: remembered until the student is inside the app, where
  // the link is made. Only a well-formed code is kept.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("asesor")?.trim().toUpperCase();
    if (!code || !/^[A-Z0-9]{6}$/.test(code)) return;
    try {
      localStorage.setItem("mockio.advisorRef", code);
    } catch {
      // Private mode: the student can still type the code later.
    }
  }, []);

  // The tab and the search result say what this page is, not the old one.
  useEffect(() => {
    const previous = document.title;
    document.title = c.docTitle;
    return () => {
      document.title = previous;
    };
  }, [c.docTitle]);

  const steps = [
    { icon: Upload, title: c.step1Title, body: c.step1Body },
    { icon: Mic, title: c.step2Title, body: c.step2Body },
    { icon: Gavel, title: c.step3Title, body: c.step3Body },
  ];
  const scenarios = [
    { title: c.sc1Title, body: c.sc1Body },
    { title: c.sc2Title, body: c.sc2Body },
    { title: c.sc3Title, body: c.sc3Body },
    { title: c.sc4Title, body: c.sc4Body },
    { title: c.sc5Title, body: c.sc5Body },
    { title: c.sc6Title, body: c.sc6Body },
  ];
  const levels = [
    { name: c.lv1, body: c.lv1Body },
    { name: c.lv2, body: c.lv2Body },
    { name: c.lv3, body: c.lv3Body },
    { name: c.lv4, body: c.lv4Body },
  ];
  const edges = [
    { icon: FileSearch, title: c.edge1Title, body: c.edge1Body },
    { icon: Users, title: c.edge2Title, body: c.edge2Body },
    { icon: Grid3x3, title: c.edge3Title, body: c.edge3Body },
    { icon: BookOpenCheck, title: c.edge4Title, body: c.edge4Body },
  ];

  return (
    <main className="bg-surface-base">
      <LandingNav
        links={[
          { label: c.navHow, href: "#how" },
          { label: c.navScenarios, href: "#scenarios" },
          { label: c.navPanel, href: "#panel" },
          { label: c.navPricing, href: "#pricing" },
        ]}
        cta={{ label: c.cta, to: start }}
      />

      {/* Hero: the promise, the way in and what it costs to try, laid over
          the footage — the same frame as the interview landing, so the two
          front doors read as one product. The copy sits in the clip's dark
          upper third; the scrim below only steadies it, never hides her. */}
      <section className="px-2 pb-2 pt-[calc(3.5rem+env(safe-area-inset-top,0px))] sm:px-3 sm:pb-3">
        <div className="on-media relative isolate flex h-[min(72svh,36rem)] min-h-[26rem] flex-col items-center overflow-hidden rounded-[1.25rem] bg-surface-base text-center sm:h-[min(calc(100svh-6rem),44rem)] sm:min-h-[30rem] sm:rounded-inset">
          <HeroVideo bare focus="object-[50%_0%]" src={HERO_VIDEO} poster={HERO_POSTER} />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[80%] bg-gradient-to-b from-black/85 via-black/50 to-transparent sm:h-2/3 sm:from-black/80 sm:via-black/40"
          />
          <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 pt-[clamp(2rem,7svh,5.5rem)]">
            <h1 className="text-balance text-[clamp(2.1rem,5vw,4rem)] font-semibold leading-[1.04] tracking-[-0.035em] text-cream-bright [text-shadow:0_1px_24px_rgb(0_0_0/0.35)]">
              <WordsPullUp align="center" className="w-full">{c.heroTitle}</WordsPullUp>
            </h1>
            <FadeRise delay={0.2} className="mt-4 max-w-2xl">
              <p className="text-balance text-base text-cream-bright/85 [text-shadow:0_1px_16px_rgb(0_0_0/0.4)] sm:text-lg">
                {c.heroSub}
              </p>
            </FadeRise>
            <FadeRise delay={0.32} className="mt-6 flex flex-col items-center gap-2.5">
              <Link to={start}>
                <Action withArrow className="px-6 py-3 text-base">
                  {c.cta}
                </Action>
              </Link>
              <span className="text-sm text-cream-bright/75 [text-shadow:0_1px_12px_rgb(0_0_0/0.5)]">{c.heroNote}</span>
            </FadeRise>
          </div>
        </div>
      </section>

      {/* How it works. */}
      <Section id="how">
        <FadeRise className="mx-auto max-w-2xl text-center">
          <Eyebrow>{c.howEyebrow}</Eyebrow>
          <h2 className="mt-3 text-balance text-headline font-semibold text-cream-bright">{c.howTitle}</h2>
        </FadeRise>
        <ol className="mx-auto mt-12 grid max-w-5xl gap-4 md:grid-cols-3 [&>*]:min-w-0">
          {steps.map((step, index) => (
            <li key={step.title}>
              <FadeRise delay={index * 0.08} className="h-full">
                <Panel variant="raised" className="flex h-full flex-col gap-3 p-6 shadow-lift">
                  <span className="flex items-center justify-between">
                    <IconTile icon={step.icon} />
                    <span className="text-xs font-semibold tabular-nums text-cream-faint">
                      {c.stepLabel} {index + 1}
                    </span>
                  </span>
                  <h3 className="mt-2 text-lg font-semibold tracking-[-0.01em] text-cream-bright">{step.title}</h3>
                  <p className="text-pretty text-sm leading-relaxed text-cream-dim">{step.body}</p>
                </Panel>
              </FadeRise>
            </li>
          ))}
        </ol>
      </Section>

      {/* Which defence: by degree, then how hard. The choice a student makes
          first on the rehearsal screen, shown before they get there. */}
      <Section id="scenarios" className="bg-surface-deep">
        <FadeRise className="mx-auto max-w-2xl text-center">
          <Eyebrow>{c.scenEyebrow}</Eyebrow>
          <h2 className="mt-3 text-balance text-headline font-semibold text-cream-bright">{c.scenTitle}</h2>
          <p className="mt-4 text-balance text-base text-cream-dim">{c.scenSub}</p>
        </FadeRise>
        <ul className="mx-auto mt-10 grid max-w-5xl grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3 [&>*]:min-w-0">
          {scenarios.map((scenario, index) => (
            <li key={scenario.title}>
              <FadeRise delay={index * 0.05} className="h-full">
                <div className="flex h-full flex-col gap-1 rounded-2xl bg-surface-card p-3.5 shadow-card sm:gap-1.5 sm:p-5">
                  <span className="text-xs font-semibold tabular-nums text-accent-text">{String(index + 1).padStart(2, "0")}</span>
                  <p className="text-sm font-semibold leading-tight text-cream-bright sm:text-base">{scenario.title}</p>
                  <p className="text-xs leading-snug text-cream-dim sm:text-sm">{scenario.body}</p>
                </div>
              </FadeRise>
            </li>
          ))}
        </ul>
        <FadeRise className="mx-auto mt-10 max-w-5xl">
          <h3 className="text-center text-title font-semibold text-cream-bright">{c.levelsTitle}</h3>
          <ol className="mt-6 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4 [&>*]:min-w-0">
            {levels.map((level, index) => (
              <li key={level.name} className="flex flex-col gap-1.5 rounded-2xl bg-surface-card p-3.5 shadow-card sm:gap-2 sm:p-5">
                <span aria-hidden className="flex items-end gap-1">
                  {[0, 1, 2, 3].map((bar) => (
                    <span
                      key={bar}
                      className={`w-1.5 rounded-sm ${bar <= index ? (index === 3 ? "bg-rose-400" : "bg-grow-text") : "bg-cream-faint/30"}`}
                      style={{ height: `${8 + bar * 4}px` }}
                    />
                  ))}
                </span>
                <p className="text-sm font-semibold text-cream-bright sm:text-base">{level.name}</p>
                <p className="text-xs leading-snug text-cream-dim sm:text-sm">{level.body}</p>
              </li>
            ))}
          </ol>
        </FadeRise>
      </Section>

      {/* The panel, shown rather than described. */}
      <Section id="panel">
        <FadeRise className="mx-auto max-w-2xl text-center">
          <Eyebrow>{c.panelEyebrow}</Eyebrow>
          <h2 className="mt-3 text-balance text-headline font-semibold text-cream-bright">{c.panelTitle}</h2>
        </FadeRise>
        <div className="mx-auto mt-12 grid max-w-5xl gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] [&>*]:min-w-0">
          <FadeRise className="flex flex-col gap-3">
            {[
              { name: "Dr. Paredes", role: c.juror3, text: c.q1 },
              { name: "Dra. Vidal", role: c.juror2, text: c.q2 },
            ].map((line) => (
              <Panel key={line.name} variant="raised" className="flex gap-4 p-5 shadow-lift">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-accent-ink">
                  {line.name.replace(/^Dra?\.\s*/, "").slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-cream-bright">
                    {line.name} <span className="font-normal text-cream-dim">· {line.role}</span>
                  </p>
                  <p className="mt-1 text-base leading-relaxed text-cream">“{line.text}”</p>
                </div>
              </Panel>
            ))}
          </FadeRise>
          <FadeRise delay={0.1}>
            <Panel variant="raised" className="flex h-full flex-col justify-center gap-4 p-6 shadow-lift">
              <span className="flex items-center gap-2 text-sm font-semibold text-accent-text">
                <Gavel aria-hidden className="h-4 w-4" />
                {c.actaLabel}
              </span>
              <p className="flex items-baseline gap-2">
                <AnimatedCounter value={14} duration={0.9} className="text-[3.5rem] font-bold leading-none tracking-[-0.03em] tabular-nums text-cream-bright" />
                <span className="text-xl font-semibold text-cream-faint">/ 20</span>
              </p>
              <span className="self-start rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-accent-text">
                {c.actaVerdict}
              </span>
              <ActaBars
                rows={[
                  { label: c.juror1, score: 16 },
                  { label: c.juror2, score: 12 },
                  { label: c.juror3, score: 14 },
                ]}
              />
            </Panel>
          </FadeRise>
        </div>

        <FadeRise className="mx-auto mt-16 max-w-2xl text-center">
          <h3 className="text-title font-semibold text-cream-bright">{c.edgeTitle}</h3>
        </FadeRise>
        <div className="mx-auto mt-6 grid max-w-5xl gap-4 sm:grid-cols-2 [&>*]:min-w-0">
          {edges.map((edge, index) => (
            <FadeRise key={edge.title} delay={index * 0.06}>
              <div className="flex h-full gap-4 rounded-2xl bg-surface-card p-5 shadow-card">
                <IconTile icon={edge.icon} />
                <div className="min-w-0">
                  <p className="font-semibold text-cream-bright">{edge.title}</p>
                  <p className="mt-1 text-pretty text-sm text-cream-dim">{edge.body}</p>
                </div>
              </div>
            </FadeRise>
          ))}
        </div>
      </Section>

      {/* Pricing, with the notices a buyer must see before paying. */}
      <Section id="pricing">
        <FadeRise className="mx-auto max-w-2xl text-center">
          <Eyebrow>{c.pricingEyebrow}</Eyebrow>
          <h2 className="mt-3 text-balance text-headline font-semibold text-cream-bright">{c.pricingTitle}</h2>
        </FadeRise>
        <div className="mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-2 [&>*]:min-w-0">
          <FadeRise>
            <Panel variant="raised" className="flex h-full flex-col gap-4 p-7 shadow-lift">
              <p className="text-lg font-semibold text-cream-bright">{c.freeName}</p>
              <p className="text-[2.5rem] font-bold leading-none tracking-[-0.03em] tabular-nums text-cream-bright">{c.freePrice}</p>
              <ul className="flex flex-col gap-2 text-sm text-cream">
                {[c.free1, c.free2, c.free3].map((item) => (
                  <li key={item} className="flex gap-2">
                    <span aria-hidden className="text-grow-text">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              {/* The same way in as the pack, quieter: the two cards end on
                  the same line instead of one trailing empty space. */}
              <Link to={start} className="mt-auto self-start">
                <Action tone="glass">{c.freeCta}</Action>
              </Link>
            </Panel>
          </FadeRise>
          <FadeRise delay={0.08}>
            <Panel variant="raised" className="flex h-full flex-col gap-4 p-7 shadow-lift ring-2 ring-accent">
              <p className="flex items-center justify-between gap-2">
                <span className="text-lg font-semibold text-cream-bright">{c.packName}</span>
                <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-ink">{c.packBadge}</span>
              </p>
              <p className="flex items-baseline gap-2">
                <span className="text-[2.5rem] font-bold leading-none tracking-[-0.03em] tabular-nums text-cream-bright">{c.packPrice}</span>
                <span className="text-sm text-cream-dim">{c.packUnit}</span>
              </p>
              <ul className="flex flex-col gap-2 text-sm text-cream">
                {[c.pack1, c.pack2, c.pack3, c.pack4, c.pack5].map((item) => (
                  <li key={item} className="flex gap-2">
                    <span aria-hidden className="text-grow-text">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link to={start} className="mt-auto self-start">
                <Action withArrow>{c.packCta}</Action>
              </Link>
            </Panel>
          </FadeRise>
        </div>
        <p className="mx-auto mt-6 max-w-3xl text-balance text-center text-sm text-cream">{c.passes}</p>
        <div className="mx-auto mt-4 flex max-w-4xl flex-col gap-1 text-center text-xs text-cream-dim">
          <p>{c.legal1}</p>
          <p>{c.legal2}</p>
        </div>
      </Section>

      {/* What is left to know, in one place: the thesis is safe, what comes
          after, and the two channels beyond the student — the advisor who
          recommends it and the school that buys it for a cohort. One section
          rather than two: four cards are one thought, not two pages. */}
      <Section className="bg-surface-deep">
        <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-2 [&>*]:min-w-0">
          {/* Four cards, one shape: the icon and title in a row, the body,
              and the way on pinned to the bottom so the actions line up. */}
          <FadeRise>
            <ClosingCard icon={ShieldCheck} tone="grow" title={c.privacyTitle} body={c.privacyBody} />
          </FadeRise>
          <FadeRise delay={0.06}>
            <ClosingCard icon={Briefcase} title={c.ladderTitle} body={c.ladderBody}>
              <Link to="/entrevistas" className="focus-ring mt-auto rounded-full text-sm font-semibold text-accent-text underline decoration-accent-text/40 underline-offset-4 transition-[text-decoration-color] duration-150 ease-press hover:decoration-accent-text">
                {c.ladderCta}
              </Link>
            </ClosingCard>
          </FadeRise>
          <FadeRise delay={0.12}>
            <ClosingCard icon={GraduationCap} title={c.advisorTitle} body={c.advisorBody}>
              {/* Neutral, not the accent: the page has one primary action,
                  and it is the student's. */}
              <Link to="/app/advisor" className="mt-auto">
                <Action tone="neutral" withArrow>{c.advisorCta}</Action>
              </Link>
            </ClosingCard>
          </FadeRise>
          <FadeRise delay={0.18}>
            <ClosingCard icon={Building2} title={c.institutionTitle} body={c.institutionBody}>
              <a
                href="mailto:hello@getmockio.com?subject=Mockio%20Sustentaci%C3%B3n%20%E2%80%94%20instituci%C3%B3n"
                className="focus-ring mt-auto rounded-full text-sm font-semibold text-accent-text underline decoration-accent-text/40 underline-offset-4 transition-[text-decoration-color] duration-150 ease-press hover:decoration-accent-text"
              >
                hello@getmockio.com
              </a>
            </ClosingCard>
          </FadeRise>
        </div>
      </Section>

      <SiteFooter />
    </main>
  );
}
