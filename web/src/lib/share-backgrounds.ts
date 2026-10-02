import type { Size } from "./share-frame";

/**
 * Something to put behind the numbers when there is no photograph.
 *
 * Coros ships a strip of stock landscapes for this, and the reason is the one
 * that matters: requiring a photograph means somebody standing in a corridor
 * with nothing worth posting simply does not post. The card has to work for
 * them too.
 *
 * Drawn rather than shipped. A handful of stock photographs would be a few
 * megabytes in the bundle, a licence to keep track of, and a set of images
 * that look like somebody else's life; a gradient costs nothing, has no owner,
 * and never competes with the type on top of it — which is the whole job.
 *
 * Every one is dark enough for cream type and light enough somewhere for the
 * dark tone to work, so no background makes the ink choice wrong.
 */

export interface Background {
  id: BackgroundId;
  labelKey:
    | "share.bgNone"
    | "share.bgInk"
    | "share.bgEmber"
    | "share.bgDepth"
    | "share.bgPaper";
  /** Null for "none", which is what makes the export transparent. */
  paint: ((context: CanvasRenderingContext2D, frame: Size) => void) | null;
}

export type BackgroundId = "none" | "ink" | "ember" | "depth" | "paper";

/** A soft radial wash, the shape every one of these is built from. */
function wash(
  context: CanvasRenderingContext2D,
  frame: Size,
  at: { x: number; y: number },
  radius: number,
  colour: string,
): void {
  const gradient = context.createRadialGradient(
    frame.width * at.x,
    frame.height * at.y,
    0,
    frame.width * at.x,
    frame.height * at.y,
    Math.max(frame.width, frame.height) * radius,
  );
  gradient.addColorStop(0, colour);
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, frame.width, frame.height);
}

/**
 * Fine noise over the whole frame.
 *
 * Without it a large gradient bands into visible steps the moment a social
 * network re-encodes it, which is the one thing that makes a drawn background
 * look cheap next to a photograph.
 */
function grain(context: CanvasRenderingContext2D, frame: Size, strength = 0.035): void {
  const step = Math.max(2, Math.round(frame.width / 360));
  context.save();
  context.globalAlpha = strength;
  context.fillStyle = "#ffffff";
  for (let y = 0; y < frame.height; y += step) {
    for (let x = 0; x < frame.width; x += step) {
      // Deterministic from the position, so the same card redraws identically
      // rather than shimmering on every render.
      if (((x * 73856093) ^ (y * 19349663)) % 7 === 0) {
        context.fillRect(x, y, step, step);
      }
    }
  }
  context.restore();
}

export const BACKGROUNDS: readonly Background[] = [
  // First, and deliberately: a transparent export is the one Strava turned its
  // whole gallery into, and it is the file that drops onto a video.
  { id: "none", labelKey: "share.bgNone", paint: null },
  {
    id: "ink",
    labelKey: "share.bgInk",
    paint: (context, frame) => {
      context.fillStyle = "#17181c";
      context.fillRect(0, 0, frame.width, frame.height);
      wash(context, frame, { x: 0.2, y: 0.15 }, 0.75, "rgba(236,233,216,0.14)");
      wash(context, frame, { x: 0.85, y: 0.9 }, 0.6, "rgba(236,233,216,0.08)");
      grain(context, frame);
    },
  },
  {
    id: "ember",
    labelKey: "share.bgEmber",
    paint: (context, frame) => {
      context.fillStyle = "#1b1410";
      context.fillRect(0, 0, frame.width, frame.height);
      wash(context, frame, { x: 0.15, y: 0.85 }, 0.8, "rgba(255,138,76,0.3)");
      wash(context, frame, { x: 0.8, y: 0.2 }, 0.55, "rgba(255,196,120,0.14)");
      grain(context, frame);
    },
  },
  {
    id: "depth",
    labelKey: "share.bgDepth",
    paint: (context, frame) => {
      context.fillStyle = "#0e1418";
      context.fillRect(0, 0, frame.width, frame.height);
      wash(context, frame, { x: 0.75, y: 0.25 }, 0.85, "rgba(96,165,196,0.26)");
      wash(context, frame, { x: 0.2, y: 0.8 }, 0.6, "rgba(40,80,110,0.4)");
      grain(context, frame);
    },
  },
  {
    id: "paper",
    labelKey: "share.bgPaper",
    paint: (context, frame) => {
      // The one light ground, for the dark ink tone and for a receipt that
      // wants to sit on something other than a photograph.
      context.fillStyle = "#efece2";
      context.fillRect(0, 0, frame.width, frame.height);
      wash(context, frame, { x: 0.3, y: 0.2 }, 0.8, "rgba(255,255,255,0.7)");
      wash(context, frame, { x: 0.85, y: 0.9 }, 0.7, "rgba(190,183,165,0.35)");
      grain(context, frame, 0.05);
    },
  },
];

export function backgroundById(id: BackgroundId): Background {
  return BACKGROUNDS.find((entry) => entry.id === id) ?? BACKGROUNDS[0]!;
}
