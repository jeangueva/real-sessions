import { useEffect, useRef, useState } from "react";
import { Action } from "@/design-system";
import { ApiError, subscribeWithCard } from "@/lib/api";
import { useT } from "@/hooks/useLocale";

/**
 * The card form, on our own page.
 *
 * The card number never reaches this application. Mercado Pago's SDK owns the
 * fields — they are iframes it mounts, not inputs we render — and it sends the
 * card straight from the browser to Mercado Pago, handing back a single-use
 * token. That token is the only thing our server ever sees, which is what
 * keeps the claim in the privacy policy true now that the form lives here.
 *
 * The SDK is loaded on demand rather than in `index.html`: it is a third-party
 * script that most visitors never need, and a landing page should not pay for
 * a payment SDK to render.
 */

const SDK_SRC = "https://sdk.mercadopago.com/js/v2";

declare global {
  interface Window {
    MercadoPago?: new (key: string, options?: { locale?: string }) => {
      cardForm: (config: unknown) => { unmount: () => void };
    };
  }
}

/** Resolves once the SDK global exists, loading the script the first time. */
function loadSdk(): Promise<void> {
  if (window.MercadoPago) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>(
    `script[src="${SDK_SRC}"]`,
  );
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("sdk")));
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SDK_SRC;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("sdk"));
    document.head.appendChild(script);
  });
}

export function CardForm({
  publicKey,
  amount,
  currency,
  locale,
  onSubscribed,
}: {
  publicKey: string;
  amount: number;
  currency: string;
  locale: string;
  /** Called once Mercado Pago has authorized the subscription. */
  onSubscribed: () => void;
}) {
  const t = useT();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef<{ unmount: () => void } | null>(null);

  useEffect(() => {
    let live = true;

    loadSdk()
      .then(() => {
        if (!live || !window.MercadoPago) return;
        const mp = new window.MercadoPago(publicKey, { locale });
        mounted.current = mp.cardForm({
          amount: String(amount),
          autoMount: true,
          form: {
            id: "mockio-card-form",
            cardNumber: { id: "mp-card-number" },
            expirationDate: { id: "mp-expiration" },
            securityCode: { id: "mp-security-code" },
            cardholderName: { id: "mp-cardholder" },
            identificationType: { id: "mp-doc-type" },
            identificationNumber: { id: "mp-doc-number" },
            // Required by the SDK, which refuses to mount without them:
            // 'Required field "installments" is missing' and the same for
            // "issuer". Neither is a choice worth offering on a monthly
            // subscription — it is always one instalment, and the issuer
            // follows from the card — so they exist for the SDK to fill and
            // are hidden from the reader.
            installments: { id: "mp-installments" },
            issuer: { id: "mp-issuer" },
          },
          callbacks: {
            onFormMounted: (mountError: unknown) => {
              if (!live) return;
              if (mountError) {
                // Mercado Pago says why it could not mount; the reader gets a
                // sentence they can act on, and the reason goes to the console
                // rather than being dropped. Without this a failed card form
                // is indistinguishable from a blocked script.
                console.error("[mockio] card form did not mount:", mountError);
                setError(t("card.unavailable"));
              } else setReady(true);
            },
            onSubmit: (event: Event) => {
              event.preventDefault();
              if (!live) return;
              setBusy(true);
              setError(null);
              const form = mounted.current as unknown as {
                getCardFormData: () => { token?: string };
              };
              const token = form.getCardFormData().token;
              if (!token) {
                setBusy(false);
                setError(t("card.checkDetails"));
                return;
              }
              subscribeWithCard(token)
                .then(() => live && onSubscribed())
                .catch((caught: unknown) => {
                  if (!live) return;
                  setError(
                    caught instanceof ApiError ? caught.message : t("card.failed"),
                  );
                })
                .finally(() => live && setBusy(false));
            },
          },
        });
      })
      .catch((caught: unknown) => {
        if (!live) return;
        // Either the SDK script never loaded — an extension, a network rule —
        // or constructing it threw. Both reach the reader as the same
        // sentence, so the distinction has to be in the log.
        console.error("[mockio] card form unavailable:", caught);
        setError(t("card.unavailable"));
      });

    return () => {
      live = false;
      // The SDK mounts iframes; leaving them behind on a route change leaks
      // them and breaks a second mount.
      try {
        mounted.current?.unmount();
      } catch {
        /* already gone */
      }
      mounted.current = null;
    };
  }, [publicKey, amount, locale, onSubscribed, t]);

  const field =
    "focus-ring h-11 rounded-xl border border-line-strong bg-surface-card px-4 text-sm text-cream-bright";

  return (
    <form id="mockio-card-form" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="mp-cardholder" className="text-xs text-cream-faint">
          {t("card.name")}
        </label>
        <input id="mp-cardholder" className={field} />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-cream-faint">{t("card.number")}</span>
        {/* The SDK replaces these with its own iframes. They carry no value
            of ours and are never read by this application. */}
        <div id="mp-card-number" className={field} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-cream-faint">{t("card.expiry")}</span>
          <div id="mp-expiration" className={field} />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-cream-faint">{t("card.cvv")}</span>
          <div id="mp-security-code" className={field} />
        </div>
      </div>

      <div className="grid grid-cols-[9rem_1fr] gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="mp-doc-type" className="text-xs text-cream-faint">
            {t("card.docType")}
          </label>
          <select id="mp-doc-type" className={field} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="mp-doc-number" className="text-xs text-cream-faint">
            {t("card.docNumber")}
          </label>
          <input id="mp-doc-number" className={field} />
        </div>
      </div>

      {/* Present for the SDK, not for the reader: see the form config above.
          `aria-hidden` with no tab stop, so a screen reader is not handed two
          unlabelled selects it cannot act on. */}
      <select id="mp-installments" className="sr-only" aria-hidden tabIndex={-1} />
      <select id="mp-issuer" className="sr-only" aria-hidden tabIndex={-1} />

      {error && (
        <p role="alert" className="text-sm text-cream-bright">
          {error}
        </p>
      )}

      <Action type="submit" disabled={!ready || busy} className="self-start">
        {busy
          ? t("card.charging")
          : t("card.pay", { amount: String(amount), currency })}
      </Action>

      <p className="text-xs text-cream-faint">{t("card.security")}</p>
    </form>
  );
}
