import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AuthLayout } from "./AuthLayout";
import { Action, Eyebrow } from "@/design-system";
import { ApiError, confirmEmail } from "@/lib/api";
import { useT } from "@/hooks/useLocale";

/**
 * Lands from the confirmation email. Confirming does not sign anyone in — a
 * link opened from an inbox proves the address, not that the person holding it
 * is at their own device.
 */
export function ConfirmEmail() {
  const t = useT();
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
      setError(t("confirm.missingToken"));
      return;
    }
    confirmEmail(token)
      .then(() => setState("done"))
      .catch((caught: unknown) => {
        setState("failed");
        setError(
          caught instanceof ApiError ? caught.message : t("confirm.couldNot"),
        );
      });
  }, [token]);

  return (
    <AuthLayout>
    <Eyebrow>{t("auth.email")}</Eyebrow>
    <h1 className="mt-3 text-title font-normal text-cream-bright">
      {state === "working"
        ? t("confirm.working")
        : state === "done"
          ? t("confirm.done")
          : t("confirm.failed")}
    </h1>

    {state === "failed" && (
      <p role="alert" className="mt-4 text-sm text-cream-dim">
        {error} {t("confirm.retry")}
      </p>
    )}

    {state === "done" && (
      <p className="mt-4 text-sm text-cream-dim">
        {t("confirm.reachYou")}
      </p>
    )}

    {state !== "working" && (
      <Link to="/app" className="mt-8 inline-block">
        <Action tone="glass">{t("confirm.toSessions")}</Action>
      </Link>
    )}
    </AuthLayout>
  );
}
