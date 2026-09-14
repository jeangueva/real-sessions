import { useId, useMemo, useState } from "react";
import { useT } from "@/hooks/useLocale";

/**
 * The trend chart.
 *
 * Deliberately a single series. Four axes on one plot would need four
 * categorical hues, and every muted palette that sits inside this cream-on-dark
 * design fails colour-blind separation — the closest pair measured ΔE 5.0 for
 * deuteranopia against a floor of 8. Rather than bolt loud hues onto a
 * monochrome brand, identity comes from the panel title and each panel plots
 * one line in the same accent. Small multiples answer the actual question
 * better anyway: "which front am I improving on" is read by comparing shapes,
 * not by tracing four crossing lines.
 *
 * The y domain is fixed at 0–100 rather than fitted to the data. A fitted axis
 * turns three points of noise into a dramatic climb, which is the single most
 * flattering lie a progress chart can tell.
 */

export interface TrendPoint {
  label: string;
  /** 0–100, or null where this session could not be measured on this axis. */
  value: number | null;
}

/**
 * The viewBox is sized close to how the chart actually renders — roughly
 * 450–580px across in both the hero slot and the small-multiple grid. An SVG
 * scales its text along with its geometry, so a 320-wide box blown up to 670
 * rendered its axis labels at twice the size of the prose beside them.
 */
const WIDTH = 480;
const HEIGHT = 150;
const PAD = { top: 14, right: 14, bottom: 16, left: 34 };
const LABEL_SIZE = 11;

const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;

export function TrendChart({
  title,
  points,
  caption,
  unit = "%",
}: {
  title: string;
  points: TrendPoint[];
  caption?: string;
  unit?: string;
}) {
  const t = useT();
  const titleId = useId();
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  // Null values are gaps, not zeros. A typed session has no pace to plot, and
  // drawing it at the floor would read as a collapse in performance.
  const measured = useMemo(
    () =>
      points
        .map((point, index) => ({ ...point, index }))
        .filter((point): point is TrendPoint & { value: number; index: number } =>
          point.value !== null,
        ),
    [points],
  );

  const x = (index: number) =>
    points.length <= 1
      ? PAD.left + PLOT_W / 2
      : PAD.left + (index / (points.length - 1)) * PLOT_W;
  const y = (value: number) => PAD.top + PLOT_H - (value / 100) * PLOT_H;

  const path = measured
    .map((point, i) => `${i === 0 ? "M" : "L"} ${x(point.index)} ${y(point.value)}`)
    .join(" ");

  const latest = measured[measured.length - 1];
  const active = hover !== null ? points[hover] : null;

  if (measured.length === 0) {
    return (
      <figure className="flex flex-col gap-2">
        <figcaption className="text-xs text-cream-faint">{title}</figcaption>
        <div
          className="flex items-center justify-center rounded-xl border border-line"
          style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}
        >
          <p className="text-xs text-cream-faint">{t("chart.notMeasured")}</p>
        </div>
        {caption && <p className="text-xs text-cream-faint">{caption}</p>}
      </figure>
    );
  }

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="text-xs text-cream-faint" id={titleId}>
          {title}
        </span>
        {latest && (
          <span className="text-sm text-cream-bright">
            {Math.round(latest.value)}
            {unit}
          </span>
        )}
      </figcaption>

      {/* Every colour is a theme token reached through `currentColor`. The
          dark palette used to be written in here as literals, and on the light
          theme the line, the markers and the axis labels all but vanished into
          the card. */}
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full text-cream"
        role="img"
        aria-labelledby={titleId}
        onMouseLeave={() => setHover(null)}
      >
        {/* Recessive grid: quarters only. More lines would compete with the
            two-pixel data line for attention. */}
        {[0, 50, 100].map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke="currentColor"
              className="text-line"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={y(tick) + LABEL_SIZE / 3}
              textAnchor="end"
              fontSize={LABEL_SIZE}
              fill="currentColor"
              className="text-cream-faint"
            >
              {tick}
            </text>
          </g>
        ))}

        {measured.length > 1 && (
          <path
            d={path}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {measured.map((point) => (
          <circle
            key={point.index}
            cx={x(point.index)}
            cy={y(point.value)}
            r={hover === point.index ? 7 : 5.5}
            fill="currentColor"
            // A 2px ring in the colour of the card the chart sits on keeps
            // overlapping markers legible.
            className="stroke-surface-card"
            strokeWidth={2}
          />
        ))}

        {hover !== null && points[hover]?.value !== null && (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={PAD.top}
            y2={PAD.top + PLOT_H}
            stroke="currentColor"
            className="text-line-strong"
            strokeWidth={1}
          />
        )}

        {/* Hit targets, wider than the markers so hovering is not a precision
            task. Transparent and drawn last so they sit above the plot. */}
        {points.map((point, index) => (
          <rect
            key={`${point.label}-${index}`}
            x={x(index) - PLOT_W / Math.max(points.length, 1) / 2}
            y={PAD.top}
            width={Math.max(PLOT_W / Math.max(points.length, 1), 12)}
            height={PLOT_H}
            fill="transparent"
            onMouseEnter={() => setHover(index)}
          />
        ))}
      </svg>

      <div className="flex min-h-[1.5rem] items-baseline justify-between gap-3">
        <p className="text-xs text-cream-faint" aria-live="polite">
          {active
            ? `${active.label} · ${active.value === null ? "not measured" : `${Math.round(active.value)}${unit}`}`
            : (caption ?? "")}
        </p>
        <button
          onClick={() => setShowTable((current) => !current)}
          aria-expanded={showTable}
          className="focus-ring shrink-0 rounded px-1 text-xs text-cream-faint underline underline-offset-4 transition-colors hover:text-cream-bright"
        >
          {showTable ? "Hide values" : "Values"}
        </button>
      </div>

      {/* The table is the accessible path to the same data, and the honest one
          for anyone who wants the numbers rather than the shape. */}
      {showTable && (
        <table className="w-full text-xs">
          <caption className="sr-only">{title}, session by session</caption>
          <thead>
            <tr className="text-cream-faint">
              <th scope="col" className="py-1 text-left font-normal">
                Session
              </th>
              <th scope="col" className="py-1 text-right font-normal">
                Value
              </th>
            </tr>
          </thead>
          <tbody>
            {points.map((point, index) => (
              <tr key={`${point.label}-${index}`} className="border-t border-line">
                <td className="py-1 text-cream-dim">{point.label}</td>
                <td className="py-1 text-right text-cream-bright">
                  {point.value === null ? "—" : `${Math.round(point.value)}${unit}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </figure>
  );
}

/**
 * The four axes at once, as a shape.
 *
 * This is the one plot in the product that shows all four fronts together, and
 * it is allowed to exist for the reason the docstring at the top of this file
 * rules out a four-line chart: a radar needs no categorical hues. There is one
 * series — one polygon — and identity comes from which spoke a vertex sits on
 * and the word printed beside it. Colour carries nothing, so nothing is lost
 * to a reader who cannot separate two muted tones.
 *
 * It answers a different question from the small multiples below it. They say
 * "is fluency improving"; this says "am I lopsided" — which is the question
 * someone asks once, at a glance, before deciding what to practise.
 */

/** Clockwise from the top. Fixed, because a shape that reorders is not a shape. */
const RADAR_AXES = ["fluency", "vocabulary", "structure", "confidence"] as const;
export type RadarAxis = (typeof RADAR_AXES)[number];

/**
 * Room for the words, not for the plot.
 *
 * Each label is two lines, the axis name with its number under it, so a side
 * label needs the width of one word — but that word is translated, and
 * "Уверенность" or "Vocabulário" runs past ninety units at the larger label
 * size below. The box is wider than it is tall to give the left and right
 * labels that room. An inline svg clips whatever falls outside its viewBox, and
 * says nothing.
 *
 * The shape grows by radius inside a bigger box, not by scaling the chart up.
 * An svg scales its text with its geometry, so a wider render of the old box
 * would have grown the labels past the prose beside them. At a radius of 62
 * the polygon read as a thumbnail next to the small multiples under it.
 */
const RADAR_W = 412;
const RADAR_H = 282;
const RADAR_CX = RADAR_W / 2;
const RADAR_CY = 140;
const RADAR_R = 90;
/** Where a label sits, measured out from the centre past the outer ring. */
const LABEL_R = RADAR_R + 16;

/**
 * The radar's own label size, in two steps rather than one.
 *
 * The box is scaled to fit its column, so a label renders at its size in units
 * times that scale: about 1.09 in the desktop column and about 0.75 in a
 * phone-width panel. No single size reads at both — the trend chart's 11 units
 * came out near 8px on a phone. Below the `sm` breakpoint, where the column is
 * narrower than the box, labels are 14 units (about 10.5px there); from `sm`
 * up they are 11 (about 12px, level with the captions around them).
 *
 * The geometry is laid out for the larger step, so neither one clips, and the
 * `fontSize` attribute carries it too, for anything rendering without the
 * stylesheet.
 */
const RADAR_LABEL_MAX = 14;
const RADAR_LABEL_CLASS = "text-[14px] sm:text-[11px]";
const LABEL_LINE = RADAR_LABEL_MAX + 2;

/** Unit vectors for the four compass points, clockwise from the top. */
const DIRECTION: Record<RadarAxis, { dx: number; dy: number }> = {
  fluency: { dx: 0, dy: -1 },
  vocabulary: { dx: 1, dy: 0 },
  structure: { dx: 0, dy: 1 },
  confidence: { dx: -1, dy: 0 },
};

function radarPoint(axis: RadarAxis, value: number, radius = RADAR_R) {
  const { dx, dy } = DIRECTION[axis];
  // The domain is fixed at 0–100, never fitted. A radar fitted to its own data
  // is worse than a fitted line chart: every shape becomes the same shape.
  const scaled = (Math.max(0, Math.min(100, value)) / 100) * radius;
  return { x: RADAR_CX + dx * scaled, y: RADAR_CY + dy * scaled };
}

export function RadarChart({
  title,
  scores,
  labels,
  caption,
}: {
  title: string;
  /** 0–100 per axis, or null where this candidate has no reading yet. */
  scores: Record<RadarAxis, number | null>;
  /** Already localised. Nothing in here may print English. */
  labels: Record<RadarAxis, string>;
  caption?: string;
}) {
  const t = useT();

  /**
   * An unmeasured axis is plotted at the centre rather than dropped.
   *
   * Dropping it would leave three vertices, and a triangle reads as a
   * deliberate shape rather than as missing data — the reader has no way to
   * tell which axis is absent, or that one is. At the centre the dent is
   * visible, and the label beside it says why.
   */
  const vertices = RADAR_AXES.map((axis) =>
    radarPoint(axis, scores[axis] ?? 0),
  );
  const polygon = vertices.map(({ x, y }) => `${x},${y}`).join(" ");

  const measuredCount = RADAR_AXES.filter((axis) => scores[axis] !== null).length;

  /** The numbers, for anyone who is not reading the shape. */
  const spoken = RADAR_AXES.map((axis) => {
    const value = scores[axis];
    return `${labels[axis]}: ${value === null ? t("chart.notMeasured") : Math.round(value)}`;
  }).join(". ");

  if (measuredCount === 0) {
    return (
      <figure className="flex flex-col gap-2">
        <figcaption className="text-xs text-cream-faint">{title}</figcaption>
        <div
          className="flex items-center justify-center rounded-xl border border-line"
          style={{ aspectRatio: `${RADAR_W} / ${RADAR_H}` }}
        >
          <p className="text-xs text-cream-faint">{t("chart.notMeasured")}</p>
        </div>
        {caption && <p className="text-xs text-cream-faint">{caption}</p>}
      </figure>
    );
  }

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-xs text-cream-faint">
        {title}
      </figcaption>

      {/* `currentColor` throughout, inherited from Tailwind text tokens on the
          svg and on each label. No literal colours and no opacity on text,
          because `web/test/contrast.test.ts` measures the tokens, not an
          alpha picked here.

          Labels anchor to physical plot sides: under `dir="rtl"`, `start`
          grows left across the right vertex. Each label remains its own text,
          so its words still shape and order correctly.

          The accessible name is aria-label alone: a labelled-by reference
          would override it and leave only the title, not the numbers; an SVG
          title child would announce them a second time. */}
      <svg
        viewBox={`0 0 ${RADAR_W} ${RADAR_H}`}
        style={{ direction: "ltr" }}
        className="w-full text-cream-bright"
        role="img"
        aria-label={`${title}. ${spoken}`}
      >
        {/* Rings and spokes, recessive. They are the ruler, not the reading. */}
        {[25, 50, 75, 100].map((ring) => (
          <polygon
            key={ring}
            points={RADAR_AXES.map((axis) => {
              const { x, y } = radarPoint(axis, ring);
              return `${x},${y}`;
            }).join(" ")}
            fill="none"
            stroke="currentColor"
            strokeOpacity={ring === 100 ? 0.22 : 0.12}
            strokeWidth={1}
          />
        ))}

        {RADAR_AXES.map((axis) => {
          const { x, y } = radarPoint(axis, 100);
          return (
            <line
              key={axis}
              x1={RADAR_CX}
              y1={RADAR_CY}
              x2={x}
              y2={y}
              stroke="currentColor"
              strokeOpacity={0.12}
              strokeWidth={1}
            />
          );
        })}

        <polygon
          points={polygon}
          fill="currentColor"
          fillOpacity={0.16}
          stroke="currentColor"
          strokeOpacity={0.85}
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {RADAR_AXES.map((axis) => {
          const value = scores[axis];
          const { x, y } = radarPoint(axis, value ?? 0);
          return (
            <circle
              key={axis}
              cx={x}
              cy={y}
              r={value === null ? 2.5 : 4}
              fill="currentColor"
              fillOpacity={value === null ? 0.35 : 1}
            />
          );
        })}

        {RADAR_AXES.map((axis) => {
          const { dx, dy } = DIRECTION[axis];
          const value = scores[axis];
          const x = RADAR_CX + dx * LABEL_R;
          const y = RADAR_CY + dy * LABEL_R;
          // Baseline of the name; the number sits a line below it. Above the
          // plot the pair is lifted so the number is what clears the ring,
          // below it the pair drops so the name does, and beside it the two
          // lines straddle the spoke.
          const nameY =
            dy < 0 ? y - LABEL_LINE : dy > 0 ? y + RADAR_LABEL_MAX : y - 2;
          const anchor = dx === 0 ? "middle" : dx > 0 ? "start" : "end";
          // Two `<text>` elements, not a `<tspan>` inside one. WebKit runs the
          // bidi algorithm across the whole element, so "אוצר מילים" with its
          // number on a second tspan rendered as "אוצר מיל80" over "ים".
          return (
            <g
              key={axis}
              fontSize={RADAR_LABEL_MAX}
              fill="currentColor"
            >
              <text
                x={x}
                y={nameY}
                textAnchor={anchor}
                fill="currentColor"
                // The fainter ink token when there is no reading means the
                // dent at the centre and the faded word are the same fact
                // said twice.
                className={`${RADAR_LABEL_CLASS} ${
                  value === null ? "text-cream-faint" : "text-cream-dim"
                }`}
              >
                {labels[axis]}
              </text>
              {value !== null && (
                <text
                  x={x}
                  y={nameY + LABEL_LINE}
                  textAnchor={anchor}
                  fill="currentColor"
                  className={`${RADAR_LABEL_CLASS} text-cream-bright`}
                >
                  {Math.round(value)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {caption && <p className="text-xs text-cream-faint">{caption}</p>}
    </figure>
  );
}
