import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Action, Eyebrow, Panel } from "@/design-system";
import {
  cancelSubscription,
  fetchBilling,
  fetchPlan,
  fetchSession,
  reconcileBilling,
  startCheckout,
} from "@/lib/api";
import type { BillingState, Plan, Session } from "@/lib/api";
import { formatSessionDate } from "@/lib/format";
import { track } from "@/lib/analytics";
import { useLocale, useT } from "@/hooks/useLocale";
import { CardForm, refusalMessage } from "./CardForm";
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
  const { locale } = useLocale();
  const { hash, state: arrived } = useLocation() as {
    hash: string;
    state: { cycle?: "monthly" | "yearly" } | null;
  };
  /**
   * Which cycle the person chose on the pricing page.
   *
   * Carried in the navigation state rather than refetched, because the choice
   * was made on the previous screen and there is nowhere else it is recorded.
   * Monthly when they arrived here by any other route — the server validates
   * it again, and defaults the same way.
   */
  const cycle = arrived?.cycle === "yearly" ? "yearly" : "monthly";
  const panel = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<BillingState | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  /**
   * Who is asking.
   *
   * Mercado Pago needs a payer email. Everyone who reaches this panel has
   * one now — the shell refuses anyone without an account — so this is read
   * for the address rather than to decide whether to offer a way in.
   */
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  /** Opens the on-site card form. Only reachable when a public key exists. */
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Read now, settle, read again.
   *
   * Someone arriving here from the hosted checkout has a row that still says
   * `pending`: the plan becomes theirs when the webhook lands, and a webhook
   * can be late, lost or refused. So the panel asks the server to check with
   * the provider — and reads again once it answers, because that check is
   * what turns their payment into a plan.
   *
   * The first read does not wait for it. Settling reaches Mercado Pago, and
   * that call carries no timeout: waiting on it means that while the provider
   * hangs — rather than failing, which is fast — `state` stays null and this
   * panel renders nothing at all. Stale first and correct a moment later is
   * the behaviour worth having; blank until a third party answers is not.
   */
  const load = () => {
    const read = () => {
      fetchBilling().then(setState).catch(() => setState(null));
      fetchPlan().then((result) => setPlan(result.plan)).catch(() => undefined);
      fetchSession().then(setSession).catch(() => undefined);
    };
    read();
    reconcileBilling().then(read, () => undefined);
  };

  useEffect(load, []);

  // Reaching the plan panel at all, which is the step before any decision
  // about paying. Sent once per mount, and only once the first answer is in,
  // so it counts people rather than renders.
  const seen = useRef(false);
  useEffect(() => {
    if (!state || seen.current) return;
    seen.current = true;
    track("plan viewed", { plan: plan ?? "unknown", configured: state.configured });
  }, [state, plan]);

  /**
   * Arrived from the pricing card, which links to `#plan`.
   *
   * Settings is a long page and billing sits near the bottom, so landing at
   * the top of it after clicking "Subscribe" reads as a link that did
   * nothing. Waits for `state`, because the panel renders nothing until the
   * first response and there would be no element to scroll to.
   */
  useEffect(() => {
    if (hash !== "#plan" || !state) return;
    panel.current?.scrollIntoView({ block: "center" });
  }, [hash, state]);

  /**
   * Someone who came here to pay lands on the card form, not on a button.
   *
   * The pricing card sends them to `#plan`; if they had no account they went
   * through sign-up first and came back to the same anchor. Either way the
   * decision was made before they arrived, and asking for one more click at
   * the end of that journey is asking twice.
   *
   * Only when there is something to open: configured, on the free plan, and
   * with a public key, which is what the button itself needs.
   */
  useEffect(() => {
    if (hash !== "#plan" || !state || paying) return;
    if (!state.configured || !state.publicKey || plan === "premium") return;
    if (session?.kind !== "user") return;
    setPaying(true);
  }, [hash, state, plan, session, paying]);

  const upgrade = async () => {
    setBusy(true);
    setError(null);
    try {
      const { initPoint } = await startCheckout(cycle);
      // A full navigation, not a new tab: the payer comes back to /app/settings
      // through Mercado Pago's own return URL, and a popup would be blocked.
      window.location.assign(initPoint);
    } catch (caught) {
      setError(refusalMessage(caught, t, "billing.couldNotOpen"));
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
      setError(refusalMessage(caught, t, "billing.couldNotCancel"));
    } finally {
      setBusy(false);
    }
  };

  if (!state) return null;

  const subscription = state.subscription;
  const active = plan === "premium";
  const canBeBilled = session?.kind === "user";
  /**
   * Cancelled, with time still on the clock.
   *
   * The state the panel handled worst: the plan is `premium`, so every offer
   * to subscribe was hidden behind `!active`, and the cancel button is gone
   * because there is nothing left to cancel. It left the card with no action
   * at all, at exactly the moment someone who cancelled by mistake — or
   * changed their mind the next day — is easiest to win back.
   */
  const lapsing = subscription?.status === "cancelled";

  return (
    <div ref={panel} id="plan">
    <Panel variant="glass" className="mt-4 max-w-2xl p-6">
      <Eyebrow>{t("billing.plan")}</Eyebrow>

      <p className="mt-3 text-sm text-cream-dim">
        <span className="text-cream-bright">
          {active ? t("billing.onPaid") : t("billing.onFree")}
        </span>
        {active && !subscription && ` ${t("billing.granted")}`}
      </p>

      {/* Not while `lapsing`: the note at the foot of the card already gives
          this status and this date, and says why the plan is still running.
          Two paragraphs repeating "Cancelled" and the same date read as a
          screen nobody proofread. */}
      {subscription && !lapsing && (
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

      {/* Mercado Pago's sandbox and production credentials look identical, so
          a deployment pointed at the wrong one is invisible until money does
          or does not move. This is the only thing that tells them apart. */}
      {state.mode === "test" && (
        <p className="mt-3 inline-flex rounded-full border border-line-strong px-3 py-1 text-xs text-cream-dim">
          {t("billing.sandbox")}
        </p>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-cream-bright">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {/* With a public key the card is taken here; without one the payer is
            sent to Mercado Pago's own page. Both end in the same subscription,
            and the redirect stays because a deployment that has not been given
            a public key must still be able to sell. */}
        {(!active || lapsing) && state.configured && canBeBilled && state.publicKey && !paying && (
          <Action withArrow onClick={() => setPaying(true)} disabled={busy}>
            {lapsing
              ? t("billing.resume")
              : state.plan
                ? t("billing.upgradeAmount", {
                    amount: state.plan.amount,
                    currency: state.plan.currency,
                  })
                : t("billing.upgrade")}
          </Action>
        )}

        {(!active || lapsing) && state.configured && canBeBilled && !state.publicKey && (
          <Action withArrow onClick={() => void upgrade()} disabled={busy}>
            {busy
              ? t("billing.opening")
              : lapsing
                ? t("billing.resume")
                : state.plan
                ? t("billing.upgradeAmount", {
                    amount: state.plan.amount,
                    currency: state.plan.currency,
                  })
                : t("billing.upgrade")}
          </Action>
        )}

        {!active && !state.configured && (
          // Said plainly rather than showing a button that 503s. Nothing to
          // offer beside it: with payments off, an existing early-access grant
          // is the only way onto the paid plan and the people who have one
          // already do.
          <p className="text-sm text-cream-dim">{t("billing.notOn")}</p>
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

      {paying && state.publicKey && state.plan && (
        <div className="mt-6 border-t border-line pt-6">
          <CardForm
            cycle={cycle}
            publicKey={state.publicKey}
            amount={state.plan.amount}
            currency={state.plan.currency}
            locale={locale === "pt" ? "pt-BR" : locale === "es" ? "es-PE" : "en-US"}
            onSubscribed={() => {
              track("subscription started", {
                amount: state.plan!.amount,
                currency: state.plan!.currency,
              });
              setPaying(false);
              load();
            }}
          />
        </div>
      )}

      {lapsing && subscription.periodEnd && (
        <p className="mt-4 border-t border-line pt-4 text-xs text-cream-faint">
          {t("billing.cancelledUntil", {
            date: formatSessionDate(subscription.periodEnd),
          })}
        </p>
      )}
    </Panel>
    </div>
  );
}
