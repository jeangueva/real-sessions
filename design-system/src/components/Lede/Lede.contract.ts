import { defineContract } from "../../contract";

export const LedeContract = defineContract({
  name: "Lede",
  level: "atom",
  status: "stable",
  summary: "The sentence under a title: what the block is, in one paragraph.",
  source: "src/components/Lede/Lede.tsx",
  composes: [],
  dependencies: [],
  props: {
    children: {
      type: "ReactNode",
      required: true,
      description: "The paragraph: one or two sentences about what the block gives.",
    },
    className: {
      type: "string",
      required: false,
      default: '""',
      description:
        "Extra classes, appended: the paragraph's own spacing and its measure. Not the size or the colour.",
    },
  },
  slots: [{ name: "children", description: "The paragraph, in the language of the page." }],
  states: [
    {
      name: "default",
      description: "One line of body text at 18px, or 20px from 640px up, in the dimmer ink.",
      trigger: "Initial render.",
    },
  ],
  events: [],
  motion: ["None. The paragraph does not move; the block around it may enter with its own motion."],
  accessibility: {
    role: "A <p>: a paragraph.",
    keyboard: [],
    aria: [],
    reducedMotion: "Nothing moves, so nothing changes.",
    contrast: "The dimmer ink (cream-dim) on the surface behind it: over 4.5:1 in both themes.",
    focus: "Not focusable: a paragraph is read, not reached.",
    targetSize: "not interactive",
    screenReader: "Reads the paragraph as it is written.",
  },
  content: {
    voice: [
      "One or two sentences, in the tú form, saying what the block gives rather than how it works.",
      "It may carry a question: the page asks the reader the thing it wants answered.",
    ],
    limits: ["Two sentences at most: 40 words on a phone, 60 on a desktop."],
    examples: [
      "Hasta 300 páginas, escaneadas o no. Cada pregunta sale de una página que puedes abrir.",
      "Pago único, sin suscripción. Empieza gratis.",
    ],
  },
  usage: {
    when: [
      "The paragraph under a title, when the block needs a sentence to introduce it.",
      "The paragraph under the title of a Widget.",
    ],
    whenNot: [
      {
        situation: "The title of the block",
        instead: "a SectionTitle: the lede is the sentence under it, never the title.",
      },
      {
        situation: "A hint under a form control",
        instead: "a Field's own hint, next to the control.",
      },
      {
        situation: "A message about what just happened",
        instead: "a Notice: the lede introduces, the notice answers.",
      },
    ],
    do: [
      "Say what the reader gets, in the first sentence.",
      "Leave a question at the end only if the page answers it further down.",
    ],
    dont: [
      "Don't repeat the title in the lede; the reader has just read it.",
      "Don't use it for body copy inside a block: that copy belongs to the block itself.",
    ],
  },
  tokens: ["--cream"],
  related: [
    {
      name: "SectionTitle",
      difference: "The title above it: the block's headline, in the page's own voice.",
    },
    {
      name: "Notice",
      difference: "A message about what just happened. This introduces a block.",
    },
  ],
  i18n: {
    rtl: "Nothing mirrors: the paragraph is text, and the page's direction carries it.",
    textExpansion:
      "The paragraph wraps and grows; it is never clamped. A third sentence in German is still a third sentence.",
    formatting: "None.",
    strings: [],
  },
  responsive: {
    behaviour: [
      "Phones: 18px, leading relaxed.",
      "From sm (640px): 20px.",
      "The paragraph wraps to as many lines as it needs, inside the column's measure.",
    ],
    minWidth: "320px",
  },
  designTool: {
    registryItem: "lede",
    importStatement: 'import { Lede } from "@mockio/design-system";',
    canvasProps: [],
    placement: "Under a title, before the block it introduces.",
  },
  appCounterpart: {
    file: "design-system/marketing.tsx",
    exportName: "Lede",
    differences: [
      "Spreads every other <p> attribute (id, lang, dir); the app's copy accepts only children and className.",
    ],
  },
  version: "1.0.0",
  changelog: [
    {
      version: "1.0.0",
      changes: [
        "First documented version, taken from the product's own copy of the public site's paragraph.",
      ],
    },
  ],
});
