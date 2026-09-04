import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import {
  TOUR_STEPS,
  markTourSeen,
  stepsPresent,
  tourSeen,
  type TourStep,
} from "@/lib/tour";

/**
 * The first-run walkthrough.
 *
 * A spotlight rather than a modal: the point is to name things that are
 * already on the screen, and a dialog in the middle of the page hides the
 * subject it is describing. The cut-out is four `box-shadow`-less panels
 * around the target rather than an SVG mask — cheaper, and it keeps the
 * highlighted control clickable, which matters because people try.
 *
 * Escape closes it, the backdrop closes it, and Skip is on every step. A tour
 * nobody can leave is the reason people dismiss tours on sight.
 */

const PAD = 8;

export interface Spot {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Where the card goes: below the spotlight, or above when there is no room. */
export function cardPosition(
  spot: Spot,
  viewportWidth: number,
  viewportHeight: number,
  cardWidth = 340,
): { left: number; top?: number; bottom?: number } {
  const left = Math.max(
    12,
    Math.min(spot.left, viewportWidth - cardWidth - 12),
  );
  const below = viewportHeight - (spot.top + spot.height);
  // 220 is roughly the card at its tallest. Below when it fits, above when it
  // does not — and below anyway when neither side has room, because a card
  // pinned to the top edge is easier to read than one off the bottom.
  if (below > 220 || below > spot.top) {
    return { left, top: spot.top + spot.height + PAD * 2 };
  }
  return { left, bottom: viewportHeight - spot.top + PAD * 2 };
}

export function Tour() {
  const [steps, setSteps] = useState<TourStep[] | null>(null);
  const [index, setIndex] = useState(0);
  const [spot, setSpot] = useState<Spot | null>(null);

  // Deferred a frame: the setup screen fetches its catalogue before the bar
  // has anything in it, and a tour that starts against a half-built page
  // measures the wrong boxes.
  useEffect(() => {
    if (tourSeen()) return;
    const timer = window.setTimeout(() => {
      const present = stepsPresent(TOUR_STEPS, (selector) =>
        Boolean(document.querySelector(selector)),
      );
      if (present.length > 0) setSteps(present);
    }, 600);
    return () => window.clearTimeout(timer);
  }, []);

  const close = useCallback(() => {
    markTourSeen();
    setSteps(null);
  }, []);

  const step = steps?.[index];

  useLayoutEffect(() => {
    if (!step) return;
    const measure = () => {
      const target = document.querySelector(step.target);
      if (!target) return;
      const rect = target.getBoundingClientRect();
      setSpot({
        top: rect.top - PAD,
        left: rect.left - PAD,
        width: rect.width + PAD * 2,
        height: rect.height + PAD * 2,
      });
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [step]);

  useEffect(() => {
    if (!step) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [step, close]);

  if (!steps || !step || !spot) return null;

  const last = index === steps.length - 1;
  const card = cardPosition(spot, window.innerWidth, window.innerHeight);

  return createPortal(
    <div className="fixed inset-0 z-[60]" role="dialog" aria-label="Guided tour">
      {/* Four panels around the target rather than one overlay with a hole:
          the target stays clickable, which is what people try first. */}
      <div
        onClick={close}
        className="absolute inset-x-0 top-0 bg-black/60"
        style={{ height: Math.max(0, spot.top) }}
      />
      <div
        onClick={close}
        className="absolute inset-x-0 bottom-0 bg-black/60"
        style={{ top: spot.top + spot.height }}
      />
      <div
        onClick={close}
        className="absolute left-0 bg-black/60"
        style={{ top: spot.top, height: spot.height, width: Math.max(0, spot.left) }}
      />
      <div
        onClick={close}
        className="absolute right-0 bg-black/60"
        style={{ top: spot.top, height: spot.height, left: spot.left + spot.width }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute rounded-2xl ring-2 ring-cream/60"
        style={{
          top: spot.top,
          left: spot.left,
          width: spot.width,
          height: spot.height,
        }}
      />

      <div
        style={{ ...card, width: 340, maxWidth: "calc(100vw - 24px)" }}
        className="absolute rounded-2xl border border-line bg-surface-deep p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <p className="text-sm text-cream-bright">{step.title}</p>
          <button
            onClick={close}
            aria-label="Close the tour"
            className="focus-ring -mr-1 -mt-1 rounded-full p-1 text-cream-faint transition-colors hover:text-cream-bright"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-cream-dim">{step.body}</p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-xs text-cream-faint">
            {index + 1} of {steps.length}
          </span>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <button
                onClick={() => setIndex((current) => current - 1)}
                className="focus-ring rounded-full border border-line px-3 py-1.5 text-xs text-cream-dim transition-colors hover:text-cream-bright"
              >
                Back
              </button>
            )}
            <button
              onClick={close}
              className="focus-ring rounded-full px-3 py-1.5 text-xs text-cream-faint transition-colors hover:text-cream-bright"
            >
              Skip
            </button>
            <button
              onClick={() => (last ? close() : setIndex((current) => current + 1))}
              className="focus-ring rounded-full bg-cream px-4 py-1.5 text-xs text-surface-base"
            >
              {last ? "Got it" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
