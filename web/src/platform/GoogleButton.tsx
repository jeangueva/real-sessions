import { useEffect, useRef, useState } from "react";
import { Action } from "@/design-system";
import { fetchAuthConfig, signInWithGoogleAccessToken } from "@/lib/api";
import { useT } from "@/hooks/useLocale";

/**
 * "Continue with Google", drawn by us.
 *
 * It used to be Google's own button: `renderButton` from Google Identity
 * Services, an iframe we could not style. It came in one fixed theme, ignored
 * ours, looked like a stranger on the dark sign-in card and sat next to the
 * primary pill in a different height, radius and typeface.
 *
 * So the button is ours now — an `Action` in the `quiet` tone, the secondary
 * sibling of the submit pill below it: same height, radius, type, pressed
 * edge and focus ring, in both themes. Pressing it opens Google's own popup
 * through the OAuth 2.0 token model (`google.accounts.oauth2.initTokenClient`),
 * which is how Google lets an app use its own button.
 *
 * Google allows that on the condition that its branding guidelines are kept,
 * and this is how it keeps them:
 * - The "G" is the official four-colour mark, inlined unaltered — not
 *   recoloured, not monochrome, not redrawn.
 * - It sits on a white circle in both themes, because the guidelines want the
 *   mark on white (or Google's own #131314); on the light theme the circle
 *   simply disappears into the surface.
 * - The words are Google's own phrase, "Continue with Google", translated with
 *   the rest of the interface — "Google" itself is never translated.
 * - The button is as tall as every other button here and padded the same,
 *   which is more room around the mark than the guidelines ask for.
 *
 * Still no client secret, on either end. The token model is the browser-only
 * grant: Google hands the popup an access token directly, with no code to
 * exchange, and the server proves it by asking Google whom it was minted for
 * and whose it is (`verifyGoogleAccessToken` in `src/google.ts`).
 *
 * It renders nothing at all when the deployment has no Client ID, or when
 * Google's script cannot be loaded. A button that appears and then fails when
 * pressed is worse than one that was never there — especially here, where the
 * person pressing it is trying to get into their account.
 *
 * The script is loaded once per page and never removed. Google's library
 * installs globals and expects to own them; loading it twice in one document
 * is unsupported, and the sign-in screen is mounted and unmounted whenever
 * somebody toggles between signing in and signing up. It is loaded on mount,
 * not on click, because a popup opened after an `await` is no longer the
 * click's popup and the browser blocks it.
 */

const SCRIPT_URL = "https://accounts.google.com/gsi/client";

interface TokenResponse {
  access_token?: string;
  error?: string;
}

interface TokenClient {
  requestAccessToken(overrides?: { prompt?: string }): void;
}

/** The sliver of Google's library this uses. */
export interface GoogleIdentityApi {
  accounts: {
    oauth2: {
      initTokenClient(options: {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
        error_callback?: (error: { type?: string }) => void;
        prompt?: string;
      }): TokenClient;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentityApi;
  }
}

let loading: Promise<void> | null = null;

function loadGoogle(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  // Memoised, so two mounts in one page share one download rather than racing
  // to install the same globals.
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // Cleared so a later attempt can try again: the usual cause is a network
      // that was down for a moment, not a page that can never load this.
      loading = null;
      reject(new Error("Google could not be reached."));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/**
 * Google's "G", exactly as Google ships it in its own button — four paths,
 * four colours, nothing changed. Decorative: the label names the button.
 */
function GoogleMark() {
  return (
    <span
      aria-hidden
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white"
    >
      <svg viewBox="0 0 48 48" className="h-[18px] w-[18px]" focusable="false">
        <path
          fill="#EA4335"
          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
        />
        <path
          fill="#4285F4"
          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
        />
        <path
          fill="#FBBC05"
          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
        />
        <path
          fill="#34A853"
          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
        />
      </svg>
    </span>
  );
}

export function GoogleButton({
  onSignedIn,
  onError,
}: {
  onSignedIn: () => void;
  /** Told in the caller's own words — this component holds no copy. */
  onError: () => void;
}) {
  const t = useT();
  const client = useRef<TokenClient | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  /**
   * Held in a ref so the callback Google keeps always calls the current one.
   * The token client is created once and remembers the function it was
   * given; a stale closure here would navigate using last render's state.
   */
  const handlers = useRef({ onSignedIn, onError });
  handlers.current = { onSignedIn, onError };

  useEffect(() => {
    let live = true;
    (async () => {
      const config = await fetchAuthConfig().catch(() => ({ google: null }));
      if (!live || !config.google) return;
      await loadGoogle().catch(() => undefined);
      const oauth2 = window.google?.accounts?.oauth2;
      if (!live || !oauth2) return;

      client.current = oauth2.initTokenClient({
        client_id: config.google,
        // The least that signs somebody in: who they are, and a verified
        // address to find or create their account by. Nothing from their
        // Drive, Gmail or calendar is asked for, so the consent screen asks
        // nothing alarming.
        scope: "openid email profile",
        // The account chooser every time, as Google's own button does: on a
        // shared laptop the account signed into Chrome is not necessarily the
        // person at the keyboard.
        prompt: "select_account",
        callback: async (response) => {
          if (!live) return;
          if (!response.access_token) {
            setBusy(false);
            return handlers.current.onError();
          }
          try {
            await signInWithGoogleAccessToken(response.access_token);
            if (live) setBusy(false);
            handlers.current.onSignedIn();
          } catch {
            if (live) setBusy(false);
            handlers.current.onError();
          }
        },
        error_callback: (error) => {
          if (!live) return;
          setBusy(false);
          // Closing the popup is a change of mind, not a failure, and an
          // error message for it would scold somebody for clicking away.
          if (error.type !== "popup_closed") handlers.current.onError();
        },
      });
      setReady(true);
    })();
    return () => {
      live = false;
    };
  }, []);

  if (!ready) return null;

  return (
    <Action
      type="button"
      tone="quiet"
      className="w-full py-3"
      disabled={busy}
      aria-busy={busy}
      onClick={() => {
        if (!client.current) return;
        setBusy(true);
        // Synchronous, inside the click: anything awaited first and the
        // browser no longer counts the popup as the person's doing.
        client.current.requestAccessToken();
      }}
    >
      <GoogleMark />
      <span>{t("auth.continueWithGoogle")}</span>
    </Action>
  );
}
