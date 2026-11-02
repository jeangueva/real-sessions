import { defineContract } from "../../contract";

export const TagContract = defineContract({
  name: "Tag",
  level: "atom",
  status: "stable",
  summary: "A small coloured pill with a verdict in words on one piece of the student's work — how serious a risk is, whether an objective holds together.",
  source: "src/components/Tag/Tag.tsx",
  composes: [],
  dependencies: [],
  props: {
    children: {
      type: "ReactNode",
      required: true,
      description: "The verdict in 1–3 words, plain text: \"Grave\", \"Te costará puntos\", \"Coherente\". The words carry the meaning; the colour only sorts.",
    },
    tone: {
      type: '"attention" | "caution" | "positive" | "neutral"',
      required: false,
      default: '"neutral"',
      description:
        "What the verdict means for the student, named by meaning, not by colour, so the same tone serves a risk's severity and a coherence check. Pick it from the verdict, never to decorate.",
      values: {
        attention: "Deal with this first: a serious risk (\"Grave\"), an objective that does not hold (\"Incoherente\"). Step soft fill with step text — orange, never red.",
        caution: "It will cost something but is not the worst: \"Te costará puntos\", \"Débil\". Accent soft fill with accent text.",
        positive: "It holds: \"Coherente\". Grow soft fill with grow text.",
        neutral: "A minor point, about form rather than substance: \"De forma\". The lifted surface with cream-dim text, the quietest pill.",
      },
    },
    className: {
      type: "string",
      required: false,
      default: '""',
      description: "Extra classes, appended. For layout (mt-0.5, shrink-0 in a row) — not for recolouring the pill.",
    },
  },
  slots: [{ name: "children", description: "Plain text, 1–3 words. No icon: the pill is small and the words already say it." }],
  states: [
    { name: "attention", description: "Step soft fill, step text: the verdict to deal with first.", trigger: "tone=\"attention\"" },
    { name: "caution", description: "Accent soft fill, accent text: it will cost something.", trigger: "tone=\"caution\"" },
    { name: "positive", description: "Grow soft fill, grow text: it holds.", trigger: "tone=\"positive\"" },
    { name: "neutral", description: "The lifted surface with cream-dim text: a minor point.", trigger: "tone=\"neutral\" (the default)" },
  ],
  events: [],
  motion: ["None. A tag does not move, appear with a transition or pulse: a verdict is a fact on the page, read at the reader's pace."],
  accessibility: {
    role: "generic (native <span>)",
    keyboard: [],
    aria: [
      { attribute: "none", managedBy: "component", note: "The text is the verdict and is read inline. The tone is not announced and needs no aria: the words already say it." },
      {
        attribute: "aria-hidden / sr-only context",
        managedBy: "consumer",
        note: "When the tag sits inside a <summary> or a list item, the item's own text comes after it; keep the tag first so a screen reader hears the verdict, then what it is about.",
      },
    ],
    reducedMotion: "Nothing moves, so nothing changes under prefers-reduced-motion: reduce.",
    contrast:
      "Text on its own soft fill: dark theme step 7.05:1, accent 8.86:1, grow 7.43:1; light theme step 4.74:1, accent 4.81:1, grow 4.72:1 — all ≥ 4.5:1 at text-xs semibold. Neutral is cream-dim on the lifted surface, ≥ 9.2:1 in both themes. The colour is never the only signal: the words are always printed.",
    focus: "Not focusable.",
    targetSize: "not interactive",
    screenReader: "Read as its text (\"Grave\"), inline, before the item it qualifies. A sighted reader also sees the colour; a screen-reader user loses nothing, because each verdict is a different word.",
  },
  content: {
    voice: [
      "A verdict on the work, never on the person: \"Grave\" describes the risk, \"Débil\" the objective.",
      "An adjective or a short phrase in sentence case, no period: \"Grave\", \"Te costará puntos\", \"De forma\", \"Coherente\".",
      "Tú when it addresses the student: \"Te costará puntos\".",
      "Every tone in a list uses a different word, so the colour is never needed to tell them apart.",
    ],
    limits: ["1–3 words, ≤ 20 characters. A verdict that needs a sentence is body text next to the tag."],
    examples: ["Grave", "Te costará puntos", "De forma", "Coherente", "Débil", "Incoherente"],
  },
  usage: {
    when: [
      "How serious each risk in the thesis diagnosis is: Grave, Te costará puntos, De forma.",
      "Whether each objective of the consistency matrix holds together: Coherente, Débil, Incoherente.",
      "Any short verdict on one item in a list of the student's work, where the colour helps the eye sort the list.",
    ],
    whenNot: [
      { situation: "A status of the screen or of a call (the mode, a setting, something in progress)", instead: "Badge." },
      { situation: "A score or a proportion", instead: "Meter, or ScoreRing for the headline score." },
      { situation: "A message about what just happened", instead: "Notice." },
      { situation: "Something the user can press, select or remove", instead: "Action (ghost) or Segmented. A Tag has no focus and no press." },
      { situation: "Marking an option as part of the paid plan", instead: "PremiumMark." },
    ],
    do: [
      "Pick the tone from the verdict: one mapping per list, the same everywhere it appears.",
      "Put the tag before the item it qualifies, so it is read first.",
      "Sort a list from the most serious to the least, as the diagnosis does.",
    ],
    dont: [
      "Don't use a Tag for a status of the screen; that is a Badge.",
      "Don't recolour it with className, and never red.",
      "Don't use two tones for the same word, or one word in two tones.",
    ],
  },
  tokens: ["--step-soft", "--step-text", "--accent-soft", "--accent-text", "--grow-soft", "--grow-text", "--surface-lift", "--surface-lift-alpha", "--cream"],
  related: [
    { name: "Badge", difference: "A status of the screen in neutral cream, never recoloured to mean anything; Tag is a verdict on a piece of the student's work and its colour follows the verdict." },
    { name: "Meter", difference: "A quantity on a scale; Tag is a verdict in words." },
    { name: "ScoreRing", difference: "The headline score as a number; Tag qualifies one item in a list." },
    { name: "PremiumMark", difference: "Marks an option as paid; Tag judges a piece of work." },
  ],
  i18n: {
    rtl: "The pill follows the reading order: in a row it sits at the start, on the right in Arabic and Hebrew. Nothing inside mirrors.",
    textExpansion:
      "The pill grows with its text. Portuguese and English run about as long (\"Vai custar nota\", \"Will cost marks\"); a verdict too long for its row wraps inside the pill, which is the sign to shorten it.",
    formatting: "None: the words arrive translated from the caller (thesis-copy.ts in the product).",
    strings: [],
  },
  responsive: {
    behaviour: [
      "The same size at every width.",
      "In a row beside the item it qualifies, give it shrink-0 so it keeps its words on one line while the item's text wraps at 320px.",
    ],
    minWidth: "64px",
  },
  designTool: {
    registryItem: "tag",
    importStatement: 'import { Tag } from "@mockio/design-system";',
    canvasProps: ["children", "tone"],
    placement: "At the start of a list row (a risk in the diagnosis) or at its end (an objective in the consistency matrix), inside a card. One per item.",
  },
  appCounterpart: {
    file: "platform/Thesis.tsx",
    exportName: "Thesis",
    differences: [
      "The product has no Tag component: it draws the pill inline in the thesis diagnosis (the unexported Diagnosis view that Thesis renders), from two class tables, SEVERITY and STATUS. Thesis is the closest real export, so the drift test catches the file moving or being renamed, but not a change to the inline markup — compare the classes by hand when either table changes.",
      "The product's two tables map a key straight to classes (alta, media, baja; coherente, debil, incoherente); here the tone is the meaning, shared by both: alta and incoherente → attention, media and debil → caution, coherente → positive, baja → neutral.",
      "Adds inline-flex items-center, so a tag in a flex row centres its text the same way as Badge; the product's span is inline.",
      "Accepts className and native span attributes; the product's layout classes (mt-0.5 shrink-0 on the severity pill) are passed through className.",
    ],
  },
  version: "1.0.0",
  changelog: [{ version: "1.0.0", changes: ["First documented version, extracted from the pills drawn inline in the product's thesis diagnosis."] }],
});
