import { defineContract } from "../../contract";

export const InsetContract = defineContract({
  name: "Inset",
  level: "atom",
  status: "stable",
  summary: "The darker well inside a Widget that groups one piece of its content: a numbered row, a price, a step's tile and title.",
  source: "src/components/Inset/Inset.tsx",
  composes: [],
  dependencies: [],
  props: {
    children: {
      type: "ReactNode",
      required: true,
      description: "One group of the widget's content: an IconTile and a line, a price and its unit, a step's number and title.",
    },
    className: {
      type: "string",
      required: false,
      default: '""',
      description: "Extra classes, appended. Layout (flex, items-center, gap-3, flex-col gap-4) and a tighter padding for a row (p-3, px-4 py-3) — not a fill or a radius.",
    },
  },
  slots: [{ name: "children", description: "One group. Text inside is cream-bright for the line that matters and cream-dim for its meta; an IconTile may lead it." }],
  states: [
    {
      name: "default",
      description: "rounded-2xl (1rem), bg-surface-lift — a 7% white wash on dark, 6% ink on light, over the card — and p-4. No edge, no shadow.",
      trigger: "Initial render.",
    },
  ],
  events: [],
  motion: ["None. An inset moves with the widget it sits in, never on its own."],
  accessibility: {
    role: "none of its own (a plain <div>)",
    keyboard: [],
    aria: [{ attribute: "role / aria-* / data-*", managedBy: "consumer", note: "Every other <div> attribute is spread onto the well. A list of insets is a <ul>/<ol> whose <li> each hold one Inset." }],
    reducedMotion: "Nothing moves, so nothing changes.",
    contrast:
      "On a card the well is #353431 on dark and #E8E4DE on light. cream-bright clears 11.6:1 dark and 13.9:1 light, cream 10.5:1 and 12.7:1, cream-dim 8.1:1 and 8.4:1. The well's own edge against the card is decoration, so nothing may depend on seeing it.",
    focus: "Not focusable. It does not clip, so a focus ring inside it shows whole.",
    targetSize: "not interactive",
    screenReader: "Nothing is announced for the well; it is read as its content.",
  },
  content: {
    voice: [
      "One line per inset row, sentence case, no period when it is a list item: \"Deliberación y acta con la escala de tu país\".",
      "A meta beside it in mono caps, in cream-dim: \"15 min · 12 preguntas\".",
    ],
    limits: ["One group per inset: a tile and a line, or a figure and its unit, or a number and a title.", "Rows: one or two lines of text; past that it is body copy under the widget, not a row."],
    examples: [
      "Presidente, metodólogo y especialista según tu carrera, cada uno con su voz",
      "Deliberación y acta con la escala de tu país",
      "Título profesional",
      "S/ 39",
      "Sube tu tesis",
    ],
  },
  usage: {
    when: [
      "Rows of a list inside a Widget: the product's three points, the six degrees with their minutes and questions.",
      "The figure of a pricing tier, set apart from its list of items.",
      "The head of a step: its IconTile and title, with the body under the inset.",
    ],
    whenNot: [
      { situation: "A block on the page ground, outside a card", instead: "Widget on the landing, Panel in the app. surface-lift is a wash; with no card behind it, it reads as nothing." },
      { situation: "A row the person presses or selects", instead: "A link or button with its own focus ring and hover; Inset has no states. A choice of one among a few is Segmented." },
      { situation: "A message about what happened", instead: "Notice." },
    ],
    do: ["Put it inside a Widget (or a Panel).", "Tighten the padding for a row with className (p-3, px-4 py-3).", "Wrap a list of insets in a real <ul>/<ol>."],
    dont: ["Don't nest an Inset in an Inset.", "Don't give it a border or a shadow: it recedes, it does not rise.", "Don't put it on the page ground."],
  },
  tokens: ["--surface-lift", "--surface-lift-alpha"],
  related: [
    { name: "Widget", difference: "The card the inset sits in; Widget rises with a hairline, Inset recedes with a wash." },
    { name: "Panel", difference: "The app's surface. Panel's guidance calls this same well (rounded-2xl bg-surface-lift p-4) the way to group inside it." },
    { name: "Notice", difference: "A tinted box that carries a message and its mark; Inset carries no meaning of its own." },
  ],
  i18n: {
    rtl: "Nothing to mirror: the well is symmetric, and a flex row inside follows the document direction (the tile moves to the right).",
    textExpansion: "The well grows in height; longer Portuguese or German rows wrap under themselves beside the tile. Nothing is truncated.",
    formatting: "None: the inset renders no text of its own.",
    strings: [],
  },
  responsive: {
    behaviour: ["The same radius, fill and padding at every width.", "A row with a meta (justify-between) keeps the meta shrink-0, so the label wraps and the figure stays whole."],
    minWidth: "200px",
  },
  designTool: {
    registryItem: "inset",
    importStatement: 'import { Inset } from "@mockio/design-system";',
    canvasProps: ["children", "className"],
    placement: "Inside a Widget (or a Panel), as a child of its stack or as an item of a list in it. Never on the page ground, never inside another Inset.",
  },
  appCounterpart: {
    file: "components/marketing.tsx",
    exportName: "Inset",
    differences: ["Spreads native <div> attributes (id, role, aria-*, data-*) onto the well; the product's copy accepts children and className only."],
  },
  version: "1.0.0",
  changelog: [{ version: "1.0.0", changes: ["First documented version, extracted from the product's landing."] }],
});
