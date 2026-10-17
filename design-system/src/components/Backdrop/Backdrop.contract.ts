import { defineContract } from "../../contract";

export const BackdropContract = defineContract({
  name: "Backdrop",
  level: "atom",
  status: "stable",
  summary: "The decorative field behind marketing heroes: slow drifting light, grain and a scrim, all CSS, and the stand-in for footage when there is none.",
  source: "src/components/Backdrop/Backdrop.tsx",
  composes: [],
  dependencies: ["framer-motion"],
  props: {
    variant: {
      type: '"hero" | "section"',
      required: false,
      default: '"hero"',
      description: "How much light. Picks the number of lights and how far they sit from the frame.",
      values: {
        hero: "The full field: the pale lift from below, the navy across the top-left and a third, fainter light on the right.",
        section: "A quieter field for mid-page: the lift and the navy pushed further out of frame, no third light.",
      },
    },
    still: {
      type: "boolean",
      required: false,
      default: "false",
      description: "Renders the same composition with no drift. For contexts that must not move — a video's poster frame, a print, a screenshot. Reduced motion stills it without this prop.",
    },
    className: {
      type: "string",
      required: false,
      default: '""',
      description: "Extra classes on the layer, appended: a z-index, or a rounded corner when the parent does not clip. Not for colour.",
    },
  },
  slots: [],
  states: [
    { name: "default", description: "The lights drift on 34s, 46s and 58s loops (the section variant runs the first two). Nothing on top of it appears to move.", trigger: "Initial render, still={false}, no reduced-motion preference." },
    { name: "still", description: "The same composition with no drift class: each light at rest in its place, at scale 1 and full opacity.", trigger: "still={true}, or prefers-reduced-motion: reduce at mount." },
  ],
  events: [],
  motion: [
    "Three CSS loops from the preset: drift-slow (34s, translate + scale + opacity), drift-wide (46s, translate + scale) and drift-counter (58s, translate + scale + opacity), all cubic-bezier(0.45, 0, 0.55, 1), infinite.",
    "Only transform and opacity animate, on blurred layers the GPU composites, so the drift never triggers layout or paint.",
    "The periods are long on purpose: a minute is slow enough that text on top never seems to move.",
    "Reduced motion: no animation class is applied at all (see accessibility.reducedMotion).",
  ],
  accessibility: {
    role: "none — a presentational layer, aria-hidden",
    keyboard: [],
    aria: [
      { attribute: "aria-hidden", managedBy: "component", note: "Always set. The field carries no information." },
      { attribute: "pointer-events: none", managedBy: "component", note: "Not ARIA, but the same promise for the pointer: clicks and taps go through to the content above." },
    ],
    reducedMotion: "The component calls framer-motion's useReducedMotion() and, when the user asks for reduced motion, applies no drift class — it renders exactly as still={true}, with no app-level MotionConfig needed. The preference is read when the component mounts; a change mid-visit is caught by the package stylesheet's reduced-motion block (src/styles.css), which ends every animation after 0.01ms.",
    contrast: "Decorative, so it has no contrast requirement of its own; it is built so that light ink over it holds AA anywhere. At its brightest point — both pale lights at full strength under the 10% middle of the scrim, about rgb(69 69 69) before grain — cream-bright text is 9.2:1 and cream-dim 6.9:1. Dark ink never goes on it. On the light theme .backdrop-field dims the whole layer to 28%.",
    focus: "Never focusable.",
    targetSize: "not interactive",
    screenReader: "Nothing. Assistive technology skips the whole layer; whatever sits on top is read normally.",
  },
  content: {
    voice: [
      "The field has no copy. What sits on it is a hero: a short line in the product's voice, not marketing fluff — \"Sustenta antes de sustentar.\"",
      "The field is atmosphere, not a picture of the product. When there is footage, show the footage (HeroVideo).",
    ],
    limits: ["Copy on top: a headline and one supporting sentence; long reading text belongs on a plain surface."],
    examples: ["Sustenta antes de sustentar.", "Un jurado de 3 que leyó tu tesis te pregunta por voz, repregunta como el de verdad y te deja un acta de 0 a 20."],
  },
  usage: {
    when: [
      "Behind a marketing hero when there is no footage, or underneath footage while it loads (HeroVideo does both).",
      "A mid-page marketing section that needs light rather than a flat ground (variant section).",
    ],
    whenNot: [
      { situation: "Any signed-in screen: the thesis workspace, a rehearsal, an acta, settings", instead: "The surface tokens (surface-deep, a Panel). Nothing decorative competes with the sentence someone is reading while nervous." },
      { situation: "There is real footage for the hero", instead: "HeroVideo, which composes Backdrop underneath as its fallback." },
      { situation: "Behind long reading text, a form or a pricing table", instead: "A plain surface (Section on surface-deep). The drift and the grain cost legibility exactly where it is needed." },
      { situation: "A section on the light theme that wants a soft tint", instead: "surface-deep or accent-soft. On a light page the field dims to a hint of itself, by design." },
    ],
    do: [
      "Give it a positioned parent that clips: relative isolate overflow-hidden.",
      "Give the parent a dark ground (bg-black, or on-media with bg-surface-base); the field paints light, not a ground.",
      "Put the copy above it with relative z-10.",
      "Pass still when the field is under something that is not moving either (a paused video, a print).",
    ],
    dont: [
      "Don't put dark ink on it, or drop it on a light section to make a grey wash.",
      "Don't stack two Backdrops, or add your own grain: it already has some.",
      "Don't use it inside the app.",
    ],
  },
  tokens: ["--cream", ".on-media", ".backdrop-field", ".noise-overlay", "animate-drift-slow", "animate-drift-wide", "animate-drift-counter"],
  related: [
    { name: "HeroVideo", difference: "The hero's footage. It composes Backdrop underneath and falls back to it when there is no video." },
    { name: "Section", difference: "Owns a marketing section's rhythm and ground; Backdrop is the light inside one." },
    { name: "Panel", difference: "A surface that holds content; Backdrop holds nothing and sits behind." },
  ],
  i18n: {
    rtl: "Does not mirror. The lights are placed physically (navy top-left, third light right) because they are a composition, not a reading direction.",
    textExpansion: "No text of its own. It fills its parent, so longer copy on top makes the parent taller and the field follows.",
    formatting: "None: the component renders no text, numbers or dates.",
    strings: [],
  },
  responsive: {
    behaviour: [
      "Fills its positioned parent (absolute inset-0) at every width and clips to it.",
      "The lights are sized in vmax, the viewport and not the parent, so the field keeps its proportions from a 320px phone to a wide desktop; a narrow frame on a wide screen shows a crop of it.",
    ],
    minWidth: "280px",
  },
  designTool: {
    registryItem: "backdrop",
    importStatement: 'import { Backdrop } from "@mockio/design-system";',
    canvasProps: ["variant", "still"],
    placement: "As the first child of a marketing hero or section that is relative, isolate, overflow-hidden and dark. Content goes above it with relative z-10. Never inside the app shell.",
  },
  appCounterpart: {
    file: "design-system/backdrop.tsx",
    exportName: "Backdrop",
    differences: [
      "The pale lights read rgb(var(--cream) / α) instead of the literal rgba(222,219,200,α) — the first palette's warm cream. They are now the current ink, #F5F5F7, a touch cooler.",
      "The layer carries on-media, so --cream resolves to the dark ink inside it in both themes and the lights stay light on the light theme.",
      "The navy (4 33 46), which has no token, is one named constant instead of two literals; the stale \"Velorah\" name is gone.",
      "Calls useReducedMotion() itself and applies no drift under reduced motion; the app's copy relies on index.css and on HeroVideo passing still.",
      "Adds className.",
    ],
  },
  version: "1.0.0",
  changelog: [
    {
      version: "1.0.0",
      changes: [
        "First documented version, extracted from the product.",
        "Cream literals moved to the --cream token; the navy kept as a documented constant.",
        "Reduced motion handled in the component.",
      ],
    },
  ],
});
