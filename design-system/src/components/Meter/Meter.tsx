export interface MeterProps {
  /** The number, as it is measured. Not clamped here beyond the bar. */
  value: number;
  /** The top of the scale. The bar fills value/max, clamped to 0–100%. */
  max?: number;
  /** What is being measured: "Claridad", "Tu turno". */
  label: string;
  /** The unit after the number. Empty for a count. */
  suffix?: string;
}

/**
 * A measured score: the name, the number, and the bar that fills to it.
 *
 * The number is always there. Colour and length carry the reading, but the
 * figure is what a person needs and what a screen reader reads, so the bar is
 * never the only way to know the score.
 */
export function Meter({ value, max = 100, label, suffix = "%" }: MeterProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-cream-dim">{label}</span>
        <span className="text-sm font-semibold tabular-nums text-cream-bright">
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
        <div
          className="h-full w-full origin-left rounded-full bg-accent transition-transform duration-700 ease-cinematic"
          style={{ transform: `scaleX(${pct / 100})` }}
        />
      </div>
    </div>
  );
}
