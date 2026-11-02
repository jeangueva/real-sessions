import { defineContract } from "../../contract";

export const ScoreRingContract = defineContract({
  name: "ScoreRing",
  level: "atom",
  status: "stable",
  summary: "The one headline score of a finished session as a ring that draws itself to the percentage, with the number printed in the middle.",
  source: "src/components/ScoreRing/ScoreRing.tsx",
  composes: [],
  dependencies: ["framer-motion"],
  props: {
    value: {
      type: "number",
      required: true,
      description:
        "The score as a percentage. It sets how far the ring is drawn (clamped to 0–100) and its colour band; it is not printed — the number inside comes from children. NaN draws an empty ring.",
    },
    size: {
      type: "number",
      required: false,
      default: "168",
      description: "Width and height in pixels. 168 for the end-of-interview report, 132 on a shared report, 128 on a session's detail, 96 for the daily goal. The stroke scales with it.",
    },
    children: {
      type: "ReactNode",
      required: false,
      description: "What sits in the middle, centred: the number with its \"%\", formatted by the caller, or a mark when a goal is met. It is the only part a screen reader hears.",
    },
    className: {
      type: "string",
      required: false,
      default: '""',
      description: "Extra classes, appended to the wrapper. For layout (margin, self-alignment) — not for recolouring the ring.",
    },
  },
  slots: [
    {
      name: "children",
      description:
        "The score itself, in display type and tabular-nums, with a smaller \"%\" in cream-faint; or, when a goal is met, a mark (a check on grow) next to a caption outside the ring that says so in words.",
    },
  ],
  states: [
    { name: "high", description: "70 and above: the stroke is grow, the colour of what improved.", trigger: "value ≥ 70." },
    { name: "middle", description: "From 40 to 69: the stroke is the accent, the way forward.", trigger: "40 ≤ value < 70." },
    { name: "low", description: "Below 40: the stroke is step, orange — what to work on next. Never red.", trigger: "value < 40." },
    { name: "empty", description: "Only the lifted track: zero is a score, not a missing one. A NaN value draws the same.", trigger: "value={0} (or below, or NaN)." },
    { name: "complete", description: "The stroke closes the whole circle in grow. A value above 100 draws the same ring; the number inside prints whatever the caller passes.", trigger: "value ≥ 100." },
  ],
  events: [],
  motion: [
    "Draw: on mount the stroke's pathLength springs from 0 to value / 100 (framer-motion spring, duration 1.2s, bounce 0.15, after a 0.25s delay), so it lands with a small settle. It plays once, at the end of an interview — the product's one allowed moment of delight.",
    "A change of value springs from the current length to the new one on the same spring.",
    "Reduced motion: the ring is drawn at its value from the first frame and a later change jumps (duration 0). useReducedMotion() from framer-motion decides; no provider is needed.",
    "Nothing in the middle moves on its own. An animated counter or a popping check inside is the caller's, and must respect reduced motion itself.",
  ],
  accessibility: {
    role: "generic (native <div>); the ring's <svg> is aria-hidden",
    keyboard: [],
    aria: [
      { attribute: "aria-hidden (svg)", managedBy: "component", note: "The ring is a picture of the number, hidden so it is not announced twice or as an unnamed graphic." },
      {
        attribute: "aria-hidden (mark in children)",
        managedBy: "consumer",
        note: "A check or icon passed as children carries aria-hidden; the words that say the goal is met sit outside the ring (\"Meta cumplida.\").",
      },
      { attribute: "aria-label / role", managedBy: "consumer", note: "Optional, spread onto the wrapper. Usually unnecessary: the printed number and its label nearby (\"General\") name the score." },
    ],
    reducedMotion: "The stroke is drawn at its value on the first frame and changes without a transition: initial pathLength equals the value and the transition has duration 0. The colour band and the number are unaffected.",
    contrast:
      "The number in children is the caller's; cream-bright, as the product uses, is ≥ 14:1 on every surface in both themes. The stroke is a graphic and never the only signal: on the dark card grow, accent and step are 7.4–8.6:1, on the light card only 1.6–2.0:1, which is why the number is always printed inside.",
    focus: "Not focusable.",
    targetSize: "not interactive",
    screenReader:
      "Only the children are read (\"72 %\"). The ring's length and colour band are not announced, so a ring with no number inside says nothing at all — always print the score, or a caption beside it.",
  },
  content: {
    voice: [
      "The middle holds the number and nothing else: digits, then a smaller \"%\". No words inside the ring.",
      "Round before printing (Math.round): \"72%\", never \"71.6%\".",
      "The label (\"General\", \"Meta del día\") and the verdict (\"Vas muy bien. Un par de ajustes y lo tienes.\") go outside, as text the caller writes.",
    ],
    limits: ["Children: ≤ 4 characters with the suffix (\"100%\") at size 96; up to that at 168. Words belong outside the ring."],
    examples: ["72%", "General", "Meta del día", "{xp} de {goal} XP", "Meta cumplida.", "Vas muy bien. Un par de ajustes y lo tienes."],
  },
  usage: {
    when: [
      "The one headline score of a finished interview: the report's overall percentage, the score on a session's detail, a shared report.",
      "How much of the daily goal is done, on Today, with the XP in words under it.",
    ],
    whenNot: [
      { situation: "The supporting scores beside the headline one (vocabulary, structure)", instead: "Meter." },
      { situation: "Something loading or being evaluated", instead: "A sentence that names what is happening (\"Evaluando…\"), or DotMatrix." },
      { situation: "A verdict in words on a piece of the work (a risk, a coherence check)", instead: "Tag." },
      { situation: "A status of the screen", instead: "Badge." },
    ],
    do: [
      "Print the rounded number inside, with a smaller \"%\".",
      "One ring per view: it is the headline.",
      "Say outside the ring, in words, what the score means for the next step.",
    ],
    dont: [
      "Don't leave the ring empty of a number: the colour alone is not readable in the light theme and is never announced.",
      "Don't use it as a spinner or a progress bar for a wait.",
      "Don't recolour the stroke with className, or add red for a low score.",
    ],
  },
  tokens: ["--surface-lift", "--grow", "--accent", "--step", "--cream-bright", "--cream"],
  related: [
    { name: "Meter", difference: "A supporting score on a bar, label and number in a row; ScoreRing is the single headline score, drawn as a ring." },
    { name: "Badge", difference: "A status of the screen in words; ScoreRing is a number." },
    { name: "Tag", difference: "A verdict in words on a piece of the work; ScoreRing is the overall score." },
  ],
  i18n: {
    rtl: "The ring starts at twelve o'clock and fills clockwise in every direction, like a clock face: it is not mirrored. Digits are not mirrored either.",
    textExpansion: "Nothing inside grows with the language: the middle is a number. Labels and verdicts sit outside and wrap in the caller's layout.",
    formatting: "The component prints nothing itself. The caller rounds the score and formats it (Intl.NumberFormat in locales with other digits) and adds the \"%\".",
    strings: [],
  },
  responsive: {
    behaviour: [
      "A fixed square of size pixels; it does not stretch and does not shrink in a flex row (shrink-0).",
      "On phones the product stacks the ring above its verdict (flex-col, sm:flex-row); pick size 128 or less where it shares a row at 320px.",
    ],
    minWidth: "96px",
  },
  designTool: {
    registryItem: "score-ring",
    importStatement: 'import { ScoreRing } from "@mockio/design-system";',
    canvasProps: ["value", "size", "children"],
    placement: "At the start of a raised Panel that reports a finished session, next to the verdict and the next step; or above a two-line caption on Today. One per view.",
  },
  appCounterpart: {
    file: "design-system/motion.tsx",
    exportName: "ScoreRing",
    differences: [
      "Accepts className and native div attributes (id, aria-label, data-*, style) on the wrapper; the app's copy takes value, size and children only.",
      "Under reduced motion a change of value jumps (transition duration 0); the app's copy draws the first frame still but springs on later changes.",
      "A NaN value draws an empty ring in step; the app's copy hands NaN to pathLength.",
      "The wrapper is shrink-0, so a long verdict beside it in a flex row cannot squeeze the ring out of round.",
    ],
  },
  version: "1.0.0",
  changelog: [{ version: "1.0.0", changes: ["First documented version, extracted from the product."] }],
});
