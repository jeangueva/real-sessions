import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Action, CheckItem, Eyebrow, FadeRise, Panel, Section, SpotlightBorder } from "@/design-system";
import { fetchPricing, type BillingCycle, type PlanOffer, type Region } from "@/lib/api";
import { useLocalPrice } from "@/hooks/useLocalPrice";
import type { Rates } from "@/lib/local-price";
import { useLocale, useT } from "@/hooks/useLocale";
import { formatPrice } from "@/lib/format";
import { currencyName } from "@/lib/local-price";
import type { MessageKey } from "@/lib/i18n";
import { Sparkles } from "lucide-react";

/**
 * Two plans.
 *
 * Free is a real interview, not a demo with the ending cut off — a general
 * round for your role, scored honestly. What you pay for is the version that
 * knows who you are: the company you are actually applying to, your CV in the
 * interviewer's hands, coaching while you speak, and the history that turns
 * five sessions into a trend.
 */
const FREE: MessageKey[] = [
  "land.free1",
  "land.free2",
  "land.free3",
  "land.free4",
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
  const [offer, setOffer] = useState<PlanOffer | null | undefined>();
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [rates, setRates] = useState<Rates | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const { locale } = useLocale();

  useEffect(() => {
    let cancelled = false;
    fetchPricing()
      .then((result) => {
        if (cancelled) return;
        setOffer(result.offer);
        setRates(result.rates ?? null);
        setRegion(result.region ?? null);
        if (result.offer?.yearly || result.region?.provider === "paddle") setCycle("yearly");
      })
      .catch(() => !cancelled && setOffer(null));
    return () => {
      cancelled = true;
    };
  }, []);

  const shown = cycle === "yearly" ? offer?.yearly : offer?.monthly;
  const price = useLocalPrice(shown?.amount, shown?.currency, rates);
  const regional = region?.provider === "paddle" ? region.price : null;
  const yearlyOffered = Boolean(offer?.yearly || regional);
  const saving = regional
    ? Math.round((1 - regional.yearly / (regional.monthly * 12)) * 100)
    : (offer?.savingPercent ?? null);
  const freeCurrency = regional?.currency ?? shown?.currency ?? "USD";

  return (
    <Section id="pricing" className="bg-surface-base">
      <Eyebrow>{t("land.pricingEyebrow")}</Eyebrow>
      <h2 className="mt-4 max-w-3xl text-headline font-normal text-cream-bright">
        {t("land.pricingTitle")}
      </h2>

      {yearlyOffered && (
        <div className="mt-8 inline-flex items-center gap-1 rounded-full border border-line bg-surface-card p-1">
          {(["monthly", "yearly"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={cycle === option}
              onClick={() => setCycle(option)}
              className={`focus-ring rounded-full px-4 py-2 text-xs transition-colors ${
                cycle === option
                  ? "bg-cream text-surface-base font-semibold"
                  : "text-cream-dim hover:text-cream-bright"
              }`}
            >
              {t(option === "monthly" ? "land.billMonthly" : "land.billYearly")}
              {option === "yearly" && saving !== null && (
                <span className="ml-2 opacity-90">
                  {t("land.savePercent", { percent: String(saving) })}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {/* FREE TIER */}
        <FadeRise>
          <SpotlightBorder borderRadius="1.5rem" className="h-full">
            <Panel className="flex h-full flex-col gap-6 p-6 sm:p-8">
              <div>
                <p className="text-sm font-medium text-cream-dim">{t("land.free")}</p>
                <p className="mt-1 text-xs text-cream-faint">{t("land.billedNever")}</p>
                <p className="mt-3 text-title text-cream-bright">{formatPrice(0, freeCurrency, locale)}</p>
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
          </SpotlightBorder>
        </FadeRise>

        {/* PREMIUM TIER */}
        <FadeRise delay={0.1}>
          <SpotlightBorder
            borderRadius="1.5rem"
            spotlightColor="rgba(168, 151, 255, 0.45)"
            className="h-full"
          >
            <Panel
              variant="raised"
              className="relative flex h-full flex-col gap-6 overflow-hidden border border-accent/40 p-6 sm:p-8"
            >
              <div
                aria-hidden
                className="plan-glow pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-accent/15 to-transparent"
              />
              <div className="relative">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-accent">{t("land.premium")}</p>
                  <span className="flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-medium text-cream-bright">
                    <Sparkles className="h-3.5 w-3.5 text-accent" />
                    {t("land.recommended")}
                  </span>
                </div>
                <p className="mt-1 text-xs text-cream-faint">
                  {t(cycle === "yearly" ? "land.billedYearly" : "land.billedMonthly")}
                </p>

                <p className="mt-3 min-h-[1.6em] text-title text-cream-bright">
                  {regional ? (
                    <>
                      {formatPrice(regional[cycle], regional.currency, locale)}
                      <span className="text-sm text-cream-faint">
                        {t(cycle === "yearly" ? "land.perYear" : "land.perMonth")}
                      </span>
                    </>
                  ) : price ? (
                    <>
                      {price.headline}
                      <span className="text-sm text-cream-faint">
                        {t(cycle === "yearly" ? "land.perYear" : "land.perMonth")}
                      </span>
                    </>
                  ) : null}
                </p>

                {regional && (
                  <>
                    {cycle === "yearly" && (
                      <p className="mt-1 text-xs text-cream-faint">
                        {t("land.perMonthEquivalent", {
                          price: formatPrice(regional.yearly / 12, regional.currency, locale),
                        })}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-cream-dim">
                      {t("price.taxIncluded", {
                        name: currencyName(regional.currency, locale),
                        code: regional.currency,
                      })}
                    </p>
                  </>
                )}
                {!regional && cycle === "yearly" && shown && price && (
                  <p className="mt-1 text-xs text-cream-faint">
                    {t("land.perMonthEquivalent", {
                      price: price.format(shown.amount / 12),
                    })}
                  </p>
                )}
                {!regional && price?.charged && (
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

              <Link
                to="/app/settings#plan"
                state={{ cycle }}
                className="relative mt-auto self-start"
              >
                <Action withArrow>{t("cta.subscribe")}</Action>
              </Link>
            </Panel>
          </SpotlightBorder>
        </FadeRise>
      </div>
    </Section>
  );
}
