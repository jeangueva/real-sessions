import { defineContract } from "../../contract";

export const MonoLabelContract = defineContract({
  name: "MonoLabel",
  level: "atom",
  status: "stable",
  summary: "The \"::LABEL\" that names a card or a section in the instrument voice — mono, spaced caps, cream-dim, led by two colons.",
  source: "src/components/MonoLabel/MonoLabel.tsx",
  composes: [],
  dependencies: [],
  props: {
    children: {
      type: "ReactNode",
      required: true,
      description: "The name, in 1–3 words, written in sentence case: the style uppercases it. Plain text; no icon, no link.",
    },
    className: {
      type: "string",
      required: false,
      default: '""',
      description: "Extra classes, appended. For layout (margin, shrink-0 beside a row of chips) — not for colour, size or case.",
    },
  },
  slots: [{ name: "children", description: "Text only. The two colons are drawn by the component; do not type them." }],
  states: [{ name: "default", description: "Two tight colons, then the name in uppercase JetBrains Mono at text-xs with 0.06em tracking, in cream-dim.", trigger: "Initial render." }],
  events: [],
  motion: ["None. The label is static; an entrance is the caller's (FadeRise on the block it names)."],
  accessibility: {
    role: "paragraph (native <p>)",
    keyboard: [],
    aria: [
      { attribute: "aria-hidden (colons)", managedBy: "component", note: "The \"::\" is drawing; hidden so a screen reader does not read \"colon colon\" before every card." },
      { attribute: "lang", managedBy: "consumer", note: "Pass lang on the label (or an ancestor) when its language differs from the page, so the uppercased word is pronounced, not spelled." },
    ],
    reducedMotion: "Nothing moves, so nothing changes.",
    contrast: "cream-dim ≥ 9.8:1 on every page and card surface in both themes (tightest: the light theme on surface-deep, 9.89:1); ≥ 9.2:1 on a lifted inset.",
    focus: "Not focusable.",
    targetSize: "not interactive",
    screenReader:
      "Read as its text, as a paragraph, without the colons. The uppercase is CSS (text-transform), so the source text stays in sentence case and is read as words, not as letters.",
  },
  content: {
    voice: [
      "A noun phrase that names the block, sentence case in the source, no period: \"Cómo funciona\", \"Precios\", \"Además\".",
      "The name of a thing, not a pitch: the heading under it says the claim (\"De tu PDF a tu acta en una tarde.\").",
      "A plan's name may be the label of its card: \"Pack Sustentación\", \"Pase Intensivo\".",
    ],
    limits: ["1–4 words, ≤ 28 characters. Spaced mono caps run wider than body text; past that the label wraps and stops reading as a label."],
    examples: ["Cómo funciona", "Precios", "Además", "Pack Sustentación", "Pase Intensivo", "Con el formato de jurado de"],
  },
  usage: {
    when: [
      "The name of a card on the landing's instrument look: a pricing tier (\"Pack Sustentación\"), a widget.",
      "A section's kicker above its title on the landing: \"Cómo funciona\" over \"De tu PDF a tu acta en una tarde.\"",
      "A short lead-in at the start of a row of chips: \"Con el formato de jurado de\" before the countries.",
    ],
    whenNot: [
      { situation: "The line above a heading inside the signed-in product", instead: "Eyebrow, the product's kicker in the accent." },
      { situation: "The name of the block in a screen reader's heading list", instead: "A heading (h2/h3) under the label. The label is a paragraph." },
      { situation: "A status of the current screen", instead: "Badge." },
      { situation: "A sentence or a message", instead: "Body text, or Notice." },
    ],
    do: [
      "Write the label in sentence case and let the style uppercase it.",
      "Keep a real heading under a section label.",
      "One label per card, at its top.",
    ],
    dont: [
      "Don't type the colons: the component draws them.",
      "Don't write a sentence in spaced caps.",
      "Don't use it inside the signed-in product, where the kicker is Eyebrow.",
    ],
  },
  tokens: ["--cream", "font-mono"],
  related: [
    { name: "Eyebrow", difference: "The product's kicker above a heading, in the accent and in weight; MonoLabel is the landing's instrument voice, mono caps in cream-dim." },
    { name: "Badge", difference: "A pill stating the status of a screen; MonoLabel names a block and has no surface of its own." },
  ],
  i18n: {
    rtl: "Follows the document direction: the colons lead the text, so they sit on the right in Arabic and Hebrew. Nothing is mirrored. Scripts without case (Arabic, Hebrew, CJK) are unaffected by the uppercase.",
    textExpansion:
      "The label wraps inside its container; Portuguese and German names run about as long (\"Como funciona\", \"Pacote Defesa\"). A label that wraps is the sign to shorten it.",
    formatting: "None: the label is text from the caller.",
    strings: [],
  },
  responsive: {
    behaviour: ["The same size at every width.", "Beside a row of chips, give it shrink-0 so it keeps its words together while the chips wrap (flex-col on phones, flex-row from md)."],
    minWidth: "120px",
  },
  designTool: {
    registryItem: "mono-label",
    importStatement: 'import { MonoLabel } from "@mockio/design-system";',
    canvasProps: ["children"],
    placement: "At the top of a card (first child, gap-4 to the content) or above a section title (mt-3 to the heading). Landing and marketing surfaces only.",
  },
  appCounterpart: {
    file: "components/marketing.tsx",
    exportName: "MonoLabel",
    differences: ["Spreads native paragraph attributes (id, lang, data-*) onto the <p>; the app's copy accepts children and className only."],
  },
  version: "1.0.0",
  changelog: [{ version: "1.0.0", changes: ["First documented version, extracted from the product."] }],
});
