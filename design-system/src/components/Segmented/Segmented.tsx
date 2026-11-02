import { useRef } from "react";
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";

export interface SegmentedOption<T extends string> {
  /** What onChange receives when this option is chosen. */
  value: T;
  /** What the person reads: one to three words. */
  label: ReactNode;
}

export interface SegmentedProps<T extends string> {
  /** The choices, in reading order. Two to five; each value unique. */
  options: readonly { value: T; label: ReactNode }[];
  /** The chosen option's value. Controlled: the thumb moves when this changes. */
  value: T;
  /** Called with the new value when the person picks a different option. Not called for the one already chosen. */
  onChange: (value: T) => void;
  /** Names the group for assistive technology ("Tema", "Tiempo de exposición"). Not shown. */
  label: string;
  /** Extra classes, appended. For layout (self-start, w-full, margin) — not for recolouring the track. */
  className?: string;
}

/**
 * A choice of a few, with the selection sliding between them.
 *
 * The slots are equal widths, so the thumb travels by its own width and only
 * `transform` changes: nothing is measured, nothing reflows, and the first
 * paint already has the thumb in place (no flash while JavaScript measures).
 * The thumb lives on a rail as wide as one slot; the rail's padding is the
 * 4px inset, which leaves each option the track's full 44px height to hit.
 *
 * To assistive technology it is a radio group: one tab stop, arrows move and
 * choose, exactly like native radios.
 */
export function Segmented<T extends string>({ options, value, onChange, label, className = "" }: SegmentedProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const count = Math.max(options.length, 1);
  const selected = options.findIndex((option) => option.value === value);
  // With no match nothing is checked, so the first option keeps the group
  // reachable by Tab, as native radios do.
  const tabbable = selected === -1 ? 0 : selected;

  const choose = (index: number) => {
    const option = options[index];
    if (!option) return;
    refs.current[index]?.focus();
    if (option.value !== value) onChange(option.value);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    // Matches Tailwind's rtl: variant, which also reads the dir attribute, so
    // the keys and the thumb always agree on which way is forward.
    const rtl = event.currentTarget.closest("[dir]")?.getAttribute("dir") === "rtl";
    const last = options.length - 1;
    let next: number | null = null;
    switch (event.key) {
      case "ArrowRight":
        next = rtl ? index - 1 : index + 1;
        break;
      case "ArrowLeft":
        next = rtl ? index + 1 : index - 1;
        break;
      case "ArrowDown":
        next = index + 1;
        break;
      case "ArrowUp":
        next = index - 1;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = last;
        break;
      default:
        return;
    }
    event.preventDefault();
    // Wraps at both ends, like a native radio group.
    choose((next + options.length) % options.length);
  };

  const rail: CSSProperties = {
    width: `${100 / count}%`,
    // Percentages in translateX are of the rail itself, which is one slot.
    // --segmented-dir flips to -1 in right-to-left documents (see the root).
    transform: `translateX(calc(${tabbable * 100}% * var(--segmented-dir, 1)))`,
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`relative inline-grid max-w-full select-none auto-cols-fr grid-flow-col rounded-full bg-surface-lift rtl:[--segmented-dir:-1] ${className}`}
    >
      {selected !== -1 && (
        <span
          aria-hidden
          // The slide: transform only, on the press curve. motion-safe: is a
          // prefers-reduced-motion query in the class itself, so with reduced
          // motion the thumb simply appears under the new option.
          className="pointer-events-none absolute inset-y-0 start-0 p-1 ease-press motion-safe:transition-transform motion-safe:duration-200"
          style={rail}
        >
          <span className="block h-full w-full rounded-full bg-surface-card" />
        </span>
      )}
      {options.map((option, index) => {
        const checked = index === selected;
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={index === tabbable ? 0 : -1}
            onClick={() => choose(index)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={`focus-ring relative inline-flex min-h-11 min-w-12 items-center justify-center rounded-full px-5 py-2 text-center text-xs font-semibold leading-tight transition-colors duration-200 ease-press [-webkit-tap-highlight-color:transparent] ${
              checked ? "cursor-default text-cream-bright" : "text-cream-dim hover:text-cream"
            }`}
          >
            <span className="text-balance">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
