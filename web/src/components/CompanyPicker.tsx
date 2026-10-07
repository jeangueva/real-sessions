import { Section, Eyebrow, FadeRise, Panel } from "@/design-system";
import { useT } from "@/hooks/useLocale";
import type { MessageKey } from "@/lib/i18n";

/**
 * What changes when you pick a different employer.
 *
 * Four cards with everything visible at once — Airbnb's listing card: a
 * monogram in the company's own hue, the name, one line of culture, and what
 * the interviewer will push on. The hue is the only colour on the card.
 */

interface Company {
  name: string;
  culture: MessageKey;
  description: MessageKey;
  /** The brand hue, as the one bit of colour on an otherwise quiet card. */
  tint: string;
}

const COMPANIES: Company[] = [
  {
    name: "Stripe",
    culture: "land.stripeCulture",
    description: "land.stripeBlurb",
    tint: "rgba(99,91,255,0.35)",
  },
  {
    name: "Amazon",
    culture: "land.amazonCulture",
    description: "land.amazonBlurb",
    tint: "rgba(255,153,0,0.32)",
  },
  {
    name: "Airbnb",
    culture: "land.airbnbCulture",
    description: "land.airbnbBlurb",
    tint: "rgba(255,90,95,0.32)",
  },
  {
    name: "Mercado Libre",
    culture: "land.meliCulture",
    description: "land.meliBlurb",
    tint: "rgba(255,225,0,0.28)",
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
                  <span
                    aria-hidden
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-cream-bright"
                    style={{ background: company.tint }}
                  >
                    {company.name.charAt(0)}
                  </span>
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
