import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useT } from "@/hooks/useLocale";
import {
  TOUR_STEPS,
  firstVisible,
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

/** Roughly the card at its tallest. Used to decide which side it fits on. */
export const CARD_HEIGHT = 200;

/**
 * Where the card goes: below the spotlight, above it, or pinned to the bottom.
 *
 * The third case is the one a phone needs. The setup bar stacks to four
 * hundred pixels there, leaving no room on either side, and the first version
 * put the card below regardless — off the bottom of the screen with the Next
 * button on it. Overlapping the spotlight is worse-looking and strictly
 * better: an overlapping card can be read and pressed.
 */
export function cardPosition(
  spot: Spot,
  viewportWidth: number,
  viewportHeight: number,
  cardWidth = 340,
): { left: number; top?: number; bottom?: number } {
  const left = Math.max(12, Math.min(spot.left, viewportWidth - cardWidth - 12));
  const below = viewportHeight - (spot.top + spot.height) - PAD * 2;
  const above = spot.top - PAD * 2;

  if (below >= CARD_HEIGHT) return { left, top: spot.top + spot.height + PAD * 2 };
  if (above >= CARD_HEIGHT) return { left, bottom: viewportHeight - spot.top + PAD * 2 };
  return { left, bottom: 12 };
}

/** Keeps the spotlight inside the viewport, so the ring never runs off. */
export function clampSpot(spot: Spot, viewportHeight: number): Spot {
  const top = Math.max(0, spot.top);
  return { ...spot, top, height: Math.min(spot.height, viewportHeight - top) };
}

export function Tour() {
  const t = useT();
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
        Boolean(firstVisible(selector)),
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
      // The same rule as the filter: a collapsed rail is not a target, and
      // on a phone the real one is the bottom bar under the same marker.
      const target = firstVisible(step.target);
      if (!target) return;
      const rect = target.getBoundingClientRect();
      setSpot(
        clampSpot(
          {
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
          },
          window.innerHeight,
        ),
      );
    };

    /**
     * Brings the target on screen before measuring it.
     *
     * On a phone the setup bar stacks and Begin ends up eight hundred pixels
     * down a six-hundred-pixel viewport — the spotlight was landing below the
     * fold, on a control nobody could see. Instant rather than smooth: this
     * measures immediately afterwards, and a scroll still in flight measures
     * the wrong box.
     */
    const target = firstVisible(step.target);
    if (target) {
      const rect = target.getBoundingClientRect();
      const above = rect.top < PAD * 2;
      const below = rect.bottom > window.innerHeight - PAD * 2;
      if (above || below) {
        target.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
      }
    }

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
    <div className="fixed inset-0 z-[60]" role="dialog" aria-label={t("tour.label")}>
      {/* Four panels around the target rather than one overlay with a hole:
          the target stays clickable, which is what people try first. */}
      <div
        onClick={close}
        className="absolute inset-x-0 top-0 bg-scrim"
        style={{ height: Math.max(0, spot.top) }}
      />
      <div
        onClick={close}
        className="absolute inset-x-0 bottom-0 bg-scrim"
        style={{ top: spot.top + spot.height }}
      />
      <div
        onClick={close}
        className="absolute left-0 bg-scrim"
        style={{ top: spot.top, height: spot.height, width: Math.max(0, spot.left) }}
      />
      <div
        onClick={close}
        className="absolute right-0 bg-scrim"
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
            aria-label={t("tour.close")}
            className="focus-ring -mr-1 -mt-1 rounded-full p-1 text-cream-faint transition-colors hover:text-cream-bright"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-cream-dim">{step.body}</p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-xs text-cream-faint">
            {t("tour.stepOf", { index: index + 1, total: steps.length })}
          </span>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <button
                onClick={() => setIndex((current) => current - 1)}
                className="focus-ring rounded-full border border-line px-3 py-1.5 text-xs text-cream-dim transition-colors hover:text-cream-bright"
              >
                {t("tour.back")}
              </button>
            )}
            <button
              onClick={close}
              className="focus-ring rounded-full px-3 py-1.5 text-xs text-cream-faint transition-colors hover:text-cream-bright"
            >
              {t("tour.skip")}
            </button>
            <button
              onClick={() => (last ? close() : setIndex((current) => current + 1))}
              className="focus-ring rounded-full bg-cream px-4 py-1.5 text-xs text-surface-base"
            >
              {last ? t("tour.done") : t("tour.next")}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
