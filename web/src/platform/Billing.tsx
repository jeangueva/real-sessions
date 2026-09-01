import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Action, Eyebrow, Panel } from "@/design-system";
import {
  ApiError,
  cancelSubscription,
  fetchBilling,
  fetchPlan,
  startCheckout,
} from "@/lib/api";
import type { BillingState, Plan } from "@/lib/api";
import { formatSessionDate } from "@/lib/format";

const STATUS_COPY: Record<string, string> = {
  pending: "Waiting for the first payment to clear.",
  authorized: "Active.",
  paused: "Payment did not go through — Mercado Pago is retrying.",
  cancelled: "Cancelled.",
};

/**
 * Subscription state and the upgrade path.
 *
 * Lives inside Settings rather than on its own screen: it is something you
 * check rarely and change almost never.
 *
 * The checkout is hosted by Mercado Pago, so this hands over a URL and gets out
 * of the way. Card details never touch this application, which is the only
 * arrangement worth having — the moment a form here collects a card number,
 * this becomes a system that has to be PCI-audited.
 */
export function Billing() {
  const [state, setState] = useState<BillingState | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    fetchBilling().then(setState).catch(() => setState(null));
    fetchPlan().then((result) => setPlan(result.plan)).catch(() => undefined);
  };

  useEffect(load, []);

  const upgrade = async () => {
    setBusy(true);
    setError(null);
    try {
      const { initPoint } = await startCheckout();
      // A full navigation, not a new tab: the payer comes back to /app/settings
      // through Mercado Pago's own return URL, and a popup would be blocked.
      window.location.assign(initPoint);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not open checkout.");
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    setError(null);
    try {
      await cancelSubscription();
      load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not cancel.");
    } finally {
      setBusy(false);
    }
  };

  if (!state) return null;

  const subscription = state.subscription;
  const active = plan === "premium";

  return (
    <Panel variant="glass" className="mt-4 max-w-2xl p-6">
      <Eyebrow>Plan</Eyebrow>

      <p className="mt-3 text-sm text-cream-dim">
        You are on the{" "}
        <span className="text-cream-bright">{active ? "paid" : "free"}</span> plan.
        {active && !subscription && " Granted, not billed — nothing to pay."}
      </p>

      {subscription && (
        <p className="mt-2 text-xs text-cream-faint">
          {STATUS_COPY[subscription.status] ?? subscription.status}
          {subscription.periodEnd &&
            ` Paid through ${formatSessionDate(subscription.periodEnd)}.`}
        </p>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-cream-bright">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {!active && state.configured && (
          <Action withArrow onClick={() => void upgrade()} disabled={busy}>
            {busy
              ? "Opening checkout…"
              : state.plan
                ? `Upgrade — ${state.plan.amount} ${state.plan.currency} / month`
                : "Upgrade"}
          </Action>
        )}

        {!active && !state.configured && (
          // Said plainly rather than showing a button that 503s. Early access
          // is the only path to the paid plan until payments are wired up.
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-cream-dim">
              Payments are not switched on yet.
            </p>
            <Link to="/#early-access">
              <Action tone="glass">Get six months free</Action>
            </Link>
          </div>
        )}

        {subscription && subscription.status !== "cancelled" && (
          <button
            onClick={() => void cancel()}
            disabled={busy}
            className="focus-ring rounded-full border border-line px-4 py-2 text-xs text-cream-dim transition-colors hover:text-cream-bright disabled:opacity-40"
          >
            Cancel subscription
          </button>
        )}
      </div>

      {subscription?.status === "cancelled" && subscription.periodEnd && (
        <p className="mt-4 border-t border-line pt-4 text-xs text-cream-faint">
          Cancelled, and you keep the paid plan until{" "}
          {formatSessionDate(subscription.periodEnd)} — you already paid for it.
        </p>
      )}
    </Panel>
  );
}
