/**
 * Shared setup for the component tests.
 *
 * The stubs here stand in for browser capabilities happy-dom does not
 * implement. Each one is a capability the app legitimately uses and guards
 * for — leaving them undefined would make every test fail on the guard rather
 * than on the thing under test.
 */
import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Unmount between tests. Without it, queries match elements left behind by an
// earlier test and failures point at the wrong place.
afterEach(cleanup);

if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

// Framer Motion measures elements on entrance; happy-dom has no layout.
if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

if (!window.IntersectionObserver) {
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
    root = null;
    rootMargin = "";
    thresholds = [];
  } as unknown as typeof IntersectionObserver;
}

if (!window.scrollTo) window.scrollTo = (() => undefined) as typeof window.scrollTo;

/**
 * Pushes Framer Motion onto its JavaScript animation path.
 *
 * It prefers the Web Animations API when `element.animate` exists, and
 * happy-dom's implementation throws from `Animation.cancel` when a component
 * unmounts mid-animation — which every one of these tests does. The thrown
 * error surfaced as unhandled noise in the run, exactly where a real failure
 * would need to be visible.
 *
 * Removing the method is what Framer Motion feature-detects, so it falls back
 * cleanly rather than being patched into a shape it does not expect.
 */
// @ts-expect-error deliberately removing a DOM method the environment fakes badly
delete Element.prototype.animate;

/**
 * Every component test stubs fetch.
 *
 * These screens all load from the API on mount, and a test that hits the
 * network is not testing the component. Unstubbed calls reject loudly rather
 * than hanging, so a forgotten route shows up as a failure naming the path.
 */
vi.stubGlobal(
  "fetch",
  vi.fn(async (input: RequestInfo | URL) =>
    Promise.reject(new Error(`unstubbed fetch: ${String(input)}`)),
  ),
);
