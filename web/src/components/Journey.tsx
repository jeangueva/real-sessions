import {
  Briefcase,
  Languages,
  Gauge,
  Timer,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Eyebrow,
  FadeRise,
  Panel,
  PremiumMark,
  Section,
} from "@/design-system";
import { useT } from "@/hooks/useLocale";
import type { MessageKey } from "@/lib/i18n";

/**
 * The whole path, before any one feature.
 *
 * The page used to sell "practise interviews", which a dozen tools also sell.
 * What only this one covers is everything after: the agency's English
 * screen, the job itself and the raise. Three columns say that in one look,
 * and the free/premium line between them is the pricing argued before the
 * price.
 */
const PHASES: {
  icon: typeof Users;
  label: MessageKey;
  paid: boolean;
  items: MessageKey[];
}[] = [
  {
    icon: Users,
    label: "phase.prepare",
    paid: false,
    items: ["land.jPrep1", "land.jPrep2", "land.jPrep3"],
  },
  {
    icon: Briefcase,
    label: "phase.work",
    paid: true,
    items: ["land.jWork1", "land.jWork2", "land.jWork3"],
  },
  {
    icon: TrendingUp,
    label: "phase.grow",
    paid: true,
    items: ["land.jGrow1", "land.jGrow2", "land.jGrow3"],
  },
];

/** What a general English or interview app does not do. */
const EDGES: { icon: typeof Users; title: MessageKey; body: MessageKey }[] = [
  { icon: Gauge, title: "land.edge1Title", body: "land.edge1Body" },
  { icon: Languages, title: "land.edge2Title", body: "land.edge2Body" },
  { icon: Timer, title: "phase.drill", body: "land.edge3Body" },
];

export function Journey() {
  const t = useT();
  return (
    <Section id="journey">
      <FadeRise className="mx-auto max-w-2xl text-center">
        <Eyebrow>{t("land.journeyEyebrow")}</Eyebrow>
        <h2 className="mt-3 text-balance text-headline font-semibold text-cream-bright">
          {t("land.journeyTitle")}
        </h2>
      </FadeRise>

      <ol className="mx-auto mt-12 grid max-w-5xl gap-4 md:grid-cols-3 [&>*]:min-w-0">
        {PHASES.map((phase, index) => (
          <li key={phase.label}>
            <FadeRise delay={index * 0.08} className="h-full">
              <Panel
                variant="raised"
                className="flex h-full flex-col gap-4 p-6 shadow-lift"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-base font-semibold text-cream-bright">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-surface-lift text-cream-bright">
                      <phase.icon aria-hidden className="h-4 w-4" />
                    </span>
                    {t(phase.label)}
                  </span>
                  {phase.paid ? (
                    <PremiumMark label={t("premium.mark")} />
                  ) : (
                    <span className="rounded-full bg-grow-soft px-2.5 py-0.5 text-xs font-semibold text-grow-text">
                      {t("land.free")}
                    </span>
                  )}
                </div>
                <ul className="flex flex-col gap-2.5 text-sm text-cream-dim">
                  {phase.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span
                        aria-hidden
                        className="mt-2 h-1 w-1 shrink-0 rounded-full bg-cream-dim"
                      />
                      {t(item)}
                    </li>
                  ))}
                </ul>
              </Panel>
            </FadeRise>
          </li>
        ))}
      </ol>

      <FadeRise className="mx-auto mt-14 max-w-2xl text-center">
        <h3 className="text-balance text-title font-semibold text-cream-bright">
          {t("land.edgeTitle")}
        </h3>
      </FadeRise>
      <div className="mx-auto mt-6 grid max-w-5xl gap-4 md:grid-cols-3 [&>*]:min-w-0">
        {EDGES.map((edge, index) => (
          <FadeRise key={edge.title} delay={index * 0.08}>
            <div className="flex h-full gap-3 rounded-2xl bg-surface-card p-5 shadow-card">
              <edge.icon
                aria-hidden
                className="mt-0.5 h-5 w-5 shrink-0 text-accent-text"
              />
              <div className="min-w-0">
                <p className="font-semibold text-cream-bright">
                  {t(edge.title)}
                </p>
                <p className="mt-1 text-sm text-cream-dim">{t(edge.body)}</p>
              </div>
            </div>
          </FadeRise>
        ))}
      </div>
    </Section>
  );
}
