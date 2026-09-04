import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { Check } from "lucide-react";

/**
 * The setup form as one bar of selectors.
 *
 * Six fields laid out as rows of pills is an honest design and a tall one:
 * every option of every field on screen at once, most of them irrelevant to
 * the choice being made right now. The bar shows what is *chosen* — which is
 * the thing a person rereads before pressing Begin — and opens the options
 * only for the field being changed.
 *
 * It also retires the "See all" escape hatch that the pill rows needed. A
 * panel that opens on demand has room for eighteen companies; a row that has
 * to fit them on one line never did.
 */

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col divide-y divide-line rounded-3xl border border-line sm:flex-row sm:divide-x sm:divide-y-0">
      {children}
    </div>
  );
}

export interface Placement {
  left: number;
  width: number;
  /** One of the two is set; the other is undefined. */
  top?: number;
  bottom?: number;
  maxHeight: number;
}

/** The smallest panel worth opening downward before flipping it. */
export const MIN_PANEL = 160;

/** Panels are at least this wide, however narrow the segment is. */
export const MIN_WIDTH = 288;

const GAP = 8;

/**
 * Where the options panel goes, given the trigger and the viewport.
 *
 * Pure, so the flip and the clamping can be checked without a browser — the
 * arithmetic here is what put the panel halfway up the page the first time.
 */
export function placeUnder(
  rect: { left: number; top: number; bottom: number; width: number },
  viewportWidth: number,
  viewportHeight: number,
): Placement {
  const width = Math.max(rect.width, MIN_WIDTH);
  // Pulled left when it would run off the right: this bar reaches the edge of
  // the screen on a laptop and the last segment is Company.
  const left = Math.max(GAP, Math.min(rect.left, viewportWidth - width - GAP));

  const below = viewportHeight - rect.bottom - GAP * 2;
  if (below >= MIN_PANEL) {
    return { left, width, top: rect.bottom + GAP, maxHeight: below };
  }

  const above = rect.top - GAP * 2;
  // Neither side has room — take the larger and let it scroll.
  if (above <= below) {
    return { left, width, top: rect.bottom + GAP, maxHeight: Math.max(80, below) };
  }
  return {
    left,
    width,
    bottom: viewportHeight - rect.top + GAP,
    maxHeight: Math.max(80, above),
  };
}

export function FilterSegment({
  label,
  value,
  hint,
  disabled = false,
  disabledReason,
  children,
  width = "flex-1",
}: {
  label: string;
  /** What is currently chosen. The reason the bar is readable at a glance. */
  value: string;
  /** One line under the options, explaining what the field changes. */
  hint?: string;
  disabled?: boolean;
  /** Shown in place of the options when the plan does not include this. */
  disabledReason?: string;
  /** The options. Given `close` so choosing one can dismiss the panel. */
  children: (close: () => void) => ReactNode;
  width?: string;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<Placement | null>(null);

  /**
   * Measured and positioned by hand, in a portal.
   *
   * The setup panel is a glass surface and carries `overflow-hidden` to keep
   * its rounded edge — which clipped an absolutely positioned panel at the
   * border. Anchoring to the trigger's own rect and rendering into the body
   * escapes that without changing a surface the rest of the app shares.
   *
   * Opens downward and simply gets shorter when the space is tight, and only
   * flips above when there is genuinely no room. The flipped case is anchored
   * by `bottom` rather than `top` because the panel's height is not known
   * until after it renders — computing a `top` from a guessed height is what
   * left it floating halfway up the page.
   */
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      setAt(placeUnder(rect, window.innerWidth, window.innerHeight));
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      // The panel lives in a portal, so it is not inside `box`. Checking only
      // the trigger would close on mousedown before the click on an option
      // ever landed, and the field would never change.
      const target = event.target as Node;
      if (box.current?.contains(target) || panel.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={box} className={`relative min-w-0 ${width}`}>
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
        className={`focus-ring flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors first:rounded-t-3xl last:rounded-b-3xl sm:first:rounded-l-3xl sm:first:rounded-tr-none sm:last:rounded-r-3xl sm:last:rounded-bl-none ${
          open ? "bg-cream/10" : "hover:bg-cream/5"
        }`}
      >
        <span className="text-xs text-cream-faint">{label}</span>
        <span
          className={`truncate text-sm ${disabled ? "text-cream-faint" : "text-cream-bright"}`}
        >
          {value}
        </span>
      </button>

      {open &&
        at &&
        createPortal(
          <div
            ref={panel}
            role="dialog"
            aria-label={label}
            style={{
              left: at.left,
              width: at.width,
              maxHeight: at.maxHeight,
              ...(at.top === undefined ? { bottom: at.bottom } : { top: at.top }),
            }}
            className="fixed z-50 overflow-y-auto rounded-2xl border border-line bg-surface-deep p-3 shadow-2xl"
          >
            {disabled ? (
              <p className="text-xs text-cream-dim">{disabledReason}</p>
            ) : (
              <>
                {hint && <p className="mb-3 text-xs text-cream-dim">{hint}</p>}
                {children(() => setOpen(false))}
              </>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

/**
 * One option inside a panel.
 *
 * A full-width row with a tick rather than a pill: the panel is a list being
 * read top to bottom, and a wrapped bag of pills makes the reader hunt for
 * which one is filled in.
 */
export function FilterOption({
  label,
  detail,
  selected,
  onSelect,
  disabled = false,
}: {
  label: string;
  detail?: string;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      disabled={disabled}
      onClick={onSelect}
      className={`focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        selected ? "bg-cream/10" : "hover:bg-cream/5"
      }`}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-cream-bright">{label}</span>
        {detail && <span className="block truncate text-xs text-cream-dim">{detail}</span>}
      </span>
      {selected && <Check className="h-4 w-4 shrink-0 text-cream-bright" aria-hidden />}
    </button>
  );
}
