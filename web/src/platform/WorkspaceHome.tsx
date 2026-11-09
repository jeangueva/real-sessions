import { useMemo, useRef, useState } from "react";
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
  Play,
  Presentation,
  Sparkles,
} from "lucide-react";
import { useLocale } from "@/hooks/useLocale";
import { useThesisT } from "@/lib/thesis-copy";
import { thesisPath, type Space } from "@/lib/spaces";
import { customPath } from "@/lib/search";
import { OmniSearch } from "./OmniSearch";
import { useHomeCatalogue } from "./useHomeCatalogue";

/**
 * The home screen, the way a streaming app's is.
 *
 * Search first: most people arrive knowing what they need to practise, and a
 * field that understands "pedir un aumento" beats a menu they have to learn.
 * Under it, one featured rehearsal for this workspace, then everything else as
 * rows of cards to browse, each row one kind of practice. The chips filter the
 * rows, so a person who only wants product cases sees only those.
 *
 * Both workspaces' rows are here; the open workspace's come first. Nothing is
 * hidden behind the switch at the top — it only changes the order and the
 * featured rehearsal.
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
    const order: RowId[] = education
      ? ["thesis", "academic", "work", "personal", "cases", "interviews"]
      : ["work", "interviews", "cases", "personal", "academic", "thesis"];
    return order
      .map((id) => all.find((row) => row.id === id)!)
      .filter((row) => row.cards.length > 0);
  }, [catalogue, copy, education]);

  const shown = filter === "all" ? rows : rows.filter((row) => row.id === filter);
  const suggested = catalogue.index.filter((item) =>
    education ? item.id.startsWith("s-") && item.to.startsWith("/app/tesis") : item.kind === "scenario",
  );

  return (
    <main className="pb-12">
      {/* Search first: the field people arrive to use. */}
      <section className="mx-auto w-full max-w-[110rem] px-4 pt-6 sm:px-6 lg:px-10 lg:pt-8">
        <div className="mx-auto max-w-3xl">
          <OmniSearch items={catalogue.index} suggested={suggested.length ? suggested : catalogue.index} />
        </div>
      </section>

      <Billboard education={education} copy={copy} tt={tt} />

      {/* Calm's chips: one tap narrows the page to one kind of practice. */}
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

      <div className="mt-6 space-y-10">
        {shown.map((row) => (
          <CardRow key={row.id} row={row} copy={copy} />
        ))}
      </div>

      {/* The way out of the catalogue, at the end of it too. */}
      <section className="mx-auto mt-12 w-full max-w-[110rem] px-4 sm:px-6 lg:px-10">
        <div className="flex flex-col items-start gap-4 rounded-card bg-surface-card p-6 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <h2 className="text-lg font-semibold text-cream-bright">{copy.customTitle}</h2>
            <p className="mt-1 text-sm text-cream-dim">{copy.customBody}</p>
          </div>
          <Link
            to={customPath("")}
            className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink transition-[filter,transform] duration-150 ease-press hover:brightness-105 active:scale-[0.97]"
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            {copy.customCta}
          </Link>
        </div>
      </section>
    </main>
  );
}

/**
 * The featured rehearsal: a wide picture, the promise in one line, and two
 * actions — the solid one starts, the quiet one explains. The picture is
 * always dark, so the text on it is always light, in both themes.
 */
function Billboard({ education, copy, tt }: { education: boolean; copy: Copy; tt: ReturnType<typeof useThesisT> }) {
  const title = education ? copy.defenseTitle : copy.careerTitle;
  const body = education ? copy.defenseBody : copy.careerBody;
  const start = education ? thesisPath("ensayar") : "/app/practice";
  const more = education ? thesisPath("diagnostico") : "/app/progress";
  return (
    <section aria-label={copy.featured} className="mx-auto mt-6 w-full max-w-[110rem] px-4 sm:px-6 lg:px-10">
      <div className="relative isolate overflow-hidden rounded-card bg-black shadow-float">
        <img
          src="/hero-2.jpg"
          alt=""
          className="absolute inset-0 -z-10 h-full w-full object-cover object-[70%_center] opacity-90"
        />
        {/* Netflix's scrim: dark where the words are, the picture where they are not. */}
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-black via-black/70 to-transparent" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="flex min-h-[18rem] max-w-xl flex-col justify-end gap-4 p-6 sm:min-h-[22rem] sm:p-10 lg:min-h-[26rem]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
            {education ? tt("tabRehearse") : copy.featured}
          </p>
          <h1 className="text-balance text-3xl font-semibold leading-[1.05] tracking-[-0.03em] text-white sm:text-5xl">{title}</h1>
          <p className="max-w-md text-pretty text-sm leading-relaxed text-white/80 sm:text-base">{body}</p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              to={start}
              className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-black transition-[transform,background-color] duration-150 ease-press hover:bg-white/90 active:scale-[0.97]"
            >
              <Play className="h-4 w-4 fill-current" aria-hidden />
              {education ? copy.defenseCta : copy.careerCta}
            </Link>
            <Link
              to={more}
              className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-full bg-white/20 px-6 text-sm font-semibold text-white backdrop-blur transition-[transform,background-color] duration-150 ease-press hover:bg-white/30 active:scale-[0.97]"
            >
              <Info className="h-4 w-4" aria-hidden />
              {copy.more}
            </Link>
          </div>
        </div>
      </div>
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
      className="focus-ring group/card relative block h-full rounded-2xl bg-surface-card shadow-card transition-[transform,box-shadow] duration-200 ease-press hover:z-10 hover:-translate-y-1 hover:shadow-lift focus-visible:-translate-y-1"
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

