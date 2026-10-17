import { defineContract } from "../../contract";

export const SectionContract = defineContract({
  name: "Section",
  level: "template",
  status: "stable",
  summary: "A band of a marketing page: owns the vertical rhythm and side gutters, bleeds its background to both edges and centres content in one column.",
  source: "src/components/Section/Section.tsx",
  composes: [],
  dependencies: [],
  props: {
    children: {
      type: "ReactNode",
      required: true,
      description: "The band's content: usually an Eyebrow, an h2 and what the heading introduces. It sits in a centred max-w-7xl (80rem) column.",
    },
    className: {
      type: "string",
      required: false,
      default: '""',
      description:
        "Extra classes for the outer <section>: the band's background (bg-surface-base, bg-surface-deep) and positioning (relative). They land on the full-bleed element, not on the content column, so a grid or a gap belongs on a <div> inside.",
    },
    id: {
      type: "string",
      required: false,
      description: "The anchor the landing nav scrolls to (\"pricing\", \"features\"). Also the target of a skip or in-page link.",
    },
    "aria-labelledby": {
      type: "string",
      required: false,
      description: "Native, passed through. The id of the band's h2; it names the <section> so it becomes a region landmark a screen-reader user can jump to.",
    },
  },
  slots: [
    {
      name: "children",
      description:
        "The band's content. Opens with its heading — an h2 (the page's h1 lives in the hero), optionally preceded by an Eyebrow — then the body: Panels in a grid, a list, a chart. Narrower blocks set their own max-w-* and mx-auto inside.",
    },
  ],
  states: [
    {
      name: "default",
      description:
        "py-20 / px-4 on phones, sm:py-28 / sm:px-6, lg:py-36 / lg:px-10. The background in className reaches both window edges; content is centred at max-w-7xl. Section has no other state.",
      trigger: "Initial render.",
    },
  ],
  events: [],
  motion: [
    "None of its own. Blocks inside enter with FadeRise (or WordsPullUp for a headline) as they scroll into view; the band itself never moves.",
  ],
  accessibility: {
    role: "generic (<section> without an accessible name); region when aria-labelledby names it",
    keyboard: [],
    aria: [
      { attribute: "aria-labelledby", managedBy: "consumer", note: "Point it at the band's h2 (give the h2 an id). Without a name a <section> is announced as nothing and does not appear in the landmarks list." },
      { attribute: "aria-label / data-* / other <section> attributes", managedBy: "consumer", note: "Spread onto the <section>. Prefer aria-labelledby over aria-label, so the name is the visible heading." },
    ],
    reducedMotion: "Nothing moves, so nothing changes. Motion inside belongs to FadeRise or WordsPullUp, which handle reduced motion themselves.",
    contrast:
      "Section draws no ink. On the backgrounds landing bands use, the ink tokens clear AA in both themes: on surface-deep cream-bright is 18.8:1 and cream-faint 7.8:1 (dark), 17.3:1 and 5.1:1 (light); on surface-base (black / white) they are higher.",
    focus: "Not focusable. With an id it can be the target of an in-page link; the browser moves the reading position there.",
    targetSize: "not interactive",
    screenReader: "With aria-labelledby: announced as a region with the heading's text, and listed among landmarks. Without it: not announced; the heading inside is what a screen-reader user navigates by.",
  },
  content: {
    voice: [
      "The heading is one plain claim, sentence case, ending in a period when it is a sentence: \"Gratis para conseguir el trabajo. Después, al precio de tu país.\"",
      "The Eyebrow above it names the topic in two or three words: \"Precios\", \"De la entrevista al aumento\".",
      "Body under the heading in the tú form, concrete, no exclamation marks: \"XP por cada entrevista, una racha que perdona un mal día, misiones semanales e insignias que te ganas.\"",
    ],
    limits: [
      "Heading: one sentence or two short ones, ≤ 90 characters, text-balance so it breaks evenly.",
      "Intro paragraph: ≤ 2 sentences, in a max-w-2xl column.",
      "One idea per band; if a band needs two headings it is two bands.",
    ],
    examples: [
      "Gratis para conseguir el trabajo. Después, al precio de tu país.",
      "Cada conversación de un trabajo remoto, ensayada antes de que cuente.",
      "Un hábito que vas a querer mantener",
      "Devoluciones que nombran el error.",
    ],
  },
  usage: {
    when: [
      "Each band of the landing or another marketing page: features, pricing, how it works, the habit loop.",
      "Alternating backgrounds down a page: give consecutive bands bg-surface-base and bg-surface-deep through className.",
    ],
    whenNot: [
      { situation: "A screen inside the signed-in app", instead: "PageBody (with PageHeader above it): tighter gutters, a wider ceiling, no marketing rhythm." },
      { situation: "A block inside a band (a tier, a feature card)", instead: "Panel, inside the Section." },
      { situation: "The hero at the top of the page", instead: "HeroVideo or the hero's own full-height layout over a Backdrop; it is not a padded band." },
      { situation: "Laying out the content in columns through className", instead: "A <div className=\"grid …\"> inside the Section; className reaches the outer band, not the column." },
    ],
    do: [
      "Give the band an id the nav can scroll to and name it with aria-labelledby on its h2.",
      "Put background and positioning in className; put layout in a <div> inside.",
      "Narrow text blocks inside with max-w-2xl or max-w-3xl and mx-auto.",
    ],
    dont: [
      "Don't add py-* or px-* to tune one band — the rhythm is the point; change it here for all of them.",
      "Don't put grid or flex classes in className: they lay out the single inner column, not your content.",
      "Don't nest a Section inside a Section.",
    ],
  },
  tokens: ["--surface-base", "--surface-deep", "max-w-7xl"],
  related: [
    { name: "PageBody", difference: "The signed-in app's container: one element, max-w-[110rem], py-8–10. Section is for marketing pages: two elements, max-w-7xl, py-20–36." },
    { name: "Panel", difference: "A surface inside a band; Section is the band." },
    { name: "Eyebrow", difference: "The kicker above a Section's heading." },
  ],
  i18n: {
    rtl: "Nothing to mirror: the gutters are symmetric and the column is centred. Content follows the document direction.",
    textExpansion: "The band grows in height with its content; headings wrap (text-balance keeps the lines even). Portuguese and German headings run 10–30% longer and simply take another line.",
    formatting: "None: the band renders no text of its own.",
    strings: [],
  },
  responsive: {
    behaviour: [
      "Phones: 16px side gutters, 80px above and below.",
      "From sm (640px): 24px gutters, 112px vertical.",
      "From lg (1024px): 40px gutters, 144px vertical. Content stops growing at 80rem (1280px) and centres.",
    ],
    minWidth: "320px",
  },
  designTool: {
    registryItem: "section",
    importStatement: 'import { Section } from "@mockio/design-system";',
    canvasProps: ["children", "className", "id"],
    placement: "A direct child of a marketing page's <main>, stacked one after another below the hero. Never inside the app shell or inside another Section.",
  },
  appCounterpart: {
    file: "design-system/primitives.tsx",
    exportName: "Section",
    differences: [
      "Spreads every other <section> attribute (aria-labelledby, aria-label, data-*). The app's copy accepts only children, className and id, so its bands cannot be named and are not landmarks.",
    ],
  },
  version: "1.0.0",
  changelog: [{ version: "1.0.0", changes: ["First documented version, extracted from the product.", "Native <section> attributes are passed through, so a band can be named with aria-labelledby."] }],
});
