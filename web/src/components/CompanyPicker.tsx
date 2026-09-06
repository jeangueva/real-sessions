import { useState } from "react";
import { Section, Eyebrow } from "@/design-system";
import { useT } from "@/hooks/useLocale";
import type { MessageKey } from "@/lib/i18n";

/**
 * Kollektiva's portrait picker, repurposed. There it introduced a team; here
 * it answers the question a candidate actually has — "who am I about to talk
 * to, and what do they care about?" The interaction is identical: pick a
 * target, the copy crossfades. Portraits are replaced by company marks,
 * rendered from tokens rather than pulled from someone else's CDN.
 */
interface Company {
  name: string;
  culture: MessageKey;
  description: MessageKey;
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
  const [active, setActive] = useState(0);
  const company = COMPANIES[active]!;

  return (
    <Section id="companies" className="bg-surface-base">
      <Eyebrow>{t("land.pickerEyebrow")}</Eyebrow>

      <div className="mt-6 flex flex-col gap-10 md:flex-row md:items-start md:justify-between md:gap-16">
        <h2 className="max-w-xl text-headline font-normal text-cream-bright">
          {t("land.pickerTitle")}
        </h2>

        <p
          /* Remount so the copy crossfades instead of swapping abruptly. */
          key={company.name}
          className="max-w-xs animate-fade-in text-sm font-medium leading-relaxed text-cream-dim md:pt-2"
        >
          {t(company.description)}
        </p>
      </div>

      <div className="mt-14 flex items-end gap-3 overflow-x-auto pb-1 [scrollbar-width:none] sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
        {COMPANIES.map((item, index) => (
          <button
            key={item.name}
            onClick={() => setActive(index)}
            aria-label={t("land.pickerPractiseFor", { company: item.name })}
            aria-pressed={index === active}
            className="focus-ring flex shrink-0 flex-col items-center gap-2 rounded-lg"
          >
            <span
              aria-hidden
              className={`h-1 w-1 rounded-full bg-cream transition-opacity duration-300 ${
                index === active ? "opacity-100" : "opacity-0"
              }`}
            />
            <span
              className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold text-cream-bright transition-transform duration-300 ease-cinematic hover:scale-105 sm:h-16 sm:w-16"
              style={{
                background: `radial-gradient(70% 70% at 30% 25%, ${item.tint} 0%, #101010 70%)`,
              }}
            >
              {item.name.charAt(0)}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5 text-sm font-medium">
        <span key={company.name} className="animate-fade-in text-cream-bright">
          {company.name}
        </span>
        <span className="hidden text-cream-dim sm:inline">
          {t(company.culture)}
        </span>
        <span className="hidden text-cream-dim md:inline">
          {t("land.pickerStages")}
        </span>
      </div>
    </Section>
  );
}
