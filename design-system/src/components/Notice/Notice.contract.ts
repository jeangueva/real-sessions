import { defineContract } from "../../contract";

export const NoticeContract = defineContract({
  name: "Notice",
  level: "molecule",
  status: "stable",
  summary: "A message about the state of something: saved, done, or not possible. The words carry the meaning; the icon is decoration.",
  source: "src/components/Notice/Notice.tsx",
  composes: [],
  dependencies: ["lucide-react"],
  props: {
    children: {
      type: "ReactNode",
      required: true,
      description:
        "What the notice says. One or two sentences: what happened and, when there is one, what to do about it.",
    },
    tone: {
      type: '"error" | "success" | "info"',
      required: false,
      default: '"info"',
      description: "How loud the message is, and how it is announced.",
      values: {
        error: "Something could not be done. Assertive: it interrupts whatever the screen was saying.",
        success: "Something was done. Quietly: it waits its turn among the other polite messages.",
        info: "A fact about the state of the screen: saved, pending, nothing to do.",
      },
    },
    className: {
      type: "string",
      required: false,
      default: '""',
      description: "Extra classes, appended. For layout — the notice's place in a stack — not for recolouring it.",
    },
  },
  slots: [
    {
      name: "children",
      description: "The message. Text only: a sentence, not a heading and not a list.",
    },
  ],
  states: [
    {
      name: "default",
      description:
        "The message in cream-bright at 14px on the lifted surface, with the information icon in cream-dim before it. Announced politely, as a status.",
      trigger: "Initial render, with tone=\"info\".",
    },
    {
      name: "error",
      description:
        "The same box in the amber of the step palette, with the alert icon. Announced assertively, as an alert, so it is read straight away.",
      trigger: "tone=\"error\".",
    },
    {
      name: "success",
      description:
        "The same box in the green of the grow palette, with the check icon. Announced politely, as a status.",
      trigger: "tone=\"success\".",
    },
  ],
  events: [],
  motion: ["None. The notice does not move; it appears where it is."],
  accessibility: {
    role: 'A <p role="status"> for info and success; a <p role="alert"> for error.',
    keyboard: [],
    aria: [
      {
        attribute: "role",
        managedBy: "component",
        note: "error is an alert and interrupts; info and success are statuses and wait their turn.",
      },
      {
        attribute: "aria-hidden (icon)",
        managedBy: "component",
        note: "The icon is decorative. The words alone say what happened.",
      },
    ],
    reducedMotion: "Nothing moves, so nothing changes.",
    contrast:
      "The message is cream-bright on its own background in every tone; the icon takes the tone's own colour, which is at least 4.5:1 on that background in both themes.",
    focus: "Not focusable itself. It is read when it appears.",
    targetSize: "not interactive",
    screenReader:
      "A status is announced when it appears without interrupting; an alert interrupts. Either way the message is read once, in full — the icon adds nothing.",
  },
  content: {
    voice: [
      "Say what happened and what to do next: \"Guardamos tu avance.\" \"No pudimos subir el archivo: pesa más de 300 MB.\"",
      "Never blame the person. The product does not mark anyone wrong: the error names what failed, not who.",
      "Tú form, sentence case, no exclamation marks. One or two sentences.",
    ],
    limits: [
      "Message: one sentence, about 80 characters at 320px; two at most.",
      "The message states the whole thing: a notice that needs a paragraph belongs in the body of the screen.",
    ],
    examples: ["Guardamos tu avance.", "No pudimos subir el archivo: pesa más de 300 MB.", "Listo: tu tesis ya está en revisión."],
  },
  usage: {
    when: [
      "After something the person asked for succeeds: saved, sent, uploaded.",
      "When something could not be done and the person has to know before they go on.",
      "A fact about the state of the screen that is worth a line of its own.",
    ],
    whenNot: [
      {
        situation: "A field that is not valid",
        instead: "the field's own hint, next to the control that has to change.",
      },
      {
        situation: "A message the screen can say by itself",
        instead: "the copy on the screen: an empty state that says where the page leads.",
      },
      {
        situation: "A confirmation the person did not ask for",
        instead: "nothing — a success notice for something nobody wanted to know about is noise.",
      },
    ],
    do: [
      "Use error only when the person has to act on it now.",
      "Put the outcome in the message, not in the icon.",
    ],
    dont: [
      "Don't stack two notices in the same screen; the second one dilutes the first.",
      "Don't use a notice to explain what the screen is for.",
    ],
  },
  tokens: ["--cream-bright", "--cream-dim", "--surface-lift", "--step-soft", "--step-text", "--grow-soft", "--grow-text"],
  related: [
    { name: "Badge", difference: "A standing fact about the screen; a Notice says what happened." },
    { name: "Meter", difference: "Measures a score; a Notice reports an event." },
  ],
  i18n: {
    rtl: "The icon stays at the start of the line, in the document's direction; the message follows it.",
    textExpansion:
      "A German or Portuguese message runs about 30% longer: the box grows to two lines and the icon stays at the top.",
    formatting: "None: the message comes from the caller, already translated.",
    strings: [],
  },
  responsive: {
    behaviour: [
      "Phones: the message wraps inside the box, and the icon stays at the top of the first line.",
      "From sm up: the same box, wider. The padding does not change.",
    ],
    minWidth: "320px",
  },
  designTool: {
    registryItem: "notice",
    importStatement: 'import { Notice } from "@mockio/design-system";',
    canvasProps: ["tone"],
    placement:
      "Inside a PageBody, above or below the thing it is about. Never inside a form field: that is the field's hint.",
  },
  appCounterpart: {
    file: "design-system/primitives.tsx",
    exportName: "Notice",
    differences: ["None: the app's copy is this component, prop for prop."],
  },
  version: "1.0.1",
  changelog: [
    { version: "1.0.1", changes: ["Nothing changes for a screen: the alternatives are named in plain words now — the field's own hint, the copy on the screen, nothing at all."] },
    { version: "1.0.0", changes: ["First documented version, taken from the product's own copy of the component."] },
  ],
});
