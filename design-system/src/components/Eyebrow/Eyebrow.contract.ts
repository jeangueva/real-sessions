import { defineContract } from "../../contract";

export const EyebrowContract = defineContract({
  name: "Eyebrow",
  level: "atom",
  status: "stable",
  summary: "The short line in the accent above a heading or a value: it says where the reader is, the heading says what it means.",
  source: "src/components/Eyebrow/Eyebrow.tsx",
  composes: [],
  dependencies: [],
  props: {
    children: {
      type: "ReactNode",
      required: true,
      description: "The kicker: a noun phrase of one to four words. Plain text; it is read as a paragraph just before the heading.",
    },
    className: {
      type: "string",
      required: false,
      default: '""',
      description: "Extra classes, appended. For spacing and grid placement (lg:col-span-2) — not for colour, case or tracking.",
    },
  },
  slots: [{ name: "children", description: "Text only. No icons, no links: the eyebrow is a label, and anything you can press belongs elsewhere." }],
  states: [{ name: "default", description: "16px semibold (text-sm in this scale) in accent-text, on its own line.", trigger: "Initial render." }],
  events: [],
  motion: ["None of its own. An eyebrow enters with the block around it (the caller's FadeRise), never separately."],
  accessibility: {
    role: "paragraph (native <p>) — deliberately not a heading",
    keyboard: [],
    aria: [
      {
        attribute: "role=\"heading\" / aria-level",
        managedBy: "consumer",
        note: "Do not add them. The heading that follows names the section; an eyebrow promoted to a heading gives the section two entries in the headings list.",
      },
      {
        attribute: "lang",
        managedBy: "consumer",
        note: "Native attributes are spread onto the <p>; pass lang when the eyebrow is in a different language from the page, so it is pronounced correctly.",
      },
    ],
    reducedMotion: "Nothing moves, so nothing changes.",
    contrast:
      "accent-text on every page and card surface: ≥ 4.94:1 on the dark theme (tightest: surface-card) and ≥ 5.19:1 on the light one (surface-deep). On a surface-lift row inside a dark card it falls to 4.05:1 — keep it off lifted rows.",
    focus: "Not focusable.",
    targetSize: "not interactive",
    screenReader:
      "Read as a plain paragraph just before the heading. Someone moving by headings skips it, so the heading must make sense without it.",
  },
  content: {
    voice: [
      "A noun phrase, not a sentence: \"Precios\", \"Acta simulada\", \"Qué esperar\".",
      "It places; the heading says something. \"Precios\" over \"Gratis para conseguir el trabajo. Después, al precio de tu país.\"",
      "Sentence case, no final period, no colon, no exclamation mark.",
      "If it needs a verb, it is the heading, not the eyebrow.",
    ],
    limits: ["1–4 words; about 32 characters, so it stays on one line in a 320px phone's column. Longer translations wrap, and that is fine."],
    examples: ["Precios", "Acceso anticipado", "Acta simulada", "Ensayo de sustentación", "Diapositiva por diapositiva", "Esta semana"],
  },
  usage: {
    when: [
      "Above a landing section's heading, to place it: \"Precios\", \"Acceso anticipado\".",
      "Above a value in a platform card: \"Nivel\" over the level, \"Acta simulada\" over the grade.",
      "As the label of a group of controls inside a card that already sits under a page heading: \"Apariencia\", \"Cuenta\".",
    ],
    whenNot: [
      { situation: "The name of a section or a page", instead: "A heading (an h2 inside Section, the title of PageHeader). The eyebrow goes above it, never in place of it." },
      { situation: "A status or a mode on an item", instead: "Badge." },
      { situation: "The label of a form field", instead: "Field, whose label is tied to its input." },
      { situation: "A sentence of explanation", instead: "Body text in cream-dim under the heading." },
    ],
    do: [
      "Pair it with a heading that says something.",
      "One eyebrow per block.",
      "Use className for spacing and grid placement only.",
    ],
    dont: [
      "Don't make it the only title of a section.",
      "Don't set it in spaced capitals or another colour.",
      "Don't end it with a period or a colon.",
    ],
  },
  tokens: ["--accent-text", "text-sm"],
  related: [{ name: "Badge", difference: "A status on one item, in a pill; Eyebrow places a whole block." }],
  i18n: {
    rtl: "Nothing mirrors. It aligns with the text around it, so it starts at the right edge in Arabic and Hebrew and stays centred in a centred landing header.",
    textExpansion: "Wraps like any paragraph and never truncates. German \"Vom Vorstellungsgespräch zur Gehaltserhöhung\" takes two lines at 320px.",
    formatting: "None: the text is the caller's.",
    strings: [],
  },
  responsive: {
    behaviour: ["The same size at every width (16px semibold).", "Wraps onto a second line in a narrow column instead of truncating."],
    minWidth: "160px",
  },
  designTool: {
    registryItem: "eyebrow",
    importStatement: 'import { Eyebrow } from "@mockio/design-system";',
    canvasProps: ["children"],
    placement: "Directly above a heading (landing sections) or above a value or a group inside a card (platform). Something must follow it: a heading, a number or the group it labels.",
  },
  appCounterpart: {
    file: "design-system/primitives.tsx",
    exportName: "Eyebrow",
    differences: ["Spreads native paragraph attributes (id, lang, data-*) onto the <p>; the app's copy accepts children and className only."],
  },
  version: "1.0.0",
  changelog: [{ version: "1.0.0", changes: ["First documented version, extracted from the product."] }],
});
