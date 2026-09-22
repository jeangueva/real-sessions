import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Action, CheckItem, Eyebrow, FadeRise, Panel, Section } from "@/design-system";
import { fetchPricing } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { useLocale, useT } from "@/hooks/useLocale";
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
  const { locale } = useLocale();
  /**
   * The price comes from the server, which is what the checkout charges.
   *
   * It used to be "$9" written into this file, while Mercado Pago billed
   * whatever MERCADOPAGO_AMOUNT said — a promise on the landing page that the
   * checkout did not keep. Undefined means not answered yet and null means
   * payments are off; neither shows a number, because no number is better
   * than the wrong one.
   */
  const [price, setPrice] = useState<{ amount: number; currency: string } | null | undefined>();

  useEffect(() => {
    let cancelled = false;
    fetchPricing()
      .then((result) => !cancelled && setPrice(result.plan))
      .catch(() => !cancelled && setPrice(null));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Section id="pricing" className="bg-surface-base">
      <Eyebrow>{t("land.pricingEyebrow")}</Eyebrow>
      <h2 className="mt-4 max-w-3xl text-headline font-normal text-cream-bright">
        {t("land.pricingTitle")}
      </h2>

      <div className="mt-12 grid gap-4 lg:grid-cols-2">
        <FadeRise>
          <Panel className="flex h-full flex-col gap-6 p-6 sm:p-8">
            <div>
              <p className="text-sm text-cream-dim">{t("land.free")}</p>
              <p className="mt-2 text-title text-cream-bright">$0</p>
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
            className="flex h-full flex-col gap-6 border border-cream/25 p-6 sm:p-8"
          >
            <div>
              <p className="text-sm text-cream-dim">{t("land.premium")}</p>
              {/* Reserves its line whether or not the price has arrived, so
                  the card does not jump when it does. */}
              <p className="mt-2 min-h-[1.6em] text-title text-cream-bright">
                {price ? (
                  <>
                    {formatPrice(price.amount, price.currency, locale)}
                    <span className="text-sm text-cream-faint">{t("land.perMonth")}</span>
                  </>
                ) : null}
              </p>
              <p className="mt-2 text-sm text-cream-dim">
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
            <Link to="/app/settings#plan" className="mt-auto self-start">
              <Action withArrow>{t("cta.subscribe")}</Action>
            </Link>
          </Panel>
        </FadeRise>
      </div>
    </Section>
  );
}
