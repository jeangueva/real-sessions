import { defineContract } from "../../contract";

export const ChipContract = defineContract({
  name: "Chip",
  level: "atom",
  status: "stable",
  summary: "A peach chip in mono caps: a fact, never a control.",
  source: "src/components/Chip/Chip.tsx",
  composes: [],
  dependencies: [],
  props: {
    children: {
      type: "ReactNode",
      required: true,
      description: "The fact: \"LATAM\", \"HIPÓTESIS · PRIORIZACIÓN\".",
    },
    className: {
      type: "string",
      required: false,
      default: '""',
      description:
        "Extra classes, appended: the chip's own placement (a margin, a wrap). Not the fill and not the ink — a chip that changes them stops being a fact.",
    },
  },
  slots: [{ name: "children", description: "The fact, in caps." }],
  states: [
    {
      name: "default",
      description:
        "A warm peach wash with the dark ink on it, in mono caps, rounded at 9px.",
      trigger: "Initial render.",
    },
  ],
  events: [],
  motion: ["None. The chip does not move; a chip that moved would look pressable."],
  accessibility: {
    role: "A <span>: a piece of text in a wash.",
    keyboard: [],
    aria: [],
    reducedMotion: "Nothing moves, so nothing changes.",
    contrast:
      "The dark ink on the peach wash: over 12:1 in both themes, and the wash itself clears 3:1 against the card behind it.",
    focus: "Not focusable: a fact is read, not reached.",
    targetSize: "not interactive",
    screenReader: "Reads the words in caps, like the rest of the text.",
  },
  content: {
    voice: [
      "A fact, in the instrument voice: caps, mono, a little tracking.",
      "It names something and never instructs: \"LATAM\" names a region, \"Recomendado\" names a plan.",
    ],
    limits: ["1–4 words, 28 characters at most; the chip wraps rather than truncates."],
    examples: ["LATAM", "HIPÓTESIS · PRIORIZACIÓN · TRADE-OFFS", "Recomendado"],
  },
  usage: {
    when: [
      "A fact about a product or a plan, next to the words it belongs to.",
      "A row of what a plan includes, in one line each.",
    ],
    whenNot: [
      {
        situation: "A status of the current screen",
        instead: "a Badge: the words carry the status, in the system's own voice.",
      },
      {
        situation: "Something the person can press",
        instead: "an Action: a chip is a fact, never a control.",
      },
      {
        situation: "A label of a block",
        instead: "a MonoLabel: the label is above the block, in the same voice.",
      },
    ],
    do: [
      "Put the chip next to the words it qualifies, not on its own line.",
      "Keep it to a fact the reader can verify: a region, a plan, a list of what is included.",
    ],
    dont: [
      "Don't put a price in it: the price is a sentence, and the sentence is what the reader compares.",
      "Don't style it as a control: no border, no shadow, no hover.",
    ],
  },
  tokens: ["--chip", "--chip-ink"],
  related: [
    {
      name: "Badge",
      difference: "A status of the current screen, in the system's own voice. This is a fact about a product or a plan, in the peach.",
    },
    {
      name: "MonoLabel",
      difference: "The label above a block. This is a fact beside the words.",
    },
    {
      name: "IconTile",
      difference: "A square with a figure in it. This is a pill with words in it.",
    },
  ],
  i18n: {
    rtl: "Nothing mirrors: the chip is symmetric and the words inside it are text.",
    textExpansion:
      "The words wrap inside the chip and the chip grows with them; a German name of a plan is longer than a Spanish one and the chip says so.",
    formatting: "None.",
    strings: [],
  },
  responsive: {
    behaviour: [
      "Phones: 12px of padding on each side, in 12px mono caps.",
      "From sm (640px): the same; the chip does not change with the width.",
      "A chip too long for its row wraps its words rather than overflowing.",
    ],
    minWidth: "320px",
  },
  designTool: {
    registryItem: "chip",
    importStatement: 'import { Chip } from "@mockio/design-system";',
    canvasProps: [],
    placement: "Beside the words it qualifies, inside a Widget or a row of facts.",
  },
  appCounterpart: {
    file: "design-system/marketing.tsx",
    exportName: "Chip",
    differences: [
      "Spreads every other <span> attribute (id, title, data-*); the app's copy accepts only children and className.",
      "The fill and the ink are the chip's own tokens now, the same peach the app wrote as a literal colour.",
    ],
  },
  version: "1.0.0",
  changelog: [
    {
      version: "1.0.0",
      changes: [
        "First documented version, taken from the product's own copy of the public site's chip.",
        "The peach wash and its ink are tokens now, so the chip is a token the design tools can pick.",
      ],
    },
  ],
});
