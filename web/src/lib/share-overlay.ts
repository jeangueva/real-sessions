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

const FONT =
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
 * Measures the block.
 *
 * Measured rather than guessed because the block has to be clamped inside the
 * frame, and a clamp against an estimated height is a card that hangs off the
 * bottom edge of somebody's story.
 *
 * Text width is estimated from the character count rather than measured with
 * `measureText`, deliberately: measuring needs a canvas, which would make this
 * untestable and would tie the layout to whichever font the browser actually
 * resolved. The estimate is generous, so the backdrop is slightly wide rather
 * than ever too narrow — and nothing is centred against it, so a loose
 * estimate costs nothing visible.
 */
export function layoutOverlay(
  frame: Size,
  stats: readonly OverlayStat[],
  scale = 1,
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

  const widest = stats.reduce((longest, stat) => {
    // 0.58em per character for the value's weight, 0.52 for the label's.
    const value = stat.value.length * valueSize * 0.58;
    const label = stat.label.length * labelSize * 0.52;
    return Math.max(longest, value, label);
  }, BRAND.length * brandSize * 0.6);

  return {
    width: Math.min(widest, frame.width - padding * 2),
    height: brandY,
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
    roundedRect(
      context,
      origin.x - pad * 0.6,
      origin.y - pad * 0.9,
      layout.width + pad * 1.2,
      layout.height + pad * 0.6,
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
    context.font = `600 ${layout.valueSize}px ${FONT}`;
    context.fillText(stat.value, origin.x, origin.y + row.valueY);
    context.font = `500 ${layout.labelSize}px ${FONT}`;
    context.globalAlpha = 0.82;
    context.fillText(stat.label.toUpperCase(), origin.x, origin.y + row.labelY);
    context.globalAlpha = 1;
  });

  context.font = `600 ${layout.brandSize}px ${FONT}`;
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
