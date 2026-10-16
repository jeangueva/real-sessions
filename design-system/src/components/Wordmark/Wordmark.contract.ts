import { defineContract } from "../../contract";

export const WordmarkContract = defineContract({
  name: "Wordmark",
  level: "molecule",
  status: "stable",
  summary: "The brand lockup: the Mark and the lowercase name \"mockio\", sized together by font-size so the logo never drifts between places.",
  source: "src/components/Wordmark/Wordmark.tsx",
  composes: ["Mark"],
  dependencies: [],
  props: {
    mark: {
      type: "boolean",
      required: false,
      default: "true",
      description: "Shows the Mark before the name, at 1.3em square. Turn it off where the mark is already on screen (the app's top bar) or a character sits right above the name (sign-in).",
    },
    className: {
      type: "string",
      required: false,
      default: '""',
      description: "Size and ink, appended to the lockup's own classes: a text-* size, a weight and a colour, e.g. \"text-xl font-semibold text-cream-bright\". The mark scales with the font-size.",
    },
  },
  slots: [],
  states: [
    { name: "default", description: "The Mark, a 0.35em gap and \"mockio\" in the mark face, lowercase, tracked -0.03em. Inherits colour and size from className or the parent.", trigger: "Initial render." },
  ],
  events: [],
  motion: ["None. The wordmark is static; an entrance, if any, belongs to the container (FadeRise, PopIn)."],
  accessibility: {
    role: "none (a plain <span>; the text is its content)",
    keyboard: [],
    aria: [
      { attribute: "aria-hidden (on the Mark)", managedBy: "component", note: "The composed Mark has no label, so it is hidden; the visible name is what gets read." },
      { attribute: "translate=\"no\"", managedBy: "component", note: "Always set, so browser translation leaves the brand name alone." },
      { attribute: "dir=\"ltr\"", managedBy: "component", note: "Always set: the lockup keeps the mark before the name in right-to-left documents." },
      { attribute: "aria-label (on the wrapping link)", managedBy: "consumer", note: "When the wordmark is the home link, the link may carry aria-label=\"mockio\"; the visible text already gives it the same name." },
    ],
    reducedMotion: "Nothing to reduce: the wordmark has no motion.",
    contrast: "The name takes the caller's ink. With text-cream-bright, the product's choice everywhere, it is ≥ 16:1 on every surface in both themes. The mark keeps its brand colours (see Mark).",
    focus: "Never focusable. As a home link, the link carries .focus-ring and a rounded corner.",
    targetSize: "not interactive",
    screenReader: "Read as the word \"mockio\". The mark is not announced.",
  },
  content: {
    voice: [
      "The component writes the name itself: \"mockio\", lowercase, in every locale. There is no prop to change it.",
      "In running text the brand is written \"Mockio\" with a capital, as a word in the sentence — not with this component.",
      "In Portuguese the brand takes the article in running text (\"O Mockio é uma ferramenta de prática\"); the wordmark itself never does.",
    ],
    limits: ["One word, fixed. Nothing is ever appended to the lockup (no tagline, no product name after it)."],
    examples: ["mockio"],
  },
  usage: {
    when: [
      "Where the brand is read, not only recognised: the landing nav, the site footer, the sign-in and unsubscribe pages.",
      "Beside the Mark in the app's top bar on wide screens, with mark={false}.",
    ],
    whenNot: [
      { situation: "A square place or a tight space where the name will not fit (phone top bar, icon tile)", instead: "Mark alone, inside a link named \"Mockio\"." },
      { situation: "The brand inside a sentence", instead: "Plain text \"Mockio\", capitalised, in the sentence's own font." },
      { situation: "A friendly presence above the name on an entry screen", instead: "Mascot above a Wordmark with mark={false}; never the character and the mark together." },
    ],
    do: [
      "Size it with a text-* class and let the mark follow.",
      "Use mark={false} when a Mark or a Mascot is already next to it.",
      "Name the home link once (aria-label on the link) and keep the lockup inside it.",
    ],
    dont: [
      "Don't build the lockup by hand with a Mark and a text node: the size relation and the lowercase drift.",
      "Don't capitalise it, translate it or route it through a translation function.",
      "Don't add a tagline or a second word inside the lockup.",
    ],
  },
  tokens: ["font-mark"],
  related: [
    { name: "Mark", difference: "The square alone, for icons and tight spaces; Wordmark adds the name." },
    { name: "Mascot", difference: "The illustrated character. On sign-in it sits above a Wordmark with mark={false}." },
  ],
  i18n: {
    rtl: "Does not mirror. dir=\"ltr\" on the lockup keeps the mark before the name in Arabic and Hebrew; the lockup as a whole is still placed by the page's direction (it sits at the start of an RTL nav).",
    textExpansion: "Nothing expands: the name is the literal \"mockio\" in every locale, so the lockup is the same width everywhere. Neighbouring labels expand around it.",
    formatting: "None. The only string is the brand name \"mockio\", which is deliberately not a prop and not translated; that is why strings is empty although the component renders text.",
    strings: [],
  },
  responsive: {
    behaviour: [
      "Scales with font-size only; responsive sizing is the caller's (text-lg lg:text-xl).",
      "Never wraps: one word and a square, kept on one line by inline-flex. Hide it below a breakpoint and keep the Mark instead when the row is too narrow.",
    ],
    minWidth: "80px",
  },
  designTool: {
    registryItem: "wordmark",
    importStatement: 'import { Wordmark } from "@mockio/design-system";',
    canvasProps: ["mark", "className"],
    placement: "Start of a nav bar, a footer row or above a sign-in card. Usually inside a link home. Give it clear space of at least the mark's width.",
  },
  appCounterpart: {
    file: "design-system/wordmark.tsx",
    exportName: "Wordmark",
    differences: [
      "Sets dir=\"ltr\" on the lockup, so the mark stays before the name in right-to-left locales; the app's copy flips the mark to the right of the name in Arabic and Hebrew.",
      "Exports WordmarkProps as an interface; the app's props are an inline type.",
    ],
  },
  version: "1.0.0",
  changelog: [{ version: "1.0.0", changes: ["First documented version, extracted from the product.", "The lockup no longer mirrors in right-to-left documents."] }],
});
