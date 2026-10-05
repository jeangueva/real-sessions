import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Action, CheckItem, Eyebrow, FadeRise, Panel, Section } from "@/design-system";
import { fetchPricing, type BillingCycle, type PlanOffer } from "@/lib/api";
import { useLocalPrice } from "@/hooks/useLocalPrice";
import type { Rates } from "@/lib/local-price";
import { useT } from "@/hooks/useLocale";
import type { MessageKey } from "@/lib/i18n";

/**
 * Two plans.
 *
 * Free is a real interview, not a demo with the ending cut off — a general
 * round for your role, scored honestly. What you pay for is the version that
 * knows who you are: the company you are actually applying to, your CV in the
 * interviewer's hands, coaching while you speak, and the history that turns
 * five sessions into a trend.
 *
 * The line is drawn along "does this need to know you", which is why the CV,
 * the company picker and the progress chart all sit on the same side of it.
 */
const FREE: MessageKey[] = [
  "land.free1",
  "land.free2",
  "land.free3",
  "land.free4",
  // XP and badges are free on purpose: a progress system that only rewards
  // subscribers rewards nobody at the moment it would have earned one.
  "land.free5",
];

const PREMIUM: MessageKey[] = [
  "land.prem1",
  "land.prem2",
  "land.prem3",
  "land.prem4",
  "land.prem5",
  "land.prem6",
];

export function Pricing() {
  const t = useT();
  /**
   * The price comes from the server, which is what the checkout charges.
   *
   * It used to be "$9" written into this file, while Mercado Pago billed
   * whatever MERCADOPAGO_AMOUNT said — a promise on the landing page that the
   * checkout did not keep. Undefined means not answered yet and null means
   * payments are off; neither shows a number, because no number is better
   * than the wrong one.
   */
  const [offer, setOffer] = useState<PlanOffer | null | undefined>();
  /**
   * Which cycle the cards are showing.
   *
   * Starts on the year when one exists, because that is the one worth
   * choosing and the saving is the reason to look. Nobody is charged for
   * looking: the cycle travels to the checkout, which validates it again.
   */
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [rates, setRates] = useState<Rates | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPricing()
      .then((result) => {
        if (cancelled) return;
        setOffer(result.offer);
        setRates(result.rates ?? null);
        if (result.offer?.yearly) setCycle("yearly");
      })
      .catch(() => !cancelled && setOffer(null));
    return () => {
      cancelled = true;
    };
  }, []);

  const shown = cycle === "yearly" ? offer?.yearly : offer?.monthly;
  const price = useLocalPrice(shown?.amount, shown?.currency, rates);

  return (
    <Section id="pricing" className="bg-surface-base">
      <Eyebrow>{t("land.pricingEyebrow")}</Eyebrow>
      <h2 className="mt-4 max-w-3xl text-headline font-normal text-cream-bright">
        {t("land.pricingTitle")}
      </h2>

      {/* Only when there is a year to switch to. A toggle with one position
          is a control that teaches somebody the product has choices it does
          not have. */}
      {offer?.yearly && (
        <div className="mt-8 inline-flex items-center gap-1 rounded-full border border-line bg-surface-card p-1">
          {(["monthly", "yearly"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={cycle === option}
              onClick={() => setCycle(option)}
              className={`focus-ring rounded-full px-4 py-2 text-xs transition-colors ${
                cycle === option
                  ? "bg-cream text-surface-base"
                  : "text-cream-dim hover:text-cream-bright"
              }`}
            >
              {t(option === "monthly" ? "land.billMonthly" : "land.billYearly")}
              {option === "yearly" && offer.savingPercent !== null && (
                <span className="ml-2 opacity-80">
                  {t("land.savePercent", { percent: String(offer.savingPercent) })}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        <FadeRise>
          <Panel className="flex h-full flex-col gap-6 p-6 sm:p-8">
            <div>
              <p className="text-sm text-cream-dim">{t("land.free")}</p>
              <p className="mt-1 text-xs text-cream-faint">{t("land.billedNever")}</p>
              <p className="mt-3 text-title text-cream-bright">$0</p>
              <p className="mt-2 text-sm text-cream-dim">
                {t("land.freeBlurb")}
              </p>
            </div>
            <ul className="flex flex-col gap-3">
              {FREE.map((item) => (
                <CheckItem key={item}>{t(item)}</CheckItem>
              ))}
            </ul>
            <Link to="/app" className="mt-auto self-start">
              <Action tone="glass">{t("land.startPractising")}</Action>
            </Link>
          </Panel>
        </FadeRise>

        <FadeRise delay={0.1}>
          <Panel
            variant="raised"
            className="relative flex h-full flex-col gap-6 overflow-hidden border border-cream/25 p-6 sm:p-8"
          >
            {/* The wash across the top of the recommended card, the one thing
                worth taking from the references. Theirs is green and orange;
                this product has no accent colour and inventing one here would
                leave a hue that appears nowhere else. Cream at low opacity
                reads as the same light without the lie. */}
            <div
              aria-hidden
              className="plan-glow pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-cream/15 to-transparent"
            />
            <div className="relative">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-cream-dim">{t("land.premium")}</p>
                <span className="rounded-full border border-cream/40 px-3 py-1 text-xs uppercase tracking-wider text-cream-bright">
                  {t("land.recommended")}
                </span>
              </div>
              <p className="mt-1 text-xs text-cream-faint">
                {t(cycle === "yearly" ? "land.billedYearly" : "land.billedMonthly")}
              </p>
              {/* Reserves its line whether or not the price has arrived, so
                  the card does not jump when it does. */}
              <p className="mt-3 min-h-[1.6em] text-title text-cream-bright">
                {price ? (
                  <>
                    {price.headline}
                    <span className="text-sm text-cream-faint">
                      {t(cycle === "yearly" ? "land.perYear" : "land.perMonth")}
                    </span>
                  </>
                ) : null}
              </p>
              {/* What a year works out to each month — the comparison somebody
                  is making in their head anyway, done for them rather than
                  left as arithmetic beside a decision about money. */}
              {cycle === "yearly" && shown && price && (
                <p className="mt-1 text-xs text-cream-faint">
                  {t("land.perMonthEquivalent", {
                    price: price.format(shown.amount / 12),
                  })}
                </p>
              )}
              {/* Outside Peru: the figure above is an estimate, and this says
                  what the card is actually charged and in which currency. */}
              {price?.charged && (
                <p className="mt-2 text-xs text-cream-dim">
                  {t(price.charged.estimated ? "price.estimateNote" : "price.chargedIn", {
                    price: price.charged.price,
                    name: price.charged.name,
                    code: price.charged.code,
                  })}
                </p>
              )}
              <p className="mt-3 text-sm text-cream-dim">
                {t("land.premiumBlurb")}
              </p>
            </div>
            <ul className="flex flex-col gap-3">
              {PREMIUM.map((item) => (
                <CheckItem key={item}>{t(item)}</CheckItem>
              ))}
            </ul>
            {/* Settings is where billing lives, and where the card form and
                the hosted checkout both start. The hash matters: the panel is
                near the bottom of a long page, and it scrolls itself into
                view. */}
            <Link
              to="/app/settings#plan"
              state={{ cycle }}
              className="relative mt-auto self-start"
            >
              <Action withArrow>{t("cta.subscribe")}</Action>
            </Link>
          </Panel>
        </FadeRise>
      </div>
    </Section>
  );
}
