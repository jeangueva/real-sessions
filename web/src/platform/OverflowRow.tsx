import { Children, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { X } from "lucide-react";

/**
 * A row of options that shows what fits and hides the rest behind "See all".
 *
 * The version before this scrolled sideways. That solved the height problem
 * and created a worse one: an option you cannot see is an option you do not
 * know exists, and a horizontal scrollbar inside a form is a thing people miss
 * entirely. Eighteen companies were reachable only by discovering that a row
 * of pills could be dragged.
 *
 * So the row now takes the full width, fills it, and stops. What did not fit
 * goes in a dialog behind one button — a control people already understand.
 *
 * The button only exists when something is actually hidden. A "See all" beside
 * three options that are all visible is a lie about there being more.
 */

/** Reserved for the button while measuring. Generous: better one pill early. */
const SEE_ALL_WIDTH = 104;

/** Matches the row's `gap-2`. */
const GAP = 8;

/**
 * How many children fit in `available` pixels, leaving room for "See all"
 * whenever anything is left over.
 *
 * Exported for its own test: it is the whole behaviour, and it is the kind of
 * arithmetic that is wrong by one for months without anyone noticing.
 */
export function countThatFit(
  widths: number[],
  available: number,
  seeAllWidth = SEE_ALL_WIDTH,
  gap = GAP,
): number {
  if (widths.length === 0) return 0;

  // First pass: how many fit if nothing has to be hidden.
  let used = 0;
  let fits = 0;
  for (const width of widths) {
    const next = used + (fits === 0 ? 0 : gap) + width;
    if (next > available) break;
    used = next;
    fits += 1;
  }
  if (fits === widths.length) return fits;

  // Something is hidden, so the button has to fit too. Drop items until it
  // does — and keep at least one visible, or the row is a button and nothing
  // else, which tells the reader nothing about what this field holds.
  while (fits > 1 && used + gap + seeAllWidth > available) {
    fits -= 1;
    used -= widths[fits]! + gap;
  }
  return Math.max(1, fits);
}

export function OverflowRow({
  label,
  title,
  children,
  className = "",
}: {
  /** Names the group for assistive tech. */
  label: string;
  /** Heading for the dialog. Usually the field's own label. */
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const items = Children.toArray(children);
  const row = useRef<HTMLDivElement>(null);
  const measure = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(items.length);
  const [open, setOpen] = useState(false);

  /**
   * Measured off a hidden copy of the full row, never off the visible one.
   *
   * Measuring the visible row feeds its own output back in: hiding an item
   * frees space, which makes another item fit, which hides a different one.
   * The hidden copy always holds every child at its natural width, so the
   * answer is stable.
   */
  useEffect(() => {
    const container = row.current;
    const source = measure.current;
    if (!container || !source) return;

    const recompute = () => {
      const widths = [...source.children].map(
        (child) => (child as HTMLElement).getBoundingClientRect().width,
      );
      const available = container.getBoundingClientRect().width;
      if (available === 0) return;
      setVisible(countThatFit(widths, available));
    };

    recompute();
    const observer = new ResizeObserver(recompute);
    observer.observe(container);
    observer.observe(source);
    return () => observer.disconnect();
  }, [items.length]);

  const hidden = items.length - visible;

  return (
    <div className={`relative min-w-0 ${className}`}>
      {/* The measuring copy. Out of the layout and out of the tree that
          assistive tech reads — it is the same options twice. */}
      <div
        ref={measure}
        aria-hidden
        className="pointer-events-none invisible absolute left-0 top-0 flex gap-2 whitespace-nowrap"
      >
        {items}
      </div>

      <div ref={row} role="radiogroup" aria-label={label} className="flex gap-2">
        <div className="flex min-w-0 gap-2 overflow-hidden">
          {items.slice(0, visible)}
        </div>
        {hidden > 0 && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="focus-ring shrink-0 whitespace-nowrap rounded-full border border-line px-4 py-2 text-xs text-cream-dim transition-colors hover:text-cream-bright sm:text-sm"
          >
            See all {items.length}
          </button>
        )}
      </div>

      {open && (
        <AllOptions title={title} onClose={() => setOpen(false)}>
          {items}
        </AllOptions>
      )}
    </div>
  );
}

/**
 * Everything the row could not show.
 *
 * Rendered through a portal, which is not optional. The setup panel is a glass
 * surface, and `backdrop-blur` makes an element a containing block for
 * everything `position: fixed` inside it — so an overlay written as
 * `fixed inset-0` covered the panel rather than the viewport, and the dialog
 * itself landed two pixels above the bottom of the screen.
 *
 * Closes on any click inside the list, because every child here is a control
 * that sets the field and there is nothing else to do afterwards. The child's
 * own handler still runs — this listens on the way back up.
 */
function AllOptions({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl border border-line bg-surface-deep p-6 sm:rounded-3xl"
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <p className="text-sm text-cream-bright">{title}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="focus-ring rounded-full p-1 text-cream-faint transition-colors hover:text-cream-bright"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="flex flex-wrap gap-2" onClick={onClose}>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
