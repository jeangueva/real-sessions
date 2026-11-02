import { defineContract } from "../../contract";

export const ChipContract = defineContract({
  name: "Chip",
  level: "atom",
  status: "stable",
  summary: "A fact in mono caps on an amber wash — a country the panel follows, the \"Recomendado\" over a tier. Never a control.",
  source: "src/components/Chip/Chip.tsx",
  composes: [],
  dependencies: [],
  props: {
    children: {
      type: "ReactNode",
      required: true,
      description: "The fact, in 1–3 words, written in sentence case: the style uppercases it. An icon at h-3.5 w-3.5 may lead it (gap-2).",
    },
    tone: {
      type: '"soft" | "accent"',
      required: false,
      default: '"soft"',
      description: "Which fill. Picks the background and the ink together, so each pairing keeps its contrast in both themes.",
      values: {
        soft: "bg-accent-soft with text-cream: a dark amber wash on the dark theme, a pale peach on the light one. For a row of facts (the countries).",
        accent: "bg-accent with text-accent-ink: the amber fill in both themes. For the one chip that marks the recommended tier.",
      },
    },
    className: {
      type: "string",
      required: false,
      default: '""',
      description: "Extra classes, appended. Layout only (shrink-0, margin) — not a fill, a colour or a radius: that is tone.",
    },
  },
  slots: [{ name: "children", description: "Text, optionally led by one small aria-hidden icon. No link, no button, no close mark." }],
  states: [
    {
      name: "default",
      description: "An inline-flex <span>, rounded-lg (8px), px-3 py-1.5, font-mono text-xs medium, uppercase with 0.06em tracking, in the tone's fill and ink. Static.",
      trigger: "Initial render.",
    },
  ],
  events: [],
  motion: ["None. A chip is a fact; it does not press, hover or animate."],
  accessibility: {
    role: "none of its own (a plain <span>); a row of chips is a <ul> of <li>",
    keyboard: [],
    aria: [{ attribute: "lang / id / data-*", managedBy: "consumer", note: "Native <span> attributes pass through. Pass lang when the fact's language differs from the page." }],
    reducedMotion: "Nothing moves, so nothing changes.",
    contrast:
      "soft: cream on accent-soft is 11.0:1 on dark and 13.3:1 on light. accent: accent-ink on accent is 7.7:1 in both themes. The soft fill against the card or page is decoration (1.18:1 and 1.43:1 on dark, ≤ 1.07:1 on light), so the chip's edge carries nothing.",
    focus: "Not focusable: a chip is never a control.",
    targetSize: "not interactive",
    screenReader: "Read as its words, in sentence case (the uppercase is CSS). A row of chips in a <ul> is announced as a list with its count.",
  },
  content: {
    voice: ["A noun or a short noun phrase, sentence case in the source, no period: \"Perú\", \"Recomendado\".", "A fact the reader can check, not a pitch and not an instruction."],
    limits: ["1–3 words, ≤ 20 characters. Spaced mono caps run wide; a chip that wraps is a sentence."],
    examples: ["Perú", "Brasil", "Colombia", "Chile", "Argentina", "Recomendado"],
  },
  usage: {
    when: [
      "A row of facts on the landing: the countries whose jury format the panel follows, after a MonoLabel lead-in.",
      "The one chip that marks the recommended tier: tone=\"accent\", in the featured Widget's header.",
    ],
    whenNot: [
      { situation: "Something the person presses, toggles or dismisses", instead: "Action for a step, Segmented for a choice of one among a few." },
      { situation: "The status of the current screen or call", instead: "Badge." },
      { situation: "The name of a card or a section", instead: "MonoLabel." },
      { situation: "A ticked item of what a plan includes", instead: "CheckItem." },
    ],
    do: ["Put a row of chips in a <ul>, one <li> per chip.", "Write the fact in sentence case and let the style uppercase it.", "Use tone=\"accent\" for one chip per view."],
    dont: ["Don't give a chip an onClick or a hover.", "Don't recolour it with bg-* or a hex value; pick the tone.", "Don't write a sentence in a chip."],
  },
  tokens: ["--accent-soft", "--accent", "--accent-ink", "--cream", "font-mono"],
  related: [
    { name: "Badge", difference: "A pill with a status of the screen, sometimes live; Chip is a static fact in mono caps." },
    { name: "Segmented", difference: "A row of options where one is chosen; chips are never chosen." },
    { name: "MonoLabel", difference: "Names a block in the same mono caps, with no fill; a chip is a fact on a fill." },
  ],
  i18n: {
    rtl: "Follows the document direction; a leading icon moves to the right. Nothing mirrors. Scripts without case are unaffected by the uppercase.",
    textExpansion: "The chip grows with its text and does not wrap inside a row of chips (flex-wrap on the list moves it to the next line). Portuguese and German country names run about as long.",
    formatting: "None: the caller passes the text. The landing names countries with Intl.DisplayNames in the page's locale.",
    strings: [],
  },
  responsive: {
    behaviour: ["The same size at every width.", "A row of chips wraps (flex flex-wrap gap-2); beside a MonoLabel lead-in it stacks under it on phones (flex-col, md:flex-row)."],
    minWidth: "64px",
  },
  designTool: {
    registryItem: "chip",
    importStatement: 'import { Chip } from "@mockio/design-system";',
    canvasProps: ["children", "tone"],
    placement: "In a <ul> row of facts on a landing band, or in a Widget's header beside its MonoLabel. Never inside a button or a link.",
  },
  appCounterpart: {
    file: "components/marketing.tsx",
    exportName: "Chip",
    differences: [
      "Fill: bg-accent-soft (the theme's amber wash). The product uses a literal peach, bg-[#F8E8CD], the same in both themes; on the dark theme the system's chip is a dark amber wash instead of a light peach chip.",
      "Ink: text-cream. The product uses a literal near-black, text-[#2E2D2A] (11.4:1 on its peach). text-accent-ink on accent-soft would read 11.4:1 on light but 1.06:1 on dark, so the ink follows the theme instead.",
      "Radius: rounded-lg (8px). The product uses rounded-[0.5625rem] (9px).",
      "tone=\"accent\" (bg-accent text-accent-ink) replaces the product's className \"!bg-[#FBD06A]\" override on the recommended tier's chip.",
      "Spreads native <span> attributes (id, lang, data-*); the product's copy accepts children and className only.",
    ],
  },
  version: "1.0.0",
  changelog: [{ version: "1.0.0", changes: ["First documented version, extracted from the product's landing, on theme tokens instead of literal colours.", "tone=\"accent\" replaces the product's !bg-[#FBD06A] override."] }],
});
