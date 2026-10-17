import { defineContract } from "../../contract";

export const PageBodyContract = defineContract({
  name: "PageBody",
  level: "template",
  status: "stable",
  summary: "The one container every signed-in app screen sits in: gutters, vertical padding and a single ceiling, on the same element as the screen's layout.",
  source: "src/components/PageBody/PageBody.tsx",
  composes: [],
  dependencies: [],
  props: {
    children: {
      type: "ReactNode",
      required: true,
      description: "The screen's content, below the PageHeader: Panels, a list, a grid, a call.",
    },
    width: {
      type: '"wide" | "reading"',
      required: false,
      default: '"wide"',
      description: "The ceiling the content stops growing at. Pass the same value to the screen's PageHeader so the title lines up with the content.",
      values: {
        wide: "max-w-[110rem] (1760px). Every screen whose content is a grid, a table, a list of sessions or a call: it fills a desktop window instead of pinning to the left.",
        reading: "max-w-3xl (48rem, 768px), centred. A screen read top to bottom as one column: a feedback report, a session's detail, the day-of warm-up, the affiliate page.",
      },
    },
    className: {
      type: "string",
      required: false,
      default: '""',
      description:
        "Extra classes on the element that holds the children: the screen's layout (flex flex-col gap-4, grid lg:grid-cols-2, flex-1) and vertical padding overrides with pt-* / pb-*, which win over the built-in py-* at the same breakpoint (a base pb-4 still yields to the built-in lg:py-10 from 1024px). Not a max-w-* — use width.",
    },
    id: {
      type: "string",
      required: false,
      description: "Native id, passed through, like every other <div> attribute. The target of a skip link (\"#contenido\").",
    },
  },
  slots: [
    {
      name: "children",
      description:
        "The screen's content. Section headings inside are h2 (the PageHeader's h1 is the page's only h1). Blocks are Panels; a screen with one block puts one raised Panel here.",
    },
  ],
  states: [
    {
      name: "default",
      description:
        "mx-auto w-full, the width's ceiling, px-4 py-8 on phones, sm:px-6, lg:px-10 lg:py-10. PageBody has no other state: loading, empty and error are content the screen puts inside.",
      trigger: "Initial render.",
    },
  ],
  events: [],
  motion: [
    "None of its own. Blocks inside enter with FadeRise; the app keeps motion restrained, so the container never animates between screens.",
  ],
  accessibility: {
    role: "generic (a plain <div>); the landmark is the <main> the app shell wraps around PageHeader and PageBody",
    keyboard: [],
    aria: [
      { attribute: "aria-busy / aria-live / id / data-*", managedBy: "consumer", note: "Every other <div> attribute is spread onto the container. A loading screen marks its own status Panel with role=\"status\" rather than the whole body." },
      { attribute: "<main> around the screen", managedBy: "consumer", note: "PageBody is not a landmark. The app shell provides one <main> around PageHeader and PageBody; the product's shell renders screens without one today." },
    ],
    reducedMotion: "Nothing moves, so nothing changes.",
    contrast: "PageBody draws no ink or fill: it sits on the app shell's ground (surface-deep), where the faintest ink, cream-faint, is 7.8:1 on dark and 5.1:1 on light.",
    focus: "Not focusable. With an id it can be the target of a skip link.",
    targetSize: "not interactive",
    screenReader: "Nothing is announced for the container; its content is read in source order, inside the main landmark when the shell provides one.",
  },
  content: {
    voice: [
      "PageBody renders no words. What the screen says first lives in the PageHeader; the body starts with the task, not a restatement of the title.",
      "An empty or loading screen says what is happening in the tú form, in a raised Panel inside: \"Leyendo tu tesis… puede tardar hasta dos minutos.\"",
    ],
    limits: ["Body text inside a wide PageBody stays at max-w-prose; the ceiling is for grids, not for lines of text."],
    examples: [
      "Leyendo tu tesis… puede tardar hasta dos minutos.",
      "Agrega el puesto para el que te estás preparando.",
      "Todavía no hay nada que graficar",
    ],
  },
  usage: {
    when: [
      "Every screen inside the signed-in app, directly under its PageHeader.",
      "width=\"reading\" for a screen that is one column read top to bottom.",
    ],
    whenNot: [
      { situation: "A band of a marketing page", instead: "Section: marketing rhythm (py-20–36), two elements, max-w-7xl." },
      { situation: "A surface for a block of content", instead: "Panel, inside the PageBody." },
      { situation: "Narrowing one block inside a wide screen", instead: "max-w-2xl on that block (as the error Panels do), not width=\"reading\" for the whole screen." },
    ],
    do: [
      "Put the screen's layout on PageBody itself: <PageBody className=\"flex flex-col gap-4\">.",
      "Pass the same width to PageHeader and PageBody.",
      "Override vertical padding with pt-* / pb-* (a call trims it: pb-4 pt-3 sm:py-6 lg:py-10).",
    ],
    dont: [
      "Don't wrap the content in another <div> for layout — the grid then lays out the wrapper.",
      "Don't pass max-w-* in className: max-w-[110rem] comes later in the generated CSS and wins.",
      "Don't override py-* or px-* with a smaller value of the same utility (py-4): Tailwind orders those by value, so the built-in py-8 wins. Use pt-* and pb-*.",
    ],
  },
  tokens: ["max-w-[110rem]", "max-w-3xl", "--surface-deep"],
  related: [
    { name: "PageHeader", difference: "The title block above it, on the same container so the two line up." },
    { name: "Section", difference: "The marketing page's band: larger rhythm, a 7xl column, a full-bleed background." },
    { name: "Panel", difference: "The surface a block sits on, inside the PageBody." },
  ],
  i18n: {
    rtl: "Nothing to mirror: gutters are symmetric and the column centres. Grids and flex rows inside follow the document direction.",
    textExpansion: "Height grows with the content; width comes from the ceiling and the window, so longer Portuguese or German copy wraps inside the blocks.",
    formatting: "None: the container renders no text of its own.",
    strings: [],
  },
  responsive: {
    behaviour: [
      "Phones: 16px gutters, 32px above and below.",
      "From sm (640px): 24px gutters.",
      "From lg (1024px): 40px gutters, 40px above and below.",
      "wide stops at 110rem and centres; reading stops at 48rem and centres. The layout in className (lg:grid-cols-2, lg:flex-row) is the screen's own.",
    ],
    minWidth: "320px",
  },
  designTool: {
    registryItem: "page-body",
    importStatement: 'import { PageBody } from "@mockio/design-system";',
    canvasProps: ["children", "width", "className"],
    placement: "Directly below a PageHeader, inside the screen's <main> (provided by the app shell). One per screen; never inside a Section or a Panel.",
  },
  appCounterpart: {
    file: "platform/AppShell.tsx",
    exportName: "PageBody",
    differences: [
      "Adds width (\"wide\" | \"reading\"). The app's copy has only className, and its screens that pass max-w-3xl or max-w-2xl there (FeedbackReport, InterviewDetail, Advisor, Warmup) get no narrower column, because max-w-[110rem] comes later in the generated CSS.",
      "Spreads every other <div> attribute (id, aria-*, data-*). The app's copy accepts only children and className.",
    ],
  },
  version: "1.0.0",
  changelog: [
    {
      version: "1.0.0",
      changes: [
        "First documented version, extracted from the product's app shell.",
        "width prop for the reading column, replacing a max-w-* in className that never took effect.",
        "Native <div> attributes are passed through.",
      ],
    },
  ],
});
