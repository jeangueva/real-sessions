import { defineContract } from "../../contract";

export const NoticeContract = defineContract({
  name: "Notice",
  level: "atom",
  status: "stable",
  summary: "A message about what just happened, in a tinted box with its mark: it did not work and what to do next, it worked, or something neutral.",
  source: "src/components/Notice/Notice.tsx",
  composes: [],
  dependencies: ["lucide-react"],
  props: {
    tone: {
      type: '"error" | "success" | "info"',
      required: false,
      default: '"info"',
      description: "What kind of outcome it reports. Sets the wash, the icon and the live-region role.",
      values: {
        error:
          "It did not work, and what to do next (\"No funcionó. Prueba de nuevo con el enlace del correo.\"). The orange step wash with an alert-circle icon, never red; role=\"alert\".",
        success: "It worked (\"Guardado\"). The green grow wash with a check-circle icon; role=\"status\".",
        info: "Something happened that is neither (\"Si esa dirección tiene una cuenta, el enlace ya está en camino.\"). The lifted surface with an info icon; role=\"status\".",
      },
    },
    children: {
      type: "ReactNode",
      required: true,
      description: "The message: one or two sentences of inline text, links allowed. It renders inside a <p>, so no blocks, lists or headings.",
    },
    role: {
      type: "string",
      required: false,
      description:
        "Native role, spread onto the paragraph after the tone's own, so it overrides it. The default is \"alert\" for error and \"status\" otherwise; override only when the Notice sits inside a region that already announces.",
    },
    className: {
      type: "string",
      required: false,
      default: '""',
      description: "Extra classes, appended. For layout (margin such as mt-4, width) — not for recolouring the box.",
    },
  },
  slots: [{ name: "children", description: "Inline text, optionally with a link. The icon is drawn by the component; do not pass one." }],
  states: [
    {
      name: "default",
      description: "A rounded-2xl box in the tone's wash, a 16px icon in the tone's text colour at the start, and the message in cream-bright beside it, top-aligned.",
      trigger: "Rendered by the caller after something happens (a submit, a request returning).",
    },
  ],
  events: [],
  motion: [
    "None. The Notice appears and disappears with the caller's render; it does not fade, slide or shake. Something that went wrong is told calmly.",
  ],
  accessibility: {
    role: "alert (tone error) or status (tones success and info), on a native <p>",
    keyboard: [],
    aria: [
      {
        attribute: "role=\"alert\" / role=\"status\"",
        managedBy: "component",
        note: "Set from the tone: an error interrupts with an assertive announcement, success and info wait politely. A consumer's role prop overrides it.",
      },
      { attribute: "aria-hidden (icon)", managedBy: "component", note: "The icon is decoration; the words say whether it worked." },
      {
        attribute: "mounting",
        managedBy: "consumer",
        note: "Render the Notice when the outcome is known, with its text, and keep a single one per outcome. Swapping the text of a mounted Notice is announced again; re-mounting a status region with the same text may not be announced by every screen reader.",
      },
    ],
    reducedMotion: "Nothing moves, so nothing changes under prefers-reduced-motion: reduce.",
    contrast:
      "Text: cream-bright is ≥ 11.6:1 on all three washes in both themes. Icons: step-text on step-soft 7.0:1 (dark) / 4.7:1 (light); grow-text on grow-soft 7.4:1 / 4.7:1; cream-dim on the lifted surface ≥ 7.8:1. The icon is never the only signal: the words say what happened.",
    focus: "Not focusable. A link inside takes focus in document order with its own focus-ring.",
    targetSize: "not interactive",
    screenReader:
      "Read as its text, with no prefix: the tone's colour and icon are not announced, so the words must say whether it worked (\"No funcionó.\", \"Listo.\"). An error is announced at once, interrupting; the other tones when the reader is idle.",
  },
  content: {
    voice: [
      "Say what happened, then what to do next: \"No funcionó. Prueba de nuevo con el enlace del correo.\"",
      "Calm and blameless: the thing did not work, the person did nothing wrong. No \"Error:\", no \"inválido\", no exclamation marks.",
      "Success can be one word: \"Guardado\". A longer one says what changed: \"Listo. No vas a recibir recordatorios ni resúmenes en esta dirección.\"",
      "Tú, never usted: \"Inténtalo otra vez\".",
    ],
    limits: ["1–2 sentences, ≤ 160 characters. More than that is a page, not a notice."],
    examples: [
      "No funcionó. Inténtalo otra vez, o entra con tu correo y contraseña.",
      "No funcionó. Prueba de nuevo con el enlace del correo.",
      "No se pudo restablecer la contraseña.",
      "Guardado",
      "Listo. No vas a recibir recordatorios ni resúmenes en esta dirección.",
      "Si esa dirección tiene una cuenta, el enlace ya está en camino.",
    ],
  },
  usage: {
    when: [
      "The outcome of a form submit: under the fields, above the Action (sign in, reset password).",
      "The result of a request the page made on its own (confirming an email, unsubscribing).",
      "A save that worked, beside the Action that saved it (\"Guardado\").",
    ],
    whenNot: [
      { situation: "A rule a value must meet, before anyone types", instead: "Field's hint." },
      { situation: "A standing fact about the screen, such as its mode", instead: "Badge." },
      { situation: "A whole block of explanation or an empty state", instead: "Panel with body text." },
      { situation: "The way forward after an error", instead: "An Action after the Notice; the Notice names it, the Action does it." },
    ],
    do: [
      "Say what happened and what to do next, in that order.",
      "One Notice per outcome, placed where the person was looking when they acted.",
      "Use tone error for anything that did not work; it is orange, never red.",
    ],
    dont: [
      "Don't use a Notice for instructions that were true before anything happened.",
      "Don't stack several Notices; merge them into one message.",
      "Don't recolour it red or add a second icon.",
    ],
  },
  tokens: ["--step-soft", "--step-text", "--grow-soft", "--grow-text", "--surface-lift", "--surface-lift-alpha", "--cream", "--cream-bright"],
  related: [
    { name: "Field", difference: "Labels and explains a control before input; Notice reports what happened after." },
    { name: "Badge", difference: "States a standing status in a pill; Notice reports a one-time outcome in a sentence." },
  ],
  i18n: {
    rtl: "The icon leads the text in reading order, so it sits on the right in Arabic and Hebrew. The icons are symmetric and are not mirrored.",
    textExpansion:
      "The text wraps inside the box and the box grows downward; the icon stays top-aligned with the first line. Portuguese runs about 10–20% longer (\"Não funcionou. Tente novamente com o link do e-mail.\") and fits at 320px.",
    formatting: "None inside the component. Any email address, date or count arrives already formatted in the message.",
    strings: [],
  },
  responsive: {
    behaviour: [
      "Fills the width of its container at every size; the message wraps beside the icon.",
      "At 320px a two-sentence message takes three or four lines; the icon stays on the first.",
    ],
    minWidth: "240px",
  },
  designTool: {
    registryItem: "notice",
    importStatement: 'import { Notice } from "@mockio/design-system";',
    canvasProps: ["tone", "children"],
    placement: "In a form's flex column, between the last Field and the Action, or under a page heading with mt-4. One per outcome.",
  },
  appCounterpart: {
    file: "design-system/primitives.tsx",
    exportName: "Notice",
    differences: [
      "Accepts native paragraph attributes (id, data-*, aria-*), spread onto the <p>; a role passed in overrides the tone's alert/status. The app's copy takes tone, children and className only.",
    ],
  },
  version: "1.0.0",
  changelog: [{ version: "1.0.0", changes: ["First documented version, extracted from the product."] }],
});
