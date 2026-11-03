import { defineContract } from "../../contract";

export const WidgetContract = defineContract({
  name: "Widget",
  level: "molecule",
  status: "stable",
  summary: "A cream card floating on the page: no shadow, a hairline at most, and an optional mono label.",
  source: "src/components/Widget/Widget.tsx",
  composes: ["MonoLabel"],
  dependencies: [],
  props: {
    children: {
      type: "ReactNode",
      required: true,
      description: "The block's content: a list, a card, a piece of the interface.",
    },
    label: {
      type: "ReactNode",
      required: false,
      description: "The block's label, in the instrument voice: \"::CÓMO FUNCIONA\".",
    },
    className: {
      type: "string",
      required: false,
      default: '""',
      description:
        "Extra classes, appended: the block's own layout (a grid, a flex column) and its height. Not the fill, the edge or the padding.",
    },
  },
  slots: [
    { name: "children", description: "The block's content, padded by the widget itself." },
    {
      name: "label",
      description: "One line above the content, in mono caps. It names the block; it does not describe it.",
    },
  ],
  states: [
    {
      name: "default",
      description:
        "A card-coloured block with a hairline around it, padded 20px on a phone and 24px from 640px up, with its label above the content.",
      trigger: "Initial render.",
    },
  ],
  events: [],
  motion: ["None. The block does not move; the content inside it does whatever it does."],
  accessibility: {
    role: "A generic <div>: a card, a box, nothing more.",
    keyboard: [],
    aria: [
      {
        attribute: "aria-labelledby",
        managedBy: "consumer",
        note: "So a region that holds several widgets can be named by the label above it.",
      },
    ],
    reducedMotion: "Nothing moves, so nothing changes.",
    contrast: "None of its own: the label is the MonoLabel's ink on the card's surface.",
    focus: "Not focusable itself. Focus moves through the content inside it, and nothing is trapped at the edge.",
    targetSize: "not interactive",
    screenReader:
      "Adds nothing by itself. The label is a paragraph, so a reader hears it before the content it names.",
  },
  content: {
    voice: [
      "The label is in the instrument voice, in caps, and names the block: \"::CÓMO FUNCIONA\".",
      "The content inside is the product's own copy, not the widget's.",
    ],
    limits: ["Label: 1–3 words, 24 characters at most."],
    examples: ["El producto", "::CÓMO FUNCIONA", "::CASOS"],
  },
  usage: {
    when: [
      "The public site: a block of the page with a label above it, side by side with other blocks.",
      "The signed-in product: the training screens, where a block of the conversation sits in a card.",
    ],
    whenNot: [
      {
        situation: "A card inside the signed-in app",
        instead: "Panel: it is the app's surface, with a shadow and no padding of its own.",
      },
      {
        situation: "A page band",
        instead: "a Section: the band owns the vertical rhythm of the page.",
      },
      {
        situation: "A card the person presses",
        instead: "a link or a button styled with the card tokens: a widget has no press.",
      },
    ],
    do: [
      "Give it a label when the block's purpose is not obvious from its content.",
      "Let the blocks in a row share the same height with h-full, so the row lines up.",
    ],
    dont: [
      "Don't stack a widget inside a widget: the hairline doubles and the radius starts to fight itself.",
      "Don't put an Action in the label; the label is a name, not a control.",
    ],
  },
  tokens: ["--surface-card", "--line", "--cream-dim"],
  related: [
    {
      name: "Panel",
      difference: "The app's surface: a shadow instead of a hairline, and no padding of its own. This one is the public site's block.",
    },
    {
      name: "InsetPanel",
      difference: "The recessed panel inside a widget: a step of its own surface.",
    },
    {
      name: "MonoLabel",
      difference: "The label on its own. A widget draws one above its content.",
    },
  ],
  i18n: {
    rtl: "Nothing mirrors: the block is symmetric and the content inside handles its own direction.",
    textExpansion: "Nothing changes: the block grows with its content, and the label wraps inside it.",
    formatting: "None.",
    strings: [],
  },
  responsive: {
    behaviour: [
      "Phones: 20px of padding, and the label wraps to two lines before it truncates.",
      "From sm (640px): 24px of padding.",
      "The block is as wide as its parent; in a row, the row decides.",
    ],
    minWidth: "320px",
  },
  designTool: {
    registryItem: "widget",
    importStatement: 'import { Widget } from "@mockio/design-system";',
    canvasProps: ["label"],
    placement:
      "Inside a band of the public site, or in the training screens of the signed-in product. One column on a phone, a row on a desktop.",
  },
  appCounterpart: {
    file: "design-system/marketing.tsx",
    exportName: "Widget",
    differences: [
      "Spreads every other <div> attribute (id, aria-*, data-*); the app's copy accepts only children, label and className.",
    ],
  },
  version: "1.0.0",
  changelog: [
    {
      version: "1.0.0",
      changes: [
        "First documented version, taken from the product's own copy of the public site's block.",
      ],
    },
  ],
});
