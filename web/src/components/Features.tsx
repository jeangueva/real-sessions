import { Section, Panel, CheckItem, FadeRise, WordsPullUp } from "@/design-system";
import { useT } from "@/hooks/useLocale";
import type { MessageKey } from "@/lib/i18n";

const CARDS: { number: string; title: MessageKey; items: MessageKey[] }[] = [
  {
    number: "01",
    title: "land.card1Title",
    items: ["land.card1a", "land.card1b", "land.card1c"],
  },
  {
    number: "02",
    title: "land.card2Title",
    items: ["land.card2a", "land.card2b", "land.card2c"],
  },
  {
    number: "03",
    title: "land.card3Title",
    items: ["land.card3a", "land.card3b", "land.card3c"],
  },
];

export function Features() {
  const t = useT();
  return (
    <Section id="features" className="relative bg-surface-base">
      <div
        aria-hidden
        className="bg-noise pointer-events-none absolute inset-0 opacity-[0.15]"
      />

      <div className="relative">
        <h2 className="max-w-3xl text-title">
          <WordsPullUp className="text-cream-bright">
            {t("land.featuresTitle")}
          </WordsPullUp>
          <WordsPullUp className="text-cream-faint" delay={0.3}>
            {t("land.featuresSub")}
          </WordsPullUp>
        </h2>

        <div className="mt-14 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4 lg:gap-2">
          <FadeRise>
            <Panel
              variant="raised"
              /* Stands in for the showreel tile in the reference layout. */
              className="relative flex h-full min-h-[18rem] flex-col justify-end p-6"
            >
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(90% 70% at 50% 100%, rgba(222,219,200,0.18) 0%, transparent 65%)",
                }}
              />
              <p className="relative text-title text-cream-bright">
                {t("land.featuresRoom")}
              </p>
            </Panel>
          </FadeRise>

          {CARDS.map((card, index) => (
            <FadeRise key={card.number} delay={0.15 * (index + 1)}>
              <Panel className="flex h-full min-h-[18rem] flex-col gap-4 p-6">
                <div className="flex items-baseline justify-between">
                  <h3 className="max-w-[12rem] text-sm font-bold text-cream-bright sm:text-base">
                    {t(card.title)}
                  </h3>
                  <span className="text-xs text-cream-faint">
                    {card.number}
                  </span>
                </div>
                <ul className="flex flex-col gap-2.5">
                  {card.items.map((item) => (
                    <CheckItem key={item}>{t(item)}</CheckItem>
                  ))}
                </ul>
              </Panel>
            </FadeRise>
          ))}
        </div>
      </div>
    </Section>
  );
}
