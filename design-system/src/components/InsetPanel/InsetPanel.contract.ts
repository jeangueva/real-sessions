import { defineContract } from "../../contract";

export const InsetPanelContract = defineContract({
  name: "InsetPanel",
  level: "atom",
  status: "stable",
  summary: "The recessed panel inside a widget: a step of the widget's own surface.",
  source: "src/components/InsetPanel/InsetPanel.tsx",
  composes: [],
  dependencies: [],
  props: {
    children: {
      type: "ReactNode",
      required: true,
      description: "What the inset holds: a row, a list, a short piece of copy.",
    },
    className: {
      type: "string",
      required: false,
      default: '""',
      description:
        "Extra classes, appended: the panel's own layout (a flex row, a grid) and its padding when the content needs less or more room. Not the fill.",
    },
  },
  slots: [{ name: "children", description: "The row or the list, padded by the panel itself." }],
  states: [
    {
      name: "default",
      description:
        "A step of the widget's surface, with 16px of padding and its own corners, so a row inside a card reads as belonging to it.",
      trigger: "Initial render.",
    },
  ],
  events: [],
  motion: ["None. The panel does not move; the content inside it does whatever it does."],
  accessibility: {
    role: "A generic <div>: a well inside a card.",
    keyboard: [],
    aria: [],
    reducedMotion: "Nothing moves, so nothing changes.",
    contrast: "None of its own: the panel has no text and no surface beyond the widget's.",
    focus: "Not focusable itself. Focus moves through the content inside it.",
    targetSize: "not interactive",
    screenReader: "Adds nothing to what a screen reader reads: it is a generic container with no role and no name.",
  },
  content: {
    voice: ["None: the panel holds content and never writes any of its own."],
    limits: ["Nothing: the panel is layout."],
    examples: [],
  },
  usage: {
    when: [
      "A row inside a widget that belongs to it rather than to the page: a step, a case, a fact.",
      "A list of short items inside a card, when the card's own padding would leave them floating.",
    ],
    whenNot: [
      {
        situation: "A card of its own",
        instead: "a Widget: the inset is inside one.",
      },
      {
        situation: "A group of blocks side by side",
        instead: "a row of Widgets in a grid.",
      },
      {
        situation: "The window a public page sits in",
        instead: "an InsetFrame: that one is the page's own frame.",
      },
    ],
    do: [
      "Keep the inset inside the widget it belongs to; on its own it is a box with no reason to exist.",
      "Use it for the rows that are content, not for a second layer of decoration.",
    ],
    dont: [
      "Don't nest one inset inside another: the steps of the surface multiply and nobody can say which is which.",
      "Don't use it for the whole card; that is the widget's own job.",
    ],
  },
  tokens: ["--surface-lift"],
  related: [
    {
      name: "Widget",
      difference: "The block: the card with the hairline and the label. This is the well inside it.",
    },
    {
      name: "Panel",
      difference: "The app's surface, on the page rather than inside a card.",
    },
    {
      name: "InsetFrame",
      difference: "The window of a public page. Nothing to do with this well.",
    },
  ],
  i18n: {
    rtl: "Nothing mirrors: the panel is symmetric and the content inside handles its own direction.",
    textExpansion: "Nothing changes: the panel grows with its content.",
    formatting: "None.",
    strings: [],
  },
  responsive: {
    behaviour: [
      "Phones: 16px of padding on every side.",
      "From sm (640px): the same; the panel does not change with the width.",
      "A row inside it wraps rather than scrolling.",
    ],
    minWidth: "320px",
  },
  designTool: {
    registryItem: "inset-panel",
    importStatement: 'import { InsetPanel } from "@mockio/design-system";',
    canvasProps: [],
    placement: "Inside a Widget, as a step of its surface.",
  },
  appCounterpart: {
    file: "design-system/marketing.tsx",
    exportName: "InsetPanel",
    differences: [
      "Spreads every other <div> attribute (id, aria-*, data-*); the app's copy accepts only children and className.",
    ],
  },
  version: "1.0.0",
  changelog: [
    {
      version: "1.0.0",
      changes: [
        "First documented version, taken from the product's own copy of the public site's inset.",
      ],
    },
  ],
});
