import { defineContract } from "../../contract";

export const MeterContract = defineContract({
  name: "Meter",
  level: "molecule",
  status: "stable",
  summary: "A measured score: what is being measured, the number, and the bar that fills to it. The number is always there.",
  source: "src/components/Meter/Meter.tsx",
  composes: [],
  dependencies: [],
  props: {
    value: {
      type: "number",
      required: true,
      description: "The figure as it is measured: 72, 3, 12.5. It is shown as it is, not rounded.",
    },
    max: {
      type: "number",
      required: false,
      default: "100",
      description:
        "The top of the scale. The bar fills value/max, clamped to 0–100%. Set it to the real maximum: 20 for a score out of 20, 8 for eight steps.",
    },
    label: {
      type: "string",
      required: true,
      description:
        "What is being measured, in the person's words: \"Claridad\", \"Vocabulario\", \"Estructura\". It is the accessible name of the bar.",
    },
    suffix: {
      type: "string",
      required: false,
      default: '"%"',
      description:
        "The unit after the number. Empty for a count, \"%\" for a percentage, \"s\" for seconds. It is written next to the figure, so it must be short.",
    },
  },
  slots: [],
  states: [
    {
      name: "default",
      description:
        "The name at the left in cream-dim at 14px, the figure at the right in cream-bright at 16px, semibold, with tabular figures; the bar 6px tall below them, in the accent over a lifted surface.",
      trigger: "Initial render.",
    },
    {
      name: "empty",
      description: "The bar at zero: the track is there, the accent is not. The figure still shows the real value, so a zero never reads as \"missing\".",
      trigger: "value={0}.",
    },
  ],
  events: [],
  motion: [
    "The bar grows: scaleX from its left edge over 700ms with the cinematic ease, so a score that arrives late still moves in the direction it came from.",
    "Reduced motion: the bar is at its final length at once; the figure changes as it changes.",
  ],
  accessibility: {
    role: 'A <div role="meter">: a scalar value inside a known range.',
    keyboard: [],
    aria: [
      {
        attribute: "aria-valuenow / aria-valuemin / aria-valuemax",
        managedBy: "component",
        note: "The figure, the bottom of the scale and the top. max is the value passed to the component, so the range a screen reader reads is the range the bar draws.",
      },
      {
        attribute: "aria-label",
        managedBy: "component",
        note: "The same text as the visible name, so the bar and the figure are not read as two different things.",
      },
    ],
    reducedMotion:
      "The bar's growth is instant under prefers-reduced-motion: reduce; the figure changes as it changes.",
    contrast:
      "The name is cream-dim, 13:1 on the surface in the dark theme and 9.9:1 in the light one; the figure is cream-bright, above 17:1 in both.",
    focus: "Not focusable itself. It reports a value; it does not take one.",
    targetSize: "not interactive",
    screenReader:
      "Announced as a meter with its name and its value: \"Claridad, 72\". The bar itself adds nothing: the figure is the reading.",
  },
  content: {
    voice: [
      "The name says what is measured, in the person's words: \"Claridad\", \"Vocabulario\", \"Estructura\". Not \"Métrica\" or \"Score\".",
      "The figure speaks for itself; the component adds no words of its own.",
      "Sentence case, no period, no exclamation marks.",
    ],
    limits: [
      "Label: 1–3 words, ≤ 24 characters, so it sits on one line beside the figure.",
      "Suffix: 1–2 characters. It is written right next to the figure, so \"puntos\" belongs in the label, not in the suffix.",
    ],
    examples: ["Claridad", "Vocabulario", "Estructura", "100%", "3 de 7"],
  },
  usage: {
    when: [
      "A score the person earned and can see: clarity, turns, answers practised.",
      "Anything measured against a maximum, where the bar and the number say the same thing.",
    ],
    whenNot: [
      {
        situation: "A step in a process that advances in time",
        instead: "a Badge with the count: \"Turno 3 de 7\" says where you are; a bar would imply a score.",
      },
      {
        situation: "A value with no maximum",
        instead: "the number alone, in the body of the screen.",
      },
      {
        situation: "Something that loads",
        instead: "a progress indicator in the place that waits, not a meter: this one reports a result, not a state of the machine.",
      },
    ],
    do: [
      "Set max to the real maximum, so the bar and the number agree.",
      "Keep the number: the bar alone is unreadable for a screen reader and useless in print.",
    ],
    dont: [
      "Don't leave max at 100 when the scale ends somewhere else; the bar would lie.",
      "Don't use the bar to hide a number the person needs to act on.",
    ],
  },
  tokens: ["--cream-bright", "--cream-dim", "--surface-lift", "--accent", "ease-cinematic"],
  related: [
    { name: "Badge", difference: "States a fact in words; a Meter measures one." },
    { name: "Notice", difference: "Says what happened; a Meter says how much." },
  ],
  i18n: {
    rtl: "The name stays at the start of the row and the figure at the end, in the document's direction.",
    textExpansion:
      "A German or Portuguese name runs about 30% longer: it wraps under the figure rather than pushing it out of the row.",
    formatting:
      "The figure is printed as a number with the suffix next to it, without a thousands separator: a score of 1200 reads \"1200\", not \"1,200\".",
    strings: [],
  },
  responsive: {
    behaviour: [
      "Phones: the name and the figure share a row; the bar spans the width of the field.",
      "From sm up: the same row, wider. The bar never changes its height.",
    ],
    minWidth: "320px",
  },
  designTool: {
    registryItem: "meter",
    importStatement: 'import { Meter } from "@mockio/design-system";',
    canvasProps: ["label", "value", "max", "suffix"],
    placement:
      "In the body of a screen, under the thing it measures: the feedback of an interview, the progress of a thesis.",
  },
  appCounterpart: {
    file: "design-system/primitives.tsx",
    exportName: "Meter",
    differences: ["None: the app's copy is this component, prop for prop."],
  },
  version: "1.0.2",
  changelog: [
    {
      version: "1.0.2",
      changes: ["The examples are the product's own meters now: \"Vocabulario\" and \"Estructura\", the labels the app's report shows. — nothing changes for a screen."],
    },
    { version: "1.0.1", changes: ["Nothing changes for a screen: the alternatives are named in plain words now — a Badge with the count, the number alone, a progress indicator — because the system has no component for them."] },
    { version: "1.0.0", changes: ["First documented version, taken from the product's own copy of the component."] },
  ],
});
