import { useEffect, useState } from "react";
import { MessageCircle, Sparkles, Volume2 } from "lucide-react";
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
      <p className="text-sm text-cream-bright">{t("feedback.steps")}</p>
      <p className="mt-1 text-xs text-cream-faint">{t("feedback.stepsNote")}</p>
      <ul className="mt-4 flex flex-col gap-3">
        {items.map((item) => {
          const correction = parseCorrection(item);
          if (correction.kind === "note") {
            return (
              <li key={item} className="rounded-2xl border border-line p-4 text-sm text-cream-bright">
                {correction.text}
              </li>
            );
          }
          return (
            <li key={item} className="rounded-2xl border border-line p-4">
              <p className="flex items-center gap-1.5 text-xs text-step-text">
                <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                {t("feedback.youSaid")}
              </p>
              <p lang="en" className="mt-1 text-sm text-cream-bright">
                <span className="rounded bg-step-soft px-1 py-0.5">{correction.said}</span>
              </p>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-grow-text">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                {t("feedback.natural")}
              </p>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                <p lang="en" className="text-sm text-cream-bright">
                  <span className="rounded bg-grow-soft px-1 py-0.5">{correction.natural}</span>
                </p>
                {canSpeak && (
                  <button
                    type="button"
                    onClick={() => speak(correction.natural)}
                    className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs text-cream-dim transition-colors hover:border-accent hover:text-accent-text"
                  >
                    <Volume2 className="h-3.5 w-3.5" aria-hidden />
                    {t("feedback.listen")}
                    <span className="sr-only">: {correction.natural}</span>
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
