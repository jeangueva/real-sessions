import { Briefcase, History, Target, TrendingUp, UserRound } from "lucide-react";
import { definePreviews } from "../../preview";
import { PremiumMark } from "./PremiumMark";

const TAB = "focus-ring inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold";

export const PremiumMarkPreviews = definePreviews([
  {
    id: "mark",
    title: "The mark",
    kind: "default",
    description: "A filled crown on its gold wash. A screen reader hears \"Premium\"; a mouse user sees it as a tooltip.",
    render: () => <PremiumMark />,
    code: `<PremiumMark />`,
  },
  {
    id: "journey-cards",
    title: "Journey card headers",
    kind: "in-context",
    description: "The landing's journey: the free phase says so in words, the paid ones carry the crown in the same place.",
    render: () => (
      <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
        <div className="flex items-center justify-between gap-3 rounded-card bg-surface-raised p-6 shadow-lift">
          <span className="inline-flex items-center gap-2 text-base font-semibold text-cream-bright">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-surface-lift text-cream-bright">
              <Target aria-hidden className="h-4 w-4" />
            </span>
            Conseguir el trabajo
          </span>
          <span className="rounded-full bg-grow-soft px-2.5 py-0.5 text-xs font-semibold text-grow-text">Gratis</span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-card bg-surface-raised p-6 shadow-lift">
          <span className="inline-flex items-center gap-2 text-base font-semibold text-cream-bright">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-surface-lift text-cream-bright">
              <Briefcase aria-hidden className="h-4 w-4" />
            </span>
            En el trabajo
          </span>
          <PremiumMark />
        </div>
      </div>
    ),
    code: `{phase.paid ? (
  <PremiumMark />
) : (
  <span className="rounded-full bg-grow-soft px-2.5 py-0.5 text-xs font-semibold text-grow-text">Gratis</span>
)}`,
  },
  {
    id: "rail-link",
    title: "A rail entry on the free plan",
    kind: "in-context",
    description: "The app's rail: the entry stays a working link, and the crown at its end names where it lives. The link's name becomes \"Tu contexto Del plan pago\".",
    render: () => (
      <nav aria-label="Secciones" className="flex w-64 flex-col gap-0.5 bg-surface-deep p-2">
        <a href="#historial" className="focus-ring flex items-center gap-3 rounded-[0.625rem] px-3 py-2.5 text-sm font-medium text-cream-dim hover:bg-surface-lift hover:text-cream-bright">
          <History aria-hidden className="h-[1.125rem] w-[1.125rem] shrink-0" />
          <span className="truncate">Historial</span>
        </a>
        <a href="#tu-contexto" className="focus-ring flex items-center gap-3 rounded-[0.625rem] px-3 py-2.5 text-sm font-medium text-cream-dim hover:bg-surface-lift hover:text-cream-bright">
          <UserRound aria-hidden className="h-[1.125rem] w-[1.125rem] shrink-0" />
          <span className="truncate">Tu contexto</span>
          <PremiumMark label="Del plan pago" className="ms-auto" />
        </a>
      </nav>
    ),
    code: `<NavLink to="/app/profile" className="focus-ring flex items-center gap-3 …">
  <UserRound aria-hidden className="h-[1.125rem] w-[1.125rem] shrink-0" />
  <span className="truncate">Tu contexto</span>
  {locked && <PremiumMark label="Del plan pago" className="ms-auto" />}
</NavLink>`,
  },
  {
    id: "tabs-phone",
    title: "Inside tabs, at phone width",
    kind: "edge",
    width: 320,
    description:
      "The practice phases: the row scrolls sideways rather than wrapping, and the mark never shrinks. Each paid tab is named with its crown: \"En el trabajo Premium\".",
    render: () => (
      <div role="tablist" aria-label="Qué quieres practicar" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        <button type="button" role="tab" aria-selected="true" className={`${TAB} bg-cream-bright text-surface-base`}>
          <Target aria-hidden className="h-4 w-4" />
          Conseguir el trabajo
        </button>
        <button type="button" role="tab" aria-selected="false" className={`${TAB} bg-surface-card text-cream-dim shadow-card`}>
          <Briefcase aria-hidden className="h-4 w-4" />
          En el trabajo
          <PremiumMark />
        </button>
        <button type="button" role="tab" aria-selected="false" className={`${TAB} bg-surface-card text-cream-dim shadow-card`}>
          <TrendingUp aria-hidden className="h-4 w-4" />
          Crecer
          <PremiumMark />
        </button>
      </div>
    ),
    code: `<button type="button" role="tab" aria-selected={phase === "work"}>
  <Briefcase aria-hidden className="h-4 w-4" />
  En el trabajo
  {!can.workScenes && <PremiumMark />}
</button>`,
  },
  {
    id: "disabled-option",
    title: "A crowned option that does nothing",
    kind: "misuse",
    description: "The paid tab is disabled because it is paid.",
    why: "The mark names where the option lives; it does not close it. A disabled control cannot be focused or pressed, so the one person who wants it is left with a grey tab and no way to learn what it costs. Keep the option pressable and let the press explain, or open the plans.",
    render: () => (
      <button type="button" disabled className={`${TAB} bg-surface-card text-cream-dim opacity-40 shadow-card`}>
        <Briefcase aria-hidden className="h-4 w-4" />
        En el trabajo
        <PremiumMark />
      </button>
    ),
    code: `{/* Don't */}
<button type="button" disabled>
  En el trabajo <PremiumMark />
</button>

{/* Do */}
<button type="button" onClick={showPlans}>
  En el trabajo <PremiumMark />
</button>`,
  },
]);
