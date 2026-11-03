import { defineContract } from "../../contract";

export const IconTileContract = defineContract({
  name: "IconTile",
  level: "atom",
  status: "stable",
  summary: "A small amber-tint square holding an icon or a number.",
  source: "src/components/IconTile/IconTile.tsx",
  composes: [],
  dependencies: [],
  props: {
    children: {
      type: "ReactNode",
      required: true,
      description: "The icon or the figure that goes in the tile.",
    },
    className: {
      type: "string",
      required: false,
      default: '""',
      description:
        "Extra classes, appended: the tile's own size when it has to grow with the icon inside it. Not the fill and not the colour.",
    },
  },
  slots: [{ name: "children", description: "An icon, or a figure in the instrument voice." }],
  states: [
    {
      name: "default",
      description:
        "A 40px square with the accent's soft wash behind it and the accent's text colour in it.",
      trigger: "Initial render.",
    },
  ],
  events: [],
  motion: ["None. The tile does not move."],
  accessibility: {
    role: "A <span> with aria-hidden: a decoration next to words.",
    keyboard: [],
    aria: [
      {
        attribute: "aria-hidden",
        managedBy: "component",
        note: "The tile holds a number or an icon that the words beside it already carry. A screen reader that read both would say everything twice.",
      },
    ],
    reducedMotion: "Nothing moves, so nothing changes.",
    contrast: "The accent's text colour on its soft wash: over 4.5:1 in both themes.",
    focus: "Not focusable, and there is nothing inside it to focus.",
    targetSize: "not interactive",
    screenReader: "Reads nothing: the tile is hidden, and the words beside it carry it.",
  },
  content: {
    voice: [
      "A figure in the instrument voice: \"01\", \"02\", \"03\".",
      "An icon with no words of its own.",
    ],
    limits: ["One or two characters in the instrument voice; an icon at 16px."],
    examples: ["01", "02", "03"],
  },
  usage: {
    when: [
      "A numbered row: the tile holds the number and the words beside it hold the step.",
      "A row of icons that mark what a card is about.",
    ],
    whenNot: [
      {
        situation: "A number the reader has to read",
        instead: "the number as text: the tile is a decoration next to words that already say it.",
      },
      {
        situation: "A status the reader has to know",
        instead: "a Badge: the words carry the status.",
      },
      {
        situation: "An icon that is the only content",
        instead: "nothing: a tile without words says nothing.",
      },
    ],
    do: [
      "Put the words beside it, not in it: the tile marks, the sentence tells.",
      "Number the steps of a row with it, so the row reads as a sequence.",
    ],
    dont: [
      "Don't put a number the reader has to count in it; the tile is hidden from them.",
      "Don't use it as an avatar: that is the mascot's job.",
    ],
  },
  tokens: ["--accent-soft", "--accent-text"],
  related: [
    {
      name: "Chip",
      difference: "A fact in mono caps in a warm wash. This is a square that holds an icon or a figure.",
    },
    {
      name: "Mascot",
      difference: "The character, in six stages. This is a square with a number in it.",
    },
    {
      name: "Badge",
      difference: "A status in words, which the reader needs.",
    },
  ],
  i18n: {
    rtl: "Nothing mirrors: the tile is symmetric and the icon inside it does its own mirroring.",
    textExpansion: "Nothing changes: the tile holds a figure or an icon, and both fit.",
    formatting: "The figure is the caller's; the tile does not number anything by itself.",
    strings: [],
  },
  responsive: {
    behaviour: [
      "The tile is 40px at every width.",
      "It never shrinks: the row of tiles keeps its own rhythm as the words wrap beside it.",
    ],
    minWidth: "320px",
  },
  designTool: {
    registryItem: "icon-tile",
    importStatement: 'import { IconTile } from "@mockio/design-system";',
    canvasProps: [],
    placement: "At the start of a row, before the words that say what it marks.",
  },
  appCounterpart: {
    file: "design-system/marketing.tsx",
    exportName: "IconTile",
    differences: [
      "Spreads every other <span> attribute (id, data-*); the app's copy accepts only children and className.",
    ],
  },
  version: "1.0.0",
  changelog: [
    {
      version: "1.0.0",
      changes: [
        "First documented version, taken from the product's own copy of the public site's tile.",
      ],
    },
  ],
});
