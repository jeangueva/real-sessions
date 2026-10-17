import { defineContract } from "../../contract";

export const CheckItemContract = defineContract({
  name: "CheckItem",
  level: "atom",
  status: "stable",
  summary: "One row of a checklist of what a plan or an offer includes: a check in the accent, then the words.",
  source: "src/components/CheckItem/CheckItem.tsx",
  composes: [],
  dependencies: ["lucide-react"],
  props: {
    children: {
      type: "ReactNode",
      required: true,
      description: "What is included, as a short phrase. Wrapped in one span, so inline emphasis or a link stays part of the sentence.",
    },
    className: {
      type: "string",
      required: false,
      default: '""',
      description: "Extra classes, appended. For spacing or a grid span — not for the ink or the check's colour.",
    },
  },
  slots: [{ name: "children", description: "A phrase of text; inline elements (<strong>, a link) are fine. No block content and no second icon." }],
  states: [{ name: "default", description: "A 16px check in accent-text aligned to the first line, then the text in cream-dim.", trigger: "Initial render." }],
  events: [],
  motion: ["None. A checklist enters with the card around it (the caller's FadeRise); rows do not stagger on their own."],
  accessibility: {
    role: "listitem (native <li>) — the consumer supplies the <ul> or <ol>",
    keyboard: [],
    aria: [
      { attribute: "aria-hidden (check)", managedBy: "component", note: "The check is decoration and is not announced on every row." },
      {
        attribute: "list label",
        managedBy: "consumer",
        note: "Say what the checks mean in text before the list — a <dt>, a heading or a paragraph such as \"Qué incluye\" — or name the <ul> with aria-labelledby.",
      },
    ],
    reducedMotion: "Nothing moves, so nothing changes.",
    contrast:
      "Text: cream-dim ≥ 9.8:1 on every page and card surface in both themes (tightest: the light theme on surface-deep, 9.89:1). Check: accent-text ≥ 4.94:1 dark, ≥ 5.19:1 light — above the 3:1 asked of a graphic, though it carries no meaning on its own.",
    focus: "Not focusable. A link inside the text takes its own focus ring.",
    targetSize: "not interactive",
    screenReader: "Announced as a list item inside \"list, N items\", then its text. The check is not announced, so the list's label must say what the rows have in common.",
  },
  content: {
    voice: [
      "A noun phrase that names what you get: \"Entrevistas ilimitadas\", \"Historial y progreso completos\".",
      "Concrete over abstract: \"Tu CV en manos del entrevistador\" rather than \"Personalización\".",
      "Sentence case, no final period, no exclamation mark.",
      "Rows of one list share a grammatical shape, so they scan as one list.",
    ],
    limits: ["One line where possible: ≤ 48 characters. Two lines are the most; a row longer than that is a paragraph."],
    examples: [
      "La empresa a la que de verdad te postulas",
      "Tu CV en manos del entrevistador",
      "Entrevistadores en español y portugués",
      "Historial y progreso completos",
      "Entrevistas ilimitadas",
      "Todo lo del plan gratis",
    ],
  },
  usage: {
    when: [
      "Listing what a plan or an offer includes: the pricing cards, the early-access offer.",
      "A short list of things the reader gets, where every row is a yes.",
    ],
    whenNot: [
      { situation: "Something the user ticks or unticks", instead: "Checkbox." },
      { situation: "Steps to follow in order", instead: "An ordered list (<ol>) with numbers; a check says done or included, not next." },
      { situation: "Comparing what one plan has and another lacks", instead: "A table with a column per plan, so a missing feature is stated rather than implied by a missing row." },
      { situation: "Plain bullets with no sense of included", instead: "A <ul> with a small dot, as the journey cards use." },
    ],
    do: [
      "Put it inside a <ul> with a label before it, such as \"Qué incluye\".",
      "Keep rows of one list to the same shape and length.",
      "Lay rows out with flex-col gap-3 on the list.",
    ],
    dont: [
      "Don't render a CheckItem outside a list.",
      "Don't use a check for something that is not included.",
      "Don't recolour the check to rank rows.",
    ],
  },
  tokens: ["--cream", "--accent-text", "text-sm"],
  related: [{ name: "Badge", difference: "A single status in a pill; CheckItem is one row of a list of what is included." }],
  i18n: {
    rtl: "The check stays at the start of the row, which is the right edge in Arabic and Hebrew. The glyph itself is not mirrored.",
    textExpansion:
      "Wraps under itself with the check aligned to the first line (items-start). Portuguese \"A empresa para a qual você realmente se candidata\" takes two lines at 320px.",
    formatting: "None: any number in the text (\"5 sustentaciones\") is written by the caller.",
    strings: [],
  },
  responsive: {
    behaviour: ["The same size at every width; long rows wrap and the check stays on the first line.", "Spacing between rows belongs to the list (gap-3), not to the item."],
    minWidth: "200px",
  },
  designTool: {
    registryItem: "check-item",
    importStatement: 'import { CheckItem } from "@mockio/design-system";',
    canvasProps: ["children"],
    placement: "Only inside a <ul> (flex flex-col gap-3), usually in a pricing or offer card, below a label that says what the checks mean.",
  },
  appCounterpart: {
    file: "design-system/primitives.tsx",
    exportName: "CheckItem",
    differences: [
      "Accepts className and native <li> attributes; the app's copy takes children only.",
      "Wraps children in a single span, so mixed inline content stays one flex item; the app's copy lays each child out as its own flex item.",
    ],
  },
  version: "1.0.0",
  changelog: [{ version: "1.0.0", changes: ["First documented version, extracted from the product."] }],
});
