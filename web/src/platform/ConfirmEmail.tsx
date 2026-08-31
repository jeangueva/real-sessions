import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Action, Eyebrow, Panel } from "@/design-system";
import { ApiError, confirmEmail } from "@/lib/api";

/**
 * Lands from the confirmation email. Confirming does not sign anyone in — a
 * link opened from an inbox proves the address, not that the person holding it
 * is at their own device.
 */
export function ConfirmEmail() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<"working" | "done" | "failed">("working");
  const [error, setError] = useState<string | null>(null);
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    if (!token) {
      setState("failed");
      setError("This link is missing its token.");
      return;
    }
    confirmEmail(token)
      .then(() => setState("done"))
      .catch((caught: unknown) => {
        setState("failed");
        setError(
          caught instanceof ApiError ? caught.message : "Could not confirm.",
        );
      });
  }, [token]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-deep px-6">
      <Panel variant="raised" className="w-full max-w-md p-8">
        <Eyebrow>Email</Eyebrow>
        <h1 className="mt-3 text-title font-normal text-cream-bright">
          {state === "working"
            ? "Confirming…"
            : state === "done"
              ? "Your email is confirmed."
              : "That link did not work."}
        </h1>

        {state === "failed" && (
          <p role="alert" className="mt-4 text-sm text-cream-dim">
            {error} You can request a new one from Settings.
          </p>
        )}

        {state === "done" && (
          <p className="mt-4 text-sm text-cream-dim">
            We can reach you about your account now.
          </p>
        )}

        {state !== "working" && (
          <Link to="/app" className="mt-8 inline-block">
            <Action tone="glass">Go to your sessions</Action>
          </Link>
        )}
      </Panel>
    </main>
  );
}
