import { Section, Panel, CheckItem, FadeRise, WordsPullUp } from "@/design-system";

const CARDS = [
  {
    number: "01",
    title: "Feedback that names the error",
    items: [
      "Catches Spanish-L1 transfer: “depends of”, “explain me”, “I have 28 years”",
      "Quotes what you actually said, never invented examples",
      "Leaves correct informal English alone instead of over-correcting",
    ],
  },
  {
    number: "02",
    title: "Vocabulary for your role",
    items: [
      "Scored against the terminology your target role expects",
      "Flags words used in the wrong context, not just misspelled",
      "Shows the phrase a hiring manager would have used instead",
    ],
  },
  {
    number: "03",
    title: "Structure under pressure",
    items: [
      "Measures whether your answers hold a STAR shape",
      "Notices rambling before an interviewer would",
      "Tells you which story to rehearse before the real call",
    ],
  },
];

export function Features() {
  return (
    <Section id="features" className="relative bg-surface-base">
      <div
        aria-hidden
        className="bg-noise pointer-events-none absolute inset-0 opacity-[0.15]"
      />

      <div className="relative">
        <h2 className="max-w-3xl text-title">
          <WordsPullUp className="text-cream-bright">
            Studio-grade feedback for people who are not native speakers.
          </WordsPullUp>
          <WordsPullUp className="text-cream-faint" delay={0.3}>
            Built for the interview, not for a grammar class.
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
                Your practice room.
              </p>
            </Panel>
          </FadeRise>

          {CARDS.map((card, index) => (
            <FadeRise key={card.number} delay={0.15 * (index + 1)}>
              <Panel className="flex h-full min-h-[18rem] flex-col gap-4 p-6">
                <div className="flex items-baseline justify-between">
                  <h3 className="max-w-[12rem] text-sm font-bold text-cream-bright sm:text-base">
                    {card.title}
                  </h3>
                  <span className="text-xs text-cream-faint">
                    {card.number}
                  </span>
                </div>
                <ul className="flex flex-col gap-2.5">
                  {card.items.map((item) => (
                    <CheckItem key={item}>{item}</CheckItem>
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
