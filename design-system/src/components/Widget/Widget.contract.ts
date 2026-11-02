import { defineContract } from "../../contract";

export const WidgetContract = defineContract({
  name: "Widget",
  level: "molecule",
  status: "stable",
  summary: "The landing's instrument card: a flat card-coloured surface with a hairline ring, its own padding, its content stacked and an optional \"::LABEL\" on top.",
  source: "src/components/Widget/Widget.tsx",
  composes: ["MonoLabel"],
  dependencies: [],
  props: {
    children: {
      type: "ReactNode",
      required: true,
      description: "The widget's content, stacked in a column with gap-4: a heading and a line of body, a list of Insets, a price, a link. Widget pads itself (p-5, sm:p-6).",
    },
    label: {
      type: "ReactNode",
      required: false,
      description: "The widget's name, rendered as a MonoLabel at the top (\"::EL PRODUCTO\"). No default: without it the widget starts with its content, which then has to name itself.",
    },
    featured: {
      type: "boolean",
      required: false,
      default: "false",
      description: "Marks the recommended widget of a set (the middle pricing tier): the 1px line ring becomes a 2px accent ring. One per set at most.",
    },
    className: {
      type: "string",
      required: false,
      default: '""',
      description: "Extra classes, appended. Height and alignment (h-full in a grid, justify-center beside a screen) — not a fill, a ring or a radius. A selection ring is featured, not ring-* here: ring-line wins over an added ring colour.",
    },
  },
  slots: [
    { name: "label", description: "Text only, 1–4 words in sentence case; MonoLabel draws the colons and the caps." },
    {
      name: "children",
      description: "One idea per widget: a heading (h3 inside a landing section) and body, or a list of Insets, or a tier. A group inside it is an Inset, never a second Widget.",
    },
  ],
  states: [
    {
      name: "default",
      description: "surface-card fill, rounded-card (1.25rem), a 1px ring in line, no shadow; content in a column with gap-4, p-5 and p-6 from sm.",
      trigger: "Initial render.",
    },
    {
      name: "featured",
      description: "The same widget with a 2px accent ring in place of the hairline: the recommended one of a set. Nothing else changes, so a featured tier lines up with its siblings.",
      trigger: "featured={true}",
    },
  ],
  events: [],
  motion: [
    "None of its own. On the landing a widget enters with its block (the caller's FadeRise, 0.8s ease-cinematic), staggered 0.05–0.08s across a grid.",
  ],
  accessibility: {
    role: "none of its own (a plain <div>); the label is a paragraph",
    keyboard: [],
    aria: [
      { attribute: "aria-hidden (label colons)", managedBy: "component", note: "MonoLabel hides the \"::\" so the label reads as its words." },
      { attribute: "role / aria-labelledby / data-*", managedBy: "consumer", note: "Every other <div> attribute is spread onto the surface; give it role=\"region\" with aria-labelledby only if the widget belongs in the landmarks list." },
    ],
    reducedMotion: "Nothing moves, so nothing changes. The caller's entrance (FadeRise) drops its translate under reduce.",
    contrast:
      "Ink on surface-card clears AA in both themes: cream-dim (the label and body) 9.8:1 dark, 9.1:1 light; cream-bright higher. The hairline is decoration (the card is 1.21:1 against surface-base on dark, 1.05:1 on light), so nothing may depend on seeing the edge. The featured accent ring is 8.6:1 against the card on dark but 1.57:1 on light, so \"recommended\" must also be said in words (a Chip).",
    focus: "Not focusable and no ring of its own. A link or Action inside keeps its focus ring: the widget does not clip (no overflow-hidden), and p-5 leaves room for the 2px offset.",
    targetSize: "not interactive",
    screenReader: "The label is read as a paragraph, then the content. The featured ring is not announced: the recommendation is the Chip's words.",
  },
  content: {
    voice: [
      "The label names the widget, sentence case, no period: \"El producto\", \"La videollamada\", \"Escenarios\".",
      "The heading under it makes the claim, in a short sentence: \"Un jurado que leyó tu tesis. Completa.\"",
      "Body copy in the tú form, no exclamation marks; one primary Action across a set of widgets at most.",
    ],
    limits: ["Label: 1–4 words, ≤ 28 characters.", "Body: up to three short lines, max-w-md beside a screen."],
    examples: ["El producto", "La videollamada", "Escenarios", "Un jurado que leyó tu tesis. Completa.", "Del plan de tesis al doctorado.", "Programa de afiliados"],
  },
  usage: {
    when: [
      "A card on the landing below the hero: a feature beside its screen, a step of \"Cómo funciona\", a pricing tier, a small fact in a grid.",
      "A grid of equal cards on a marketing page: all Widgets, all h-full, gap-3 between them.",
      "The recommended tier of a set: featured, with a Chip saying \"Recomendado\".",
    ],
    whenNot: [
      { situation: "A block on a signed-in app screen (an upload step, a settings section, a wait)", instead: "Panel, which carries the card shadow and leaves padding to the caller." },
      { situation: "A group inside a widget", instead: "Inset. A Widget inside a Widget doubles the ring and the radius." },
      { situation: "A card the person presses as a whole", instead: "A link styled with the card tokens itself, with its own focus ring. Widget has no hover, focus or pressed state." },
      { situation: "Content over footage", instead: "Panel variant=\"glass\" inside .on-media." },
      { situation: "A band of the page with its gutters and width", instead: "Section." },
    ],
    do: [
      "Name the widget with label, and keep a real heading under it when it makes a claim.",
      "Give widgets in a grid h-full so a row lines up.",
      "Use featured for the recommended tier, together with a Chip that says so.",
      "Put groups inside it in Insets.",
    ],
    dont: [
      "Don't nest a Widget in a Widget.",
      "Don't add a shadow or a hover lift: the widget kit is flat, and a lift promises a press.",
      "Don't recolour the ring or the fill through className; use featured.",
      "Don't type the colons into label.",
    ],
  },
  tokens: ["--surface-card", "--line", "--accent", "rounded-card", "font-mono"],
  related: [
    { name: "Panel", difference: "The app's surface: shadow-card, no padding, three variants. Widget is the landing's flat card: a hairline ring, its own padding and stack, an optional label." },
    { name: "Inset", difference: "The darker well that groups content inside a Widget." },
    { name: "MonoLabel", difference: "The \"::LABEL\" a Widget draws from its label prop; on its own it names a section." },
    { name: "Section", difference: "The page band Widgets sit in; it owns gutters and rhythm." },
  ],
  i18n: {
    rtl: "Nothing to mirror: the surface is symmetric. The label's colons lead the text, so they sit on the right in Arabic and Hebrew; content follows the document direction.",
    textExpansion: "The widget grows in height and takes its width from the grid, so longer Portuguese or German copy wraps. Nothing is truncated; in a grid, h-full keeps the row even.",
    formatting: "None: the widget renders no text of its own beyond the caller's label.",
    strings: [],
  },
  responsive: {
    behaviour: [
      "Padding steps from p-5 on phones to p-6 from sm; radius, fill and ring are the same at every width.",
      "Grids of widgets collapse to one column on phones (grid gap-3 md:grid-cols-3, sm:grid-cols-2 lg:grid-cols-4).",
    ],
    minWidth: "280px",
  },
  designTool: {
    registryItem: "widget",
    importStatement: 'import { Widget } from "@mockio/design-system";',
    canvasProps: ["label", "featured", "children", "className"],
    placement: "Inside a Section on the landing or a marketing page, alone, beside a screen, or in a grid with gap-3. Never inside another Widget or a Panel.",
  },
  appCounterpart: {
    file: "components/marketing.tsx",
    exportName: "Widget",
    differences: [
      "Radius: rounded-card (1.25rem, 20px), the package's card radius. The product uses rounded-[1.375rem] (22px).",
      "Hairline: ring-1 ring-line, the preset's line colour. The product writes ring-1 ring-[color:var(--line)], the same variable through an arbitrary value; the rendered ring is identical.",
      "featured prop: a 2px ring-accent replaces the hairline. The product marks the recommended tier with className \"!ring-2 !ring-accent\", important overrides on top of the hairline.",
      "Spreads native <div> attributes (id, role, aria-*, data-*) onto the surface; the product's copy accepts children, label and className only.",
    ],
  },
  version: "1.0.0",
  changelog: [{ version: "1.0.0", changes: ["First documented version, extracted from the product's landing.", "featured replaces the product's !ring-2 !ring-accent override."] }],
});
