import { useEffect, useState } from "react";
import { Camera } from "lucide-react";
import { Panel } from "@/design-system";
import { fetchPresence } from "@/lib/api";
import type { Presence } from "@/lib/api";
import { useThesisT } from "@/lib/thesis-copy";

/**
 * The camera reading, when the session had the camera on. It is written
 * while the report is being read, so this asks a few times before giving up.
 */
export function PresenceCard({ sessionId, wait = false }: { sessionId: string; wait?: boolean }) {
  const t = useThesisT();
  const [presence, setPresence] = useState<Presence | null>(null);

  useEffect(() => {
    let tries = 0;
    let stopped = false;
    const ask = () => {
      fetchPresence(sessionId)
        .then((result) => {
          if (stopped) return;
          if (result.presence) setPresence(result.presence);
          // Only waited for when this session just sent its frames.
          else if (wait && (tries += 1) < 8) window.setTimeout(ask, 3_000);
        })
        .catch(() => undefined);
    };
    ask();
    return () => {
      stopped = true;
    };
  }, [sessionId, wait]);

  if (!presence) return null;
  const rows = [
    [t("presenceEye"), presence.eye_contact],
    [t("presencePosture"), presence.posture],
    [t("presenceExpression"), presence.expression],
    [t("presenceFraming"), presence.framing],
  ] as const;
  return (
    <Panel className="flex flex-col gap-3 p-6 sm:p-8">
      <h2 className="flex items-center gap-2 text-base font-semibold text-cream-bright">
        <Camera aria-hidden className="h-5 w-5 text-accent-text" />
        {t("presenceTitle")}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-1">
            <div className="flex justify-between text-sm">
              <span className="text-cream">{label}</span>
              <span className="tabular-nums text-cream-dim">{value}</span>
            </div>
            <span className="block h-2 overflow-hidden rounded-full bg-surface-lift">
              <span
                className={`block h-full rounded-full ${value >= 70 ? "bg-grow" : value >= 45 ? "bg-accent" : "bg-step"}`}
                style={{ width: `${Math.max(3, value)}%` }}
              />
            </span>
          </div>
        ))}
      </div>
      <p className="text-sm text-cream">{presence.summary}</p>
      <ul className="list-disc pl-5 text-sm text-cream">
        {presence.tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
      <p className="text-xs text-cream-dim">{t("presenceNote")}</p>
    </Panel>
  );
}
