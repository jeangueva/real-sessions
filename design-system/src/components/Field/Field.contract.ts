import { defineContract } from "../../contract";

export const FieldContract = defineContract({
  name: "Field",
  level: "molecule",
  status: "stable",
  summary: "A form control with its label above and an optional hint below, at the spacing every form in the product shares.",
  source: "src/components/Field/Field.tsx",
  composes: [],
  dependencies: [],
  props: {
    label: {
      type: "string",
      required: true,
      description: "What the control asks for, in a few words. Rendered as a <label> above the control: \"Email\", \"Contraseña\", \"Modo por defecto\".",
    },
    hint: {
      type: "string",
      required: false,
      description: "One or two sentences under the control: what the value is used for or the rule it must meet. Omitted, nothing is drawn below the control.",
    },
    htmlFor: {
      type: "string",
      required: false,
      description:
        "The id of the control inside, so the label names it and a click on the label focuses it. Leave it off only when the control names itself (a radiogroup or a Segmented with its own aria-label).",
    },
    hintId: {
      type: "string",
      required: false,
      description: "An id for the hint paragraph. Put the same value in the control's aria-describedby so a screen reader reads the hint when the control takes focus.",
    },
    children: {
      type: "ReactNode",
      required: true,
      description: "The control: an <input>, <select> or <textarea> carrying the field-control class and the id named in htmlFor, or a control that names itself.",
    },
    className: {
      type: "string",
      required: false,
      default: '""',
      description: "Extra classes, appended to the column. For layout, such as lg:col-span-2 for a field that spans two cells of a settings grid.",
    },
  },
  slots: [
    {
      name: "children",
      description:
        "One control. Native controls take className=\"field-control text-sm text-cream-bright\" (plus placeholder:text-cream-faint when they have a placeholder, resize-none on a textarea). A self-naming control (radiogroup, Segmented) goes in without htmlFor.",
    },
  ],
  states: [
    {
      name: "default",
      description: "Label in cream, the control's well (surface-card fill, line-strong border, rounded-xl) and, if given, the hint in cream-faint, 8px apart in a column.",
      trigger: "Initial render.",
    },
    {
      name: "focus-visible",
      description: "Drawn by the control's field-control class, not by Field: the border takes the accent and a soft accent halo (4px at 18%) spreads around the well. The label and hint do not change.",
      trigger: "The control inside receives keyboard focus.",
    },
  ],
  events: [],
  motion: [
    "Field itself does not move.",
    "The control's border colour and halo ease in over 200ms on the UI ease-out (var(--ease-out), cubic-bezier(0.23, 1, 0.32, 1)) when it gains focus; this is the field-control class in styles.css.",
    "Reduced motion: unchanged. The global reduced-motion rule in styles.css keeps colour and box-shadow transitions, and this one moves nothing: it only recolours the border and fades the halo in.",
  ],
  accessibility: {
    role: "generic (native <div>) holding a native <label>; the control keeps its own role",
    keyboard: [],
    aria: [
      {
        attribute: "for / id",
        managedBy: "consumer",
        note: "Pass htmlFor and give the control the same id. Without it the label names nothing: clicking it does not focus the control and a screen reader reads the control unnamed.",
      },
      {
        attribute: "aria-describedby",
        managedBy: "consumer",
        note: "The hint is not linked to the control on its own. Pass hintId and set aria-describedby on the control to the same value when the hint carries a rule the person needs while typing (\"Al menos 8 caracteres\").",
      },
      {
        attribute: "aria-label (self-naming controls)",
        managedBy: "consumer",
        note: "A radiogroup or a Segmented placed without htmlFor must carry its own aria-label, usually the same words as the Field's label.",
      },
    ],
    reducedMotion: "Nothing in Field animates. The control's 200ms focus transition is a border colour and a halo, with no movement, so the global reduced-motion rule leaves it running as it is.",
    contrast:
      "Label: cream on any surface is ≥ 12.9:1 in both themes. Hint: cream-faint is ≥ 6.3:1 on dark surfaces and ≥ 4.6:1 on light ones (tightest: light theme on surface-deep, 4.61:1). The control's line-strong border is ≥ 3.5:1 against its own fill in both themes (WCAG 1.4.11), the only thing saying \"this is a field\" on white.",
    focus: "Field is not focusable. The control inside takes focus in document order and shows the field-control focus treatment: accent border and accent halo, no separate outline.",
    targetSize: "The label is a click target that focuses the control. The native control is full width and at least 44px tall with field-control's py-3 and text-sm.",
    screenReader:
      "The control is announced with the label's words as its name. The hint is read with it only when wired through hintId and aria-describedby; otherwise a screen-reader user meets it only by reading on past the control.",
  },
  content: {
    voice: [
      "Label: a noun phrase, sentence case, no colon and no period: \"Tu nombre\", \"Modo por defecto\", \"Rol al que apuntas\".",
      "Hint: full sentences with a period, saying what the value is for or the rule it must meet: \"Se usa para precargar las sesiones nuevas.\"",
      "An optional field says so at the start of its hint: \"Opcional. Nos dice qué empleador construir después.\"",
      "Tú, never usted: \"Empresa que tienes en mente\".",
    ],
    limits: ["Label: 1–5 words, ≤ 32 characters; it does not wrap at 320px.", "Hint: ≤ 2 sentences, about 140 characters."],
    examples: [
      "Email",
      "Contraseña — Al menos 8 caracteres. Una frase funciona bien.",
      "Modo por defecto — El modo real retiene el coaching hasta el informe, como hace una entrevista de verdad. Vale más XP.",
      "Uno por línea",
      "Empresa que tienes en mente — Opcional. Nos dice qué empleador construir después.",
    ],
  },
  usage: {
    when: [
      "Any form control that needs a visible label: sign-in, reset password, settings, the early-access form.",
      "A setting in a settings grid whose effect needs a sentence of explanation, in the hint.",
      "A self-naming control (a radiogroup of languages, a theme Segmented) that still wants the label and hint layout.",
    ],
    whenNot: [
      { situation: "A message about what just happened after submitting", instead: "Notice, below the fields and above the Action." },
      { situation: "A heading over a group of fields or a block", instead: "Eyebrow, then the Fields under it." },
      { situation: "A checkbox or toggle whose label sits beside it", instead: "A native <label> wrapping the checkbox; Field stacks the label above." },
      { situation: "A list of what a plan includes", instead: "CheckItem." },
    ],
    do: [
      "Always pass htmlFor and the matching id on a native control.",
      "Give the control the field-control class so it matches every other field.",
      "Put the rule a value must meet in the hint, before the person types, and wire it with hintId.",
    ],
    dont: [
      "Don't use the placeholder as the label: it disappears as soon as someone types.",
      "Don't put an error in the hint; the outcome of a submit is a Notice.",
      "Don't draw a box or border around the Field; the control's well is the field.",
    ],
  },
  tokens: ["--cream", "--line-strong", "--surface-card", "--accent", "--ease-out", "field-control"],
  related: [
    { name: "Notice", difference: "Says what happened after a submit; Field labels a control and explains it before." },
    { name: "Eyebrow", difference: "Names a whole group or block; Field's label names one control." },
  ],
  i18n: {
    rtl: "The column aligns to the start edge, so label and hint sit on the right in Arabic and Hebrew. Nothing is mirrored; the control handles its own text direction.",
    textExpansion:
      "Label and hint wrap inside the column at any length; the column grows downward. Portuguese and German run about 20–30% longer (\"Pelo menos 8 caracteres. Uma frase funciona bem.\") and still fit two lines at 320px.",
    formatting: "None. A label with a number in it (\"Duración de la entrevista — 5 turnos\") arrives already formatted by the caller.",
    strings: [],
  },
  responsive: {
    behaviour: [
      "Full width of its container at every size; field-control's w-full min-w-0 keeps a long <select> from pushing a 320px phone wider.",
      "In a settings grid it fills one cell; className=\"lg:col-span-2\" lets a wide field span two from the lg breakpoint.",
    ],
    minWidth: "240px",
  },
  designTool: {
    registryItem: "field",
    importStatement: 'import { Field } from "@mockio/design-system";',
    canvasProps: ["label", "hint", "htmlFor"],
    placement: "In a form or a settings Panel, stacked in a flex column with gap-5, or in a grid with gap-6. The one solid Action comes after the last Field.",
  },
  appCounterpart: {
    file: "design-system/primitives.tsx",
    exportName: "Field",
    differences: [
      "Accepts native div attributes (id, data-*, aria-*) spread onto the column; the app's copy takes label, hint, children, htmlFor and className only.",
      "Adds hintId, which puts an id on the hint so the control can reference it with aria-describedby; the app's hint has no id.",
    ],
  },
  version: "1.0.0",
  changelog: [{ version: "1.0.0", changes: ["First documented version, extracted from the product."] }],
});
