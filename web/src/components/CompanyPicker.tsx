import { Section, Eyebrow, FadeRise, Panel } from "@/design-system";
import { useT } from "@/hooks/useLocale";
import type { MessageKey } from "@/lib/i18n";

/**
 * What changes when you pick a different employer.
 *
 * Four cards with everything visible at once — Airbnb's listing card: a
 * the company's own app icon, the name, one line of culture, and what
 * the interviewer will push on. The icon is the only colour on the card.
 */

interface Company {
  name: string;
  culture: MessageKey;
  description: MessageKey;
  /** The company's own app icon, from `public/companies`. */
  logo: string;
}

const COMPANIES: Company[] = [
  {
    name: "Stripe",
    logo: "/companies/stripe.png",
    culture: "land.stripeCulture",
    description: "land.stripeBlurb",
  },
  {
    name: "Amazon",
    logo: "/companies/amazon.png",
    culture: "land.amazonCulture",
    description: "land.amazonBlurb",
  },
  {
    name: "Airbnb",
    logo: "/companies/airbnb.png",
    culture: "land.airbnbCulture",
    description: "land.airbnbBlurb",
  },
  {
    name: "Mercado Libre",
    logo: "/companies/mercadolibre.png",
    culture: "land.meliCulture",
    description: "land.meliBlurb",
  },
];

export function CompanyPicker() {
  const t = useT();

  return (
    <Section id="companies" className="bg-surface-base">
      <FadeRise className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
        <Eyebrow>{t("land.pickerEyebrow")}</Eyebrow>
        <h2 className="text-balance text-headline font-semibold text-cream-bright">
          {t("land.pickerTitle")}
        </h2>
        <p className="max-w-xl text-base text-cream-dim sm:text-lg">{t("land.pickerSub")}</p>
      </FadeRise>

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {COMPANIES.map((company, index) => (
          <FadeRise key={company.name} delay={0.06 * index} className="h-full">
              <Panel className="flex h-full flex-col gap-4 p-6 transition-shadow duration-300 ease-press hover:shadow-lift">
                <div className="flex items-center gap-3">
                  <img
                    src={company.logo}
                    alt=""
                    width={40}
                    height={40}
                    className="h-10 w-10 shrink-0 rounded-xl object-contain"
                  />
                  <p className="text-base font-semibold text-cream-bright">{company.name}</p>
                </div>

                <p className="text-xs font-semibold text-cream-faint">
                  {t(company.culture)}
                </p>

                <p className="text-sm leading-relaxed text-cream-dim">
                  {t(company.description)}
                </p>
              </Panel>
          </FadeRise>
        ))}
      </div>

      <FadeRise delay={0.32}>
        <p className="mt-8 text-center text-xs text-cream-faint">{t("land.pickerStages")}</p>
      </FadeRise>
    </Section>
  );
}
