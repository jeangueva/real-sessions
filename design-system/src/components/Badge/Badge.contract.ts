import { defineContract } from "../../contract";

export const BadgeContract = defineContract({
  name: "Badge",
  level: "atom",
  status: "stable",
  summary: "A small pill with a status in words — the mode of a call, a setting in force — and, when live, a breathing dot.",
  source: "src/components/Badge/Badge.tsx",
  composes: [],
  dependencies: [],
  props: {
    children: {
      type: "ReactNode",
      required: true,
      description: "The status in 1–3 words, optionally led by a 12px icon with aria-hidden. The words carry the meaning; nothing else does.",
    },
    tone: {
      type: '"neutral" | "live"',
      required: false,
      default: '"neutral"',
      description: "Whether the status is a standing fact or something happening right now.",
      values: {
        neutral: "A fact about the screen: the mode (\"Práctica\"), a setting in force (\"Modo estrés\").",
        live: "Something in progress at this moment (\"Conectando\", the interviewer's turn). Prepends an accent dot that breathes.",
      },
    },
    role: {
      type: "string",
      required: false,
      description: "Native role, spread onto the span. Pass \"status\" when the text changes in place and the change should be announced politely.",
    },
    className: {
      type: "string",
      required: false,
      default: '""',
      description: "Extra classes, appended. For layout (margin, self-alignment) — not for recolouring the pill.",
    },
  },
  slots: [{ name: "children", description: "Text, optionally preceded by a 12px (h-3 w-3) lucide icon with aria-hidden." }],
  states: [{ name: "default", description: "The lifted surface pill with cream-dim text; the live tone adds the accent dot before the text.", trigger: "Initial render." }],
  events: [],
  motion: [
    "Live dot: opacity breathes 1 → 0.35 → 1 over 2s on an in-out curve (cubic-bezier(0.45, 0, 0.55, 1)), for as long as the tone is live. A breath rather than a blink, so it can sit beside text someone is reading.",
    "Reduced motion: the dot does not animate and stays at full opacity. The animation class is behind Tailwind's motion-safe: variant, so the component carries its own prefers-reduced-motion check.",
    "Nothing else moves; switching tone swaps the dot in and out without a transition.",
  ],
  accessibility: {
    role: "generic (native <span>); status when the consumer passes role=\"status\"",
    keyboard: [],
    aria: [
      { attribute: "aria-hidden (dot)", managedBy: "component", note: "The live dot is decoration and is hidden from assistive technology; the words say what is happening." },
      {
        attribute: "role=\"status\"",
        managedBy: "consumer",
        note: "Add it when the text changes in place and the change matters, like the call's turn counter. Leave it off fixed labels such as \"Práctica\", or every render is announced.",
      },
      { attribute: "aria-hidden (icon)", managedBy: "consumer", note: "A leading icon passed in children must carry aria-hidden; the text names the status." },
    ],
    reducedMotion: "The live dot stays still at full opacity: its animation only applies under prefers-reduced-motion: no-preference (motion-safe:). No provider is needed, and a change of the setting applies at once.",
    contrast:
      "Text: cream-dim on surface-lift is ≥ 9.2:1 in both themes over any surface (tightest: the light theme on surface-deep, 9.21:1). The dot is decorative (accent on the lifted pill, 2.8–5.1:1) and is never the only signal.",
    focus: "Not focusable.",
    targetSize: "not interactive",
    screenReader: "Read as its text, inline. The dot is not announced, so \"live\" reaches a screen reader only through the words — write a status (\"Conectando\"), not just a name.",
  },
  content: {
    voice: [
      "A noun or a short status, sentence case, no period: \"Práctica\", \"Modo estrés\", \"Turno 3 de 8\".",
      "Something in progress may be a gerund: \"Conectando\". No ellipsis — the live dot already says it is ongoing.",
      "Numbers as digits: \"Turno 3 de 8\".",
    ],
    limits: ["1–3 words, ≤ 20 characters. A badge that wraps is a sentence that wants to be body text."],
    examples: ["Práctica", "Real", "Modo estrés", "Conectando", "Turno 3 de 8"],
  },
  usage: {
    when: [
      "A short fact about the current screen that the user is not changing right now: the mode of a call, a setting in force.",
      "A status happening at this moment, with tone live: the call connecting, the interviewer's turn.",
    ],
    whenNot: [
      { situation: "Something the user can press or toggle", instead: "Action (ghost) or Segmented. A Badge is not focusable and has no press." },
      { situation: "Marking an option as part of the paid plan", instead: "PremiumMark." },
      { situation: "A message about what just happened", instead: "Notice." },
      { situation: "A score or how far along something is", instead: "Meter or ScoreRing." },
      { situation: "Something loading, with nothing to say yet", instead: "DotMatrix, or a sentence that names what is loading." },
    ],
    do: [
      "Say the state in words; let the dot only add \"right now\".",
      "One live badge per view at most.",
      "Add role=\"status\" when the text changes in place.",
    ],
    dont: [
      "Don't use a Badge as a button or a filter chip.",
      "Don't make every badge live.",
      "Don't recolour it to mean error or success.",
    ],
  },
  tokens: ["--surface-lift", "--surface-lift-alpha", "--cream", "--accent", "animate-live"],
  related: [
    { name: "PremiumMark", difference: "Marks one option as paid, with a crown; Badge states a status in words." },
    { name: "Eyebrow", difference: "Places a whole block above its heading; Badge describes one item or the current screen." },
  ],
  i18n: {
    rtl: "The dot leads the text in reading order, so it sits on the right in Arabic and Hebrew. A leading icon follows the same order; nothing is mirrored.",
    textExpansion:
      "The pill grows with its text. Portuguese and German statuses run about as long (\"Modo estresse\", \"Stressmodus\"); a label too long for its row wraps inside the pill, which is the sign to shorten it.",
    formatting: "None inside the component: a counter such as \"Turno 3 de 8\" arrives already formatted by the caller.",
    strings: [],
  },
  responsive: {
    behaviour: [
      "The same size at every width.",
      "A row of badges is the caller's flex row; give it flex-wrap so the badges drop to a second line on a 320px phone instead of overflowing.",
    ],
    minWidth: "80px",
  },
  designTool: {
    registryItem: "badge",
    importStatement: 'import { Badge } from "@mockio/design-system";',
    canvasProps: ["children", "tone"],
    placement: "In a page header's actions, beside a title, or at the top of a card. Several sit in a flex row with gap-2 or gap-3.",
  },
  appCounterpart: {
    file: "design-system/primitives.tsx",
    exportName: "Badge",
    differences: [
      "Accepts className and native span attributes (role, id, data-*); the app's copy takes children and tone only.",
      "The live dot animates only under motion-safe:; the app's copy relies on the global reduced-motion stylesheet to stop it.",
      "The live dot is shrink-0, so it keeps its size when the label wraps.",
    ],
  },
  version: "1.0.0",
  changelog: [{ version: "1.0.0", changes: ["First documented version, extracted from the product."] }],
});
