import { defineContract } from "../../contract";

export const IconTileContract = defineContract({
  name: "IconTile",
  level: "atom",
  status: "stable",
  summary: "The widget kit's small amber-tint square holding a step number or an icon at the head of a row or a step; decoration, hidden from assistive technology.",
  source: "src/components/IconTile/IconTile.tsx",
  composes: [],
  dependencies: [],
  props: {
    children: {
      type: "ReactNode",
      required: true,
      description: "A two-digit step number (\"01\") or one lucide icon at h-5 w-5. Hidden from assistive technology, so the words beside it, or the <ol> around it, carry the meaning.",
    },
    className: {
      type: "string",
      required: false,
      default: '""',
      description: "Extra classes, appended. Layout only (self-start, margin) — not a size, a fill or a colour.",
    },
  },
  slots: [{ name: "children", description: "Two characters or one icon. The tile is 40px square; anything longer overflows its look, and words belong beside it." }],
  states: [
    {
      name: "default",
      description: "A 40px (h-10 w-10) square, rounded-xl, bg-accent-soft, its content centred in font-mono text-sm medium in accent-text. shrink-0, so it keeps its size in a row.",
      trigger: "Initial render.",
    },
  ],
  events: [],
  motion: ["None. The tile moves with its row or step."],
  accessibility: {
    role: "none: aria-hidden <span>",
    keyboard: [],
    aria: [
      { attribute: "aria-hidden", managedBy: "component", note: "Always true, and not overridable: the tile is drawing. The order is announced by the <ol> it sits in, the meaning by the text beside it." },
    ],
    reducedMotion: "Nothing moves, so nothing changes.",
    contrast:
      "The tile's ink on its fill: accent-text on accent-soft is 8.9:1 on dark and 4.8:1 on light, AA for the small mono figure. The fill against the card is decoration (1.18:1 dark, 1.07:1 light), so the tile's shape carries nothing a person needs.",
    focus: "Not focusable.",
    targetSize: "not interactive",
    screenReader: "Silent. A screen reader hears the list position from the <ol> (\"1 of 3\") and the row's words; it never hears \"zero one\".",
  },
  content: {
    voice: ["A step number in two digits with the leading zero, as the landing draws them: \"01\", \"02\", \"03\".", "Or one icon that repeats the words beside it; never an icon that replaces them."],
    limits: ["Two characters, or one icon at h-5 w-5."],
    examples: ["01", "02", "03"],
  },
  usage: {
    when: [
      "The number of a step or a point in an ordered list on the landing: the three rows of El producto, the three steps of Cómo funciona.",
      "An icon at the head of an Inset row, repeating what its words say.",
    ],
    whenNot: [
      { situation: "An icon that is the only label of something", instead: "Words, or an icon with an accessible name inside the control that needs it. The tile is aria-hidden." },
      { situation: "A tick on an item of what a plan includes", instead: "CheckItem." },
      { situation: "A status or a count the person needs to read", instead: "Badge for a status, Meter for an amount." },
      { situation: "The brand", instead: "Mark." },
    ],
    do: ["Put the tiles inside an <ol> when they number things.", "Keep the words beside the tile.", "Write numbers with the leading zero: 01, 02, 03."],
    dont: ["Don't put a word in the tile.", "Don't rely on the tile to say anything.", "Don't recolour it per row: every tile in the kit is the same amber tint."],
  },
  tokens: ["--accent-soft", "--accent-text", "font-mono"],
  related: [
    { name: "Inset", difference: "The well whose row or head the tile leads." },
    { name: "CheckItem", difference: "A checklist row with its own check mark; IconTile is a numbered or iconic square with no words of its own." },
    { name: "Badge", difference: "A pill with a status in words, read aloud; IconTile is silent." },
  ],
  i18n: {
    rtl: "Nothing mirrors: numbers never do, and a directional icon inside is the caller's to mirror (rtl:-scale-x-100). In a flex row the tile moves to the start side, on the right.",
    textExpansion: "None: the tile holds two characters or an icon, the same in every language. The words beside it wrap.",
    formatting: "The caller writes the number. The landing writes it as \"0\" + n, Western digits in every locale.",
    strings: [],
  },
  responsive: {
    behaviour: ["40px at every width; shrink-0 keeps it square while the text beside it wraps on a phone."],
    minWidth: "40px",
  },
  designTool: {
    registryItem: "icon-tile",
    importStatement: 'import { IconTile } from "@mockio/design-system";',
    canvasProps: ["children"],
    placement: "The first child of an Inset row (flex items-center gap-3) or of a step's Inset head (flex-col gap-4). Inside a Widget.",
  },
  appCounterpart: {
    file: "components/marketing.tsx",
    exportName: "IconTile",
    differences: ["Spreads native <span> attributes (id, data-*) onto the tile, with aria-hidden always applied after them; the product's copy accepts children and className only."],
  },
  version: "1.0.0",
  changelog: [{ version: "1.0.0", changes: ["First documented version, extracted from the product's landing."] }],
});
