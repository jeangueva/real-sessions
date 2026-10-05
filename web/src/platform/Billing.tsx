import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Action, Eyebrow, Panel } from "@/design-system";
import {
  fetchPricing,
  ApiError,
  cancelSubscription,
  fetchBilling,
  fetchPlan,
  fetchSession,
  reconcileBilling,
  redeemPromo,
  startCheckout,
} from "@/lib/api";
import type { BillingState, Plan, Session } from "@/lib/api";
import { formatPrice, formatSessionDate } from "@/lib/format";
import { track } from "@/lib/analytics";
import { useLocale, useT } from "@/hooks/useLocale";
import { CardForm, refusalMessage } from "./CardForm";
import { useLocalPrice } from "@/hooks/useLocalPrice";
import { openPaddleCheckout } from "@/lib/paddle";
import { currencyName } from "@/lib/local-price";
import type { Rates } from "@/lib/local-price";
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
  /** Between Paddle saying "paid" and our webhook switching the plan on. */
  const [confirming, setConfirming] = useState(false);
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

  /**
   * Indicative rates, so a reader outside Peru is told before paying what the
   * charge is in their own currency and which currency the card sees. Fetched
   * from the same public price endpoint the landing page reads.
   */
  const [rates, setRates] = useState<Rates | null>(null);
  useEffect(() => {
    fetchPricing()
      .then((result) => setRates(result.rates ?? null))
      .catch(() => undefined);
  }, []);
  const price = useLocalPrice(state?.plan?.amount, state?.plan?.currency, rates);

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
    // A reader sold through Paddle never sees Mercado Pago's card form: it
    // would charge soles at the Peruvian price, which is not their price.
    if (state.region?.provider === "paddle" && state.paddle) return;
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
    } catch (caught: unknown) {
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
  /**
   * Sold through Paddle: a reader outside Peru, on a deployment with Paddle
   * configured. They get one button, at their country's price in their own
   * currency, and Mercado Pago's two are not shown.
   */
  const regional =
    state.region?.provider === "paddle" && state.paddle && state.region.price
      ? { paddle: state.paddle, price: state.region.price }
      : null;

  const payWithPaddle = async () => {
    if (!regional) return;
    setBusy(true);
    try {
      await openPaddleCheckout({
        paddle: regional.paddle,
        cycle,
        email: session?.email ?? null,
        locale,
        theme: document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark",
        completed: () => {
          // Paddle has the money; the plan switches on when its webhook
          // reaches us, usually within seconds. Asked a few times rather than
          // once, so a slow webhook still ends on the right screen.
          setConfirming(true);
          let tries = 0;
          const check = () => {
            tries += 1;
            fetchPlan()
              .then((result) => {
                if (result.plan === "premium") {
                  setConfirming(false);
                  load();
                } else if (tries < 20) setTimeout(check, 2000);
                else setConfirming(false);
              })
              .catch(() => (tries < 20 ? setTimeout(check, 2000) : setConfirming(false)));
          };
          check();
        },
      });
    } catch {
      setError(t("billing.couldNotOpen"));
    } finally {
      setBusy(false);
    }
  };

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
        {(!active || lapsing) && regional && canBeBilled && (
          <Action withArrow onClick={() => void payWithPaddle()} disabled={busy || confirming}>
            {confirming
              ? t("billing.confirming")
              : t("billing.subscribeRegional", {
                  price: `${formatPrice(regional.price[cycle], regional.price.currency, locale)}${t(
                    cycle === "yearly" ? "land.perYear" : "land.perMonth",
                  )}`,
                })}
          </Action>
        )}

        {(!active || lapsing) && regional && canBeBilled && (
          <p className="w-full text-xs text-cream-dim">
            {t("price.taxIncluded", {
              name: currencyName(regional.price.currency, locale),
              code: regional.price.currency,
            })}
          </p>
        )}

        {(!active || lapsing) && !regional && state.configured && canBeBilled && state.publicKey && !paying && (
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

        {(!active || lapsing) && !regional && state.configured && canBeBilled && !state.publicKey && (
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

        {(!active || lapsing) && !regional && state.configured && canBeBilled && price?.charged && (
          <p className="w-full text-xs text-cream-dim">
            {price.charged.estimated
              ? `${price.headline} · ${t("price.estimateNote", {
                  price: price.charged.price,
                  name: price.charged.name,
                  code: price.charged.code,
                })}`
              : t("price.chargedIn", { name: price.charged.name, code: price.charged.code })}
          </p>
        )}

        {!active && !regional && !state.configured && (
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

      {/* Before the card, not after it.
          Somebody holding a code is not shopping — they were given something
          and came to use it, and making them scroll past a payment form to
          find the field is asking them to consider paying for what they
          already have. Only to somebody not already on the paid plan: being
          charged and comped at once is not a thing anybody wants. */}
      {plan !== "premium" && <PromoField onRedeemed={load} />}

      {paying && !regional && state.publicKey && state.plan && (
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


/**
 * "Do you have a code?"
 *
 * Collapsed by default, and that is the whole design. An open field marked
 * "promotion code" on a payment page is a prompt to leave and go looking for
 * one, and most people who leave to look do not come back. Behind one line of
 * text it is found by the people who were given a code and invisible to
 * everybody else.
 */
function PromoField({ onRedeemed }: { onRedeemed: () => void }) {
  const t = useT();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [until, setUntil] = useState<string | null>(null);

  const redeem = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await redeemPromo(code.trim());
      setUntil(result.until);
      setCode("");
      onRedeemed();
    } catch (caught: unknown) {
      /**
       * The server's own words.
       *
       * Unlike most of this interface, these are not translated locally: the
       * four outcomes — unknown, expired, fully claimed, already used — are
       * distinctions the server makes, and a panel that restated them would
       * have to match it exactly for ever. Matching for ever is how two
       * copies of the same sentence drift apart.
       */
      setError(caught instanceof ApiError ? caught.message : t("billing.promoFailed"));
    } finally {
      setBusy(false);
    }
  };

  if (until) {
    return (
      <p
        role="status"
        className="mt-6 rounded-2xl border border-cream/30 bg-surface-raised p-4 text-sm text-cream-bright"
      >
        {t("billing.promoDone", { date: formatSessionDate(until) })}
      </p>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-line-strong bg-surface-raised p-4">
      <p className="text-sm text-cream-bright">{t("billing.promoAsk")}</p>
      <p className="mt-1 text-xs text-cream-dim">{t("billing.promoHint")}</p>
      <div className="mt-3 flex flex-wrap items-start gap-2">
        <label className="flex flex-col gap-1">
          <span className="sr-only">{t("billing.promoLabel")}</span>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase().slice(0, 40))}
            placeholder={t("billing.promoPlaceholder")}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            /* `text-sm` is 16px, and under 16px iOS Safari zooms the page the
               moment this is focused. */
            className="focus-ring w-44 rounded-xl border border-line-strong bg-transparent px-4 py-2.5 text-sm uppercase tracking-wider text-cream-bright placeholder:tracking-normal placeholder:text-cream-faint"
          />
        </label>
        <Action
          tone="glass"
          onClick={() => void redeem()}
          disabled={busy || code.trim() === ""}
        >
          {t("billing.promoApply")}
        </Action>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-cream-bright">
          {error}
        </p>
      )}
    </div>
  );
}
