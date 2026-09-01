import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import type { ReactElement } from "react";

/**
 * Renders a screen the way the app does.
 *
 * Every one of these uses `Link`, so a bare `render` throws on a missing router
 * before reaching anything worth asserting.
 */
export function renderScreen(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

/**
 * Answers the API calls a screen makes on mount.
 *
 * Keyed by path fragment rather than exact URL, because the screens build their
 * own paths and a test should not have to restate them. An unmatched call
 * rejects with the path in the message, so a screen that starts fetching
 * something new fails loudly rather than hanging on a promise nobody resolves.
 */
export function stubApi(routes: Record<string, unknown>): void {
  vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(typeof input === "string" ? input : (input as Request).url);
    const match = Object.keys(routes).find((key) => url.includes(key));
    if (!match) throw new Error(`unstubbed fetch: ${url}`);
    return new Response(JSON.stringify(routes[match]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
}
