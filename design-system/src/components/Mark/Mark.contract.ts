import { defineContract } from "../../contract";

export const MarkContract = defineContract({
  name: "Mark",
  level: "atom",
  status: "stable",
  summary: "The isologo: Mocki the parrot as three shapes on the indigo tile, in the brand's fixed colours, legible down to 16px.",
  source: "src/components/Mark/Mark.tsx",
  composes: [],
  dependencies: [],
  props: {
    size: {
      type: "number",
      required: false,
      default: "32",
      description: "Width and height in px, written as the SVG's width and height attributes. A className with h-/w- (for example h-[1.3em] w-[1.3em]) overrides it.",
    },
    label: {
      type: "string",
      required: false,
      description: "The accessible name. With a non-empty label the SVG becomes role=\"img\" with that aria-label; without one (or with an empty or whitespace-only one) it is aria-hidden. Pass it only when the mark stands alone and nothing next to it already says the name. No default: decorative is the default.",
    },
    className: {
      type: "string",
      required: false,
      default: '""',
      description: "Extra classes on the <svg>, appended after shrink-0. For sizing in em, a rounded corner that matches a shadow (rounded-[0.55rem] shadow-card), or margin — never for colour.",
    },
  },
  slots: [],
  states: [
    { name: "default", description: "Decorative: aria-hidden, no role, not announced. The tile, crest, head, eye and beak in the brand colours.", trigger: "Initial render, label omitted or empty." },
    { name: "named", description: "Looks identical. Carries role=\"img\" and the label as aria-label, so a screen reader announces it as an image with that name.", trigger: "label=\"Mockio\" (any non-empty string)." },
  ],
  events: [],
  motion: ["None. The mark never animates: it is the one thing on the screen that stays put."],
  accessibility: {
    role: "none while decorative (aria-hidden); img when label is set",
    keyboard: [],
    aria: [
      { attribute: "aria-hidden", managedBy: "component", note: "Set to true when there is no label, so a mark beside the written name is not announced twice." },
      { attribute: "role=\"img\" + aria-label", managedBy: "component", note: "Set from label when it is non-empty. The text itself is the consumer's: \"Mockio\" is the brand name and is not translated." },
      { attribute: "focusable=\"false\"", managedBy: "component", note: "Always set, so legacy Edge and IE do not put the SVG in the tab order." },
      { attribute: "aria-label (on the wrapping link)", managedBy: "consumer", note: "A mark used as the home link keeps label empty and names the link instead: <a aria-label=\"Mockio\">." },
    ],
    reducedMotion: "Nothing to reduce: the mark has no motion.",
    contrast: "Brand colours, not tokens, so the figures are the same in both themes. The tile is ≥ 3:1 against every surface token (tightest: surface-card on dark, 3.0:1; 5.6:1 on the light page). The white head is 5.6:1 on the tile and the eye 14.4:1 on the head. The orange beak is 2.6:1 on the tile — it is a detail of the drawing, not what identifies it.",
    focus: "Never focusable. When the mark is a link, the link carries .focus-ring.",
    targetSize: "not interactive",
    screenReader: "Silent by default. With label=\"Mockio\" it is announced as \"Mockio, image\" (wording varies by reader).",
  },
  content: {
    voice: [
      "The label, when there is one, is the brand name and nothing else: \"Mockio\". Not \"Logo de Mockio\" — the role already says it is an image.",
      "The name is never translated: \"Mockio\" in every locale, so the label is not a dictionary string.",
    ],
    limits: ["label: the brand name only, one word."],
    examples: ["Mockio"],
  },
  usage: {
    when: [
      "The product's corner of the app shell, beside or instead of the written name (the top bar at 30px).",
      "Any place the brand must be recognisable in a square: an icon tile, a compact header.",
      "Inside Wordmark, which composes it at the height of the name.",
    ],
    whenNot: [
      { situation: "The brand needs to be read, not only recognised (landing nav, footer, sign-in)", instead: "Wordmark — the mark and the name as one lockup." },
      { situation: "Showing the user's progress or a friendly face in an empty state, an error or a level-up", instead: "Mascot — the full illustrated Mocki, in one of its six stages." },
      { situation: "A decorative background behind marketing copy", instead: "Backdrop. The mark is an identifier, not a pattern; never tile or repeat it." },
    ],
    do: [
      "Leave it decorative when the name is written next to it, and name the link instead.",
      "Give the tile's corner to the shadow with a matching rounded class when you add shadow-card.",
      "Keep it at 16px or larger: it is drawn to read at favicon size and no smaller.",
    ],
    dont: [
      "Don't recolour it with className, filters or currentColor: the colours are the brand.",
      "Don't rotate, stretch, outline or mirror it, in any direction or locale.",
      "Don't put text on top of it or crop the tile.",
    ],
  },
  tokens: [],
  related: [
    { name: "Wordmark", difference: "The mark and the lowercase name together; Mark alone is the square." },
    { name: "Mascot", difference: "The full illustrated character with six growth stages; Mark is the reduced, fixed logo." },
  ],
  i18n: {
    rtl: "Never mirrors. A logo is the same drawing in every direction; nothing in the SVG reads the document direction.",
    textExpansion: "No text, so nothing expands.",
    formatting: "None. The only string is label, which is the caller's and, by the brand rule, always \"Mockio\".",
    strings: [],
  },
  responsive: {
    behaviour: [
      "A fixed square at size px at every width; it does not scale with the viewport unless the caller sizes it in em or with a responsive class.",
      "shrink-0, so a flex row never squeezes it into an oval.",
    ],
    minWidth: "16px",
  },
  designTool: {
    registryItem: "mark",
    importStatement: 'import { Mark } from "@mockio/design-system";',
    canvasProps: ["size", "label"],
    placement: "Top-left of an app shell or a small header, on any surface. Give it at least a quarter of its size of clear space on every side.",
  },
  appCounterpart: {
    file: "design-system/mark.tsx",
    exportName: "Mark",
    differences: [
      "Adds label: with it the SVG is role=\"img\" with an aria-label. The app's copy is always aria-hidden and relies on the wrapping link's name.",
      "The colours are named constants (BRAND.tile, BRAND.beak, BRAND.head, BRAND.eye) instead of inline literals; the values are identical (#fff is written #FFFFFF).",
    ],
  },
  version: "1.0.0",
  changelog: [{ version: "1.0.0", changes: ["First documented version, extracted from the product.", "Added the optional label for a mark that stands alone."] }],
});
