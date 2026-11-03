import { defineContract } from "../../contract";

export const SectionTitleContract = defineContract({
  name: "SectionTitle",
  level: "atom",
  status: "stable",
  summary: "The heading of a block of the public site: a section's title, or the title of a Widget inside one.",
  source: "src/components/SectionTitle/SectionTitle.tsx",
  composes: [],
  dependencies: [],
  props: {
    children: {
      type: "ReactNode",
      required: true,
      description: "The title's words.",
    },
    className: {
      type: "string",
      required: false,
      default: '""',
      description:
        "Extra classes, appended: the title's own spacing above it, and the measure when a title has to wrap sooner. Not the size, the weight or the colour.",
    },
  },
  slots: [{ name: "children", description: "The title, in the language of the page." }],
  states: [
    {
      name: "default",
      description:
        "The title is 32px on a phone and 56px on a wide desktop, in the light weight and the brightest ink.",
      trigger: "Initial render.",
    },
  ],
  events: [],
  motion: ["None. The title does not move; the block around it may enter with its own motion."],
  accessibility: {
    role: "An <h2>: the second level of the document's headings.",
    keyboard: [],
    aria: [
      {
        attribute: "id",
        managedBy: "consumer",
        note: "So the band that holds it can be named by it: aria-labelledby.",
      },
    ],
    reducedMotion: "Nothing moves, so nothing changes.",
    contrast: "The brightest ink on the page (cream-bright) on the surface behind it: over 12:1 in both themes.",
    focus: "Not focusable: a heading is read, not reached.",
    targetSize: "not interactive",
    screenReader: "Reads the title as a heading of the second level, and nothing else.",
  },
  content: {
    voice: [
      "A sentence with a full stop, in the tú form: the page speaks to the person reading it, not about itself.",
      "It says what the block gives, not how it works: \"Un jurado que leyó tu tesis. Completa.\"",
    ],
    limits: ["One line on a phone, two on a desktop: 8–14 words."],
    examples: ["Un jurado que leyó tu tesis. Completa.", "De tu PDF a tu acta en una tarde."],
  },
  usage: {
    when: [
      "The title of a section of the public site.",
      "The title of a Widget, when the widget is a block of the page in its own right.",
    ],
    whenNot: [
      {
        situation: "The title of a screen in the signed-in app",
        instead: "PageHeader: the app's screen has one title, and it is an h1.",
      },
      {
        situation: "A label above the title",
        instead: "a MonoLabel, in the instrument voice.",
      },
      {
        situation: "A heading inside the block",
        instead: "an h3 or a bold paragraph: the title is the block's only heading.",
      },
    ],
    do: [
      "Write the title as what the block gives, in one sentence.",
      "Let it wrap: the size follows the viewport and the measure is the caller's.",
    ],
    dont: [
      "Don't use it as an h1: the page's own title is the h1, and a second one flattens the document.",
      "Don't set the size or the weight through className; they are the title's.",
    ],
  },
  tokens: ["--cream-bright"],
  related: [
    {
      name: "Lede",
      difference: "The sentence under the title: this is the title itself.",
    },
    {
      name: "PageHeader",
      difference: "The title of an app screen, with its meta and its actions. This is the title of a block of a public page.",
    },
    {
      name: "MonoLabel",
      difference: "The instrument label above a block, in mono caps. This is the title, in the page's own voice.",
    },
  ],
  i18n: {
    rtl: "Nothing mirrors: the title is text, and the page's direction carries it.",
    textExpansion:
      "The size follows the viewport, so a longer title wraps to two lines instead of shrinking. Keep it under 14 words.",
    formatting: "None.",
    strings: [],
  },
  responsive: {
    behaviour: [
      "Phones: 32px, in the light weight.",
      "From sm (640px): the size follows the width of the window, up to 56px.",
      "The title wraps; it never shrinks below 32px.",
    ],
    minWidth: "320px",
  },
  designTool: {
    registryItem: "section-title",
    importStatement: 'import { SectionTitle } from "@mockio/design-system";',
    canvasProps: [],
    placement:
      "At the top of a band of the public site, or at the top of a Widget that is a block in its own right.",
  },
  appCounterpart: {
    file: "design-system/marketing.tsx",
    exportName: "SectionTitle",
    differences: [
      "Spreads every other <h2> attribute (id, aria-*); the app's copy accepts only children and className.",
    ],
  },
  version: "1.0.0",
  changelog: [
    {
      version: "1.0.0",
      changes: [
        "First documented version, taken from the product's own copy of the public site's title.",
      ],
    },
  ],
});
