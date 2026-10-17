import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import axe from "axe-core";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { stubApi } from "./support/render";
import { SignIn } from "../src/platform/SignIn";
import { GoogleButton } from "../src/platform/GoogleButton";
import { LocaleProvider } from "../src/hooks/useLocale";
import { loadDictionary, saveLocale } from "../src/lib/i18n";

/**
 * The Google button on the sign-in screen.
 *
 * It is our own button now, opening Google's token popup, so most of it can
 * finally be tested: the label, the accessibility, what reaches the API. The
 * behaviour still worth pinning first is the absence — on a deployment with no
 * Client ID the button must not appear at all. One that appears and fails when
 * pressed is worse than one that was never there.
 *
 * Google's library is played by a stub on `window.google`, which is also what
 * keeps the real script from being requested: the loader sees the library is
 * already there.
 */
const CLIENT_ID = "test-client.apps.googleusercontent.com";

type Options = {
  client_id: string;
  scope: string;
  callback: (response: { access_token?: string }) => void;
  error_callback?: (error: { type?: string }) => void;
};

let options: Options | null = null;
let requestAccessToken: ReturnType<typeof vi.fn>;

function stubGoogle() {
  requestAccessToken = vi.fn();
  window.google = {
    accounts: {
      oauth2: {
        initTokenClient: (given: Options) => {
          options = given;
          return { requestAccessToken };
        },
      },
    },
  } as never;
}

beforeEach(() => {
  options = null;
});
afterEach(() => {
  delete window.google;
  saveLocale("en");
});

function serve(google: string | null, extra: Record<string, unknown> = {}) {
  stubApi({
    "/api/auth/config": { google },
    "/api/auth/me": { kind: "user", email: "", emailVerified: false },
    ...extra,
  });
  return render(
    <MemoryRouter initialEntries={["/signin"]}>
      <SignIn />
    </MemoryRouter>,
  );
}

describe("signing in with Google", () => {
  it("renders nothing, and loads nothing from Google, without a Client ID", async () => {
    serve(null);
    await screen.findByRole("button", { name: /^sign in$/i });
    await waitFor(() =>
      expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes("/api/auth/config"))).toBe(true),
    );
    expect(screen.queryByRole("button", { name: /google/i })).toBeNull();
    expect(document.querySelector('script[src*="accounts.google.com"]')).toBeNull();
  });

  it("is our own button, not Google's iframe, once a Client ID is configured", async () => {
    stubGoogle();
    serve(CLIENT_ID);
    const button = await screen.findByRole("button", { name: "Continue with Google" });
    expect(button.tagName).toBe("BUTTON");
    expect(button).toHaveAttribute("type", "button");
    expect(document.querySelector("iframe")).toBeNull();
    // The least scope that signs somebody in, for the Client ID the server
    // handed over rather than one baked into the bundle.
    expect(options?.client_id).toBe(CLIENT_ID);
    expect(options?.scope).toBe("openid email profile");
  });

  it("labels itself in the interface's language", async () => {
    stubGoogle();
    await loadDictionary("es");
    saveLocale("es");
    stubApi({ "/api/auth/config": { google: CLIENT_ID } });
    render(
      <LocaleProvider>
        <GoogleButton onSignedIn={() => undefined} onError={() => undefined} />
      </LocaleProvider>,
    );
    expect(await screen.findByRole("button", { name: "Continuar con Google" })).toBeTruthy();
  });

  it("opens the popup on click, waits busy, and posts the access token", async () => {
    stubGoogle();
    const onSignedIn = vi.fn();
    stubApi({
      "/api/auth/config": { google: CLIENT_ID },
      "/api/auth/google": { email: "ana@example.com" },
    });
    render(<GoogleButton onSignedIn={onSignedIn} onError={() => undefined} />);
    const button = await screen.findByRole("button", { name: "Continue with Google" });

    fireEvent.click(button);
    // Synchronously inside the click, or the browser blocks the popup.
    expect(requestAccessToken).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");

    await act(async () => {
      options!.callback({ access_token: "ya29.token" });
    });
    await waitFor(() => expect(onSignedIn).toHaveBeenCalled());
    const post = vi
      .mocked(fetch)
      .mock.calls.find(([url]) => String(url).includes("/api/auth/google"));
    expect(post?.[1]?.method).toBe("POST");
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({ accessToken: "ya29.token" });
    expect(button).not.toBeDisabled();
  });

  it("says nothing when the popup is simply closed, and reports a real failure", async () => {
    stubGoogle();
    const onError = vi.fn();
    stubApi({ "/api/auth/config": { google: CLIENT_ID } });
    render(<GoogleButton onSignedIn={() => undefined} onError={onError} />);
    const button = await screen.findByRole("button", { name: "Continue with Google" });

    fireEvent.click(button);
    act(() => options!.error_callback!({ type: "popup_closed" }));
    expect(onError).not.toHaveBeenCalled();
    expect(button).not.toBeDisabled();

    fireEvent.click(button);
    act(() => options!.error_callback!({ type: "popup_failed_to_open" }));
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("has no WCAG A or AA violations with the button showing", async () => {
    stubGoogle();
    const { container } = serve(CLIENT_ID);
    await screen.findByRole("button", { name: "Continue with Google" });
    const results = await axe.run(container, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    });
    const problems = [
      ...results.violations,
      ...results.incomplete.filter((entry) => entry.id !== "color-contrast"),
    ].map((entry) => entry.id);
    expect(problems).toEqual([]);
  });

  it("still offers the email form, so Google is never the only way in", async () => {
    stubGoogle();
    serve(CLIENT_ID);
    // Somebody without a Google account, or whose work laptop blocks it, has
    // to be able to reach their account.
    expect(await screen.findByLabelText(/email/i)).toBeTruthy();
    expect(screen.getByLabelText(/password/i)).toBeTruthy();
  });
});
