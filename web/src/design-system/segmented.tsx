import type { ReactNode } from "react";
import RubberSegment from "@/components/bits/RubberSegment";

/**
 * A choice of a few, with the selection sliding between them.
 *
 * React Bits' RubberSegment, dressed in this product's tokens: the thumb is
 * a card on the lifted track, the way the plain pill groups it replaces
 * looked, and it stretches as it travels — the motion says "this moved",
 * which a colour swap alone does not. Arrow keys move it; it is a radio
 * group to assistive technology.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className = "",
}: {
  options: readonly { value: T; label: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <RubberSegment
      items={options.map((option) => ({ value: option.value, label: option.label }))}
      value={value}
      onChange={(next) => onChange(next as T)}
      aria-label={label}
      size="lg"
      radius={999}
      inset={4}
      trackColor="rgb(var(--surface-lift) / var(--surface-lift-alpha))"
      thumbColor="rgb(var(--surface-card))"
      textColor="rgb(var(--cream) / 0.85)"
      activeTextColor="rgb(var(--cream-bright))"
      className={`font-semibold ${className}`}
    />
  );
}
