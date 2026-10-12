import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { Action, Panel } from "@/design-system";
import { decideDefenseQuestion, fetchDefenseReviewQueue } from "@/lib/api";
import type { RealDefenseQuestion } from "@/lib/api";
import { useT } from "@/hooks/useLocale";
import { useThesisT } from "@/lib/thesis-copy";
import { formatSessionDate } from "@/lib/format";

/** The defence questions waiting for a reviewer, under the interview ones. */
export function DefenseReviewQueue() {
  const t = useT();
  const tt = useThesisT();
  const [queue, setQueue] = useState<RealDefenseQuestion[] | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  useEffect(() => {
    fetchDefenseReviewQueue()
      // Only entries that are defence questions: anything else answering on
      // this route is not something to put in front of a reviewer here.
      .then((result) =>
        setQueue(
          (Array.isArray(result.queue) ? result.queue : []).filter(
            (entry) => typeof entry.university === "string" && typeof entry.question === "string",
          ),
        ),
      )
      .catch(() => setQueue([]));
  }, []);

  const decide = async (id: number, status: "verified" | "rejected") => {
    setBusy(id);
    try {
      await decideDefenseQuestion(id, status);
    } finally {
      setQueue((current) => (current ?? []).filter((entry) => entry.id !== id));
      setBusy(null);
    }
  };

  if (!queue || queue.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold text-cream-bright">{tt("reviewDefenseTitle")}</h2>
      <ul className="flex flex-col gap-3">
        {queue.map((entry) => (
          <li key={entry.id}>
            <Panel className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-xs text-cream-faint">
                  {entry.university}
                  {entry.country && ` · ${entry.country}`}
                  {entry.field && ` · ${entry.field}`}
                  {` · ${formatSessionDate(entry.createdAt)}`}
                </p>
                {/* Plain text, never markup: a stranger wrote it. */}
                <p className="mt-2 text-sm leading-relaxed text-cream-bright">{entry.question}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => void decide(entry.id, "rejected")}
                  disabled={busy === entry.id}
                  className="focus-ring flex items-center gap-2 rounded-full bg-surface-lift px-4 py-2 text-xs font-medium text-cream-bright active:scale-[0.97] disabled:opacity-40"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                  {t("review.reject")}
                </button>
                <Action onClick={() => void decide(entry.id, "verified")} disabled={busy === entry.id}>
                  <Check className="h-4 w-4" aria-hidden />
                  {t("review.verify")}
                </Action>
              </div>
            </Panel>
          </li>
        ))}
      </ul>
    </section>
  );
}
