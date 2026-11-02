/**
 * The walkthrough shown once, the first time someone opens the app.
 *
 * Kept to four steps and to one screen. A tour that spans routes has to drive
 * the router, and a tour that drives the router is a tour people cannot leave
 * — which is the thing everyone hates about them. This one points at four
 * controls already on the page, and every step is skippable from the first.
 *
 * It also does not explain what the product is. Someone who reached this
 * screen has read the landing page; repeating it is the tour equivalent of a
 * cookie banner.
 */

export interface TourStep {
  id: string;
  /** CSS selector for the element to point at. Missing targets are skipped. */
  target: string;
}

export const TOUR_KEY = "realsessions.tour.seen";

/**
 * Where each step points, and nothing else.
 *
 * The words live in `tour-copy.ts`, one set per language: the walkthrough is
 * the first thing a new reader meets, and it was the one place in the product
 * that spoke English to everybody.
 */
export const TOUR_STEPS: TourStep[] = [
  { id: "search", target: "[data-tour='search']" },
  { id: "setup", target: "[data-tour='setup']" },
  { id: "begin", target: "[data-tour='begin']" },
  { id: "progress", target: "[data-tour='progress']" },
];

export function tourSeen(): boolean {
  try {
    return localStorage.getItem(TOUR_KEY) === "1";
  } catch {
    // Blocked storage. Showing the tour again is friendlier than never
    // showing it, and it is four steps.
    return false;
  }
}

export function markTourSeen(): void {
  try {
    localStorage.setItem(TOUR_KEY, "1");
  } catch {
    /* It will offer itself again next visit. */
  }
}

export function resetTour(): void {
  try {
    localStorage.removeItem(TOUR_KEY);
  } catch {
    /* Nothing was stored to clear. */
  }
}

/**
 * Drops steps whose target is not on screen.
 *
 * Visible, not merely present — which is the distinction this got wrong the
 * first time. On a phone the sidebar collapses but stays in the DOM as a
 * zero-sized box, so `querySelector` found it, the step survived, and the
 * spotlight was a sixteen-pixel dot in the top corner pointing at nothing.
 * The free plan hides controls the same way.
 */
export function stepsPresent(
  steps: readonly TourStep[],
  visible: (selector: string) => boolean,
): TourStep[] {
  return steps.filter((step) => visible(step.target));
}

/** A target counts when something matching it has an actual box on screen. */
export function firstVisible(selector: string, doc: Document = document): Element | null {
  for (const element of doc.querySelectorAll(selector)) {
    const rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return element;
  }
  return null;
}
