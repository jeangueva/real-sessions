import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { stubApi } from "./support/render";
import { SignIn } from "../src/platform/SignIn";

/**
 * The Google button on the sign-in screen.
 *
 * The behaviour worth pinning is the absence: on a deployment with no Client
 * ID the button must not appear at all. One that appears and fails when
 * pressed is worse than one that was never there, because the person pressing
 * it is trying to get into their own account — and that is exactly what
 * happens if the config call is ignored and the script is loaded regardless.
 */
function serve(google: string | null) {
  stubApi({
    "/api/auth/config": { google },
    "/api/auth/me": { kind: "user", email: "", emailVerified: false },
  });
  render(
    <MemoryRouter initialEntries={["/signin"]}>
      <SignIn />
    </MemoryRouter>,
  );
}

describe("signing in with Google", () => {
  it("loads nothing from Google when no Client ID is configured", async () => {
    serve(null);
    await screen.findByRole("button", { name: /sign in/i });
    await waitFor(() =>
      expect(document.querySelector('script[src*="accounts.google.com"]')).toBeNull(),
    );
  });

  it("asks the server for the Client ID rather than carrying one", async () => {
    // A Client ID baked into the bundle at build time is one that cannot
    // differ between localhost and production without a rebuild.
    serve("test-client.apps.googleusercontent.com");
    await waitFor(() =>
      expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes("/api/auth/config"))).toBe(
        true,
      ),
    );
  });

  /**
   * Not covered: that only one button is drawn.
   *
   * Google's `renderButton` appends rather than replaces, and this effect
   * re-runs when the interface language resolves — which it always does, a
   * moment after the first paint. Production shipped with two buttons stacked
   * on each other, and `slot.replaceChildren()` is the fix.
   *
   * A test was written for it and then deleted: Google's script never loads
   * here, and with a stub in its place the locale never changes, so the effect
   * runs once and the test passed with the fix removed. A test that passes
   * either way is worse than none — it reads as coverage. This one is held by
   * having looked at the live page, and by that sentence.
   */

  it("still offers the email form, so Google is never the only way in", async () => {
    serve("test-client.apps.googleusercontent.com");
    // Somebody without a Google account, or whose work laptop blocks it, has
    // to be able to reach their account.
    expect(await screen.findByLabelText(/email/i)).toBeTruthy();
    expect(screen.getByLabelText(/password/i)).toBeTruthy();
  });
});
