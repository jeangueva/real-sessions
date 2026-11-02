/**
 * The bridge between this package and the Figma library.
 *
 * Figma names a token by what it is for (`background/surface`), the code by
 * the CSS variable that carries it (`--surface-card`). This file is the one
 * place that pairs the two. Everything else is derived:
 *
 *   scripts/build-tokens.mjs  resolves every entry against tokens.css and the
 *                             preset and writes src/tokens/figma.json, the
 *                             values Figma must hold, in both themes.
 *   test/tokens.test.ts       fails when an entry names a variable that does
 *                             not exist, or a colour variable has no entry.
 *   docs/guides/figma.md      how an agent pushes figma.json into the file
 *                             and reads it back to find drift.
 *
 * Edit this file when a token is added, renamed or removed; never edit
 * figma.json.
 */

/** The Figma file the library lives in. */
export const FIGMA_FILE = {
  key: "jmdQwNqGso3sQoUpcME5g8",
  url: "https://www.figma.com/design/jmdQwNqGso3sQoUpcME5g8",
};

const BG = ["FRAME_FILL", "SHAPE_FILL"];
const TEXT = ["TEXT_FILL"];
const STROKE = ["STROKE_COLOR"];
const ICON = ["STROKE_COLOR", "SHAPE_FILL"];
const ANY = ["FRAME_FILL", "SHAPE_FILL", "STROKE_COLOR"];

/**
 * Colour roles. `css` is the variable in tokens.css; `alpha` is a fixed
 * opacity (the preset's `cream-dim` and `cream-faint`) or the variable that
 * holds one (`--surface-lift-alpha`). Every colour variable in tokens.css
 * appears here at least once.
 */
export const COLORS = [
  { figma: "background/page", css: "--surface-base", tailwind: "bg-surface-base", scopes: BG },
  { figma: "background/surface", css: "--surface-card", tailwind: "bg-surface-card", scopes: BG },
  { figma: "background/raised", css: "--surface-raised", tailwind: "bg-surface-raised", scopes: BG },
  { figma: "background/deep", css: "--surface-deep", tailwind: "bg-surface-deep", scopes: BG },
  { figma: "background/hover", css: "--surface-lift", alpha: "--surface-lift-alpha", tailwind: "bg-surface-lift", scopes: BG },
  { figma: "background/sunken", css: "--surface-sunken", alpha: "--surface-sunken-alpha", tailwind: "bg-surface-sunken", scopes: BG },

  { figma: "text/primary", css: "--cream-bright", tailwind: "text-cream-bright", scopes: TEXT },
  { figma: "text/body", css: "--cream", tailwind: "text-cream", scopes: TEXT },
  { figma: "text/secondary", css: "--cream", alpha: 0.85, tailwind: "text-cream-dim", scopes: TEXT },
  { figma: "text/tertiary", css: "--cream", alpha: 0.65, tailwind: "text-cream-faint", scopes: TEXT },
  { figma: "text/on-accent", css: "--accent-ink", tailwind: "text-accent-ink", scopes: TEXT },
  { figma: "text/accent", css: "--accent-text", tailwind: "text-accent-text", scopes: TEXT },
  { figma: "text/positive", css: "--grow-text", tailwind: "text-grow-text", scopes: TEXT },
  { figma: "text/attention", css: "--step-text", tailwind: "text-step-text", scopes: TEXT },
  { figma: "text/premium", css: "--premium", tailwind: "text-premium", scopes: TEXT },

  { figma: "interactive/primary/default", css: "--accent", tailwind: "bg-accent", scopes: ANY },
  { figma: "interactive/primary/depth", css: "--accent-depth", tailwind: "shadow-[0_3px_0_rgb(var(--accent-depth))]", scopes: ANY },
  { figma: "interactive/primary/soft", css: "--accent-soft", tailwind: "bg-accent-soft", scopes: BG },
  { figma: "feedback/positive/default", css: "--grow", tailwind: "bg-grow", scopes: ANY },
  { figma: "feedback/positive/soft", css: "--grow-soft", tailwind: "bg-grow-soft", scopes: BG },
  { figma: "feedback/attention/default", css: "--step", tailwind: "bg-step", scopes: ANY },
  { figma: "feedback/attention/soft", css: "--step-soft", tailwind: "bg-step-soft", scopes: BG },
  { figma: "premium/default", css: "--premium", tailwind: "bg-premium", scopes: ANY },
  { figma: "premium/soft", css: "--premium-soft", tailwind: "bg-premium-soft", scopes: BG },
  { figma: "border/subtle", css: "--line", tailwind: "border-line", scopes: STROKE },
  { figma: "border/control", css: "--line-strong", tailwind: "border-line-strong", scopes: STROKE },
  { figma: "overlay/scrim", css: "--scrim", tailwind: "bg-scrim", scopes: BG },

  // Icons inherit the text colour (currentColor); these are the same roles
  // scoped to strokes, so a designer picks them from the stroke picker.
  { figma: "icon/primary", css: "--cream-bright", tailwind: "text-cream-bright", scopes: ICON },
  { figma: "icon/secondary", css: "--cream", alpha: 0.65, tailwind: "text-cream-faint", scopes: ICON },
  { figma: "icon/accent", css: "--accent-text", tailwind: "text-accent-text", scopes: ICON },
  { figma: "icon/on-accent", css: "--accent-ink", tailwind: "text-accent-ink", scopes: ICON },
  { figma: "icon/positive", css: "--grow-text", tailwind: "text-grow-text", scopes: ICON },
  { figma: "icon/attention", css: "--step-text", tailwind: "text-step-text", scopes: ICON },
  { figma: "icon/premium", css: "--premium", tailwind: "text-premium", scopes: ICON },
];

/**
 * Radii. `preset` reads the value from the preset's borderRadius; `px` is a
 * Tailwind default the product uses by name.
 */
export const RADII = [
  { figma: "radius/xs", px: 2, tailwind: "rounded-sm" },
  { figma: "radius/sm", px: 8, tailwind: "rounded-lg" },
  { figma: "radius/field", px: 12, tailwind: "rounded-xl" },
  { figma: "radius/tile", px: 16, tailwind: "rounded-2xl" },
  { figma: "radius/card", preset: "card", tailwind: "rounded-card" },
  { figma: "radius/inset", preset: "inset", tailwind: "rounded-inset" },
  { figma: "radius/pill", px: 9999, tailwind: "rounded-full" },
];

/** Tailwind's default spacing steps the product uses, named by pixels in Figma. */
export const SPACING = [
  ["0.5", 2], ["1", 4], ["2", 8], ["3", 12], ["4", 16], ["5", 20], ["6", 24],
  ["8", 32], ["10", 40], ["12", 48], ["16", 64], ["20", 80],
].map(([step, px]) => ({ figma: `space/${px}`, px, tailwind: `p-${step} / gap-${step}` }));

/**
 * Text styles. `preset` names a fontSize in the preset, whose size, leading,
 * tracking and weight win; the rest is set here because the product sets it
 * in index.css or at the call site (`font-semibold`, `font-mono uppercase`).
 * A clamp() becomes two styles: Desktop takes its maximum, Mobile its minimum.
 */
export const TEXT_STYLES = [
  { figma: "Display", preset: "display", family: "sans", tailwind: "text-display" },
  { figma: "Headline", preset: "headline", family: "sans", tailwind: "text-headline" },
  { figma: "Page title", px: 40, lineHeight: "1.1", letterSpacing: "-0.028em", weight: 700, family: "sans", tailwind: "text-[2.5rem] font-bold" },
  { figma: "Title", preset: "title", weight: 600, family: "sans", tailwind: "text-title font-semibold" },
  { figma: "Body L", preset: "base", weight: 400, family: "sans", tailwind: "text-base" },
  { figma: "Body", preset: "sm", weight: 400, family: "sans", tailwind: "text-sm" },
  { figma: "Small", preset: "xs", weight: 400, family: "sans", tailwind: "text-xs" },
  { figma: "Label", preset: "xs", weight: 500, letterSpacing: "0.06em", uppercase: true, family: "mono", tailwind: "font-mono text-xs uppercase tracking-[0.06em]" },
];

/**
 * Every component folder, and where it lives in the library: the node of its
 * component (set) on the "04 · Componentes" page, or `figma: null` with the
 * reason it is not drawn there. A new folder fails the tests until it has an
 * entry, so the library cannot quietly fall behind the package.
 *
 * Figma component properties mirror the contract's `designTool.canvasProps`;
 * the node's description carries the import and the contract's path.
 */
export const COMPONENTS = {
  Action: { figma: "14:103", properties: ["Label", "With arrow", "Icon", "Tone", "State"] },
  Badge: { figma: "14:109", properties: ["Label", "Tone"] },
  CheckItem: { figma: "14:110", properties: ["Label"] },
  Eyebrow: { figma: "14:115", properties: ["Label"] },
  Panel: { figma: "15:54", properties: ["Content", "Variant"] },
  PremiumMark: { figma: "14:117", properties: [] },
  PageHeader: { figma: "15:91", properties: ["Title", "Meta", "Show meta", "Show actions", "Size", "Compact"] },
  Backdrop: { figma: null, reason: "Animated CSS light behind a hero; it has no static form worth a component." },
  Mascot: { figma: null, reason: "Six illustrated PNG stages; place the image itself." },
  ShimmerText: { figma: null, reason: "An animation on a word; in Figma it is the word." },
  Section: { figma: null, reason: "Page rhythm and gutters, not a drawable surface." },
  PageBody: { figma: null, reason: "Page rhythm and gutters, not a drawable surface." },
  Mark: { figma: null, reason: "Brand artwork, not drawn yet: four fixed colours on a 64px tile (see Mark.md); draw it from Mark.tsx's SVG." },
  Wordmark: { figma: null, reason: "Composes Mark; drawn after it." },
};

/** Elevation: one Figma effect style per theme for each shadow variable. */
export const SHADOWS = [
  { figma: "Elevation/Card", css: "--shadow-card", tailwind: "shadow-card" },
  { figma: "Elevation/Lift", css: "--shadow-lift", tailwind: "shadow-lift" },
  { figma: "Elevation/Float", css: "--shadow-float", tailwind: "shadow-float" },
];
