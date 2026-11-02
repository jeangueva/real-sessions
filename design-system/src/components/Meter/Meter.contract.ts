import { defineContract } from "../../contract";

export const MeterContract = defineContract({
  name: "Meter",
  level: "atom",
  status: "stable",
  summary: "A measured amount on a known scale — a score out of ten, a percentage, the XP into a level — as a label, the number and a bar that fills to it.",
  source: "src/components/Meter/Meter.tsx",
  composes: [],
  dependencies: [],
  props: {
    value: {
      type: "number",
      required: true,
      description: "The measured amount, on the same scale as max. Printed exactly as passed; the bar clamps to 0–100% of the scale, the number does not.",
    },
    max: {
      type: "number",
      required: false,
      default: "100",
      description: "The top of the scale: 100 for a percentage, 10 for a score out of ten, the XP the next level needs. A max of 0 or less draws an empty bar.",
    },
    label: {
      type: "string",
      required: true,
      description: "What is measured, in a word or two (\"Vocabulario\"). Shown above the bar on the start side and used as the meter's accessible name.",
    },
    suffix: {
      type: "string",
      required: false,
      default: '"%"',
      description: "Written right after the number with no space: \"%\" for a percentage, \"/10\" for a score out of ten, \"\" for a bare count such as XP.",
    },
    className: {
      type: "string",
      required: false,
      default: '""',
      description: "Extra classes, appended to the wrapper. For layout (width, a grid span, margin) — not for recolouring the bar.",
    },
  },
  slots: [],
  states: [
    { name: "default", description: "The label and the number on one row; under them the lifted track with the accent fill scaled to value / max.", trigger: "Initial render with 0 < value < max." },
    { name: "empty", description: "The track with no fill and the number 0 beside the label. Still a meter: zero is a measurement, not a missing one.", trigger: "value={0}, or max ≤ 0." },
    { name: "complete", description: "The fill covers the whole track. A value above max prints as passed (12/10) while the bar stops at full.", trigger: "value ≥ max." },
  ],
  events: [],
  motion: [
    "Fill: when value changes, the bar's scaleX eases to the new proportion over 700ms on the cinematic curve (cubic-bezier(0.16, 1, 0.3, 1)) — a slow settle, so a new score lands rather than jumps. A transform, so it stays on the compositor.",
    "First render: the bar is drawn at its value with no entrance. An entrance, if the screen wants one, is the caller's (FadeRise in the product).",
    "Reduced motion: the package's global prefers-reduced-motion rule (styles.css) drops transform from every transition, so the bar changes to its new length at once. The number never animates.",
  ],
  accessibility: {
    role: "meter (on the track); the wrapper is a generic <div>",
    keyboard: [],
    aria: [
      { attribute: "role=\"meter\"", managedBy: "component", note: "On the track, not the wrapper: a bounded measurement, not a task in progress (that is progressbar)." },
      { attribute: "aria-valuenow / aria-valuemin / aria-valuemax", managedBy: "component", note: "value, 0 and max, unclamped: a screen reader hears the same number a sighted reader sees." },
      { attribute: "aria-label", managedBy: "component", note: "Set from label, so the meter is named by what it measures." },
    ],
    reducedMotion: "The fill's length changes at once: styles.css removes transform from transitions under prefers-reduced-motion: reduce. Nothing else moves.",
    contrast:
      "Number: cream-bright, ≥ 14:1 on every page and card surface in both themes (tightest: 14.3:1 on the dark card, 14.1:1 on the light surface-deep). Label: cream-dim, ≥ 9.2:1 in both themes on any surface. The accent fill on the lifted track is 2.8–5.1:1, a graphic that is never the only signal: the number is always printed.",
    focus: "Not focusable.",
    targetSize: "not interactive",
    screenReader:
      "The visible label and number are read as text, then the meter is announced with its name and value (\"Vocabulario, 7\"). The suffix is not part of the value, so \"/10\" is heard only in the printed text.",
  },
  content: {
    voice: [
      "The label names the dimension, a noun in sentence case, no period: \"Vocabulario\", \"Estructura\", \"General\".",
      "A label may carry its own count, formatted by the caller: \"1240 XP en total\" with suffix \"\".",
      "Never a verdict in the label (\"Mal vocabulario\"): the number says how it went; the words around the meter say what to do next.",
    ],
    limits: ["Label: 1–4 words, ≤ 28 characters, so it stays on one line beside the number at 280px.", "Number and suffix: ≤ 6 characters (\"100%\", \"10/10\")."],
    examples: ["Vocabulario", "Estructura", "General", "{xp} XP en total"],
  },
  usage: {
    when: [
      "A score on a fixed scale in a report: vocabulary and structure out of ten in the feedback detail.",
      "How far into a level someone is: XP into the next level on the progress screen.",
      "A proportion with a known top, printed as a number, where the bar helps comparing a few side by side.",
    ],
    whenNot: [
      { situation: "Something loading or being evaluated, with no real total", instead: "A sentence that names what is happening (\"Evaluando…\")." },
      { situation: "A status in words, not a quantity", instead: "Badge." },
      { situation: "The one headline score of a report", instead: "The number itself in display type; a Meter is for the supporting scores beside it." },
      { situation: "A choice between options", instead: "Segmented." },
    ],
    do: [
      "Pass the suffix that matches the scale: \"/10\" with max 10, \"\" for XP.",
      "Put related meters in one grid or column so the bars compare.",
      "Say in words, near the meters, what the scores mean for the next step.",
    ],
    dont: [
      "Don't use a Meter as a loading bar.",
      "Don't recolour the fill to mark a low score: nothing in this product marks a person wrong.",
      "Don't show a meter without its number by hiding it with className.",
    ],
  },
  tokens: ["--surface-lift", "--accent", "--cream", "--cream-bright", "ease-cinematic"],
  related: [
    { name: "Badge", difference: "States a status in words; Meter shows a quantity on a scale." },
  ],
  i18n: {
    rtl: "The row follows the document direction: the label starts on the right and the number sits at the left end. The fill grows from the start of the line (origin-right under dir=\"rtl\"). Numbers are not mirrored.",
    textExpansion:
      "The label wraps under its own width while the number keeps its place at the end (shrink-0); German and Portuguese labels (\"Wortschatz\", \"Vocabulário\") fit on one line at 280px.",
    formatting:
      "The component prints value with no locale formatting. A caller showing large or decimal numbers formats them first (Intl.NumberFormat) and builds the label; the suffix is passed as written.",
    strings: [],
  },
  responsive: {
    behaviour: [
      "Fills its container's width; the bar stretches, the type does not change size.",
      "Side by side on wide screens (grid sm:grid-cols-2), stacked on phones: the caller's grid decides.",
    ],
    minWidth: "160px",
  },
  designTool: {
    registryItem: "meter",
    importStatement: 'import { Meter } from "@mockio/design-system";',
    canvasProps: ["label", "value", "max", "suffix"],
    placement: "Inside a Panel, in a column (flex-col gap-4) or a grid (sm:grid-cols-2 gap-4) of related scores. Needs at least 160px of width.",
  },
  appCounterpart: {
    file: "design-system/primitives.tsx",
    exportName: "Meter",
    differences: [
      "Accepts className and native div attributes (id, lang, data-*) on the wrapper; the app's copy takes value, max, label and suffix only.",
      "The label/number row has gap-3, the label min-w-0 and the number shrink-0, so a long label wraps instead of touching or pushing the number at phone width.",
      "A max of 0 or less draws an empty bar; the app's copy divides by zero and the invalid transform leaves the bar full.",
      "The fill grows from the right under dir=\"rtl\" (rtl:origin-right); the app's copy always fills from the left.",
    ],
  },
  version: "1.0.0",
  changelog: [{ version: "1.0.0", changes: ["First documented version, extracted from the product."] }],
});
