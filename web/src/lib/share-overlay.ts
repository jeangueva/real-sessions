import type { Pan, Size } from "./share-frame";

/**
 * The block of numbers that goes on top of the photograph.
 *
 * Laid out here and drawn here, apart from the screen, for the reason the
 * crop geometry is: the layout is arithmetic and can be held to its promises
 * by a test, while a canvas cannot.
 *
 * Everything is sized against the frame rather than in pixels. The same card
 * is drawn at 1440 across for the export and at about 400 for the preview, and
 * a layout in absolute pixels would mean type that looks right in one of those
 * two places — which is how a preview stops being a preview.
 */

export interface OverlayStat {
  /** The number, in large type. */
  value: string;
  /** What it is, in small type under it. */
  label: string;
}

/**
 * The ink. Three, from the product's own palette plus plain white.
 *
 * No accent colour, because this system has none — five themes, all cream on a
 * dark surface. What a photograph actually needs is a choice between light ink
 * for a dark picture and dark ink for a bright one, which is what these are.
 */
export const TONES = {
  cream: { ink: "#ece9d8", shadow: "rgba(0,0,0,0.55)" },
  white: { ink: "#ffffff", shadow: "rgba(0,0,0,0.55)" },
  ink: { ink: "#17181c", shadow: "rgba(255,255,255,0.5)" },
} as const;

export type Tone = keyof typeof TONES;

export const SHARE_FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** The wordmark. The whole reason this feature is free. */
const BRAND = "mockio";

export interface OverlayLayout extends Size {
  /** One row per stat, positioned relative to the block's top-left. */
  rows: { valueY: number; labelY: number }[];
  valueSize: number;
  labelSize: number;
  brandSize: number;
  brandY: number;
  /** Space inside the backdrop, when one is drawn. */
  padding: number;
}

/**
 * Measures one run of text, when a real canvas is available.
 *
 * Passed in rather than reached for, so the layout stays pure and testable.
 * Without it the width falls back to an estimate, which is fine for a test and
 * is NOT fine for the scrim or the transparent export — both are drawn to this
 * width, and an estimate that comes up short clips the text.
 */
export type Measure = (text: string, weight: number, size: number) => number;

/** The estimate, used when nothing can measure for real. */
function estimate(text: string, size: number, perChar: number): number {
  return text.length * size * perChar;
}

/**
 * Measures the block.
 *
 * Measured rather than guessed because the block has to be clamped inside the
 * frame, and a clamp against the wrong height is a card that hangs off the
 * bottom of somebody's story.
 *
 * The width is measured from the text AS DRAWN, which is the part that was
 * wrong: labels are drawn upper-cased, and upper-case is wider than the string
 * they were measured from. The scrim came out narrower than the words inside
 * it and the transparent export clipped them — neither visible to any test,
 * because no test draws.
 */
export function layoutOverlay(
  frame: Size,
  stats: readonly OverlayStat[],
  scale = 1,
  measure?: Measure,
): OverlayLayout {
  // One unit is a hundredth of the frame's width, so every size below reads
  // as a percentage of the picture.
  const unit = (frame.width / 100) * scale;
  const valueSize = unit * 11;
  const labelSize = unit * 3.6;
  const brandSize = unit * 3;
  const padding = unit * 4;
  const gap = unit * 3;

  const rows: { valueY: number; labelY: number }[] = [];
  let y = 0;
  for (let index = 0; index < stats.length; index += 1) {
    // Baselines, not box tops: canvas draws text from its baseline, and
    // converting at the call site is how a row ends up a line too low.
    y += valueSize * 0.82;
    const valueY = y;
    y += labelSize * 1.5;
    rows.push({ valueY, labelY: y });
    if (index < stats.length - 1) y += gap;
  }

  const brandY = y + brandSize * 2.4;

  const widthOf = (text: string, weight: number, size: number, perChar: number) =>
    measure ? measure(text, weight, size) : estimate(text, size, perChar);

  const widest = stats.reduce((longest, stat) => {
    const value = widthOf(stat.value, 600, valueSize, 0.62);
    // Upper-cased here exactly as `drawOverlay` draws it. Measuring the
    // original string is what made the scrim too narrow.
    const label = widthOf(stat.label.toUpperCase(), 500, labelSize, 0.68);
    return Math.max(longest, value, label);
  }, widthOf(BRAND, 600, brandSize, 0.62));

  return {
    width: Math.min(widest, frame.width - padding * 2),
    // Past the wordmark's baseline, so a scrim drawn to this height covers its
    // descenders instead of cutting them off.
    height: brandY + brandSize * 0.3,
    rows,
    valueSize,
    labelSize,
    brandSize,
    brandY,
    padding,
  };
}

/**
 * Where the block's top-left corner sits, in frame pixels.
 *
 * The position is stored as a fraction of the frame rather than as pixels, so
 * it survives changing the crop: a card dragged to the bottom third of a
 * square stays in the bottom third of a story. Clamped to keep the whole block
 * inside, with its padding as the margin — text touching the edge of an image
 * gets cropped by the safe areas every social app overlays on a story.
 */
export function overlayOrigin(
  frame: Size,
  layout: OverlayLayout,
  position: Pan,
): Pan {
  const free = {
    x: Math.max(0, frame.width - layout.width - layout.padding * 2),
    y: Math.max(0, frame.height - layout.height - layout.padding * 2),
  };
  return {
    x: layout.padding + Math.min(free.x, Math.max(0, position.x * free.x)),
    y: layout.padding + Math.min(free.y, Math.max(0, position.y * free.y)),
  };
}

/**
 * Draws the block onto a context, at `origin`.
 *
 * `backdrop` is a scrim rather than a solid panel. A photograph is rarely
 * evenly lit, so light type over the bright half of one is unreadable no
 * matter which tone is chosen; a shadow helps and is not always enough. The
 * scrim is what makes the card legible on a picture taken against a window,
 * which is most pictures taken indoors.
 */
export function drawOverlay(
  context: CanvasRenderingContext2D,
  layout: OverlayLayout,
  stats: readonly OverlayStat[],
  options: { origin: Pan; tone: Tone; backdrop: boolean },
): void {
  const { ink, shadow } = TONES[options.tone];
  const { origin } = options;

  context.save();

  if (options.backdrop) {
    const pad = layout.padding;
    context.fillStyle = options.tone === "ink" ? "rgba(255,255,255,0.72)" : "rgba(0,0,0,0.42)";
    // Symmetric, and taller than the content rather than shorter. It used to
    // end above the wordmark, leaving "mockio" floating on the photograph
    // outside the shade that exists to make it readable.
    roundedRect(
      context,
      origin.x - pad * 0.7,
      origin.y - pad * 0.9,
      layout.width + pad * 1.4,
      layout.height + pad * 1.6,
      pad * 0.8,
    );
    context.fill();
  }

  context.fillStyle = ink;
  context.textBaseline = "alphabetic";
  // A shadow rather than a stroke. An outline on type this size reads as a
  // sticker; a soft shadow is what keeps it legible without announcing itself.
  context.shadowColor = options.backdrop ? "transparent" : shadow;
  context.shadowBlur = layout.valueSize * 0.22;
  context.shadowOffsetY = layout.valueSize * 0.04;

  stats.forEach((stat, index) => {
    const row = layout.rows[index];
    if (!row) return;
    context.font = `600 ${layout.valueSize}px ${SHARE_FONT}`;
    context.fillText(stat.value, origin.x, origin.y + row.valueY);
    context.font = `500 ${layout.labelSize}px ${SHARE_FONT}`;
    context.globalAlpha = 0.82;
    context.fillText(stat.label.toUpperCase(), origin.x, origin.y + row.labelY);
    context.globalAlpha = 1;
  });

  context.font = `600 ${layout.brandSize}px ${SHARE_FONT}`;
  context.globalAlpha = 0.6;
  context.fillText(BRAND, origin.x, origin.y + layout.brandY);

  context.restore();
}

/**
 * The size of a transparent export: the block, with room for its shadow.
 *
 * Tight to the content rather than the frame, because the point of this file
 * is to be dropped onto a video in somebody else's editor — and a PNG padded
 * out to the shape of a photograph is one they have to crop before they can
 * place it.
 */
export function overlayOnlySize(layout: OverlayLayout): Size {
  return {
    width: Math.ceil(layout.width + layout.padding * 2),
    height: Math.ceil(layout.height + layout.padding * 2),
  };
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}
