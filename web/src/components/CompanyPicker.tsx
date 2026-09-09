import { Section, Eyebrow, FadeRise, Panel } from "@/design-system";
import { useT } from "@/hooks/useLocale";
import type { MessageKey } from "@/lib/i18n";

/**
 * What changes when you pick a different employer.
 *
 * This was an interactive picker: four circles showing a single initial, a
 * headline on the left, and the selected company's description floating on the
 * right with a name and a culture line in a strip below. Reading it required
 * noticing the circles were pressable, pressing one, and then looking in two
 * separate places to see what had changed — and "A" was both Amazon and
 * Airbnb, so the circles could not even say which was which.
 *
 * It is now four cards with everything visible at once. Nothing to discover,
 * nothing hidden behind a state, and each card answers the only question the
 * section exists to answer: what is this interview like. A landing page is
 * read, not operated, and the interaction was never selecting anything anyway.
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
      <Eyebrow>{t("land.pickerEyebrow")}</Eyebrow>

      <FadeRise className="mt-4 flex max-w-2xl flex-col gap-3">
        <h2 className="text-headline font-normal text-cream-bright">
          {t("land.pickerTitle")}
        </h2>
        <p className="text-sm text-cream-dim sm:text-base">{t("land.pickerSub")}</p>
      </FadeRise>

      <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {COMPANIES.map((company, index) => (
          <FadeRise key={company.name} delay={0.06 * index} className="h-full">
            <Panel className="flex h-full flex-col gap-4 p-6">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  /* The mark carries the brand hue and nothing else — no
                     initial, because two of these four start with an A. */
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
          </FadeRise>
        ))}
      </div>

      <FadeRise delay={0.32}>
        <p className="mt-6 text-xs text-cream-faint">{t("land.pickerStages")}</p>
      </FadeRise>
    </Section>
  );
}
