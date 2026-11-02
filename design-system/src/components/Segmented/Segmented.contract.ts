import { defineContract } from "../../contract";

export const SegmentedContract = defineContract({
  name: "Segmented",
  level: "molecule",
  status: "stable",
  summary: "A pill of two to five options where exactly one is chosen, with a thumb that slides to the choice. A radio group to assistive technology.",
  source: "src/components/Segmented/Segmented.tsx",
  composes: [],
  dependencies: [],
  props: {
    options: {
      type: "readonly { value: T; label: ReactNode }[]",
      required: true,
      description: "The choices, in reading order: two to five, each with a unique value. Every option gets an equal share of the track, so the widest label sets the width of all of them.",
    },
    value: {
      type: "T",
      required: true,
      description: "The chosen option's value. Controlled: the thumb sits under it and moves when it changes. A value that matches no option leaves nothing checked and hides the thumb.",
    },
    onChange: {
      type: "(value: T) => void",
      required: true,
      description: "Receives the new value when the person picks a different option — by pointer, arrows, Home or End. Store it and pass it back as value.",
    },
    label: {
      type: "string",
      required: true,
      description: "The group's accessible name (aria-label), usually the visible heading or field label beside it: \"Tema\", \"Tiempo de exposición\". Not rendered.",
    },
    className: {
      type: "string",
      required: false,
      default: '""',
      description: "Extra classes, appended to the track. For layout (self-start, w-full, margin) — not for recolouring the track or the thumb.",
    },
  },
  slots: [
    { name: "options[].label", description: "Each option's label: text of one to three words. An icon before the words is allowed only with aria-hidden; the words name the option." },
  ],
  states: [
    { name: "default", description: "The lifted-surface pill; unselected labels in cream-dim, semibold.", trigger: "Initial render." },
    { name: "hover", description: "An unselected label brightens to full cream. Only on devices that can hover.", trigger: "Pointer over an unselected option (hover: hover)." },
    { name: "focus-visible", description: "The 2px accent focus-ring around the focused option, offset in the page colour.", trigger: "Keyboard focus (Tab into the group, or an arrow key)." },
    { name: "selected", description: "The surface-card thumb sits under the option and its label turns cream-bright; aria-checked is true.", trigger: "value equals that option's value." },
  ],
  events: [
    {
      name: "onChange",
      signature: "(value: T) => void",
      firesWhen: "The person picks an option other than the current one: click or tap, an arrow key, Home or End. Never for the option already chosen, and never on render.",
    },
  ],
  motion: [
    "Thumb: slides to the chosen option with transform (translateX) only, 200ms on the press ease-out (cubic-bezier(0.23, 1, 0.32, 1)). Nothing is measured and nothing reflows: slots are equal widths, so the thumb moves by whole slots.",
    "Labels: colour crossfades in 200ms on the same curve as the thumb arrives.",
    "Reduced motion: the slide is behind motion-safe:, so the thumb appears under the new option at once; the label colour change still runs, so the choice is still acknowledged.",
    "First paint: the thumb is already in place (it is positioned in CSS, not after a measurement), so there is no jump on load.",
  ],
  accessibility: {
    role: "radiogroup, with one radio (native <button role=\"radio\">) per option",
    keyboard: [
      { key: "Tab", effect: "Moves focus into the group, onto the chosen option (the only one in the tab order), and out again on the next Tab." },
      { key: "ArrowRight / ArrowDown", effect: "Moves focus to the next option and chooses it; wraps from the last to the first. In right-to-left documents ArrowRight goes to the previous option instead." },
      { key: "ArrowLeft / ArrowUp", effect: "Moves focus to the previous option and chooses it; wraps from the first to the last. In right-to-left documents ArrowLeft goes to the next option instead." },
      { key: "Home / End", effect: "Moves focus to the first / last option and chooses it." },
      { key: "Space / Enter", effect: "On the focused option, which is already chosen: nothing changes." },
    ],
    aria: [
      { attribute: "aria-label", managedBy: "component", note: "Set from the required label prop, so the group is always named." },
      { attribute: "aria-checked", managedBy: "component", note: "true on the chosen option, false on the others." },
      { attribute: "tabindex (roving)", managedBy: "component", note: "0 on the chosen option (or the first, when nothing matches value), -1 on the rest." },
      { attribute: "aria-hidden (thumb)", managedBy: "component", note: "The sliding thumb is decoration; aria-checked carries the state." },
    ],
    reducedMotion: "The thumb's slide only runs under prefers-reduced-motion: no-preference (motion-safe:); otherwise it moves instantly. No provider is needed and a change of the setting applies at once.",
    contrast:
      "Labels: cream-dim (cream at 0.85) on surface-lift and cream-bright on surface-card both clear 4.5:1 in both themes. The thumb is not the only signal of the choice: the label also turns cream-bright, and aria-checked states it.",
    focus: "focus-ring on the focused option: 2px accent ring, 2px offset in surface-base, keyboard focus only. One tab stop for the whole group; arrows move within it.",
    targetSize: "Each option is the track's full 44px height (min-h-11) and at least 48px wide (min-w-12); the 4px inset is drawn by the thumb, not taken from the target.",
    screenReader: "Announced as a radio group with the label, then each option as \"radio button, checked / not checked, n of m\". The thumb is not announced.",
  },
  content: {
    voice: [
      "Option labels are nouns or short values, not actions: \"Oscuro\", \"Con informe\", \"20 min\". A verb in a label means it wanted to be an Action.",
      "Sentence case, no final period, no exclamation marks.",
      "Parallel wording across the options, so they read as one set: \"Hoja de defensa\" / \"Tarjetas\".",
      "Numbers as digits, formatted by the caller: \"15 min\".",
    ],
    limits: [
      "2–5 options.",
      "Each label 1–3 words, ≤ 20 characters; every slot is as wide as the longest, so one long label widens them all.",
      "The group label: the field's name in 1–4 words (\"Tema\", \"Tiempo de exposición\").",
    ],
    examples: ["Sistema · Oscuro · Claro", "Todas · Con informe", "15 min · 20 min · 30 min", "Hoja de defensa · Tarjetas"],
  },
  usage: {
    when: [
      "Choosing one of two to five mutually exclusive options whose effect is immediate: the theme, a filter on a list, the length of the exposition.",
      "Switching between two or three views of the same content in place, such as the study sheet and the cards.",
    ],
    whenNot: [
      { situation: "Six or more options, or options that need a sentence each", instead: "A radio list (stacked radios with descriptions) or a select." },
      { situation: "Moving between sections of a page that each have their own panel and heading", instead: "A tablist (role=\"tab\" + tabpanel), as the settings screen does." },
      { situation: "Running an action — copy, download, send", instead: "Action, one per action." },
      { situation: "A single setting that is on or off", instead: "A checkbox." },
      { situation: "Showing a status the person is not changing", instead: "Badge." },
    ],
    do: [
      "Keep the labels short and parallel so the slots stay narrow.",
      "Pass a label that matches the visible field name next to it.",
      "Apply the choice at once; a Segmented never needs a Save.",
    ],
    dont: [
      "Don't put actions in it: each option is a value, not a command.",
      "Don't use it for more than five options or for long labels — it gets wider than a phone.",
      "Don't recolour the thumb to mark one option as right or recommended.",
    ],
  },
  tokens: ["--surface-lift", "--surface-lift-alpha", "--surface-card", "--cream", "--cream-bright", "--accent", "--surface-base", "ease-press", "focus-ring"],
  related: [
    { name: "Action", difference: "Does something when pressed; Segmented holds which of a few values is chosen." },
    { name: "Badge", difference: "States a status the person is not changing; Segmented is the control that changes it." },
  ],
  i18n: {
    rtl: "The options follow the document order, so the first sits on the right in Arabic and Hebrew; the thumb slides the mirrored way (the rail starts at the inline start and its translate flips with dir=\"rtl\"), and ArrowLeft / ArrowRight swap so the arrow you press is the way the thumb moves. ArrowUp / ArrowDown, Home and End are not mirrored. Digits in labels are not mirrored.",
    textExpansion:
      "Slots are equal and grow with the longest label; a label that does not fit the container wraps inside its slot (balanced, centred) and every slot grows taller together. Portuguese and German run 30–40% longer (\"Folha de defesa\", \"Tempo de apresentação\"); a label that wraps is the sign to shorten it.",
    formatting: "None inside the component: labels such as \"15 min\" arrive formatted by the caller.",
    strings: [],
  },
  responsive: {
    behaviour: [
      "Inline: as wide as its options need, never wider than its container (max-w-full).",
      "Pass w-full through className to make it fill a phone's column; the slots stay equal.",
      "On a 320px phone up to three short options sit on one line; four or five wrap their labels inside the slots.",
    ],
    minWidth: "240px",
  },
  designTool: {
    registryItem: "segmented",
    importStatement: 'import { Segmented } from "@mockio/design-system";',
    canvasProps: ["options", "value", "label"],
    placement: "Under or beside the field label it answers, in a settings panel, a form or a list's header. Usually self-start inside a flex column so it does not stretch.",
  },
  appCounterpart: {
    file: "design-system/segmented.tsx",
    exportName: "Segmented",
    differences: [
      "Does not use React Bits' RubberSegment: its licence forbids redistribution, and the registry hands this package's files to other tools. This is an original implementation with the same props and the same track, thumb and label colours.",
      "The thumb slides by transform only, with no rubber stretch and no drag to change the option; the app's copy stretches the thumb as it travels and can be dragged.",
      "Options are equal widths (the widest label sets them all), so the slide needs no measurement; the app's copy sizes each option to its label and measures them.",
      "Each option is the track's full 44px height, so the hit target is 44px; in the app's copy (size lg) the option is 36px inside the 4px inset.",
      "Long labels wrap inside their slot instead of staying on one line, so it never overflows a phone.",
      "The focus ring is the system's focus-ring class (accent ring); the app's copy draws an outline in the thumb colour.",
    ],
  },
  version: "1.0.0",
  changelog: [{ version: "1.0.0", changes: ["First documented version: an original implementation with the product's props and look, without React Bits."] }],
});
