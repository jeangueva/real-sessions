import { Thermometer } from "lucide-react";
import { Panel } from "@/design-system";
import type { SessionMetrics } from "@/lib/api";
import { useThesisT } from "@/lib/thesis-copy";

/**
 * Nerves, read off the voice.
 *
 * The four signs a jury notices without naming them: padding words, racing or
 * crawling, long silences before an answer, and a slow first answer — where
 * nerves show most. Each is scored against a plain target and the worst of
 * them sets the reading, because one bad habit is what a jury remembers.
 */
export function NervesCard({ metrics }: { metrics: SessionMetrics }) {
  const t = useThesisT();
  if (!metrics.fromSpeech) return null;

  // 0 is calm, 2 is very nervous, per sign.
  const signs: { label: string; value: string; level: 0 | 1 | 2 }[] = [];
  if (metrics.fillerPer100 !== null) {
    const v = metrics.fillerPer100;
    signs.push({
      label: t("nervesFillers"),
      value: t("nervesFillersValue", { count: Math.round(v * 10) / 10 }),
      level: v < 3 ? 0 : v < 6 ? 1 : 2,
    });
  }
  if (metrics.wpm !== null) {
    const v = metrics.wpm;
    signs.push({
      label: t("nervesPace"),
      value: t("nervesPaceValue", { count: Math.round(v) }),
      level: v >= 110 && v <= 160 ? 0 : v >= 90 && v <= 185 ? 1 : 2,
    });
  }
  if (metrics.longPauses !== null) {
    const v = metrics.longPauses;
    signs.push({ label: t("nervesPauses"), value: String(v), level: v <= 2 ? 0 : v <= 4 ? 1 : 2 });
  }
  if (metrics.timeToFirstMs !== null) {
    const v = metrics.timeToFirstMs / 1000;
    signs.push({
      label: t("nervesFirst"),
      value: t("nervesFirstValue", { count: Math.round(v * 10) / 10 }),
      level: v < 3 ? 0 : v < 6 ? 1 : 2,
    });
  }
  if (signs.length === 0) return null;

  const worst = Math.max(...signs.map((sign) => sign.level));
  const reading = worst === 0 ? "nervesCalm" : worst === 1 ? "nervesSome" : "nervesHigh";
  const tone = (level: number) =>
    level === 0 ? "bg-grow-soft text-grow-text" : level === 1 ? "bg-accent-soft text-accent-text" : "bg-step-soft text-step-text";

  return (
    <Panel className="flex flex-col gap-4 p-6 sm:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <Thermometer aria-hidden className="h-5 w-5 text-accent-text" />
        <h2 className="text-base font-semibold text-cream-bright">{t("nervesTitle")}</h2>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${tone(worst)}`}>{t(reading)}</span>
      </div>
      <dl className="grid gap-3 sm:grid-cols-2">
        {signs.map((sign) => (
          <div key={sign.label} className="flex items-center justify-between gap-3 rounded-2xl bg-surface-lift px-4 py-3">
            <dt className="text-sm text-cream">{sign.label}</dt>
            <dd className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone(sign.level)}`}>{sign.value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-cream-dim">{t("nervesNote")}</p>
    </Panel>
  );
}
