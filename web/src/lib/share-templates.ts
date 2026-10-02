import type { Pan, Size } from "./share-frame";
import {
  drawOverlay,
  layoutOverlay,
  overlayOnlySize,
  overlayOrigin,
  SHARE_FONT,
  TONES,
  type Measure,
  type OverlayStat,
  type Tone,
} from "./share-overlay";
import type { ShareStat } from "./share-stats";

/**
 * The composed designs somebody picks from, rather than assembles.
 *
 * Strava, Coros and Aura all converged on the same thing: a gallery of
 * finished arrangements you tap once. None of them asks which numbers to
 * include and then shows you what that looked like. The reason is visible the
 * moment you watch somebody use it — choosing from pictures takes a second and
 * always looks composed, while choosing from checkboxes takes a minute and
 * usually does not.
 *
 * So a template decides two things, not one: which stats it wants and how they
 * are arranged. "Streak" is a single enormous number because a streak is the
 * one thing worth saying alone; "receipt" is a list because a list is what a
 * list is good at. A template that only changed colours would be a theme, and
 * themes are what the tone picker already is.
 *
 * Every template draws through the same primitives in `share-overlay.ts` —
 * the measured width, the scrim, the shadow, the wordmark — so a fix to any of
 * those reaches all of them.
 */

export interface TemplateOptions {
  origin: Pan;
  tone: Tone;
  backdrop: boolean;
  scale: number;
  measure?: Measure;
}

export interface ShareTemplate {
  id: TemplateId;
  /** The copy key for its name in the gallery. */
  labelKey:
    | "share.templateStack"
    | "share.templateStreak"
    | "share.templateReceipt"
    | "share.templateBest";
  /**
   * The stats this design wants, in the order it draws them.
   *
   * Returns an empty list when the person does not have what it needs, and
   * the gallery then leaves it out rather than offering a card that cannot be
   * filled — a template that renders "—" is worse than one that is absent.
   */
  pick(stats: readonly ShareStat[]): ShareStat[];
  measure(frame: Size, stats: readonly OverlayStat[], options: TemplateOptions): Size;
  draw(
    context: CanvasRenderingContext2D,
    frame: Size,
    stats: readonly OverlayStat[],
    options: TemplateOptions,
  ): void;
}

export type TemplateId = "stack" | "streak" | "receipt" | "best";

/** One unit is a hundredth of the frame's width — see `layoutOverlay`. */
const unitOf = (frame: Size, scale: number) => (frame.width / 100) * scale;

const BRAND = "mockio";

function widthOf(
  text: string,
  weight: number,
  size: number,
  perChar: number,
  measure?: Measure,
): number {
  return measure ? measure(text, weight, size) : text.length * size * perChar;
}

/** The shadow every template uses, so type stays readable on a photograph. */
function inkFor(context: CanvasRenderingContext2D, options: TemplateOptions, size: number): void {
  const { ink, shadow } = TONES[options.tone];
  context.fillStyle = ink;
  context.shadowColor = options.backdrop ? "transparent" : shadow;
  context.shadowBlur = size * 0.22;
  context.shadowOffsetY = size * 0.04;
}

/* ---------------------------------------------------------------------------
 * The one that already existed: value over label, stacked.
 * ------------------------------------------------------------------------ */

const stack: ShareTemplate = {
  id: "stack",
  labelKey: "share.templateStack",
  // Up to three, never a sensitive one unless it is all there is.
  pick: (stats) => stats.filter((stat) => !stat.sensitive).slice(0, 3),
  measure: (frame, stats, options) =>
    layoutOverlay(frame, stats, options.scale, options.measure),
  draw: (context, frame, stats, options) => {
    const layout = layoutOverlay(frame, stats, options.scale, options.measure);
    drawOverlay(context, layout, stats, {
      origin: options.origin,
      tone: options.tone,
      backdrop: options.backdrop,
    });
  },
};

/* ---------------------------------------------------------------------------
 * One number, as large as it will go.
 * ------------------------------------------------------------------------ */

const streak: ShareTemplate = {
  id: "streak",
  labelKey: "share.templateStreak",
  /**
   * The single most boastable thing, and nothing else.
   *
   * A streak first, because consecutive weeks is a sentence; otherwise
   * whatever the first effort stat happens to be. One stat only — the whole
   * design is that the number is enormous, and two enormous numbers is just
   * a stack in a larger font.
   */
  pick: (stats) => {
    const best =
      stats.find((stat) => stat.id === "streak") ??
      stats.find((stat) => !stat.sensitive);
    return best ? [best] : [];
  },
  measure: (frame, stats, options) => {
    const unit = unitOf(frame, options.scale);
    const value = unit * 30;
    const label = unit * 5;
    const first = stats[0];
    const width = Math.max(
      first ? widthOf(first.value, 700, value, 0.6, options.measure) : 0,
      first ? widthOf(first.label.toUpperCase(), 500, label, 0.7, options.measure) : 0,
      widthOf(BRAND, 600, unit * 3.4, 0.62, options.measure),
    );
    return {
      width: Math.min(width, frame.width - unit * 8),
      height: value * 0.78 + label * 2.6 + unit * 3.4 * 2,
    };
  },
  draw: (context, frame, stats, options) => {
    const first = stats[0];
    if (!first) return;
    const unit = unitOf(frame, options.scale);
    const value = unit * 30;
    const label = unit * 5;
    const brand = unit * 3.4;
    const { origin } = options;

    context.save();
    context.textBaseline = "alphabetic";
    inkFor(context, options, value);
    context.font = `700 ${value}px ${SHARE_FONT}`;
    context.fillText(first.value, origin.x, origin.y + value * 0.78);
    context.font = `500 ${label}px ${SHARE_FONT}`;
    context.globalAlpha = 0.85;
    // Letter-spacing by hand: canvas has no such property, and this label is
    // the one piece of type in the system that needs it.
    let x = origin.x;
    const spaced = first.label.toUpperCase();
    for (const character of spaced) {
      context.fillText(character, x, origin.y + value * 0.78 + label * 1.9);
      x += widthOf(character, 500, label, 0.7, options.measure) + label * 0.1;
    }
    context.globalAlpha = 0.6;
    context.font = `600 ${brand}px ${SHARE_FONT}`;
    context.fillText(BRAND, origin.x, origin.y + value * 0.78 + label * 1.9 + brand * 2.2);
    context.restore();
  },
};

/* ---------------------------------------------------------------------------
 * The receipt. A paper slip with dotted leaders.
 * ------------------------------------------------------------------------ */

const receipt: ShareTemplate = {
  id: "receipt",
  labelKey: "share.templateReceipt",
  // Up to four, and a score is welcome here: a receipt is a record rather
  // than a boast, which is the one context where the number reads as honest.
  pick: (stats) => stats.slice(0, 4),
  measure: (frame, stats, options) => {
    const unit = unitOf(frame, options.scale);
    const row = unit * 4.2;
    const pad = unit * 5;
    /**
     * Wide enough for its longest line, not a number somebody liked.
     *
     * It was a fixed 58 units, and "MINUTES SPEAKING ENGLISH" simply ran over
     * the value on its right — the label and the figure overlapped into an
     * unreadable smudge, in every crop, for the one stat most people have.
     * Found by drawing it; no test could have seen it.
     */
    const widest = stats.reduce((longest, stat) => {
      const label = widthOf(stat.label.toUpperCase(), 500, row, 0.68, options.measure);
      const value = widthOf(stat.value, 700, row, 0.62, options.measure);
      return Math.max(longest, label + value + unit * 6);
    }, unit * 30);
    return {
      width: Math.min(frame.width - unit * 8, Math.max(unit * 40, widest + pad * 2)),
      height: pad * 2 + unit * 7 + stats.length * row * 1.9,
    };
  },
  draw: (context, frame, stats, options) => {
    const unit = unitOf(frame, options.scale);
    const row = unit * 4.2;
    const pad = unit * 5;
    const { origin } = options;
    const size = receipt.measure(frame, stats, options);

    context.save();
    /**
     * Its own paper rather than the shared scrim.
     *
     * A receipt is an object, not text laid over a picture, and the whole
     * reason this design travels is that it looks like a thing somebody was
     * handed. So it brings its own ground and ignores the tone, which is
     * about ink on a photograph.
     */
    const paper = options.tone === "ink" ? "#17181c" : "#f4f1e8";
    const ink = options.tone === "ink" ? "#f4f1e8" : "#17181c";
    context.shadowColor = "rgba(0,0,0,0.35)";
    context.shadowBlur = unit * 3;
    context.shadowOffsetY = unit * 1;
    context.fillStyle = paper;
    context.fillRect(origin.x, origin.y, size.width, size.height);
    context.shadowColor = "transparent";

    // The torn edge. Half-circles bitten out of the bottom, which is what
    // makes it read as paper rather than as a white rectangle.
    const tooth = unit * 2;
    context.globalCompositeOperation = "destination-out";
    for (let x = origin.x; x < origin.x + size.width; x += tooth * 2) {
      context.beginPath();
      context.arc(x + tooth, origin.y + size.height, tooth, 0, Math.PI * 2);
      context.fill();
    }
    context.globalCompositeOperation = "source-over";

    context.fillStyle = ink;
    context.textBaseline = "alphabetic";
    context.font = `700 ${unit * 4}px ${SHARE_FONT}`;
    context.fillText(BRAND.toUpperCase(), origin.x + pad, origin.y + pad + unit * 3.4);

    stats.forEach((stat, index) => {
      const y = origin.y + pad + unit * 7 + row * 1.9 * (index + 0.6);
      const label = stat.label.toUpperCase();
      context.font = `700 ${row}px ${SHARE_FONT}`;
      const valueWidth = widthOf(stat.value, 700, row, 0.62, options.measure);
      context.fillText(stat.value, origin.x + size.width - pad - valueWidth, y);

      /**
       * The label shrinks to fit rather than running under the value.
       *
       * Even with the box measured from the content, the box is capped by the
       * frame — so on a narrow crop a long label still has to give way. It
       * gives way by getting smaller, never by overlapping: two pieces of
       * type on top of each other is the one outcome that looks broken rather
       * than merely tight.
       */
      const room = size.width - pad * 2 - valueWidth - unit * 4;
      const natural = widthOf(label, 500, row, 0.68, options.measure);
      const labelSize = natural > room ? Math.max(row * 0.62, row * (room / natural)) : row;
      context.font = `500 ${labelSize}px ${SHARE_FONT}`;
      context.fillText(label, origin.x + pad, y);

      // The dotted leader between them, which is the whole visual idea.
      const from =
        origin.x + pad + widthOf(label, 500, labelSize, 0.68, options.measure) + unit;
      const to = origin.x + size.width - pad - valueWidth - unit;
      if (to > from) {
        context.save();
        context.globalAlpha = 0.45;
        context.strokeStyle = ink;
        context.lineWidth = Math.max(1, unit * 0.25);
        context.setLineDash([unit * 0.5, unit * 0.9]);
        context.beginPath();
        context.moveTo(from, y - row * 0.3);
        context.lineTo(to, y - row * 0.3);
        context.stroke();
        context.restore();
      }
    });
    context.restore();
  },
};

/* ---------------------------------------------------------------------------
 * The score, for somebody who wants to say it.
 * ------------------------------------------------------------------------ */

const best: ShareTemplate = {
  id: "best",
  labelKey: "share.templateBest",
  /**
   * Only offered to somebody who has a score.
   *
   * And never selected for them — the gallery puts it last, because
   * publishing a percentage about your own English is a different act from
   * publishing how often you practise.
   */
  pick: (stats) => {
    const score = stats.find((stat) => stat.id === "best");
    return score ? [score] : [];
  },
  measure: (frame, stats, options) => {
    const unit = unitOf(frame, options.scale);
    const ring = unit * 34;
    return { width: ring, height: ring + unit * 8 };
  },
  draw: (context, frame, stats, options) => {
    const first = stats[0];
    if (!first) return;
    const unit = unitOf(frame, options.scale);
    const ring = unit * 34;
    const { origin } = options;
    const centre = { x: origin.x + ring / 2, y: origin.y + ring / 2 };
    const { ink } = TONES[options.tone];

    context.save();
    context.textBaseline = "middle";
    context.textAlign = "center";

    // The ring, drawn as a full circle rather than an arc of the score: an
    // arc invites the reader to compare it against the whole, and a score out
    // of a hundred is not a progress bar toward anything.
    context.strokeStyle = ink;
    context.globalAlpha = 0.5;
    context.lineWidth = unit * 0.9;
    context.beginPath();
    context.arc(centre.x, centre.y, ring / 2 - unit, 0, Math.PI * 2);
    context.stroke();
    context.globalAlpha = 1;

    inkFor(context, options, unit * 14);
    context.font = `700 ${unit * 14}px ${SHARE_FONT}`;
    context.fillText(first.value, centre.x, centre.y - unit);
    /**
     * The caption shrinks to stay inside the ring.
     *
     * At a fixed size "minutes speaking english" spilled out past the circle
     * on every narrow crop, which turns a deliberate shape into something
     * that looks like a mistake. The ring is the design; the words fit inside
     * it or they get smaller.
     */
    const caption = first.label.toUpperCase();
    const room = ring - unit * 6;
    const natural = widthOf(caption, 500, unit * 3.4, 0.68, options.measure);
    const captionSize =
      natural > room ? Math.max(unit * 2, unit * 3.4 * (room / natural)) : unit * 3.4;
    context.font = `500 ${captionSize}px ${SHARE_FONT}`;
    context.globalAlpha = 0.85;
    context.fillText(caption, centre.x, centre.y + unit * 6);
    context.globalAlpha = 0.6;
    context.font = `600 ${unit * 3.2}px ${SHARE_FONT}`;
    context.fillText(BRAND, centre.x, origin.y + ring + unit * 4);
    context.restore();
  },
};

/**
 * The largest scale at which a design still fits inside the frame.
 *
 * Height is the one dimension no template controls: a stack of four rows at
 * the top of the size slider is taller than a 16:9 crop, and the overflow
 * falls off the bottom edge where the author cannot see it in the preview.
 * Measured and reduced rather than forbidden, so the slider keeps working and
 * simply stops having an effect once the card is as large as it can be.
 */
export function fittingScale(
  template: ShareTemplate,
  frame: Size,
  stats: readonly OverlayStat[],
  options: TemplateOptions,
): number {
  if (stats.length === 0) return options.scale;
  const room = { width: frame.width * 0.92, height: frame.height * 0.92 };
  const size = template.measure(frame, stats, options);
  const ratio = Math.min(room.width / size.width, room.height / size.height, 1);
  return options.scale * ratio;
}

/** In gallery order: effort first, the score last. */
export const TEMPLATES: readonly ShareTemplate[] = [stack, streak, receipt, best];

export function templateById(id: TemplateId): ShareTemplate {
  return TEMPLATES.find((template) => template.id === id) ?? stack;
}

/**
 * The templates worth offering, given what this person has.
 *
 * One that cannot be filled is left out rather than shown empty: a card
 * reading "—" is worse than a card that was never on the menu.
 */
export function availableTemplates(stats: readonly ShareStat[]): ShareTemplate[] {
  return TEMPLATES.filter((template) => template.pick(stats).length > 0);
}

export { overlayOnlySize, overlayOrigin };
