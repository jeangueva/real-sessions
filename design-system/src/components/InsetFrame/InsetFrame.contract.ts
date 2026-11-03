import { defineContract } from "../../contract";

export const InsetFrameContract = defineContract({
  name: "InsetFrame",
  level: "template",
  status: "stable",
  summary: "The frame the public site's content sits in: a rounded window, inset from the edge of the screen.",
  source: "src/components/InsetFrame/InsetFrame.tsx",
  composes: [],
  dependencies: [],
  props: {
    children: {
      type: "ReactNode",
      required: true,
      description:
        "The content the frame holds: a screen, a document, a page of the public site.",
    },
    className: {
      type: "string",
      required: false,
      default: '""',
      description:
        "Extra classes, appended. For the frame's own surface — a background, a shadow — not for the padding.",
    },
  },
  slots: [
    {
      name: "children",
      description:
        "One page. The frame clips what overflows it, so the content inside is laid out for the width it gets, not for the window.",
    },
  ],
  states: [
    {
      name: "default",
      description:
        "The content fills the window with 8px around it on a phone and 12px from md up; the frame's corners are 10px on a phone and 28px from md up.",
      trigger: "Initial render.",
    },
  ],
  events: [],
  motion: [
    "None. The frame does not move; the page inside it scrolls.",
  ],
  accessibility: {
    role: "A generic <div> inside another <div>: the padding and the corners, nothing more.",
    keyboard: [],
    aria: [
      {
        attribute: "overflow",
        managedBy: "component",
        note: "The frame clips what does not fit. Anything that must be reachable has to be reachable inside it, not behind it.",
      },
    ],
    reducedMotion: "Nothing moves, so nothing changes.",
    contrast: "None of its own: the frame has no text and no surface of its own beyond what the caller puts on it.",
    focus: "Not focusable itself. Focus moves through the page inside it, and nothing is trapped at the frame's edge.",
    targetSize: "not interactive",
    screenReader:
      "Adds nothing to what a screen reader reads: it is a generic container with no role and no name.",
  },
  content: {
    voice: ["None: the frame holds content and never writes any of its own."],
    limits: ["Nothing: the frame is layout."],
    examples: [],
  },
  usage: {
    when: [
      "The public site: the page sits in a rounded window, inset from the edge of the screen.",
      "Any full-height surface that should read as a document on a table.",
    ],
    whenNot: [
      {
        situation: "A screen inside the signed-in app",
        instead: "PageBody: the app is the window, and it does not need a frame around it.",
      },
      {
        situation: "A card inside a page",
        instead: "Panel: a frame the size of its content, not of the screen.",
      },
      {
        situation: "Content that must be read in the browser's own scroll",
        instead: "nothing — the frame clips, and a long page inside it has to scroll inside it.",
      },
    ],
    do: [
      "Let the frame fill the height it is given; it is a viewport frame, not a box.",
      "Keep one frame per page: a frame inside a frame is a picture of a picture.",
    ],
    dont: [
      "Don't nest an InsetFrame inside another one.",
      "Don't use it for the app's screens; it would put a second window inside the first.",
    ],
  },
  tokens: ["--surface-base", "--surface-deep"],
  related: [
    { name: "PageBody", difference: "The content container of the app's screens; this one frames the public site." },
    { name: "Panel", difference: "A card the size of its content; the frame is the size of the screen." },
  ],
  i18n: {
    rtl: "Nothing mirrors: the frame is symmetric and the page inside it handles its own direction.",
    textExpansion: "Nothing changes: the frame holds the page, and the page grows with its language.",
    formatting: "None.",
    strings: [],
  },
  responsive: {
    behaviour: [
      "Phones: 8px of padding around the content, 10px corners.",
      "From md (768px): 12px of padding, 28px corners.",
      "The content inside keeps its own responsive rules; the frame only clips and pads.",
    ],
    minWidth: "320px",
  },
  designTool: {
    registryItem: "inset-frame",
    importStatement: 'import { InsetFrame } from "@mockio/design-system";',
    canvasProps: [],
    placement:
      "The outermost element of a public page. One per page, above the page's own layout.",
  },
  appCounterpart: {
    file: "design-system/primitives.tsx",
    exportName: "InsetFrame",
    differences: ["None: the app's copy is this component, prop for prop."],
  },
  version: "1.0.1",
  changelog: [
    { version: "1.0.1", changes: ["Nothing changes for a screen: the alternative for a page that has to scroll is named in plain words now."] },
    { version: "1.0.0", changes: ["First documented version, taken from the product's own copy of the component."] },
  ],
});
