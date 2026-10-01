/**
 * Where the photograph sits inside the frame it is being cropped to.
 *
 * Separated from the screen that draws it because canvas code cannot be
 * tested and arithmetic can. Everything here is pure: given a frame, an image
 * and how far the candidate has dragged it, this says exactly which rectangle
 * to draw into. The component owns the canvas; this owns the decisions.
 *
 * The model is "cover", the same one `background-size: cover` implements: the
 * image is scaled up until it fills the frame on both axes and the overflow is
 * cropped. Never "contain" — a letterboxed photograph with bars down the side
 * is the single clearest sign that something was made by a tool rather than
 * composed, and this image is going on somebody's Instagram story next to
 * posts made by people with better tools than ours.
 */

export interface Size {
  width: number;
  height: number;
}

/** How far the image has been dragged from centre, in frame pixels. */
export interface Pan {
  x: number;
  y: number;
}

export interface Placement extends Pan, Size {}

/**
 * The crop shapes on offer.
 *
 * `original` keeps the photograph's own proportions, which is the right
 * default: it is the one choice that cannot cut anything off. The rest are the
 * shapes the places people post to actually use — 9:16 for a story, 4:5 for an
 * Instagram post, 1:1 for a LinkedIn image, 16:9 for everything on a desktop.
 */
export const CROPS = ["original", "1:1", "4:5", "9:16", "16:9", "4:3", "custom"] as const;

export type Crop = (typeof CROPS)[number];

/**
 * The longest side of an exported image, in pixels.
 *
 * 1440 is chosen against what the image is for, not against what a screen can
 * show: Instagram re-encodes anything larger and the only thing a bigger
 * export buys is a slower save on a mid-range Android phone. Small enough to
 * write in well under a second, large enough that the type stays crisp after
 * their compression.
 */
const LONGEST_SIDE = 1440;

/** The aspect ratio a crop means, given what the photograph itself is. */
export function ratioFor(crop: Crop, image: Size, custom: Size): number {
  if (crop === "original") return image.width / image.height;
  if (crop === "custom") return custom.width / custom.height;
  const [w, h] = crop.split(":").map(Number);
  return (w as number) / (h as number);
}

/**
 * The pixel dimensions to export at.
 *
 * Even numbers on both axes. Odd dimensions are legal in a PNG and a nuisance
 * everywhere after it — half-pixel centres make text land between pixels and
 * look faintly blurred, which on a card whose whole content is text is the
 * difference between "designed" and "made in a browser".
 */
export function frameFor(ratio: number): Size {
  const safe = Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
  const [width, height] =
    safe >= 1 ? [LONGEST_SIDE, LONGEST_SIDE / safe] : [LONGEST_SIDE * safe, LONGEST_SIDE];
  return { width: even(width), height: even(height) };
}

function even(value: number): number {
  return Math.max(2, Math.round(value / 2) * 2);
}

/**
 * How far the image may be dragged before an edge would show.
 *
 * The limit, not a suggestion: an unclamped drag leaves a transparent wedge
 * along one side, which exports as a black bar in every app that flattens a
 * PNG. There is nothing to drag along an axis the image exactly fills, and the
 * clamp collapses to zero there on its own.
 */
export function panLimit(frame: Size, drawn: Size): Pan {
  return {
    x: Math.max(0, (drawn.width - frame.width) / 2),
    y: Math.max(0, (drawn.height - frame.height) / 2),
  };
}

/** Keeps a drag inside what `panLimit` allows. */
export function clampPan(pan: Pan, frame: Size, drawn: Size): Pan {
  const limit = panLimit(frame, drawn);
  return {
    x: Math.min(limit.x, Math.max(-limit.x, pan.x)),
    y: Math.min(limit.y, Math.max(-limit.y, pan.y)),
  };
}

/**
 * The rectangle to draw the image into, in frame coordinates.
 *
 * Returns the top-left corner and the scaled size, which is exactly the four
 * arguments `drawImage` wants — the component should not be doing arithmetic
 * at the call site.
 */
export function placeCover(frame: Size, image: Size, pan: Pan): Placement {
  // The larger of the two scales is what makes it cover rather than fit.
  const scale = Math.max(frame.width / image.width, frame.height / image.height);
  const drawn = { width: image.width * scale, height: image.height * scale };
  const clamped = clampPan(pan, frame, drawn);
  return {
    x: (frame.width - drawn.width) / 2 + clamped.x,
    y: (frame.height - drawn.height) / 2 + clamped.y,
    width: drawn.width,
    height: drawn.height,
  };
}

/**
 * The size to show the frame at on screen.
 *
 * The export is 1440 on its longest side and a phone is about 360 points
 * wide, so the preview is a scaled view of the same geometry rather than a
 * second layout. One set of rules for both means what somebody drags is what
 * they get, which is the only property of a preview that matters.
 */
export function previewSize(frame: Size, available: Size): Size {
  const scale = Math.min(
    available.width / frame.width,
    available.height / frame.height,
    1,
  );
  return { width: frame.width * scale, height: frame.height * scale };
}
