import { defineContract } from "../../contract";

export const FieldContract = defineContract({
  name: "Field",
  level: "molecule",
  status: "stable",
  summary: "A labelled form control: the name above it, the control, a hint below. The spacing of the three is the same in every form in the product.",
  source: "src/components/Field/Field.tsx",
  composes: [],
  dependencies: [],
  props: {
    label: {
      type: "string",
      required: true,
      description:
        "The name of the control, in sentence case: \"Tu nombre\", \"Correo\". It names the control; it never describes it.",
    },
    children: {
      type: "ReactNode",
      required: true,
      description:
        "The control itself: an input, a select, a textarea. The component wraps whatever it is given and never renders a control of its own.",
    },
    hint: {
      type: "string",
      required: false,
      description:
        "One line under the control saying what it wants: \"Se usa para precargar las sesiones nuevas.\" Omitted, nothing renders.",
    },
    htmlFor: {
      type: "string",
      required: false,
      description:
        "The id of the control the label names. Leave it out when the control sits inside the label; pass it when the control is somewhere else in the tree.",
    },
    className: {
      type: "string",
      required: false,
      default: '""',
      description:
        "Extra classes, appended. For layout — a field that spans more than its cell in a grid — not for restyling the label.",
    },
  },
  slots: [
    {
      name: "children",
      description:
        "One control, with its own id and its own value. The Field brings the label and the spacing, not the control.",
    },
  ],
  states: [
    {
      name: "default",
      description:
        "The label above the control in cream at 14px, medium weight; the hint under it in cream-faint at 14px; 8px between the three.",
      trigger: "Initial render.",
    },
  ],
  events: [],
  motion: ["None. The field does not move; the control inside it does whatever it does."],
  accessibility: {
    role: "A generic <div> wrapping a <label>, the control and an optional <p>.",
    keyboard: [],
    aria: [
      {
        attribute: "label (htmlFor)",
        managedBy: "consumer",
        note: "The label names the control when htmlFor points at the control's id. Without it, the control has to sit inside the label.",
      },
      {
        attribute: "aria-describedby",
        managedBy: "consumer",
        note: "The hint is a plain paragraph and is not wired to the control. When the hint is needed by a screen reader, point aria-describedby at its id.",
      },
    ],
    reducedMotion: "Nothing moves, so nothing changes.",
    contrast:
      "The label is cream on the surface it sits on, at least 13:1 in both themes; the hint is cream-faint, the lowest step the palette allows, 4.5:1 or more.",
    focus: "Not focusable itself. The control inside takes the focus ring (focus-ring): 2px accent with a 2px offset.",
    targetSize: "not interactive (the control inside brings its own target)",
    screenReader:
      "The label is read as the control's name when htmlFor points at it. The hint is read in the flow of the page, after the control, unless the control names it with aria-describedby.",
  },
  content: {
    voice: [
      "The label names the control in the person's own words: \"Tu nombre\", \"Correo\", \"Rol por defecto\". Never \"Campo\" or \"Input\".",
      "The hint says what the control wants, not what it is: \"Se usa para precargar las sesiones nuevas.\"",
      "Tú form, sentence case, no final period, no exclamation marks.",
    ],
    limits: [
      "Label: 1–4 words, ≤ 30 characters, so it stays on one line above the control.",
      "Hint: one line at 320px, about 60 characters. Anything longer belongs in the body of the screen.",
    ],
    examples: ["Tu nombre", "Correo", "Rol por defecto", "Se usa para precargar las sesiones nuevas."],
  },
  usage: {
    when: [
      "Every form control in the product that has a name: the name above, the control, the spacing.",
      "A control with a hint: what it wants goes under it, where the eye already is.",
    ],
    whenNot: [
      {
        situation: "A control that needs no name",
        instead: "the bare control, with its own placeholder or aria-label.",
      },
      {
        situation: "A choice between two or three options",
        instead: "a radio group with its own labels.",
      },
      {
        situation: "A question the person has to answer in their own words",
        instead: "a Notice above the form, not a hint under one field.",
      },
    ],
    do: [
      "Give the control an id and pass it as htmlFor, so the label names it.",
      "Keep the same order everywhere: label, control, hint.",
    ],
    dont: [
      "Don't use the hint for instructions about the form as a whole.",
      "Don't restyle the label with className; the label's voice belongs to the system.",
    ],
  },
  tokens: ["--cream", "--cream-faint"],
  related: [
    { name: "Notice", difference: "Says something about the state of the screen; a Field names a control." },
    { name: "Panel", difference: "The block a form can sit in." },
  ],
  i18n: {
    rtl: "The label, the control and the hint stack in the document's direction; the label stays above the control.",
    textExpansion:
      "A German or Portuguese label runs about 30% longer: it wraps to two lines and the control moves down with it. The spacing between the three does not change.",
    formatting: "None: the label and the hint come from the caller, already translated.",
    strings: [],
  },
  responsive: {
    behaviour: [
      "Phones: the label, the control and the hint stack in a single column; a field that spans more than its cell in a grid keeps spanning it.",
      "From sm up: the same stack. A field's width is the caller's, through className.",
    ],
    minWidth: "320px",
  },
  designTool: {
    registryItem: "field",
    importStatement: 'import { Field } from "@mockio/design-system";',
    canvasProps: ["label", "hint", "htmlFor"],
    placement:
      "Inside a form or a Panel, once per control. Never around a group of controls: that is a fieldset.",
  },
  appCounterpart: {
    file: "design-system/primitives.tsx",
    exportName: "Field",
    differences: ["None: the app's copy is this component, prop for prop."],
  },
  version: "1.0.2",
  changelog: [
    {
      version: "1.0.2",
      changes: ["The examples are the product's own labels and hints now: \"Rol por defecto\" and \"Se usa para precargar las sesiones nuevas.\" — nothing changes for a screen."],
    },
    { version: "1.0.1", changes: ["Nothing changes for a screen: the alternatives are named in plain words now — the bare control, a radio group — because the system has no component for them."] },
    { version: "1.0.0", changes: ["First documented version, taken from the product's own copy of the component."] },
  ],
});
