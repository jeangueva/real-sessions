import { defineContract } from "../../contract";

export const ShimmerTextContract = defineContract({
  name: "ShimmerText",
  level: "atom",
  status: "beta",
  summary: "A word with a slow, soft light crossing it every few seconds — the one quiet flourish that says the paid plan is on.",
  source: "src/components/ShimmerText/ShimmerText.tsx",
  composes: [],
  dependencies: ["framer-motion"],
  props: {
    children: {
      type: "string",
      required: true,
      description: "The text the light crosses, as a plain string: one to three words, usually the plan's name.",
    },
    speed: {
      type: "number",
      required: false,
      default: "2.4",
      description: "Seconds the light takes to cross the text once. Higher is slower. Zero, negative or non-finite values fall back to 2.4.",
    },
    pause: {
      type: "number",
      required: false,
      default: "4",
      description: "Seconds the text stays still between two sweeps. 0 runs them back to back; negative or non-finite values count as 0.",
    },
    disabled: {
      type: "boolean",
      required: false,
      default: "false",
      description: "Stops the sweep and draws the text in the base colour, in the same box, so nothing shifts when it switches.",
    },
    className: {
      type: "string",
      required: false,
      default: '""',
      description: "Extra classes, appended. For type size, weight and layout (text-xs font-semibold) — not for colour, which the tokens set.",
    },
  },
  slots: [{ name: "children", description: "A plain string, no elements, so the light crosses one run of text and a screen reader reads it as written." }],
  states: [
    {
      name: "default",
      description:
        "The text in accent-text; once every speed + pause seconds a band of cream-bright crosses it in reading order. Left to right, each cycle opens with the pause, so the first sweep comes `pause` seconds after mount.",
      trigger: "Initial render, motion allowed.",
    },
    {
      name: "disabled",
      description: "No sweep and no gradient: plain accent-text in the same inline-block box.",
      trigger: "disabled={true}",
    },
  ],
  events: [],
  motion: [
    "One cycle lasts speed + pause seconds and repeats for as long as the component is mounted: the text stays still for `pause` seconds (4 by default), then the light crosses it in `speed` seconds (2.4 by default) at a constant rate (linear). The first sweep therefore comes `pause` seconds after mount.",
    "Only background-position animates, from one keyframe; per-instance timing comes from an inline background-size and animation-duration. It repaints the text's own box each frame and never triggers layout — keep it to one instance per view.",
    "Right-to-left: under :dir(rtl) the animation runs in reverse, so the light travels right to left, in reading order. There each cycle opens with the sweep and the pause follows.",
    "Reduced motion: no sweep and no gradient; the text is drawn in the base colour.",
  ],
  accessibility: {
    role: "generic (native <span>) holding real text",
    keyboard: [],
    aria: [
      {
        attribute: "aria-label / aria-hidden",
        managedBy: "component",
        note: "Deliberately absent. The visible text is the DOM text, so it is read, translated, found and selected as written.",
      },
    ],
    reducedMotion:
      "Under prefers-reduced-motion: reduce the sweep never runs and the text is plain accent-text. useReducedMotion() from framer-motion chooses the static branch when the component mounts; a prefers-reduced-motion media query in its own <style> covers a server render and a setting changed while the page is open. No MotionConfig provider is needed.",
    contrast:
      "Every pixel is a mix of accent-text (the base) and cream-bright (the light), and in both themes the mix is never lower in contrast than the base. On the product's chip (accent-soft) that is ≥ 4.65:1 dark and ≥ 4.92:1 light at every frame; on page and card surfaces ≥ 4.94:1 dark and ≥ 5.19:1 light. Not for a surface-lift row in a dark card (4.05:1) or an accent fill (1.47:1). Selected text is drawn in accent-ink on accent (≥ 5:1). Forced-colours mode drops the gradient and draws CanvasText; print, and a browser that cannot clip a background to text, draw plain accent-text, so it never renders or prints blank.",
    focus: "Not focusable.",
    targetSize: "not interactive",
    screenReader:
      "Read as its text, exactly as written; the light is not announced, and nothing is hidden or relabelled. A sighted reader sees the sweep; a screen-reader user loses nothing by not hearing it.",
  },
  content: {
    voice: [
      "A name, not a message: the plan's name as the product writes it, \"Premium\".",
      "Written exactly as the name is cased; no punctuation.",
      "Never a call to action and never a claim about the plan: the light already draws the eye.",
    ],
    limits: ["1–3 words. The crossing takes `speed` seconds whatever the length, so on a long line the light moves faster and reads as a flicker."],
    examples: ["Premium", "Pack Sustentación", "Asesor Pro"],
  },
  usage: {
    when: ["Saying, once and quietly, that the paid plan is on for this person: the \"Premium\" chip in the app's top bar."],
    whenNot: [
      { situation: "A call to action", instead: "Action with tone solid. Emphasis comes from tone, not from motion." },
      { situation: "Marking an option as part of the paid plan", instead: "PremiumMark." },
      { situation: "Headlines, body copy or numbers", instead: "Plain text; WordsPullUp or FadeRise for an entrance that happens once." },
      { situation: "Showing that something is loading", instead: "DotMatrix, or a sentence that names what is loading." },
    ],
    do: [
      "One per view, in the chrome, on accent-soft or a page or card surface.",
      "Pass disabled where the screen already moves (a live call, a video).",
      "Size it with className (text-xs font-semibold), never colour it.",
    ],
    dont: [
      "Don't put it on an Action or any accent fill.",
      "Don't shimmer several things at once.",
      "Don't pass elements as children.",
    ],
  },
  tokens: ["--accent-text", "--cream-bright", "--accent", "--accent-ink"],
  related: [
    { name: "PremiumMark", difference: "Marks each option that needs the paid plan; ShimmerText says once that the plan is on." },
    { name: "Badge", difference: "A status in a still pill, with a breathing dot when live; ShimmerText moves the light across the word itself." },
  ],
  i18n: {
    rtl: "The sweep reverses under :dir(rtl) so the light travels in reading order. Nothing else mirrors: the gradient and the glyphs are drawn as usual.",
    textExpansion:
      "An inline-block that grows with its text. A translation too long for its box wraps inside it and the light crosses every line at once; the crossing still takes `speed` seconds, so keep translations as short as the original.",
    formatting: "None: the text is the caller's.",
    strings: [],
  },
  responsive: {
    behaviour: [
      "The same at every width; size comes from the caller's text classes.",
      "Where it appears is the caller's call: the product hides the top-bar chip below 640px (hidden sm:inline-flex).",
    ],
    minWidth: "64px",
  },
  designTool: {
    registryItem: "shimmer-text",
    importStatement: 'import { ShimmerText } from "@mockio/design-system";',
    canvasProps: ["children", "speed", "pause", "disabled"],
    placement: "Inside the small chip in the app's top bar (rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold). One per view.",
  },
  appCounterpart: null,
  version: "0.1.0",
  changelog: [
    {
      version: "0.1.0",
      changes: [
        "First version. A clean-room replacement for the vendored text shine behind the product's top-bar \"Premium\" chip (PremiumShine in platform/AppShell.tsx): CSS only, colours from tokens instead of resolved props, reduced motion checked by the component itself.",
      ],
    },
  ],
});
