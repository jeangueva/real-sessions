import { defineContract } from "../../contract";

export const DisclosureMarkContract = defineContract({
  name: "DisclosureMark",
  level: "atom",
  status: "stable",
  summary: "The pill at the end of a <details> summary that says the card opens — a chevron that turns over when open and, on larger disclosures, the word for what clicking does.",
  source: "src/components/DisclosureMark/DisclosureMark.tsx",
  composes: [],
  dependencies: ["lucide-react"],
  props: {
    label: {
      type: "string",
      required: false,
      description: "What opening does, a verb: \"Ver\", \"Ver planes\", \"Completar\". Shown while closed. Absent, the mark is the chevron alone in a 32px circle.",
    },
    openLabel: {
      type: "string",
      required: false,
      default: '"Cerrar"',
      description: "What the pill says once its <details> is open. Only rendered when label is set; \"Ocultar\" where the product hides a list rather than closing a card.",
    },
    className: {
      type: "string",
      required: false,
      default: '""',
      description: "Extra classes, appended. For layout (-my-1 in a tight row) or, on a summary that is already on the lifted surface, a fill that separates the pill from it (bg-surface-card).",
    },
  },
  slots: [],
  states: [
    { name: "default", description: "Closed: the lifted pill with the chevron pointing down, and the label when there is one.", trigger: "The ancestor <details> is closed." },
    { name: "open", description: "The chevron is turned 180° (pointing up) and the label is swapped for openLabel.", trigger: "The ancestor <details> has the open attribute: the user opened it, or <details open>." },
    { name: "hover", description: "The pill lifts to cream at 14% while the pointer is anywhere on the summary, which is what tells a disclosure from a plain card.", trigger: "The pointer hovers the summary (hover: hover and pointer: fine)." },
    { name: "pressed", description: "The pill scales to 0.95 while the summary is pressed.", trigger: "The summary is :active (pointer down, or Space held)." },
  ],
  events: [],
  motion: [
    "Chevron: rotates 0 → 180° over 200ms on the out curve (var(--ease-out)) when the <details> opens, and back when it closes. It turns rather than swaps, so the change reads as the same control answering.",
    "Pill: background-color and transform transition over 150ms on ease-press (cubic-bezier(0.23, 1, 0.32, 1)) for the hover tint and the 0.95 press.",
    "Label: the closed and open words swap instantly (display), never cross-fade.",
    "Reduced motion: the package's global rule drops transform from transitions, so the chevron and the press change at once; the hover tint still fades.",
  ],
  accessibility: {
    role: "none (the whole mark is aria-hidden); the disclosure's role belongs to the native <summary>",
    keyboard: [],
    aria: [
      { attribute: "aria-hidden", managedBy: "component", note: "Always on, and not overridable: the pill and its words repeat what the summary already exposes. The browser announces the summary as expanded or collapsed." },
      { attribute: "summary text", managedBy: "consumer", note: "The <summary> must carry its own visible text that names what opens (\"Ajustes del ensayo\"); the mark adds nothing a screen reader hears." },
    ],
    reducedMotion: "The chevron flips to its new direction at once and the press does not scale (transform is dropped from transitions by styles.css). The words swap instantly in every case.",
    contrast:
      "Words and chevron: cream-bright on the lifted pill, ≥ 11.6:1 in both themes over any surface (tightest: the dark theme on surface-card). The pill against the summary is decoration; the chevron's direction and the words carry the state.",
    focus: "Not focusable itself. The <summary> takes focus and shows the ring (pass focus-ring on it); the mark sits inside the ring.",
    targetSize: "not interactive itself; the whole <summary> is the target, which the caller sizes with its padding; the 32px mark sets the floor of its height.",
    screenReader:
      "Hears nothing from the mark. \"Ver\"/\"Cerrar\" are visual: a screen-reader user hears the summary's text and its expanded or collapsed state instead.",
  },
  content: {
    voice: [
      "label is a verb for what opening does, sentence case, no period: \"Ver\", \"Ver planes\", \"Completar\", \"Editar\".",
      "openLabel says how to undo it: \"Cerrar\" for a card, \"Ocultar\" for a list.",
      "The summary's own text names the thing; the label never repeats it (\"Ver\", not \"Ver ajustes del ensayo\").",
    ],
    limits: ["label and openLabel: 1–2 words, ≤ 12 characters. The pill never wraps; a long word pushes the summary's text instead."],
    examples: ["Ver", "Cerrar", "Ver planes", "Ocultar", "Completar", "Editar"],
  },
  usage: {
    when: [
      "At the end of a <summary> drawn as a card or a row, so it reads as something that opens: \"La conversación\", \"Ver el detalle completo\".",
      "With a label on the larger disclosures, where the summary is a title and a line of body: \"Tu plan hasta el día D\" with \"Ver\"/\"Cerrar\", the plans with \"Ver planes\"/\"Ocultar\".",
      "Icon only on rows in a list and on summaries whose text already says \"Ver…\".",
    ],
    whenNot: [
      { situation: "A button that opens a menu, a sheet or a dialog", instead: "Action (ghost or neutral) with its own words; the mark only follows a <details>." },
      { situation: "A card that navigates somewhere", instead: "A link, with Action's arrow if it needs a sign. A chevron down promises the content opens in place." },
      { situation: "Choosing between views", instead: "Segmented." },
      { situation: "A status of the card", instead: "Badge, beside the summary's text." },
    ],
    do: [
      "Put it inside a <summary>, last, with the summary's text before it.",
      "Give the summary list-none, focus-ring and cursor-pointer, so it looks and behaves like the product's disclosures.",
      "Use a label only where the summary is a title and a line of body.",
    ],
    dont: [
      "Don't put it on a button or a link: outside <summary> it never turns and its words never swap.",
      "Don't use it to promise content that loads on a new screen.",
      "Don't repeat the summary's text in the label.",
    ],
  },
  tokens: ["--surface-lift", "--cream", "--cream-bright", "--ease-out", "ease-press", "disclosure-pill", "disclosure-mark", "disclosure-when-open", "disclosure-when-closed"],
  related: [
    { name: "Action", difference: "A control with its own role and focus; DisclosureMark is a decoration inside a native <summary>, which is the control." },
    { name: "Badge", difference: "A static status pill; DisclosureMark answers its <details>'s open state." },
  ],
  i18n: {
    rtl: "Sits at the end of the summary's row, so on the left in Arabic and Hebrew. The chevron points down and up, so it is never mirrored.",
    textExpansion:
      "The pill grows with its word and never wraps (Portuguese \"Preencher\", \"Fechar\"; German runs similar). The summary's text, being min-w-0 flex-1, wraps first.",
    formatting: "None: the words are plain strings.",
    strings: [{ text: "Cerrar", prop: "openLabel" }],
  },
  responsive: {
    behaviour: [
      "The same size at every width: a 32px circle icon-only, a pill of 14px text with a label.",
      "In a summary with flex-wrap (the plans row) it may drop under the text on a 320px phone; elsewhere the text wraps and the mark stays at the end.",
    ],
    minWidth: "32px",
  },
  designTool: {
    registryItem: "disclosure-mark",
    importStatement: 'import { DisclosureMark } from "@mockio/design-system";',
    canvasProps: ["label", "openLabel"],
    placement: "Only as the last child of a <summary> inside a <details>, typically a flex row with justify-between and gap-3 or gap-4.",
  },
  appCounterpart: {
    file: "design-system/disclosure.tsx",
    exportName: "DisclosureMark",
    differences: [
      "openLabel defaults to \"Cerrar\"; in the app's copy it falls back to label, so a labelled mark without openLabel says the same word open and closed. Every labelled use in the product passes openLabel, so nothing it renders changes.",
      "Accepts native span attributes (id, data-*) beyond className; aria-hidden is applied after them and cannot be turned off.",
    ],
  },
  version: "1.0.0",
  changelog: [{ version: "1.0.0", changes: ["First documented version, extracted from the product."] }],
});
