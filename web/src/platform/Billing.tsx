import { useEffect, useState } from "react";
import { Eyebrow, Panel } from "@/design-system";
import { ApiError, cancelSubscription, fetchBilling, reconcileBilling } from "@/lib/api";
import type { BillingState } from "@/lib/api";
import { formatSessionDate } from "@/lib/format";
import { Support } from "./Support";

/** Existing charges remain visible and cancellable after the free transition. */
export function Billing() {
  const [state, setState] = useState<BillingState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const read = () => fetchBilling().then(setState).catch(() => setError("Could not load existing subscriptions. Please try again."));
  useEffect(() => {
    void read();
    void reconcileBilling().then(read, () => setError("Could not refresh the provider status. The last recorded subscription is shown."));
  }, []);
  const cancel = async () => {
    setBusy(true);
    setError(null);
    try {
      await cancelSubscription();
      await read();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not cancel. Please try again.");
    } finally { setBusy(false); }
  };
  const subscription = state?.subscription;
  return <div id="plan">
    <Support />
    <Panel className="mt-4 max-w-2xl p-6 sm:p-8">
      <Eyebrow>Existing subscriptions</Eyebrow>
      <p className="mt-3 text-sm text-cream-dim">All platform features are now free. An existing subscription is not automatically cancelled or converted into a donation.</p>
      {error && <p role="alert" className="mt-3 text-sm">{error}</p>}
      {!state && !error && <p role="status" className="mt-3 text-sm">Loading subscriptions…</p>}
      {state && !subscription && <p className="mt-3 text-sm">No existing subscription.</p>}
      {subscription && <>
        <p className="mt-3 text-sm">Status: {subscription.status}{subscription.periodEnd ? ` · Recorded period end: ${formatSessionDate(subscription.periodEnd)}` : ""}</p>
        {subscription.status !== "cancelled" && <>
          <p className="mt-3 text-sm text-cream-dim">Your existing subscription may continue to renew until you cancel it. Cancelling does not remove any platform features.</p>
          <button type="button" className="focus-ring mt-4 rounded-full bg-surface-lift px-4 py-2 text-sm disabled:opacity-40" disabled={busy} onClick={() => void cancel()}>{busy ? "Cancelling…" : "Cancel existing subscription"}</button>
        </>}
        {subscription.status === "cancelled" && <p className="mt-3 text-sm">All features remain free. No new purchase is needed.</p>}
      </>}
      {error && <button type="button" className="focus-ring mt-3 rounded px-3 py-2 text-sm" onClick={() => { setError(null); void read(); }}>Retry subscription status</button>}
    </Panel>
  </div>;
}
