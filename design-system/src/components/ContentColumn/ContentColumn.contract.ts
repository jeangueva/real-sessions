import { defineContract } from "../../contract";

export const ContentColumnContract = defineContract({
  name: "ContentColumn",
  level: "template",
  status: "stable",
  summary: "The public site's one column: 1200px of content, the same gutters on every page.",
  source: "src/components/ContentColumn/ContentColumn.tsx",
  composes: [],
  dependencies: [],
  props: {
    children: {
      type: "ReactNode",
      required: true,
      description: "The page's content: a band, a grid, a row of cards.",
    },
    className: {
      type: "string",
      required: false,
      default: '""',
      description:
        "Extra classes, appended: the column's own layout (a grid, a flex row) and the padding of a band that is not the page's. Not a max-w-* — the ceiling is the same everywhere.",
    },
  },
  slots: [
    {
      name: "children",
      description: "One page's worth of bands, in one column. Everything inside is as wide as the column allows.",
    },
  ],
  states: [
    {
      name: "default",
      description:
        "The column is as wide as the window allows, up to 1200px, with 20px of gutter on a phone and 32px from 640px up.",
      trigger: "Initial render.",
    },
  ],
  events: [],
  motion: ["None. The column does not move; the page inside it scrolls."],
  accessibility: {
    role: "A generic <div> inside another <div>: the ceiling and the gutters, nothing more.",
    keyboard: [],
    aria: [],
    reducedMotion: "Nothing moves, so nothing changes.",
    contrast: "None of its own: the column has no text and no surface beyond what the caller puts on it.",
    focus: "Not focusable itself. Focus moves through the content inside it, and nothing is trapped at the column's edge.",
    targetSize: "not interactive",
    screenReader: "Adds nothing to what a screen reader reads: it is a generic container with no role and no name.",
  },
  content: {
    voice: ["None: the column holds content and never writes any of its own."],
    limits: ["Nothing: the column is layout."],
    examples: [],
  },
  usage: {
    when: [
      "The public site: every band of every public page sits in this column, so a card that moves from one page to another lands in the same place.",
      "Any page whose content is one column and the same width everywhere.",
    ],
    whenNot: [
      {
        situation: "A screen inside the signed-in app",
        instead: "PageBody: the app is the window, and it does not need a frame around it.",
      },
      {
        situation: "A band with its own vertical rhythm",
        instead: "Section: it owns the padding above and below the band.",
      },
      {
        situation: "A block of content inside the page",
        instead: "a Widget: the block, its own label and its own hairline.",
      },
    ],
    do: [
      "Let the column fill the width it is given; the ceiling is there for a reason.",
      "Keep one column per page: two columns in a row is a grid, and a grid needs a decision.",
    ],
    dont: [
      "Don't set a max-w-* on it: the ceiling is the column's, and a second one fights it.",
      "Don't use it for the signed-in app; the app's screens are wider and tighter.",
    ],
  },
  tokens: [],
  related: [
    {
      name: "Section",
      difference: "The band: it owns the vertical rhythm and centres a column of its own. This is the column without the band.",
    },
    {
      name: "PageBody",
      difference: "The app's container: wider, tighter gutters and a ceiling that follows the screen rather than the page.",
    },
    {
      name: "Widget",
      difference: "One block inside the column, with a hairline and its own padding.",
    },
  ],
  i18n: {
    rtl: "Nothing mirrors: the column is symmetric and the page inside it handles its own direction.",
    textExpansion: "Nothing changes: the column is a width, and the page inside it grows with its language.",
    formatting: "None.",
    strings: [],
  },
  responsive: {
    behaviour: [
      "Phones: 20px of gutter on each side, the column as wide as the window.",
      "From sm (640px): 32px of gutter on each side.",
      "Above 1200px the column stops growing and centres; the gutters stay.",
    ],
    minWidth: "320px",
  },
  designTool: {
    registryItem: "content-column",
    importStatement: 'import { ContentColumn } from "@mockio/design-system";',
    canvasProps: [],
    placement:
      "The outermost element of a public page. One per page, above the page's own bands.",
  },
  appCounterpart: {
    file: "design-system/marketing.tsx",
    exportName: "ContentColumn",
    differences: [
      "Spreads every other <div> attribute (id, aria-*, data-*); the app's copy accepts only children and className.",
    ],
  },
  version: "1.0.0",
  changelog: [
    {
      version: "1.0.0",
      changes: [
        "First documented version, taken from the product's own copy of the public site's column.",
      ],
    },
  ],
});
