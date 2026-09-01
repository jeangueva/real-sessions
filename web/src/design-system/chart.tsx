import { useId, useMemo, useState } from "react";

/**
 * The one chart in the product.
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
          <p className="text-xs text-cream-faint">Not measured yet</p>
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

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
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
              stroke="rgba(222,219,200,0.14)"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={y(tick) + LABEL_SIZE / 3}
              textAnchor="end"
              fontSize={LABEL_SIZE}
              fill="rgba(222,219,200,0.45)"
            >
              {tick}
            </text>
          </g>
        ))}

        {measured.length > 1 && (
          <path
            d={path}
            fill="none"
            stroke="#DEDBC8"
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
            fill="#DEDBC8"
            // A 2px ring in the surface colour keeps overlapping markers legible.
            stroke="#04212E"
            strokeWidth={2}
          />
        ))}

        {hover !== null && points[hover]?.value !== null && (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={PAD.top}
            y2={PAD.top + PLOT_H}
            stroke="rgba(222,219,200,0.45)"
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
