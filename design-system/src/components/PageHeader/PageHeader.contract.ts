import { defineContract } from "../../contract";

export const PageHeaderContract = defineContract({
  name: "PageHeader",
  level: "template",
  status: "stable",
  summary: "The title block of every app screen: the page's only h1, one line of meta and the screen's actions, on the same container as PageBody.",
  source: "src/components/PageHeader/PageHeader.tsx",
  composes: [],
  dependencies: [],
  props: {
    title: {
      type: "string",
      required: true,
      description: "The screen's name, rendered as the page's only h1. Short and specific: \"Mi tesis\", \"Tu camino\", \"Ajustes\".",
    },
    meta: {
      type: "string",
      required: false,
      description:
        "One line under the title: what the screen is for, or the one fact that places it (a count, the thesis it is about). Clamped to one line with an ellipsis; the full text stays in the DOM and in a title tooltip. Omitted or empty, nothing renders.",
    },
    actions: {
      type: "ReactNode",
      required: false,
      description: "Controls at the end of the title row: one Action, or a few Badges that state the screen's mode. On a phone they wrap under the title.",
    },
    compact: {
      type: "boolean",
      required: false,
      default: "false",
      description:
        "For a screen whose content is the point, like a call: on phones the title drops from 32px to 20px and the space above from 32px to 16px. From sm up the size and spacing match every other screen. The title is clamped to two lines at every width.",
    },
    width: {
      type: '"wide" | "reading"',
      required: false,
      default: '"wide"',
      description: "The ceiling, the same values as PageBody's width. Pass the PageBody's value so the title starts where the content starts.",
      values: {
        wide: "max-w-[110rem]: the default, for every screen with a wide PageBody.",
        reading: "max-w-3xl, centred: above a PageBody with width=\"reading\".",
      },
    },
  },
  slots: [
    { name: "actions", description: "One Action (a solid one only when it is the screen's way forward, e.g. \"Otra vez, sin miedo\"), or Badges for the mode: \"Práctica\", \"Turno 3 de 7\". Never a row of three buttons." },
  ],
  states: [
    {
      name: "default",
      description: "The h1 at 32px (40px from sm), bold, tracking -0.028em; meta in cream-dim at 16px below it; actions bottom-aligned at the row's end. No rule under it.",
      trigger: "Initial render.",
    },
    {
      name: "truncated",
      description:
        "The meta is longer than one line at the current width: it stops at the end of the first line with an ellipsis. The full text is still in the DOM, so a screen reader reads all of it, and a mouse user sees it in the title tooltip on hover.",
      trigger: "meta longer than one line at the current width: a 25-word thesis title at any width, or a meta over about 35 characters at 320px.",
    },
  ],
  events: [],
  motion: ["None. The header is the fixed point a screen changes under; it never animates in."],
  accessibility: {
    role: "<header> containing heading level 1. Inside a <main> it is generic; outside any <main>, <article>, <aside>, <nav> or <section> it is a banner landmark",
    keyboard: [],
    aria: [
      { attribute: "h1", managedBy: "component", note: "The title is the page's only h1. One PageHeader per screen; headings below start at h2." },
      { attribute: "<main> around the screen", managedBy: "consumer", note: "The app shell wraps PageHeader and PageBody in one <main>, so the header is not a second banner next to the shell's and the screen is a main landmark. The product's shell renders screens without a <main> today." },
      { attribute: "title (meta)", managedBy: "component", note: "The meta's full text, for the hover tooltip when it is clamped. Same text as the content, so screen readers that read both announce it once." },
      { attribute: "aria-label (icon-only actions)", managedBy: "consumer", note: "Whatever is passed in actions brings its own name and role." },
    ],
    reducedMotion: "Nothing moves, so nothing changes.",
    contrast: "On the shell's surface-deep ground: cream-bright title 18.8:1 (dark) and 17.3:1 (light); cream-dim meta 13.0:1 and 9.9:1.",
    focus: "Not focusable itself. The actions follow the title in source order, so they are the first stops in the screen's content after the shell's navigation.",
    targetSize: "not interactive (actions bring their own targets)",
    screenReader:
      "Announced as heading level 1 with the title, then the meta in full — the one-line clamp is visual only. On touch the clamped part of the meta cannot be revealed (the tooltip needs a pointer), so nothing a person needs to act on may live only in the meta.",
  },
  content: {
    voice: [
      "The title names the screen in one to four words, sentence case, no period: \"Mi tesis\", \"Tu camino\", \"Tus postulaciones\".",
      "Possessives in the tú form where the screen is the person's own: \"Tu informe\", \"Tu camino\".",
      "Meta is one short sentence that says what the screen is for, or one fact: \"Súbela una vez. El jurado la lee antes de cada ensayo.\", \"12 completadas\".",
      "No exclamation marks; meta never repeats the title.",
    ],
    limits: [
      "Title: ≤ 40 characters so it stays on one line at 320px (two at most).",
      "Meta: one line. About 35 characters fit at 320px, about 45 at 390px and about 70 from 640px; anything longer is cut, so the point goes in the first 35 characters and instructions go in the body.",
    ],
    examples: ["Mi tesis", "Súbela una vez. El jurado la lee antes de cada ensayo.", "Ajustes", "Cuenta y preferencias de práctica", "Tu camino", "Equivócate aquí, no en la entrevista"],
  },
  usage: {
    when: [
      "At the top of every screen in the signed-in app, once, directly above its PageBody.",
      "compact for a screen whose content needs the height on a phone: the live call.",
    ],
    whenNot: [
      { situation: "A marketing page's headline", instead: "The hero's own h1, then Sections with h2." },
      { situation: "A heading inside the screen", instead: "An h2 in a Panel." },
      { situation: "Instructions or a long description of the screen", instead: "A Panel in the PageBody; meta is cut to one line." },
      { situation: "A status message (an error, a saved confirmation)", instead: "Notice, in the PageBody." },
    ],
    do: [
      "Pass the same width to PageHeader and PageBody.",
      "Put the point of the meta in its first 35 characters: that is what a 320px phone shows.",
      "Keep one Action in actions, and make it solid only when it is the screen's way forward.",
    ],
    dont: [
      "Don't render a second PageHeader (or any other h1) on a screen.",
      "Don't put something the person must read to act in meta: on touch, the clamped part cannot be revealed.",
      "Don't draw a rule or a background under the header.",
    ],
  },
  tokens: ["--cream-bright", "--cream", "--surface-deep", "max-w-[110rem]", "max-w-3xl"],
  related: [
    { name: "PageBody", difference: "The content container under it, with the same gutters and ceiling." },
    { name: "Badge", difference: "Goes in actions to state the screen's mode (Práctica, Modo estrés)." },
    { name: "Action", difference: "Goes in actions: at most one, the screen's way forward." },
  ],
  i18n: {
    rtl: "The row follows the document direction: the title starts at the right and the actions move to the left end. The meta's ellipsis lands at the line's end (the left in RTL).",
    textExpansion:
      "The title wraps (compact clamps it at two lines); the meta is clamped at one line, so a Portuguese or German meta 30–40% longer than the Spanish shows less of itself rather than growing the header. Actions wrap under the title when the row runs out.",
    formatting: "None: title and meta come formatted from the caller (a count through Intl, a date through the app's formatter).",
    strings: [],
  },
  responsive: {
    behaviour: [
      "Phones: 16px gutters; 32px above (16px when compact); title 32px (20px when compact); actions wrap onto their own line under the title when the row runs out of room.",
      "From sm (640px): 24px gutters, title 40px, 32px above in both modes.",
      "From lg (1024px): 40px gutters, 40px above. The row stops at the width's ceiling and centres.",
    ],
    minWidth: "320px",
  },
  designTool: {
    registryItem: "page-header",
    importStatement: 'import { PageHeader } from "@mockio/design-system";',
    canvasProps: ["title", "meta", "actions", "compact", "width"],
    placement: "The first child of the screen's <main> (provided by the app shell), directly above PageBody. One per screen.",
  },
  appCounterpart: {
    file: "platform/AppShell.tsx",
    exportName: "PageHeader",
    differences: [
      "The meta renders on one line (line-clamp-1) with the full text in a title attribute. The app's copy lets it wrap, so on Mi tesis a 25-word thesis title becomes the longest block of the header; this is the minimalist redesign's decision, ahead of the product.",
      "Adds width (\"wide\" | \"reading\") to match PageBody's; the app's copy is always max-w-[110rem], so its title does not line up with a narrower body.",
    ],
  },
  version: "1.0.0",
  changelog: [
    {
      version: "1.0.0",
      changes: [
        "First documented version, extracted from the product's app shell.",
        "Meta clamped to one line with the full text in a title attribute.",
        "width prop, matching PageBody.",
      ],
    },
  ],
});
