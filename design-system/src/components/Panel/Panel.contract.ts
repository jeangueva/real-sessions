import { defineContract } from "../../contract";

export const PanelContract = defineContract({
  name: "Panel",
  level: "atom",
  status: "stable",
  summary: "The surface every card, block and sheet sits on: a rounded fill with the card shadow, or glass over imagery. No padding, no states.",
  source: "src/components/Panel/Panel.tsx",
  composes: [],
  dependencies: [],
  props: {
    children: {
      type: "ReactNode",
      required: true,
      description: "The panel's content. Panel adds no padding: give it p-6 sm:p-8 for a block, p-5 for a row, so the content clears the rounded corners.",
    },
    variant: {
      type: '"card" | "raised" | "glass"',
      required: false,
      default: '"card"',
      description: "Which surface. Picks the fill and the edge; the radius and the clipping are the same for all three.",
      values: {
        card: "bg-surface-card + shadow-card. The lighter fill on the dark theme (#1C1C1E); white on the light one. For panels side by side in a grid: pricing tiers, settings sections, list rows.",
        raised: "bg-surface-raised + shadow-card. A step darker than card on the dark theme (#161618), identical to card on the light one. For one block on the page ground: an upload step, an empty state, a wait.",
        glass:
          ".liquid-glass: near-transparent with a 4px backdrop blur and a gradient edge on dark and inside .on-media; a white sheet with a hairline on the light theme. The only surface allowed over video. On a plain page the product uses it for errors (the message of a screen that failed to load, on five screens) and for two tabbed sheets (the Settings account tab, the Billing plan).",
      },
    },
    className: {
      type: "string",
      required: false,
      default: '""',
      description: "Extra classes, appended. Padding, layout (flex, grid, gap), width and a selection ring (ring-2 ring-accent). Not a background, border or radius — that is a variant.",
    },
    id: {
      type: "string",
      required: false,
      description: "Native id, passed through. For a panel a tab or a link has to point at (aria-controls, #anchor).",
    },
    role: {
      type: "string",
      required: false,
      description: "Native role, passed through. region (with aria-labelledby), tabpanel, status for a wait, alert for a failure. Leave it off for a plain card.",
    },
    "aria-labelledby": {
      type: "string",
      required: false,
      description: "Native, passed through. The id of the heading or tab that names the panel; required with role=\"region\" and role=\"tabpanel\".",
    },
  },
  slots: [
    {
      name: "children",
      description: "Anything: a heading (h2 on an app screen, h3 inside a landing Section), body copy, Actions, a form. One idea per panel. A group inside it is an inset well (rounded-2xl bg-surface-lift p-4), not a second Panel.",
    },
  ],
  states: [
    {
      name: "default",
      description: "The variant's fill and edge, rounded-card (1.25rem), overflow hidden. Panel has no other state: hover, focus and selection belong to whatever the caller wraps around or adds.",
      trigger: "Initial render.",
    },
  ],
  events: [],
  motion: [
    "None of its own. A panel enters with the block around it (the caller's FadeRise), never separately.",
    "A caller's hover:shadow-lift is a box-shadow transition; keep it for panels inside something pressable.",
  ],
  accessibility: {
    role: "none of its own (a plain <div>); the caller passes region, tabpanel, status or alert when the panel is one",
    keyboard: [],
    aria: [
      { attribute: "role", managedBy: "consumer", note: "Only when the panel means something as a whole: tabpanel under a tablist, status around a wait, alert around a failure, region for a named block in the landmarks list." },
      { attribute: "aria-labelledby", managedBy: "consumer", note: "Points at the heading or tab that names the panel. Required with region and tabpanel; a region with no name is not a landmark." },
      { attribute: "aria-busy / aria-live / aria-label / data-*", managedBy: "consumer", note: "Every other <div> attribute is spread onto the surface." },
    ],
    reducedMotion: "Nothing moves, so nothing changes. A caller's hover:shadow-lift keeps fading under reduce, because box-shadow is on the system's list of transitions that carry no movement.",
    contrast:
      "Ink on every surface clears AA in both themes. Dark: cream-bright 16.3:1, cream-dim 11.6:1, cream-faint 7.3:1 and accent-text 4.94:1 on card (the tightest); raised and glass are higher. Light: cream-dim 10.5:1, cream-faint 5.2:1 on white. Over footage the picture sets the contrast: .on-media pins the ink to cream and the caller darkens the footage. The panel's own edge is decoration (card on surface-deep is 1.15:1 on dark, 1.09:1 on light), so nothing may depend on seeing it.",
    focus: "Not focusable and has no ring. overflow-hidden clips anything past the rounded edge, so keep at least 4px (in practice p-5 or more) between a control and the edge or its 2px ring and 2px offset are cut.",
    targetSize: "not interactive",
    screenReader: "Nothing is announced for the surface. A plain panel is just its content; with a role it is announced as that role and its name.",
  },
  content: {
    voice: [
      "A panel's first line says what it is for, as a heading or a plain sentence: \"Sube tu tesis\", \"Sesión iniciada en este dispositivo.\"",
      "Body copy in the tú form, sentence case, no exclamation marks; a wait says what is happening and how long: \"Leyendo tu tesis… puede tardar hasta dos minutos.\"",
      "One primary Action per panel at most, and it repeats nothing the heading already said.",
    ],
    limits: [
      "One idea per panel: a heading, up to three short lines of body, one primary Action.",
      "Body text at max-w-prose (65ch) inside wide panels, so a line never runs the full 110rem.",
    ],
    examples: [
      "Sube tu tesis",
      "Sesión iniciada en este dispositivo.",
      "Leyendo tu tesis… puede tardar hasta dos minutos.",
      "Agrega el puesto para el que te estás preparando.",
    ],
  },
  usage: {
    when: [
      "Any block of content that belongs together on a page: a step, a form section, an empty state, a wait, a tier.",
      "A grid of equal items: give them all variant=\"card\" and h-full so the row lines up.",
      "Content over video or photography: variant=\"glass\" inside .on-media.",
      "A whole screen that failed to load: variant=\"glass\" with role=\"alert\" on the message.",
    ],
    whenNot: [
      { situation: "A card the person presses as a whole (a session row, a nav tile)", instead: "A link or button styled with the card tokens itself (focus-ring rounded-2xl bg-surface-card shadow-card hover:shadow-lift), as RecentSessions does. Panel has no hover, focus or pressed state." },
      { situation: "A group inside a panel", instead: "An inset well: rounded-2xl bg-surface-lift p-4. A Panel inside a Panel doubles the edge and the radius." },
      { situation: "A one-line message about the screen's state", instead: "Notice, which carries the icon and the tone." },
      { situation: "A card that opens and closes", instead: "Disclosure (<details> with the card surface)." },
      { situation: "Page gutters and width", instead: "PageBody inside the app, Section on a marketing page." },
    ],
    do: [
      "Use card for siblings in a grid and raised for a single block on the page.",
      "Give the panel its padding through className: p-6 sm:p-8.",
      "Give a wait role=\"status\" and a failure role=\"alert\".",
      "Mark the recommended one of a set with ring-2 ring-accent, not a glow.",
    ],
    dont: [
      "Don't put hover:shadow-lift on a panel nothing happens on — it promises a press.",
      "Don't nest a Panel in a Panel.",
      "Don't recolour it with bg-* or border-*; pick the variant.",
      "Don't reach for glass on a plain page for a grid of ordinary cards: on the dark theme it is near-transparent and reads as empty; use card.",
    ],
  },
  tokens: ["--surface-card", "--surface-raised", "--shadow-card", "rounded-card", ".liquid-glass", ".on-media"],
  related: [
    { name: "Section", difference: "A marketing page's band of rhythm and width; Panels sit inside it." },
    { name: "PageBody", difference: "The app screen's container; Panels sit inside it." },
    { name: "Backdrop", difference: "A decorative field behind a hero, aria-hidden and empty; Panel holds content." },
  ],
  i18n: {
    rtl: "Nothing to mirror: the surface is symmetric. Content inside follows the document direction.",
    textExpansion: "The panel grows in height with its content and takes its width from the caller's layout, so longer Portuguese or German copy wraps and the panel gets taller. Nothing is truncated.",
    formatting: "None: the panel renders no text of its own.",
    strings: [],
  },
  responsive: {
    behaviour: [
      "No breakpoints of its own: radius, fill and edge are the same at every width.",
      "Padding steps up with the caller's className (p-6 → sm:p-8); grids of panels collapse to one column on phones (grid gap-5 lg:grid-cols-2).",
    ],
    minWidth: "280px",
  },
  designTool: {
    registryItem: "panel",
    importStatement: 'import { Panel } from "@mockio/design-system";',
    canvasProps: ["variant", "className", "children"],
    placement: "Inside PageBody on an app screen or inside a Section on a marketing page, alone or in a grid. Never inside another Panel.",
  },
  appCounterpart: {
    file: "design-system/primitives.tsx",
    exportName: "Panel",
    differences: [
      "Spreads every other <div> attribute onto the surface. The app's copy accepts only id, role and aria-labelledby, so a panel there cannot carry aria-busy, aria-label or data-* attributes.",
    ],
  },
  version: "1.0.0",
  changelog: [{ version: "1.0.0", changes: ["First documented version, extracted from the product.", "Native <div> attributes are passed through."] }],
});
