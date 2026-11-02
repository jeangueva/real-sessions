import { useEffect, useState } from "react";
import { Action, Badge, Eyebrow, Notice, Panel } from "@/design-system";
import { Inset } from "@/components/marketing";
import { ApiError, cancelSubscription, fetchBilling, reconcileBilling } from "@/lib/api";
import type { BillingState } from "@/lib/api";
import { formatSessionDate } from "@/lib/format";
import { Support } from "./Support";

/** Existing charges remain visible and cancellable after the free transition. */
export function Billing() {
  const [state, setState] = useState<BillingState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const read = () =>
    fetchBilling()
      .then(setState)
      .catch(() => setError("Could not load existing subscriptions. Please try again."));

  useEffect(() => {
    void read();
    void reconcileBilling().then(
      read,
      () =>
        setError(
          "Could not refresh the provider status. The last recorded subscription is shown.",
        ),
    );
  }, []);

  const cancel = async () => {
    setBusy(true);
    setError(null);
    try {
      await cancelSubscription();
      await read();
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "Could not cancel. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const subscription = state?.subscription;

  return (
    <div id="plan" className="space-y-6">
      <Support />
      <Panel variant="raised" className="p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Eyebrow>Existing subscriptions</Eyebrow>
          <Badge tone="neutral">100% Free</Badge>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-cream-dim">
          All platform features are now free. An existing subscription is not automatically
          cancelled or converted into a donation.
        </p>

        {error && (
          <div className="mt-4 space-y-3">
            <Notice tone="error">{error}</Notice>
            <Action
              type="button"
              tone="quiet"
              onClick={() => {
                setError(null);
                void read();
              }}
            >
              Retry subscription status
            </Action>
          </div>
        )}

        {!state && !error && (
          <p role="status" className="mt-4 text-sm text-cream-dim">
            Loading subscriptions…
          </p>
        )}

        {state && !subscription && (
          <Inset className="mt-4 p-4">
            <p className="text-sm text-cream-bright">No existing subscription.</p>
          </Inset>
        )}

        {subscription && (
          <Inset className="mt-4 space-y-3 p-4">
            <p className="text-sm font-medium text-cream-bright">
              Status: {subscription.status}
              {subscription.periodEnd
                ? ` · Recorded period end: ${formatSessionDate(subscription.periodEnd)}`
                : ""}
            </p>
            {subscription.status !== "cancelled" && (
              <>
                <p className="text-sm text-cream-dim">
                  Your existing subscription may continue to renew until you cancel it. Cancelling
                  does not remove any platform features.
                </p>
                <Action
                  type="button"
                  tone="quiet"
                  disabled={busy}
                  onClick={() => void cancel()}
                >
                  {busy ? "Cancelling…" : "Cancel existing subscription"}
                </Action>
              </>
            )}
            {subscription.status === "cancelled" && (
              <p className="text-sm text-cream-dim">
                All features remain free. No new purchase is needed.
              </p>
            )}
          </Inset>
        )}
      </Panel>
    </div>
  );
}
