import { Section, Eyebrow, FadeRise, Panel, SpotlightBorder } from "@/design-system";
import { useT } from "@/hooks/useLocale";
import type { MessageKey } from "@/lib/i18n";

/**
 * What changes when you pick a different employer.
 *
 * It is now four cards with everything visible at once, upgraded with
 * dynamic cursor-following spotlight glows using each company's brand hue.
 */

interface Company {
  name: string;
  culture: MessageKey;
  description: MessageKey;
  /** The brand hue, as the one bit of colour on an otherwise quiet card. */
  tint: string;
  spotlight: string;
}

const COMPANIES: Company[] = [
  {
    name: "Stripe",
    culture: "land.stripeCulture",
    description: "land.stripeBlurb",
    tint: "rgba(99,91,255,0.35)",
    spotlight: "rgba(99,91,255,0.45)",
  },
  {
    name: "Amazon",
    culture: "land.amazonCulture",
    description: "land.amazonBlurb",
    tint: "rgba(255,153,0,0.32)",
    spotlight: "rgba(255,153,0,0.42)",
  },
  {
    name: "Airbnb",
    culture: "land.airbnbCulture",
    description: "land.airbnbBlurb",
    tint: "rgba(255,90,95,0.32)",
    spotlight: "rgba(255,90,95,0.42)",
  },
  {
    name: "Mercado Libre",
    culture: "land.meliCulture",
    description: "land.meliBlurb",
    tint: "rgba(255,225,0,0.28)",
    spotlight: "rgba(255,225,0,0.40)",
  },
];

export function CompanyPicker() {
  const t = useT();

  return (
    <Section id="companies" className="bg-surface-base">
      <Eyebrow>{t("land.pickerEyebrow")}</Eyebrow>

      <FadeRise className="mt-4 flex max-w-2xl flex-col gap-3">
        <h2 className="text-headline font-normal text-cream-bright">
          {t("land.pickerTitle")}
        </h2>
        <p className="text-sm text-cream-dim sm:text-base">{t("land.pickerSub")}</p>
      </FadeRise>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {COMPANIES.map((company, index) => (
          <FadeRise key={company.name} delay={0.06 * index} className="h-full">
            <SpotlightBorder
              borderRadius="1.5rem"
              spotlightColor={company.spotlight}
              className="h-full"
            >
              <Panel className="flex h-full flex-col gap-4 p-6 transition-all duration-300 hover:border-line-strong">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="h-8 w-8 shrink-0 rounded-full ring-1 ring-line"
                    style={{
                      background: `radial-gradient(70% 70% at 30% 25%, ${company.tint} 0%, rgb(var(--surface-base)) 75%)`,
                    }}
                  />
                  <p className="text-sm font-bold text-cream-bright">{company.name}</p>
                </div>

                <p className="text-xs uppercase tracking-[0.1em] text-cream-faint">
                  {t(company.culture)}
                </p>

                <p className="text-sm leading-relaxed text-cream-dim">
                  {t(company.description)}
                </p>
              </Panel>
            </SpotlightBorder>
          </FadeRise>
        ))}
      </div>

      <FadeRise delay={0.32}>
        <p className="mt-6 text-xs text-cream-faint">{t("land.pickerStages")}</p>
      </FadeRise>
    </Section>
  );
}
