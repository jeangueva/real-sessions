import { defineContract } from "../../contract";

export const MonoLabelContract = defineContract({
  name: "MonoLabel",
  level: "atom",
  status: "stable",
  summary: "The name of a block, in the instrument voice: mono, capitals, a tight \"::\" in front. The label on a card, not the heading under it.",
  source: "src/components/MonoLabel/MonoLabel.tsx",
  composes: [],
  dependencies: [],
  props: {
    children: {
      type: "ReactNode",
      required: true,
      description:
        "The name of the block, in capitals: \"GENERAL\", \"TU CUENTA\", \"EDUCACIÓN\". It is read as a paragraph, just before what it names.",
    },
    className: {
      type: "string",
      required: false,
      default: '""',
      description: "Extra classes, appended. For spacing and grid placement — not for colour, case or tracking.",
    },
  },
  slots: [
    {
      name: "children",
      description:
        "Text only. No icons and no links: this is a label, and anything pressable belongs elsewhere.",
    },
  ],
  states: [
    {
      name: "default",
      description: "14px mono, medium weight, uppercase, tracking 0.06em, in cream-dim, after a tight \"::\".",
      trigger: "Initial render.",
    },
  ],
  events: [],
  motion: [
    "None of its own. A label enters with the block around it, never separately.",
  ],
  accessibility: {
    role: "paragraph (native <p>) — deliberately not a heading",
    keyboard: [],
    aria: [
      {
        attribute: "aria-hidden (\"::\")",
        managedBy: "component",
        note: "The two colons are punctuation, not words: they are hidden so the label is read as \"GENERAL\" and not as \"colon colon GENERAL\".",
      },
      {
        attribute: "role=\"heading\" / aria-level",
        managedBy: "consumer",
        note: "Do not add them. The block it names has its own heading; promoting the label gives it two names in the headings list.",
      },
      {
        attribute: "lang",
        managedBy: "consumer",
        note: "Native attributes are spread onto the <p>; pass lang when the label is in another language from the page.",
      },
    ],
    reducedMotion: "Nothing moves, so nothing changes.",
    contrast:
      "cream-dim on every surface the labels sit on: 13.0:1 on the dark theme and 9.9:1 on the light one, both above the 4.5:1 floor for text.",
    focus: "Not focusable.",
    targetSize: "not interactive",
    screenReader:
      "Read as a plain paragraph just before the block it names. Someone moving by headings skips it, so the heading must make sense without it.",
  },
  content: {
    voice: [
      "A noun phrase, not a sentence: \"GENERAL\", \"TU CUENTA\", \"QUÉ FUNCIONÓ\".",
      "It names the block; the heading under it says something. Never a full sentence and never a question.",
      "It is written in capitals by the component: pass the words as they are written, \"qué funcionó\", not \"QUÉ FUNCIONÓ\".",
      "No final period, no colon of its own, no exclamation mark.",
    ],
    limits: [
      "1–3 words, about 24 characters, so it stays on one line beside what it labels.",
      "Longer names are cut by the space they sit in, not by the label: shorten the name, do not wrap it.",
    ],
    examples: ["general", "tu cuenta", "qué funcionó", "educación", "turno actual"],
  },
  usage: {
    when: [
      "On a card, naming what the card holds: \"::GENERAL\", \"::TU CUENTA\".",
      "On a dashboard panel, as the instrument voice the panels are written in.",
      "Anywhere the product needs a marker rather than a heading.",
    ],
    whenNot: [
      {
        situation: "The title of a screen or a section",
        instead: "A heading: the title of PageHeader, an h2 inside a Section.",
      },
      {
        situation: "A status on one item",
        instead: "Badge, which is a pill and says something about the item.",
      },
      {
        situation: "The kicker above a landing page's heading",
        instead: "Eyebrow, which is the accent-coloured line in the system's own voice.",
      },
    ],
    do: [
      "Write the name in the case you want it read, and let the component set the capitals.",
      "Keep one label per block, at the top-left of it.",
    ],
    dont: [
      "Don't use it as the only name of a block.",
      "Don't turn it into a heading with a role.",
      "Don't set the colour or the case through className.",
    ],
  },
  tokens: ["--cream-dim", "font-mono", "text-xs", "tracking-[0.06em]"],
  related: [
    { name: "Eyebrow", difference: "The accent-coloured kicker above a heading; this is the mono label on a card." },
    { name: "Badge", difference: "A status on one item, in a pill; a MonoLabel names a whole block." },
    { name: "Panel", difference: "The block a MonoLabel usually sits in." },
  ],
  i18n: {
    rtl: "Nothing mirrors: the label is a paragraph and aligns with the text around it.",
    textExpansion:
      "Wraps like any paragraph and never truncates. A German label of three words takes one line at 320px; a label of five wraps, and the block moves down with it.",
    formatting: "None: the text is the caller's, in the case the caller wants it read.",
    strings: [],
  },
  responsive: {
    behaviour: [
      "The same size at every width (14px mono).",
      "Wraps onto a second line in a narrow column instead of truncating.",
    ],
    minWidth: "160px",
  },
  designTool: {
    registryItem: "mono-label",
    importStatement: 'import { MonoLabel } from "@mockio/design-system";',
    canvasProps: ["children"],
    placement:
      "At the top-left of the block it names: a Panel, a card, a section of a dashboard.",
  },
  appCounterpart: {
    file: "design-system/primitives.tsx",
    exportName: "MonoLabel",
    differences: [
      "Spreads native paragraph attributes (id, lang, data-*) onto the <p>; the app's copy accepts children and className only.",
      "The app had this component twice, under two names: as \"Eyebrow\" in its primitives and as \"MonoLabel\" in its marketing library, byte for byte the same. It is one component now, called MonoLabel, and the app's copy of the system's Eyebrow is a different thing entirely.",
    ],
  },
  version: "1.0.0",
  changelog: [
    {
      version: "1.0.0",
      changes: [
        "First documented version, taken from the product's own copy of the component.",
        "The product's two copies of this component — \"Eyebrow\" in its primitives and \"MonoLabel\" in its marketing library — were the same component under two names. They are one now.",
      ],
    },
  ],
});
