import { useEffect, useState } from "react";
import { ArrowRight, Volume2 } from "lucide-react";
import { useT } from "@/hooks/useLocale";
import { parseCorrection } from "@/lib/corrections";

/**
 * The corrections, as steps rather than as mistakes.
 *
 * Each one is drawn as two lines: what you said, on the amber of something to
 * work on, and how it sounds natural, on the green of something that got
 * better. Never red, and never struck through — the first line is not wrong,
 * it is the version before the next one, and somebody reading this the night
 * before an interview needs to see a way forward, not a tally.
 *
 * "Listen" reads the natural version aloud with the browser's own voice, so
 * the next step is something to hear and repeat, not only to read. It is
 * offered only where the browser can speak; no voice means no button rather
 * than a button that does nothing.
 */
export function CorrectionSteps({ items }: { items: string[] }) {
  const t = useT();
  const [canSpeak, setCanSpeak] = useState(false);

  useEffect(() => {
    setCanSpeak(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.92;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div>
      <p className="text-base font-semibold text-cream-bright">{t("feedback.steps")}</p>
      <p className="mt-1 text-xs text-cream-faint">{t("feedback.stepsNote")}</p>
      <ul className="mt-4 flex flex-col gap-3">
        {items.map((item) => {
          const correction = parseCorrection(item);
          if (correction.kind === "note") {
            return (
              <li key={item} className="rounded-2xl bg-surface-lift p-4 text-sm text-cream-bright">
                {correction.text}
              </li>
            );
          }
          return (
            <li key={item} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[color:var(--line)] pt-3 first:border-t-0 first:pt-0">
              <p lang="en" className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-sm">
                <span className="sr-only">{t("feedback.youSaid")}: </span>
                <span className="text-cream-dim line-through decoration-step-text/60">{correction.said}</span>
                <ArrowRight aria-hidden className="h-3.5 w-3.5 shrink-0 text-cream-faint" />
                <span className="sr-only">{t("feedback.natural")}: </span>
                <span className="font-medium text-cream-bright">{correction.natural}</span>
              </p>
              {canSpeak && (
                <button
                  type="button"
                  onClick={() => speak(correction.natural)}
                  aria-label={`${t("feedback.listen")}: ${correction.natural}`}
                  className="focus-ring grid h-8 w-8 shrink-0 place-items-center rounded-full text-cream-dim transition-[color,transform] duration-150 ease-press hover:text-accent-text active:scale-[0.94]"
                >
                  <Volume2 className="h-4 w-4" aria-hidden />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
