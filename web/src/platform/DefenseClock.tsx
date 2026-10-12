import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { useThesisT } from "@/lib/thesis-copy";

/**
 * The time on the floor, with a traffic light.
 *
 * Juries keep time: an exposition that runs past its slot is cut, and an
 * answer that wanders for three minutes loses the room. Green while there is
 * time, amber in the last fifth, red past it — the same signal a president
 * gives by looking at the clock.
 */
export function DefenseClock({ since, limitSeconds, label }: { since: number; limitSeconds: number; label: string }) {
  const t = useThesisT();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const elapsed = Math.max(0, Math.floor((now - since) / 1000));
  const share = elapsed / limitSeconds;
  const tone =
    share >= 1 ? "bg-step-soft text-step-text" : share >= 0.8 ? "bg-accent-soft text-accent-text" : "bg-grow-soft text-grow-text";
  const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  return (
    <span
      role="timer"
      aria-label={`${label}: ${clock(elapsed)} / ${clock(limitSeconds)}`}
      className={`inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1 text-sm font-semibold tabular-nums ${tone}`}
    >
      <Timer aria-hidden className="h-4 w-4" />
      {label} · {clock(elapsed)} / {clock(limitSeconds)}
      {share >= 1 && <span className="font-normal">· {t("overTime")}</span>}
    </span>
  );
}
