import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpenCheck,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Compass,
  FileSearch,
  GraduationCap,
  Heart,
  Info,
  MessagesSquare,
  Mic,
  Pause,
  Play,
  Presentation,
  Sparkles,
} from "lucide-react";
import { useLocale } from "@/hooks/useLocale";
import { useThesisT } from "@/lib/thesis-copy";
import { thesisPath, type Space } from "@/lib/spaces";
import { customPath } from "@/lib/search";
import { OmniSearch } from "./OmniSearch";
import { indexFor, useHomeCatalogue } from "./useHomeCatalogue";

/**
 * The home screen, the way a streaming app's is.
 *
 * Search first: most people arrive knowing what they need to practise, and a
 * field that understands "pedir un aumento" beats a menu they have to learn.
 * Right under it, the way to make a rehearsal that is not in the catalogue.
 * Then a featured slider that dissolves between this workspace's highlights,
 * its most popular rehearsals ranked, and the rest as rows of cards. The
 * chips filter the rows.
 *
 * Each workspace shows only its own world: Education the academic one,
 * Professional the working one. The search follows the same rule.
 */

type RowId = "thesis" | "academic" | "work" | "personal" | "cases" | "interviews";

const COPY = {
  es: {
    rows: { thesis: "Tu tesis", academic: "Escenarios académicos", work: "Conversaciones de trabajo", personal: "Personal y familiar", cases: "Criterio de producto y diseño", interviews: "Entrevistas por rol" },
    all: "Todo",
    filters: "Filtrar por tema",
    start: "Empezar",
    more: "Más info",
    prev: "Anteriores",
    next: "Siguientes",
    defenseTitle: "Tu sustentación, ensayada antes del día",
    defenseBody: "Un jurado de tres que leyó tu tesis te pregunta lo que te preguntarían de verdad. Ensaya, revisa el acta y vuelve a intentarlo.",
    defenseCta: "Ensayar ahora",
    careerTitle: "Tu próxima entrevista, practicada en voz alta",
    careerBody: "Elige empresa y rol: un entrevistador con IA te pregunta, te escucha y te devuelve un informe respuesta por respuesta.",
    careerCta: "Practicar entrevista",
    featured: "Destacado",
    customTitle: "¿No está lo que buscas?",
    customBody: "Descríbelo y armamos el ensayo a tu medida.",
    customCta: "Crear a tu medida",
    thesisTools: { rehearse: "Ensayo con el jurado", diagnosis: "Diagnóstico de la tesis", study: "Repaso espaciado", slides: "Diapositivas", observations: "Observaciones del jurado" },
    thesisBody: { rehearse: "Tres jurados, tus preguntas reales y un acta con nota.", diagnosis: "Qué preguntará el jurado y dónde está débil tu tesis.", study: "Tarjetas que vuelven justo antes de olvidarlas.", slides: "Revisa tu presentación diapositiva por diapositiva.", observations: "Responde las observaciones antes de levantarlas." },
    interviewBody: "Entrevista de práctica para este rol.",
    empty: "Nada en esta categoría todavía.",
    popular: "Los más populares",
    pause: "Pausar destacados",
    play: "Reanudar destacados",
    slideLabel: (n: number, total: number) => `${n} de ${total}`,
    goTo: (n: number) => `Ir al destacado ${n}`,
    slides: {
      diagnosisEyebrow: "Diagnóstico", diagnosisTitle: "¿Qué te va a preguntar el jurado?", diagnosisBody: "El diagnóstico lee tu tesis y te dice qué preguntarán y dónde está débil, antes de que lo descubras frente a ellos.", diagnosisCta: "Ver diagnóstico",
      advisorEyebrow: "Escenario académico", advisorTitle: "Negocia el alcance de tu tesis con tu asesor", advisorBody: "Tu asesor quiere un capítulo más a seis semanas de la entrega. Ensaya cómo proteger tu fecha sin perder su apoyo.", advisorCta: "Ensayar escenario",
      founderEyebrow: "Conversación difícil", founderTitle: "Dile que no a un founder sin romper la relación", founderBody: "Quiere lanzar el viernes y la versión no está estable. Practica poner el límite y ofrecer una salida pequeña.", founderCta: "Ensayar conversación",
      caseEyebrow: "Criterio de producto", caseTitle: "¿Habrías quitado el registro antes de pagar?", caseBody: "Decide primero y luego compara tu decisión con un caso real que cambió las ventas de una tienda.", caseCta: "Resolver el caso",
    },
  },
  en: {
    rows: { thesis: "Your thesis", academic: "Academic scenarios", work: "Work conversations", personal: "Personal and family", cases: "Product and design judgment", interviews: "Interviews by role" },
    all: "All",
    filters: "Filter by topic",
    start: "Start",
    more: "More info",
    prev: "Previous",
    next: "Next",
    defenseTitle: "Your defence, rehearsed before the day",
    defenseBody: "A jury of three that read your thesis asks what they would really ask. Rehearse, read the record, try again.",
    defenseCta: "Rehearse now",
    careerTitle: "Your next interview, practised out loud",
    careerBody: "Choose a company and a role: an AI interviewer asks, listens and gives you a report answer by answer.",
    careerCta: "Practise an interview",
    featured: "Featured",
    customTitle: "Not finding it?",
    customBody: "Describe it and we build the rehearsal for you.",
    customCta: "Make one for you",
    thesisTools: { rehearse: "Rehearse with the jury", diagnosis: "Thesis diagnosis", study: "Spaced review", slides: "Slides", observations: "Jury observations" },
    thesisBody: { rehearse: "Three jurors, your real questions and a graded record.", diagnosis: "What the jury will ask and where your thesis is weak.", study: "Cards that come back just before you forget them.", slides: "Review your deck slide by slide.", observations: "Answer the observations before you resolve them." },
    interviewBody: "A practice interview for this role.",
    empty: "Nothing in this category yet.",
    popular: "Most popular",
    pause: "Pause featured",
    play: "Resume featured",
    slideLabel: (n: number, total: number) => `${n} of ${total}`,
    goTo: (n: number) => `Go to featured item ${n}`,
    slides: {
      diagnosisEyebrow: "Diagnosis", diagnosisTitle: "What will the jury ask you?", diagnosisBody: "The diagnosis reads your thesis and tells you what they will ask and where it is weak, before you find out in front of them.", diagnosisCta: "See the diagnosis",
      advisorEyebrow: "Academic scenario", advisorTitle: "Negotiate your thesis scope with your advisor", advisorBody: "Six weeks before submission your advisor wants another chapter. Rehearse protecting your date without losing their support.", advisorCta: "Rehearse the scenario",
      founderEyebrow: "Difficult conversation", founderTitle: "Say no to a founder without breaking the relationship", founderBody: "They want to launch on Friday and the release is not stable. Practise holding the line and offering a smaller way out.", founderCta: "Rehearse the conversation",
      caseEyebrow: "Product judgment", caseTitle: "Would you have removed sign-up before checkout?", caseBody: "Decide first, then compare your call with a real case that changed a store's sales.", caseCta: "Solve the case",
    },
  },
  pt: {
    rows: { thesis: "Seu trabalho", academic: "Cenários acadêmicos", work: "Conversas de trabalho", personal: "Pessoal e familiar", cases: "Critério de produto e design", interviews: "Entrevistas por cargo" },
    all: "Tudo",
    filters: "Filtrar por tema",
    start: "Começar",
    more: "Mais info",
    prev: "Anteriores",
    next: "Próximos",
    defenseTitle: "Sua defesa, ensaiada antes do dia",
    defenseBody: "Uma banca de três que leu seu trabalho pergunta o que perguntaria de verdade. Ensaie, leia a ata e tente de novo.",
    defenseCta: "Ensaiar agora",
    careerTitle: "Sua próxima entrevista, praticada em voz alta",
    careerBody: "Escolha empresa e cargo: um entrevistador com IA pergunta, escuta e devolve um relatório resposta por resposta.",
    careerCta: "Praticar entrevista",
    featured: "Destaque",
    customTitle: "Não encontrou?",
    customBody: "Descreva e montamos o ensaio sob medida.",
    customCta: "Criar sob medida",
    thesisTools: { rehearse: "Ensaio com a banca", diagnosis: "Diagnóstico do trabalho", study: "Revisão espaçada", slides: "Slides", observations: "Observações da banca" },
    thesisBody: { rehearse: "Três avaliadores, suas perguntas reais e uma ata com nota.", diagnosis: "O que a banca vai perguntar e onde seu trabalho é fraco.", study: "Cartões que voltam pouco antes de você esquecer.", slides: "Revise sua apresentação slide a slide.", observations: "Responda as observações antes de resolvê-las." },
    interviewBody: "Entrevista de prática para este cargo.",
    empty: "Nada nesta categoria ainda.",
    popular: "Os mais populares",
    pause: "Pausar destaques",
    play: "Retomar destaques",
    slideLabel: (n: number, total: number) => `${n} de ${total}`,
    goTo: (n: number) => `Ir para o destaque ${n}`,
    slides: {
      diagnosisEyebrow: "Diagnóstico", diagnosisTitle: "O que a banca vai perguntar?", diagnosisBody: "O diagnóstico lê seu trabalho e diz o que vão perguntar e onde ele é fraco, antes que você descubra na frente deles.", diagnosisCta: "Ver diagnóstico",
      advisorEyebrow: "Cenário acadêmico", advisorTitle: "Negocie o escopo do trabalho com seu orientador", advisorBody: "A seis semanas da entrega, seu orientador quer mais um capítulo. Ensaie como proteger sua data sem perder o apoio dele.", advisorCta: "Ensaiar cenário",
      founderEyebrow: "Conversa difícil", founderTitle: "Diga não a um founder sem romper a relação", founderBody: "Ele quer lançar na sexta e a versão não está estável. Pratique colocar o limite e oferecer uma saída menor.", founderCta: "Ensaiar conversa",
      caseEyebrow: "Critério de produto", caseTitle: "Você teria tirado o cadastro antes de pagar?", caseBody: "Decida primeiro e depois compare com um caso real que mudou as vendas de uma loja.", caseCta: "Resolver o caso",
    },
  },
  fr: {
    rows: { thesis: "Votre mémoire", academic: "Scénarios académiques", work: "Conversations au travail", personal: "Personnel et familial", cases: "Jugement produit et design", interviews: "Entretiens par poste" },
    all: "Tout",
    filters: "Filtrer par thème",
    start: "Commencer",
    more: "Plus d'infos",
    prev: "Précédents",
    next: "Suivants",
    defenseTitle: "Votre soutenance, répétée avant le jour J",
    defenseBody: "Un jury de trois qui a lu votre mémoire pose les questions qu'il poserait vraiment. Répétez, lisez le procès-verbal, recommencez.",
    defenseCta: "Répéter maintenant",
    careerTitle: "Votre prochain entretien, pratiqué à voix haute",
    careerBody: "Choisissez une entreprise et un poste : un recruteur IA pose les questions, écoute et vous rend un rapport réponse par réponse.",
    careerCta: "Pratiquer un entretien",
    featured: "À la une",
    customTitle: "Vous ne trouvez pas ?",
    customBody: "Décrivez-le et nous préparons la répétition sur mesure.",
    customCta: "Créer sur mesure",
    thesisTools: { rehearse: "Répétition avec le jury", diagnosis: "Diagnostic du mémoire", study: "Révision espacée", slides: "Diapositives", observations: "Observations du jury" },
    thesisBody: { rehearse: "Trois membres du jury, vos vraies questions et un procès-verbal noté.", diagnosis: "Ce que le jury demandera et où votre mémoire est fragile.", study: "Des cartes qui reviennent juste avant l'oubli.", slides: "Revoyez votre présentation diapositive par diapositive.", observations: "Répondez aux observations avant de les lever." },
    interviewBody: "Un entretien d'entraînement pour ce poste.",
    empty: "Rien dans cette catégorie pour l'instant.",
    popular: "Les plus populaires",
    pause: "Mettre en pause",
    play: "Reprendre",
    slideLabel: (n: number, total: number) => `${n} sur ${total}`,
    goTo: (n: number) => `Aller à l'élément ${n}`,
    slides: {
      diagnosisEyebrow: "Diagnostic", diagnosisTitle: "Que va vous demander le jury ?", diagnosisBody: "Le diagnostic lit votre mémoire et vous dit ce qu'ils demanderont et où il est fragile, avant de le découvrir devant eux.", diagnosisCta: "Voir le diagnostic",
      advisorEyebrow: "Scénario académique", advisorTitle: "Négociez le périmètre de votre mémoire avec votre directeur", advisorBody: "À six semaines du rendu, votre directeur veut un chapitre de plus. Répétez comment protéger votre date sans perdre son soutien.", advisorCta: "Répéter le scénario",
      founderEyebrow: "Conversation difficile", founderTitle: "Dire non à un fondateur sans rompre la relation", founderBody: "Il veut lancer vendredi et la version n'est pas stable. Entraînez-vous à poser la limite et à proposer une issue plus petite.", founderCta: "Répéter la conversation",
      caseEyebrow: "Jugement produit", caseTitle: "Auriez-vous supprimé l'inscription avant le paiement ?", caseBody: "Décidez d'abord, puis comparez avec un cas réel qui a changé les ventes d'une boutique.", caseCta: "Résoudre le cas",
    },
  },
};

type Copy = (typeof COPY)["es"];

/** A tile's look: the category's soft wash, its ink, and an icon. Tokens only. */
type Tone = "accent" | "grow" | "step" | "neutral";
const TONE: Record<Tone, { tile: string; ink: string }> = {
  accent: { tile: "bg-accent-soft", ink: "text-accent-text" },
  grow: { tile: "bg-grow-soft", ink: "text-grow-text" },
  step: { tile: "bg-step-soft", ink: "text-step-text" },
  neutral: { tile: "bg-surface-lift", ink: "text-cream-bright" },
};

interface Card {
  id: string;
  title: string;
  category: string;
  body: string;
  /** A second line in the preview: who you talk to, or the question asked. */
  detail?: string;
  to: string;
  state?: Record<string, string>;
  icon: typeof Mic;
  tone: Tone;
}

interface Row {
  id: RowId;
  title: string;
  cards: Card[];
}

/**
 * Each workspace's rows, in order. Education is the academic world only and
 * Professional the working one only: switching workspace switches the whole
 * catalogue, not just its order.
 */
const ROWS: Record<Space, RowId[]> = {
  defense: ["thesis", "academic"],
  career: ["work", "interviews", "cases", "personal"],
};

/**
 * "Most popular", per workspace, by card id.
 *
 * Chosen by hand for now: nothing records which rehearsals people open yet.
 * When that exists, this list is what it replaces. A card that is not in the
 * catalogue (a role renamed, a scenario retired) is skipped, not shown empty.
 */
const POPULAR: Record<Space, string[]> = {
  defense: ["thesis-rehearse", "scenario-oral-exam-question", "thesis-diagnosis", "scenario-advisor-scope", "thesis-slides"],
  career: ["scenario-founder-no", "role:product manager", "case-case-d", "scenario-designer-feedback", "scenario-family-money"],
};

/** How long each featured slide stays before the next one fades in. */
const SLIDE_MS = 7000;

export function WorkspaceHome({ space }: { space: Space }) {
  const { locale } = useLocale();
  const copy: Copy = COPY[locale as keyof typeof COPY] ?? COPY.en;
  const tt = useThesisT();
  const catalogue = useHomeCatalogue();
  const [filter, setFilter] = useState<RowId | "all">("all");
  const education = space === "defense";

  const rows = useMemo<Row[]>(() => {
    const thesis: Card[] = (
      [
        ["rehearse", "ensayar", Mic],
        ["diagnosis", "diagnostico", FileSearch],
        ["study", "repaso", BookOpenCheck],
        ["slides", "diapositivas", Presentation],
        ["observations", "observaciones", ClipboardCheck],
      ] as const
    ).map(([key, section, icon]) => ({
      id: `thesis-${key}`,
      title: copy.thesisTools[key],
      category: copy.rows.thesis,
      body: copy.thesisBody[key],
      to: thesisPath(section),
      icon,
      tone: "accent" as const,
    }));
    const scenarioCards = (pick: (domain: string, personal: boolean) => boolean, tone: Tone, icon: typeof Mic) =>
      catalogue.scenarios
        .filter((item) => pick(item.domain, Boolean(item.personal)))
        .map((item) => ({
          id: `scenario-${item.id}`,
          title: item.title,
          category: item.category,
          body: item.brief,
          detail: item.role,
          to: `/app/training/${item.domain}?id=${encodeURIComponent(item.id)}`,
          icon,
          tone,
        }));
    const all: Row[] = [
      { id: "thesis", title: copy.rows.thesis, cards: thesis },
      { id: "academic", title: copy.rows.academic, cards: scenarioCards((d) => d === "education", "accent", GraduationCap) },
      { id: "work", title: copy.rows.work, cards: scenarioCards((d, p) => d === "professional" && !p, "neutral", MessagesSquare) },
      { id: "personal", title: copy.rows.personal, cards: scenarioCards((d, p) => d === "professional" && p, "grow", Heart) },
      {
        id: "cases",
        title: copy.rows.cases,
        cards: catalogue.cases.map((item) => ({
          id: `case-${item.id}`,
          title: item.title,
          category: item.category,
          body: item.prompt,
          to: `/app/intuition?id=${encodeURIComponent(item.id)}`,
          icon: Compass,
          tone: "step" as const,
        })),
      },
      {
        id: "interviews",
        title: copy.rows.interviews,
        cards: catalogue.roles.slice(0, 16).map((role) => ({
          id: `role-${role.id}`,
          title: role.label,
          category: catalogue.kindLabel("interview"),
          body: role.focus || copy.interviewBody,
          to: "/app/practice",
          state: { role: role.label },
          icon: Briefcase,
          tone: "neutral" as const,
        })),
      },
    ];
    return ROWS[space].map((id) => all.find((row) => row.id === id)!).filter((row) => row.cards.length > 0);
  }, [catalogue, copy, space]);

  // The popular picks, looked up among this workspace's own cards, so a pick
  // can never pull in the other world.
  const popular = useMemo(() => {
    const cards = rows.flatMap((row) => row.cards);
    return POPULAR[space]
      .map((pick) =>
        pick.startsWith("role:")
          ? cards.find((card) => card.id.startsWith("role-") && card.title.toLowerCase() === pick.slice(5))
          : cards.find((card) => card.id === pick),
      )
      .filter((card): card is Card => Boolean(card));
  }, [rows, space]);

  const shown = filter === "all" ? rows : rows.filter((row) => row.id === filter);
  const items = indexFor(catalogue.index, space);
  const suggested = items.filter((item) => item.kind !== "section").slice(0, 5);

  return (
    <main className="pb-12">
      {/* Search first: the field people arrive to use. */}
      <section className="mx-auto w-full max-w-[110rem] px-4 pt-6 sm:px-6 lg:px-10 lg:pt-8">
        <div className="mx-auto max-w-3xl">
          <OmniSearch items={items} suggested={suggested} space={space} />
          {/* The way out of the catalogue, right under the field it belongs
              to: nobody should have to scroll to the bottom to find it. */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm">
            <span className="text-cream-dim">
              <span className="font-medium text-cream-bright">{copy.customTitle}</span> {copy.customBody}
            </span>
            <Link
              to={customPath("", space)}
              className="focus-ring inline-flex min-h-9 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-semibold text-accent-ink transition-[filter,transform] duration-150 ease-press hover:brightness-105 active:scale-[0.97]"
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              {copy.customCta}
            </Link>
          </div>
        </div>
      </section>

      <Billboard slides={useSlides(education, copy, tt)} copy={copy} />

      {popular.length > 0 && filter === "all" && <PopularRow cards={popular} copy={copy} />}

      {/* Calm's chips: one tap narrows the page to one kind of practice. */}
      {rows.length > 1 && (
        <nav aria-label={copy.filters} className="mx-auto mt-8 w-full max-w-[110rem] px-4 sm:px-6 lg:px-10">
          <ul className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {(["all", ...rows.map((row) => row.id)] as const).map((id) => {
              const label = id === "all" ? copy.all : copy.rows[id];
              return (
                <li key={id} className="shrink-0">
                  <button
                    type="button"
                    aria-pressed={filter === id}
                    onClick={() => setFilter(id)}
                    className="focus-ring whitespace-nowrap rounded-full bg-surface-card px-4 py-2 text-sm font-medium text-cream-dim shadow-card transition-colors hover:text-cream-bright aria-pressed:bg-cream-bright aria-pressed:text-surface-base"
                  >
                    {label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      <div className="mt-6 space-y-10">
        {shown.map((row) => (
          <CardRow key={row.id} row={row} copy={copy} />
        ))}
      </div>
    </main>
  );
}

interface Slide {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  to: string;
  more?: string;
  /** The photo, or the mascot drawn on the right over a dark wash. */
  image?: string;
  mascot?: string;
}

/** Each workspace's featured rehearsals, in the order they rotate. */
function useSlides(education: boolean, copy: Copy, tt: ReturnType<typeof useThesisT>): Slide[] {
  const s = copy.slides;
  return education
    ? [
        { id: "defense", eyebrow: tt("tabRehearse"), title: copy.defenseTitle, body: copy.defenseBody, cta: copy.defenseCta, to: thesisPath("ensayar"), more: thesisPath("diagnostico"), image: "/hero-2.jpg" },
        { id: "diagnosis", eyebrow: s.diagnosisEyebrow, title: s.diagnosisTitle, body: s.diagnosisBody, cta: s.diagnosisCta, to: thesisPath("diagnostico"), mascot: "/avatars/level-3.png" },
        { id: "advisor", eyebrow: s.advisorEyebrow, title: s.advisorTitle, body: s.advisorBody, cta: s.advisorCta, to: "/app/training/education?id=advisor-scope", mascot: "/avatars/level-5.png" },
      ]
    : [
        { id: "interview", eyebrow: copy.featured, title: copy.careerTitle, body: copy.careerBody, cta: copy.careerCta, to: "/app/practice", more: "/app/progress", image: "/hero-2.jpg" },
        { id: "founder", eyebrow: s.founderEyebrow, title: s.founderTitle, body: s.founderBody, cta: s.founderCta, to: "/app/training/professional?id=founder-no", mascot: "/avatars/level-4.png" },
        { id: "case", eyebrow: s.caseEyebrow, title: s.caseTitle, body: s.caseBody, cta: s.caseCta, to: "/app/intuition?id=case-d", mascot: "/avatars/level-6.png" },
      ];
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * The featured rehearsals, one at a time, dissolving into each other every
 * few seconds.
 *
 * It stops while the pointer or the keyboard is inside it — nobody should
 * have the button they are about to press fade away — and never starts for
 * someone who asked the system for less motion. The pause button is there for
 * everyone else (WCAG 2.2.2: anything that moves on its own for more than five
 * seconds can be paused). The slides are stacked in one grid cell, so the
 * box is as tall as the tallest and nothing jumps when they change.
 */
function Billboard({ slides, copy }: { slides: Slide[]; copy: Copy }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(() => prefersReducedMotion());
  const [held, setHeld] = useState(false);
  const total = slides.length;
  const current = Math.min(index, total - 1);

  useEffect(() => setIndex(0), [slides[0]?.id]);

  useEffect(() => {
    if (paused || held || total < 2) return;
    const timer = window.setTimeout(() => setIndex((value) => (value + 1) % total), SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [paused, held, total, current]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label={copy.featured}
      className="mx-auto mt-6 w-full max-w-[110rem] px-4 sm:px-6 lg:px-10"
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setHeld(false);
      }}
    >
      <div className="relative isolate grid overflow-hidden rounded-card bg-black shadow-float">
        {slides.map((slide, i) => {
          const active = i === current;
          return (
            <div
              key={slide.id}
              role="group"
              aria-roledescription="slide"
              aria-label={copy.slideLabel(i + 1, total)}
              aria-hidden={!active}
              // `inert` keeps the hidden slides' links out of the tab order.
              {...(active ? {} : { inert: "" })}
              className={`relative isolate [grid-area:1/1] transition-opacity duration-700 ease-out motion-reduce:transition-none ${
                active ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0"
              }`}
            >
              <SlideArt slide={slide} />
              <div className="flex min-h-[19rem] max-w-xl flex-col justify-end gap-4 p-6 pb-14 sm:min-h-[22rem] sm:p-10 sm:pb-16 lg:min-h-[26rem]">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">{slide.eyebrow}</p>
                {/* One heading per page: the first slide's title is the h1. */}
                {i === 0 ? (
                  <h1 className="text-balance text-3xl font-semibold leading-[1.05] tracking-[-0.03em] text-white sm:text-5xl">{slide.title}</h1>
                ) : (
                  <h2 className="text-balance text-3xl font-semibold leading-[1.05] tracking-[-0.03em] text-white sm:text-5xl">{slide.title}</h2>
                )}
                <p className="max-w-md text-pretty text-sm leading-relaxed text-white/80 sm:text-base">{slide.body}</p>
                <div className="flex flex-wrap gap-3 pt-1">
                  <Link
                    to={slide.to}
                    className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-black transition-[transform,background-color] duration-150 ease-press hover:bg-white/90 active:scale-[0.97]"
                  >
                    <Play className="h-4 w-4 fill-current" aria-hidden />
                    {slide.cta}
                  </Link>
                  {slide.more && (
                    <Link
                      to={slide.more}
                      className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-full bg-white/20 px-6 text-sm font-semibold text-white backdrop-blur transition-[transform,background-color] duration-150 ease-press hover:bg-white/30 active:scale-[0.97]"
                    >
                      <Info className="h-4 w-4" aria-hidden />
                      {copy.more}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {total > 1 && (
          <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 backdrop-blur sm:bottom-6 sm:right-6">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                aria-label={copy.goTo(i + 1)}
                aria-current={i === current ? "true" : undefined}
                onClick={() => setIndex(i)}
                className="focus-ring grid h-8 w-6 place-items-center rounded-full"
              >
                <span
                  aria-hidden
                  className={`block h-1.5 rounded-full transition-[width,background-color] duration-300 ${
                    i === current ? "w-4 bg-white" : "w-1.5 bg-white/50"
                  }`}
                />
              </button>
            ))}
            <button
              type="button"
              aria-label={paused ? copy.play : copy.pause}
              onClick={() => setPaused((value) => !value)}
              className="focus-ring grid h-8 w-8 place-items-center rounded-full text-white hover:bg-white/15"
            >
              {paused ? <Play className="h-3.5 w-3.5 fill-current" aria-hidden /> : <Pause className="h-3.5 w-3.5 fill-current" aria-hidden />}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * A slide's background. The photo gets Netflix's scrim, dark where the words
 * are. A slide without one is a dark wash lit in the accent from the right,
 * with Mocki standing there — always dark, so the text is always white.
 */
function SlideArt({ slide }: { slide: Slide }) {
  if (slide.image) {
    return (
      <>
        <img src={slide.image} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover object-[70%_center] opacity-90" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-black via-black/70 to-transparent" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />
      </>
    );
  }
  return (
    <>
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{ background: "radial-gradient(circle at 78% 45%, rgb(var(--accent) / 0.45), transparent 55%), radial-gradient(circle at 95% 100%, rgb(var(--step) / 0.25), transparent 50%)" }}
      />
      {slide.mascot && (
        <img
          src={slide.mascot}
          alt=""
          className="absolute bottom-0 right-[6%] -z-10 hidden h-[78%] max-h-80 w-auto object-contain opacity-95 drop-shadow-2xl sm:block"
        />
      )}
    </>
  );
}

/**
 * Netflix's top ten: each card with its rank drawn large behind it, an
 * outlined numeral, so the order reads before any title does.
 */
function PopularRow({ cards, copy }: { cards: Card[]; copy: Copy }) {
  const track = useRef<HTMLOListElement>(null);
  return (
    <section aria-labelledby="row-popular" className="group/row relative mt-10">
      <h2 id="row-popular" className="mx-auto mb-3 w-full max-w-[110rem] px-4 text-lg font-semibold text-cream-bright sm:px-6 sm:text-xl lg:px-10">
        {copy.popular}
      </h2>
      <ol
        ref={track}
        className="flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-4 pt-1 [scrollbar-width:none] sm:scroll-px-6 sm:px-6 lg:scroll-px-10 lg:px-10 [&::-webkit-scrollbar]:hidden"
      >
        {cards.map((card, i) => (
          <li key={card.id} className="flex w-[85%] shrink-0 snap-start items-stretch sm:w-[52%] md:w-[38%] lg:w-[28%] 2xl:w-[22%]">
            <span
              aria-hidden
              className="-mr-4 select-none self-end text-[7rem] font-black leading-[0.8] text-transparent sm:text-[8.5rem]"
              style={{ WebkitTextStroke: "3px rgb(var(--cream) / 0.45)" }}
            >
              {i + 1}
            </span>
            <div className="relative flex min-w-0 flex-1">
              <PracticeCard card={card} copy={copy} />
            </div>
          </li>
        ))}
      </ol>
      <RowArrow side="left" label={copy.prev} onClick={() => track.current?.scrollBy({ left: -track.current.clientWidth * 0.9, behavior: "smooth" })} />
      <RowArrow side="right" label={copy.next} onClick={() => track.current?.scrollBy({ left: track.current.clientWidth * 0.9, behavior: "smooth" })} />
    </section>
  );
}

/**
 * One row of cards that scrolls sideways, with arrows on a desktop and a
 * swipe on a phone. Cards snap so a row never stops halfway through one.
 */
function CardRow({ row, copy }: { row: Row; copy: Copy }) {
  const track = useRef<HTMLUListElement>(null);
  const page = (direction: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: "smooth" });
  };
  const headingId = `row-${row.id}`;
  return (
    <section aria-labelledby={headingId} className="group/row relative">
      <h2 id={headingId} className="mx-auto mb-3 w-full max-w-[110rem] px-4 text-lg font-semibold text-cream-bright sm:px-6 sm:text-xl lg:px-10">
        {row.title}
      </h2>
      <div className="relative">
        <ul
          ref={track}
          className="flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-4 pt-1 [scrollbar-width:none] sm:scroll-px-6 sm:px-6 lg:scroll-px-10 lg:px-10 [&::-webkit-scrollbar]:hidden"
        >
          {row.cards.map((card) => (
            <li key={card.id} className="w-[72%] shrink-0 snap-start sm:w-[42%] md:w-[30%] lg:w-[22%] 2xl:w-[18%]">
              <PracticeCard card={card} copy={copy} />
            </li>
          ))}
        </ul>
        <RowArrow side="left" label={copy.prev} onClick={() => page(-1)} />
        <RowArrow side="right" label={copy.next} onClick={() => page(1)} />
      </div>
    </section>
  );
}

function RowArrow({ side, label, onClick }: { side: "left" | "right"; label: string; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`focus-ring absolute top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-surface-card text-cream-bright opacity-0 shadow-float transition-opacity duration-150 focus-visible:opacity-100 group-hover/row:opacity-100 md:grid ${
        side === "left" ? "left-2 lg:left-4" : "right-2 lg:right-4"
      }`}
    >
      <Icon className="h-5 w-5" aria-hidden />
    </button>
  );
}

/**
 * A card that opens a preview on hover or focus, Netflix's way: the tile
 * lifts, and under it the category, a line of what it is and the action. On a
 * touch screen there is no hover, so the tile already says what it is and a
 * tap opens it.
 */
function PracticeCard({ card, copy }: { card: Card; copy: Copy }) {
  const tone = TONE[card.tone];
  const Icon = card.icon;
  return (
    <Link
      to={card.to}
      state={card.state}
      className="focus-ring group/card relative block h-full w-full rounded-2xl bg-surface-card shadow-card transition-[transform,box-shadow] duration-200 ease-press hover:z-10 hover:-translate-y-1 hover:shadow-lift focus-visible:-translate-y-1"
    >
      <div className={`relative flex aspect-[16/9] items-end overflow-hidden rounded-t-2xl p-4 ${tone.tile}`}>
        <Icon aria-hidden className={`absolute -right-3 -top-3 h-24 w-24 opacity-15 ${tone.ink}`} strokeWidth={1.25} />
        <p className="line-clamp-2 text-base font-semibold leading-snug text-cream-bright">{card.title}</p>
      </div>
      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-center gap-2">
          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${tone.tile}`}>
            <Play className={`h-3.5 w-3.5 fill-current ${tone.ink}`} aria-hidden />
          </span>
          <span className="text-xs font-medium text-cream-dim">{card.category}</span>
        </div>
        <p className="line-clamp-2 text-sm leading-relaxed text-cream-dim group-hover/card:line-clamp-4 group-focus-visible/card:line-clamp-4">
          {card.body}
        </p>
        {card.detail && (
          <p className="hidden text-xs text-cream-faint group-hover/card:block group-focus-visible/card:block">{card.detail}</p>
        )}
        <span className="sr-only">{copy.start}</span>
      </div>
    </Link>
  );
}

