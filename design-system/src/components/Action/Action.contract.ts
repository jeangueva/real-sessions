import { defineContract } from "../../contract";

export const ActionContract = defineContract({
  name: "Action",
  level: "atom",
  status: "stable",
  summary: "The button. One primary per view, in the accent; everything else steps down in tone.",
  source: "src/components/Action/Action.tsx",
  composes: [],
  dependencies: ["lucide-react"],
  props: {
    children: {
      type: "ReactNode",
      required: true,
      description: "The label. Starts with a verb and says what happens, not what the button is.",
    },
    tone: {
      type: '"solid" | "neutral" | "glass" | "ghost"',
      required: false,
      default: '"solid"',
      description: "How loud the button is. Picks the fill, the ink and the press depth.",
      values: {
        solid: "The one primary action of the view. Accent fill, white ink, a darker edge it sinks into on press.",
        neutral: "A confident secondary next to a primary, or the primary on a surface that is already accent-heavy.",
        glass: "Over video or imagery, where a solid fill would cover the picture. Translucent, blurred.",
        ghost: "Tertiary actions: cancel, skip, a quiet secondary in a toolbar.",
      },
    },
    withArrow: {
      type: "boolean",
      required: false,
      default: "false",
      description: "Adds a trailing arrow that nudges forward on hover. Only for the main path forward; it mirrors in right-to-left documents.",
    },
    type: {
      type: '"button" | "submit" | "reset"',
      required: false,
      default: '"button"',
      description: "The native button type. Defaults to button so an Action inside a form never submits by accident; pass submit on the form's own button.",
    },
    disabled: {
      type: "boolean",
      required: false,
      default: "false",
      description: "Greys the button and removes it from pointer events. Prefer explaining why next to it over a silent disabled state.",
    },
    className: {
      type: "string",
      required: false,
      default: '""',
      description: "Extra classes, appended. For layout (width, margin) — not for restyling the tone.",
    },
    onClick: {
      type: "(event: MouseEvent<HTMLButtonElement>) => void",
      required: false,
      description: "Native click handler. Fires on pointer click, Enter and Space.",
    },
  },
  slots: [{ name: "children", description: "Text, optionally preceded by a 16px lucide icon with aria-hidden." }],
  states: [
    { name: "default", description: "Resting fill for the tone.", trigger: "Initial render." },
    { name: "hover", description: "solid brightens 10%; neutral dims to 90%; ghost and glass take the lifted surface. Only on devices that can hover.", trigger: "Pointer over the button (hover: hover)." },
    { name: "pressed", description: "solid, neutral and glass translate down by their edge height (4px / 3px) and lose the edge; answers in 75ms.", trigger: ":active — pointer down, or Space held." },
    { name: "focus-visible", description: "2px accent ring with a 2px offset in the page colour.", trigger: "Keyboard focus." },
    { name: "disabled", description: "solid becomes the neutral lifted grey with faint ink and no edge; other tones drop to 40% opacity. No pointer events.", trigger: "disabled={true}" },
  ],
  events: [
    { name: "onClick", signature: "(event: MouseEvent<HTMLButtonElement>) => void", firesWhen: "Click, Enter or Space — never while disabled." },
  ],
  motion: [
    "Press: transform and shadow in 75ms with the press ease-out (cubic-bezier(0.23, 1, 0.32, 1)); release in 150ms.",
    "Arrow: translates 2px toward where it points on hover, 200ms.",
    "Reduced motion: the press translate is instant; colour and opacity changes still run.",
  ],
  accessibility: {
    role: "button (native <button>)",
    keyboard: [
      { key: "Tab", effect: "Moves focus to the button; the focus ring appears." },
      { key: "Enter", effect: "Activates (fires onClick)." },
      { key: "Space", effect: "Activates on release; shows the pressed state while held." },
    ],
    aria: [
      { attribute: "aria-label", managedBy: "consumer", note: "Required only when the label is an icon alone. A visible text label is always preferred." },
      { attribute: "aria-hidden (arrow)", managedBy: "component", note: "The trailing arrow is decorative and hidden from assistive technology." },
      { attribute: "aria-disabled", managedBy: "consumer", note: "Use aria-disabled instead of disabled when the button must stay focusable to explain why it is unavailable." },
    ],
    reducedMotion: "Transforms are instant under prefers-reduced-motion: reduce (the system's global rule); the colour change on press remains so the press is still acknowledged.",
    contrast: "solid: accent-ink on accent ≥ 5:1 in both themes. neutral: surface-base on cream-bright ≥ 15:1. ghost: cream-dim on surface ≥ 4.5:1 (cream at 0.85).",
    focus: "focus-ring: 2px accent ring, 2px offset in surface-base. Visible only for keyboard focus (focus-visible).",
    targetSize: "≥ 40px tall at the default padding (py-2.5 + 16px line); add w-full on phones for primary actions.",
    screenReader: "Announced as its text label and the role button. The arrow is not announced.",
  },
  content: {
    voice: [
      "Start with a verb, in the imperative, tú form in Spanish: \"Ensayar\", \"Sube tu tesis\", \"Ver mi acta\".",
      "Sentence case. No final period. No exclamation marks.",
      "Say the outcome, not the mechanism: \"Ver mi informe\" rather than \"Enviar\".",
      "Free things say so in the label when price is the obstacle: \"Sube tu tesis gratis\".",
    ],
    limits: ["1–4 words; ≤ 28 characters so it stays on one line at 320px."],
    examples: ["Sube tu tesis gratis", "Ensayar", "Terminar y ver informe", "Copiar enlace", "Invitar a tu compañero"],
  },
  usage: {
    when: [
      "Any action the user takes on purpose: start, save, send, confirm, open a flow.",
      "The single most important next step of a screen (tone solid, often withArrow).",
    ],
    whenNot: [
      { situation: "Navigating to another page as plain navigation", instead: "A link (<a> / router Link) styled as a link; wrap an Action in a Link only when the destination is a step forward." },
      { situation: "Choosing one option among several", instead: "Segmented (2–5 options) or a radio group." },
      { situation: "A destructive action with no undo", instead: "HoldButton, so a stray tap does nothing." },
      { situation: "Toggling a setting on and off", instead: "Checkbox." },
    ],
    do: [
      "One solid Action per view; demote the rest to neutral or ghost.",
      "Put the primary on the right of a pair on desktop and first in the stack on mobile.",
      "Explain a disabled Action in text next to it.",
    ],
    dont: [
      "Don't put two solid Actions side by side — the user has to read both to know which matters.",
      "Don't restyle the tone with className colours; add a tone to the contract instead.",
      "Don't use withArrow on secondary or destructive actions.",
    ],
  },
  tokens: ["--accent", "--accent-ink", "--accent-depth", "--cream-bright", "--surface-base", "--surface-lift", "--line", "--line-strong", "ease-press"],
  related: [
    { name: "HoldButton", difference: "For irreversible actions: must be held, not tapped." },
    { name: "Checkbox", difference: "Turns a setting on or off; Action does something once." },
    { name: "Segmented", difference: "Chooses a value; Action performs an action." },
  ],
  i18n: {
    rtl: "The trailing arrow mirrors (rtl:-scale-x-100) and its hover nudge reverses; the label aligns by the document direction.",
    textExpansion: "The pill grows with its label and wraps only inside a w-full container; keep labels short enough to stay on one line in Portuguese and German.",
    formatting: "None: the label is the caller's text.",
    strings: [],
  },
  responsive: {
    behaviour: [
      "Same size at every width; on phones the primary action usually takes w-full via className.",
      "Pairs stack vertically below 360px, primary first.",
    ],
    minWidth: "120px",
  },
  designTool: {
    registryItem: "action",
    importStatement: 'import { Action } from "@mockio/design-system";',
    canvasProps: ["children", "tone", "withArrow", "disabled"],
    placement: "Anywhere an action is taken: forms, cards, toolbars, page headers. Never more than one solid per view.",
  },
  appCounterpart: {
    file: "design-system/primitives.tsx",
    exportName: "Action",
    differences: ["Defaults type to \"button\" so it never submits a form by accident; the app's copy relies on the native default (submit)."],
  },
  version: "1.0.0",
  changelog: [{ version: "1.0.0", changes: ["First documented version, extracted from the product."] }],
});
