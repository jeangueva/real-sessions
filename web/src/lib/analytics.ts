import posthog from "posthog-js";

/**
 * Product analytics, configured to be able to answer one question: where do
 * people stop.
 *
 * Everything here is a subtraction from what PostHog does by default, and each
 * subtraction is for the same reason. This application handles CVs and the
 * transcripts of interviews — someone's employment history, and every word
 * they said while rehearsing in a language they are still learning. A tool
 * that captures "whatever the page contains" would ship that to a vendor the
 * privacy notice promises receives nothing of the kind.
 *
 * So the defaults that read the page are off:
 *
 *   `autocapture`             would record the text of whatever was clicked,
 *                             which on the report screen is the feedback and
 *                             on the transcript is the answers.
 *   `session_recording`       would record the screen. The screen is the CV.
 *   `capture_dead_clicks`     samples surrounding content to explain the click.
 *   `person_profiles`         only for people who signed in, and keyed to the
 *                             account id rather than the address.
 *
 * What remains is a page view and the handful of named events in `track`
 * below, each carrying values this file chose — never a string that came from
 * a candidate.
 *
 * The key is a write-only project key. It is meant to sit in the browser
 * bundle and can do nothing but send events, which is why it is written here
 * rather than passed through the build.
 */
const KEY = "phc_xAgvPpzfLhJpiMX9zLkjnaCkbrrJUGCEpri8uEcXRsjx";
const HOST = "https://us.i.posthog.com";

/** The one deployment that reports. */
const PRODUCTION = /(^|\.)getmockio\.com$/i;

let live = false;

/**
 * Starts analytics, on production only.
 *
 * A hostname check rather than a build flag: a flag has to be set correctly in
 * every environment that builds this, and the failure mode of forgetting is a
 * month of development traffic mixed into the numbers you are trying to read.
 * The hostname cannot be forgotten.
 */
export function startAnalytics(): void {
  if (live) return;
  if (typeof window === "undefined") return;
  if (!PRODUCTION.test(window.location.hostname)) return;

  posthog.init(KEY, {
    api_host: HOST,
    defaults: "2026-05-30",
    // No cookie, no localStorage: the identifier lives for one tab session and
    // is gone on close. This is what makes the product answerable to people
    // who decline tracking without a consent banner in front of the landing
    // page, and it costs only the ability to recognise a returning visitor as
    // the same anonymous person.
    persistence: "memory",
    person_profiles: "identified_only",
    autocapture: false,
    capture_dead_clicks: false,
    disable_session_recording: true,
    // Someone who asked their browser not to be tracked has asked.
    respect_dnt: true,
    // Page views are sent by the router, which knows when a route actually
    // changed. The built-in one fires on history events this app also uses for
    // its own state, and would double-count.
    capture_pageview: false,
  });
  live = true;
}

/**
 * The funnel, named by hand.
 *
 * A closed set rather than free-form strings, so that adding a measurement is
 * a decision made in this file with the rule above in view, and so a typo
 * cannot quietly create a second event that splits a funnel in half.
 */
type Event =
  | "account created"
  | "interview started"
  | "interview finished"
  | "plan viewed"
  | "subscription started";

/**
 * Records one event.
 *
 * Properties are values this application chose — a role, a round, a plan name,
 * a score. Never a transcript, an answer, a company someone typed, a file
 * name, or an email address.
 */
export function track(event: Event, properties?: Record<string, string | number | boolean>): void {
  if (!live) return;
  posthog.capture(event, properties);
}

/**
 * Ties events to an account, once there is one.
 *
 * The account id, never the address: PostHog does not need to know who someone
 * is to tell us that the person who signed up on Tuesday came back on Friday,
 * and an address in a third-party product is an address that has to be deleted
 * when they ask us to erase them.
 */
export function identify(accountId: string): void {
  if (!live) return;
  posthog.identify(accountId);
}

/** Forgets the person on sign-out, so a shared machine does not merge two people. */
export function forget(): void {
  if (!live) return;
  posthog.reset();
}

/** One page view, sent by the router on a real route change. */
export function pageView(path: string): void {
  if (!live) return;
  posthog.capture("$pageview", { $current_url: `${window.location.origin}${path}` });
}
