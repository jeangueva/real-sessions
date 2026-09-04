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
  title: string;
  body: string;
}

export const TOUR_KEY = "realsessions.tour.seen";

export const TOUR_STEPS: TourStep[] = [
  {
    id: "search",
    target: "[data-tour='search']",
    title: "Start here if you know what you want",
    body: "Type a company, a role, or a past session. Picking an old session sets every field back the way it was, which is the only way two attempts are worth comparing.",
  },
  {
    id: "setup",
    target: "[data-tour='setup']",
    title: "Six choices, one bar",
    body: "Role decides which rounds exist. A round decides what gets asked and who asks it — a recruiter takes the screen, an architect takes the system design. Pick more than one round and the interview covers both.",
  },
  {
    id: "begin",
    target: "[data-tour='begin']",
    title: "Then it is a call",
    body: "Microphone, camera and screen share, with the transcript down the side. You can type instead if you would rather not speak yet.",
  },
  {
    id: "progress",
    target: "[data-tour='progress']",
    title: "The point is the second attempt",
    body: "Every session is scored and kept. Progress is where the same interview, run twice, becomes a number that moved.",
  },
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
 * Drops steps whose target is not on the page.
 *
 * The bar hides controls on the free plan and the sidebar collapses on a
 * phone, so a step can point at nothing through no fault of its own. Pointing
 * a spotlight at an element that does not exist is the failure everyone has
 * seen: an arrow into empty space, and no way forward.
 */
export function stepsPresent(
  steps: readonly TourStep[],
  exists: (selector: string) => boolean,
): TourStep[] {
  return steps.filter((step) => exists(step.target));
}
