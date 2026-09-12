import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Action, Panel } from "@/design-system";
import { useT } from "@/hooks/useLocale";

/**
 * Where an unsubscribe link lands.
 *
 * A page with a button rather than a link that does the work on arrival.
 * Corporate mail scanners fetch every URL in a message before a human opens
 * it, so an unsubscribe that happened on GET would silently opt people out of
 * mail they never read — and they would have no idea why it stopped. The click
 * here is the confirmation, and it is the only thing that sends the request.
 *
 * Public, and deliberately outside the app shell: someone who wants our mail
 * to stop should not have to sign in to say so.
 */
export function Unsubscribe() {
  const t = useT();
  const [params] = useSearchParams();
  const email = params.get("e") ?? "";
  const token = params.get("t") ?? "";
  const [state, setState] = useState<"idle" | "sending" | "done" | "failed">("idle");
  const [message, setMessage] = useState("");

  const stop = async () => {
    setState("sending");
    try {
      const response = await fetch("/api/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token }),
      });
      /**
       * The outcome comes from the status, and the words come from here.
       *
       * The API answers in English like every other endpoint, and this page is
       * one of fourteen languages — showing the server's string put "That
       * unsubscribe link is not valid." under a Spanish heading. Neither
       * message carries information the reader can act on that the local copy
       * does not, and the local one is in their language.
       */
      if (!response.ok) {
        setMessage(t("unsub.failed"));
        setState("failed");
        return;
      }
      setMessage(t("unsub.done"));
      setState("done");
    } catch {
      setMessage(t("unsub.failed"));
      setState("failed");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-base px-6">
      <Panel variant="raised" className="flex w-full max-w-md flex-col gap-5 p-8">
        <h1 className="text-title font-normal text-cream-bright">{t("unsub.title")}</h1>

        {state === "done" || state === "failed" ? (
          <p className="text-sm text-cream-dim" role="status">
            {message}
          </p>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-cream-dim">
              {email ? t("unsub.body", { email }) : t("unsub.noAddress")}
            </p>
            {/* Said here rather than after the fact: someone stopping reminders
                is usually not asking to stop hearing that their card failed. */}
            <p className="text-xs text-cream-faint">{t("unsub.keeps")}</p>
            <Action onClick={stop} disabled={!email || !token || state === "sending"}>
              {state === "sending" ? t("unsub.working") : t("unsub.confirm")}
            </Action>
          </>
        )}

        <Link
          to="/"
          className="focus-ring rounded text-xs text-cream-faint underline underline-offset-4 hover:text-cream-bright"
        >
          {t("auth.backHome")}
        </Link>
      </Panel>
    </main>
  );
}
