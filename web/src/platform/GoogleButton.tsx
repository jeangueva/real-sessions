import { useEffect, useRef, useState } from "react";
import { fetchAuthConfig, signInWithGoogle } from "@/lib/api";
import { useLocale } from "@/hooks/useLocale";

/**
 * Google's own sign-in button.
 *
 * Drawn by Google rather than by us, and that is a requirement rather than a
 * shortcut: their branding guidelines govern what the button may look like,
 * and a hand-built one is how an app ends up with its Google access revoked
 * for a wordmark three pixels too small.
 *
 * It renders nothing at all when the deployment has no Client ID. A button
 * that appears and then fails when pressed is worse than one that was never
 * there — especially here, where the person pressing it is trying to get into
 * their account.
 *
 * The script is loaded once per page and never removed. Google's library
 * installs globals and expects to own them; loading it twice in one document
 * is unsupported, and the sign-in screen is mounted and unmounted whenever
 * somebody toggles between signing in and signing up.
 */

const SCRIPT_URL = "https://accounts.google.com/gsi/client";

/** The sliver of Google's library this uses. */
interface GoogleIdentityApi {
  accounts: {
    id: {
      initialize(options: {
        client_id: string;
        callback: (response: { credential?: string }) => void;
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
      }): void;
      renderButton(
        parent: HTMLElement,
        options: {
          type?: "standard" | "icon";
          theme?: "outline" | "filled_blue" | "filled_black";
          size?: "small" | "medium" | "large";
          shape?: "rectangular" | "pill";
          text?: "signin_with" | "signup_with" | "continue_with";
          width?: number;
          locale?: string;
        },
      ): void;
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
  if (window.google) return Promise.resolve();
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

export function GoogleButton({
  onSignedIn,
  onError,
}: {
  onSignedIn: () => void;
  /** Told in the caller's own words — this component holds no copy. */
  onError: () => void;
}) {
  const { locale } = useLocale();
  const slot = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);

  /**
   * Held in a ref so the callback Google keeps always calls the current one.
   * Google's library is initialised once and remembers the function it was
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
      if (!live || !window.google || !slot.current) return;

      window.google.accounts.id.initialize({
        client_id: config.google,
        callback: async (response) => {
          if (!response.credential) return handlers.current.onError();
          try {
            await signInWithGoogle(response.credential);
            handlers.current.onSignedIn();
          } catch {
            handlers.current.onError();
          }
        },
        // No One Tap prompt. It appears over the page uninvited, and this
        // screen already asked the question it would be asking.
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      window.google.accounts.id.renderButton(slot.current, {
        type: "standard",
        theme: "filled_black",
        size: "large",
        shape: "pill",
        text: "continue_with",
        // Google draws its own text, so it needs the interface's language or
        // it hands a Spanish-speaking candidate a button in English.
        locale,
      });
      setReady(true);
    })();
    return () => {
      live = false;
    };
  }, [locale]);

  // No wrapper, no divider, no height held open before it exists: an empty
  // bordered box above the form is what a reader sees as a broken page.
  return <div ref={slot} hidden={!ready} />;
}
