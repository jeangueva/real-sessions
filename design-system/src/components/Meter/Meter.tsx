import type { HTMLAttributes } from "react";

export interface MeterProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** The measured amount, on the same scale as max: 7 of 10, 72 of 100. Shown as written. */
  value: number;
  /** The top of the scale. 100 for a percentage, 10 for a score out of ten, the XP a level needs. */
  max?: number;
  /** What is measured, in a word or two: "Vocabulario", "Estructura". Also the meter's accessible name. */
  label: string;
  /** Written right after the number: "%" for a percentage, "/10" for a score, "" for a bare count. */
  suffix?: string;
  /** Extra classes, appended to the wrapper. For layout (width, a grid span) — not for recolouring the bar. */
  className?: string;
}

/**
 * Score readout: a label, the number, and a bar that fills to the proportion.
 *
 * Colour never carries the meaning on its own — the number is always present
 * — so it stays readable for colour-blind users. The bar is a role="meter"
 * named by the label, so a screen reader hears what is measured and its value.
 */
export function Meter({ value, max = 100, label, suffix = "%", className = "", ...props }: MeterProps) {
  // A scale with no top (max 0 while data loads) draws an empty bar rather
  // than dividing by zero and drawing a full one.
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={`flex flex-col gap-2 ${className}`} {...props}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 text-xs text-cream-dim">{label}</span>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-cream-bright">
          {value}
          {suffix}
        </span>
      </div>
      <div
        role="meter"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
        className="h-1.5 w-full overflow-hidden rounded-full bg-surface-lift"
      >
        {/* Scaled, not resized, so a change of value is a compositor-only
            transition. It fills from the start of the line: the left in
            Spanish, the right in Arabic and Hebrew. */}
        <div
          className="h-full w-full origin-left rounded-full bg-accent transition-transform duration-700 ease-cinematic rtl:origin-right"
          style={{ transform: `scaleX(${pct / 100})` }}
        />
      </div>
    </div>
  );
}
