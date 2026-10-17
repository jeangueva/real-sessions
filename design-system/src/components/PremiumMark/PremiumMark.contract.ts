import { defineContract } from "../../contract";

export const PremiumMarkContract = defineContract({
  name: "PremiumMark",
  level: "atom",
  status: "stable",
  summary: "The gold crown on an option that belongs to the paid plan, named for screen readers; the option itself stays usable.",
  source: "src/components/PremiumMark/PremiumMark.tsx",
  composes: [],
  dependencies: ["lucide-react"],
  props: {
    label: {
      type: "string",
      required: false,
      default: '"Premium"',
      description:
        "The mark's accessible name and its tooltip, read instead of the crown. A blank string falls back to the default, so the mark is never an unnamed image.",
    },
    className: {
      type: "string",
      required: false,
      default: '""',
      description: "Extra classes, appended. For placement (ms-auto at the end of a row, an absolute corner on a thumbnail) — not for size or colour.",
    },
  },
  slots: [],
  states: [{ name: "default", description: "A 20px circle in premium-soft with a 12px filled crown in premium.", trigger: "Initial render." }],
  events: [],
  motion: ["None. The mark is static wherever it appears; the paid plan's one moving flourish is ShimmerText in the top bar."],
  accessibility: {
    role: "img (role=\"img\" on a <span>), named by label",
    keyboard: [],
    aria: [
      { attribute: "role=\"img\" + aria-label", managedBy: "component", note: "Set from label, so the crown is announced as a word, never as \"image\"." },
      { attribute: "aria-hidden (crown)", managedBy: "component", note: "The SVG inside is hidden; the span carries the name." },
      { attribute: "title", managedBy: "component", note: "The same text as a tooltip for mouse users. Touch and keyboard users do not get it, so the name must not be the only place an important condition is explained." },
    ],
    reducedMotion: "Nothing moves, so nothing changes.",
    contrast:
      "The crown is a graphic: premium on premium-soft is 8.82:1 on the dark theme and 4.17:1 on the light one, above the 3:1 asked of non-text. The soft circle itself is a wash, not a boundary, and needs no contrast.",
    focus: "Not focusable. Inside a link, tab or button it adds to that control's accessible name and takes no focus of its own.",
    targetSize: "not interactive",
    screenReader:
      "Read as its label. Inside a control the label joins the control's name: a tab is named \"En el trabajo Premium\" and a rail link \"Tu contexto Del plan pago\".",
  },
  content: {
    voice: [
      "The plan's name or where the option lives: \"Premium\", \"Del plan pago\".",
      "A name, not a refusal: never \"Bloqueado\" or \"No disponible\".",
      "Sentence case, no period.",
    ],
    limits: ["1–4 words. It is heard, and seen only as a tooltip, so brevity is for the ear."],
    examples: ["Premium", "Del plan pago"],
  },
  usage: {
    when: [
      "Next to any option the free plan cannot use: a rail entry, a practice tab, a share template, a section of the report.",
      "Wherever the option appears, the same mark — so it is learnt once.",
    ],
    whenNot: [
      { situation: "Saying the paid plan is active for this person", instead: "ShimmerText in the top bar's \"Premium\" chip." },
      { situation: "A status of the current screen", instead: "Badge." },
      { situation: "Explaining what the paid plan adds", instead: "A sentence beside the option with a link to the plans (\"Ver los planes\")." },
    ],
    do: [
      "Keep the marked option visible and pressable; let the press explain or open the plans.",
      "Put it at the end of the option's label (ms-auto in a full-width row).",
      "Use the default label unless the place needs \"Del plan pago\".",
    ],
    dont: [
      "Don't disable an option because it carries the mark.",
      "Don't use the crown or the gold for anything else.",
      "Don't resize or recolour it through className.",
    ],
  },
  tokens: ["--premium", "--premium-soft"],
  related: [
    { name: "ShimmerText", difference: "Says the paid plan is on, once, in the top bar; PremiumMark marks each option that needs it." },
    { name: "Badge", difference: "States a status in visible words; PremiumMark is a crown with a spoken name." },
  ],
  i18n: {
    rtl: "The crown is not mirrored. Place it with logical utilities (ms-auto, not ml-auto) so it sits at the end of the row in both directions.",
    textExpansion: "Fixed 20px whatever the language; only the spoken label and the tooltip grow.",
    formatting: "None.",
    strings: [{ text: "Premium", prop: "label" }],
  },
  responsive: {
    behaviour: [
      "The same 20px at every width; shrink-0, so a wrapping label never squeezes it.",
      "Where a label is hidden at small widths (the collapsed rail), hide the mark with it, as the product does with hidden lg:inline-grid.",
    ],
    minWidth: "20px",
  },
  designTool: {
    registryItem: "premium-mark",
    importStatement: 'import { PremiumMark } from "@mockio/design-system";',
    canvasProps: ["label"],
    placement: "At the end of an option's label — inside a rail link, a tab, a card header or the corner of a template thumbnail.",
  },
  appCounterpart: {
    file: "design-system/primitives.tsx",
    exportName: "PremiumMark",
    differences: [
      "label is optional and defaults to \"Premium\" (the product's es copy of premium.mark); the app's copy requires it.",
      "A blank label falls back to the default instead of rendering an image with no name.",
    ],
  },
  version: "1.0.0",
  changelog: [{ version: "1.0.0", changes: ["First documented version, extracted from the product."] }],
});
