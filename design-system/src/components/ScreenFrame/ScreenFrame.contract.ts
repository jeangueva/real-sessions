import { defineContract } from "../../contract";

export const ScreenFrameContract = defineContract({
  name: "ScreenFrame",
  level: "atom",
  status: "stable",
  summary: "A piece of the product, drawn as the product draws it: a window with a hairline and the interface inside.",
  source: "src/components/ScreenFrame/ScreenFrame.tsx",
  composes: [],
  dependencies: [],
  props: {
    children: {
      type: "ReactNode",
      required: true,
      description: "The interface itself: a transcript, a card, a row of the real product.",
    },
    className: {
      type: "string",
      required: false,
      default: '""',
      description:
        "Extra classes, appended: the frame's own size and the padding of the interface inside it. Not the fill and not the edge.",
    },
    dark: {
      type: "boolean",
      required: false,
      default: "false",
      description: "The call is always dark, as a video call is, whatever the theme.",
    },
  },
  slots: [
    {
      name: "children",
      description:
        "The product, drawn as the product draws it. The frame clips what overflows it, so the content inside is laid out for the width it gets.",
    },
  ],
  states: [
    {
      name: "default",
      description: "The frame is a card-coloured window with a hairline around it, and the interface inside is padded by the caller.",
      trigger: "Initial render.",
    },
    {
      name: "dark",
      description:
        "The ground is the media ground, so the window reads as a lit screen in either theme and the ink inside stays light.",
      trigger: "dark={true}",
    },
  ],
  events: [],
  motion: ["None. The frame does not move; the interface inside it does whatever it does."],
  accessibility: {
    role: "A generic <div> with aria-hidden: the frame is a picture of the product.",
    keyboard: [],
    aria: [
      {
        attribute: "aria-hidden",
        managedBy: "component",
        note: "The frame is hidden from assistive technology. The page says the same thing in words next to it, and a screen reader that read both would say everything twice.",
      },
    ],
    reducedMotion: "Nothing moves, so nothing changes.",
    contrast: "None of its own: the frame has no text of its own beyond what the caller puts inside it.",
    focus: "Not focusable, and nothing inside it can be reached: the frame is a picture.",
    targetSize: "not interactive",
    screenReader: "Reads nothing: the whole frame is hidden, and the page's words carry it.",
  },
  content: {
    voice: ["None: the frame holds the product and never writes any of its own."],
    limits: ["Nothing: the frame is layout."],
    examples: [],
  },
  usage: {
    when: [
      "The public site: a piece of the product shown as the product draws it, next to the words that say what it is.",
      "Any place where the interface itself is the argument: a transcript, a card, the call.",
    ],
    whenNot: [
      {
        situation: "A real screen of the signed-in app",
        instead: "PageBody: the app is the window, and it does not need a frame around it.",
      },
      {
        situation: "A card of content with words in it",
        instead: "a Widget: the frame is for the interface, not for copy.",
      },
      {
        situation: "A video",
        instead: "nothing: the frame is a window, and a video brings its own.",
      },
    ],
    do: [
      "Put the real interface inside: the point of the frame is that it is the product.",
      "Say in words next to it what the frame shows, because the frame itself is silent.",
    ],
    dont: [
      "Don't put anything inside that has to be read or pressed: it is hidden from everyone but the eye.",
      "Don't use it to frame a whole page; an InsetFrame is the frame of a page.",
    ],
  },
  tokens: ["--surface-card", "--surface-base", "--line"],
  related: [
    {
      name: "Widget",
      difference: "A card of words: a label, a title and content. This is the product itself, framed.",
    },
    {
      name: "InsetFrame",
      difference: "The window the whole public page sits in. This is a window around one piece of the product.",
    },
    {
      name: "PageBody",
      difference: "The app's screen. This is a picture of the product, on the public site.",
    },
  ],
  i18n: {
    rtl: "Nothing mirrors: the frame is symmetric and the interface inside handles its own direction.",
    textExpansion: "Nothing changes: the frame is a window and the interface inside it grows with its language.",
    formatting: "None.",
    strings: [],
  },
  responsive: {
    behaviour: [
      "Phones: the frame is as wide as the column allows, and the interface inside is padded by the caller.",
      "From sm (640px): the same, with the caller's own padding.",
      "The frame never scrolls: what overflows it is clipped.",
    ],
    minWidth: "320px",
  },
  designTool: {
    registryItem: "screen-frame",
    importStatement: 'import { ScreenFrame } from "@mockio/design-system";',
    canvasProps: ["dark"],
    placement:
      "Inside a band of the public site, next to the words that explain it. Never around a whole page.",
  },
  appCounterpart: {
    file: "design-system/marketing.tsx",
    exportName: "ScreenFrame",
    differences: [
      "Spreads every other <div> attribute (id, data-*); the app's copy accepts only children, className and dark.",
    ],
  },
  version: "1.0.0",
  changelog: [
    {
      version: "1.0.0",
      changes: [
        "First documented version, taken from the product's own copy of the public site's window.",
      ],
    },
  ],
});
