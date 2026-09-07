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
import { useT } from "@/hooks/useLocale";
import type { MessageKey } from "@/lib/i18n";

const STATUS_COPY: Record<string, MessageKey> = {
  pending: "billing.statusPending",
  authorized: "billing.statusAuthorized",
  paused: "billing.statusPaused",
  cancelled: "billing.statusCancelled",
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
  const t = useT();
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
      setError(caught instanceof ApiError ? caught.message : t("billing.couldNotOpen"));
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
      setError(caught instanceof ApiError ? caught.message : t("billing.couldNotCancel"));
    } finally {
      setBusy(false);
    }
  };

  if (!state) return null;

  const subscription = state.subscription;
  const active = plan === "premium";

  return (
    <Panel variant="glass" className="mt-4 max-w-2xl p-6">
      <Eyebrow>{t("billing.plan")}</Eyebrow>

      <p className="mt-3 text-sm text-cream-dim">
        <span className="text-cream-bright">
          {active ? t("billing.onPaid") : t("billing.onFree")}
        </span>
        {active && !subscription && ` ${t("billing.granted")}`}
      </p>

      {subscription && (
        <p className="mt-2 text-xs text-cream-faint">
          {STATUS_COPY[subscription.status]
            ? t(STATUS_COPY[subscription.status]!)
            : subscription.status}
          {subscription.periodEnd &&
            ` ${t("billing.paidThrough", {
              date: formatSessionDate(subscription.periodEnd),
            })}`}
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
              ? t("billing.opening")
              : state.plan
                ? t("billing.upgradeAmount", {
                    amount: state.plan.amount,
                    currency: state.plan.currency,
                  })
                : t("billing.upgrade")}
          </Action>
        )}

        {!active && !state.configured && (
          // Said plainly rather than showing a button that 503s. Early access
          // is the only path to the paid plan until payments are wired up.
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-cream-dim">
              {t("billing.notOn")}
            </p>
            <Link to="/#early-access">
              <Action tone="glass">{t("setup.sixMonths")}</Action>
            </Link>
          </div>
        )}

        {subscription && subscription.status !== "cancelled" && (
          <button
            onClick={() => void cancel()}
            disabled={busy}
            className="focus-ring rounded-full border border-line-strong px-4 py-2 text-xs text-cream-dim transition-colors hover:text-cream-bright disabled:opacity-40"
          >
            {t("billing.cancelSub")}
          </button>
        )}
      </div>

      {subscription?.status === "cancelled" && subscription.periodEnd && (
        <p className="mt-4 border-t border-line pt-4 text-xs text-cream-faint">
          {t("billing.cancelledUntil", {
            date: formatSessionDate(subscription.periodEnd),
          })}
        </p>
      )}
    </Panel>
  );
}
