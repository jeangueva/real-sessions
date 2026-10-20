import { useEffect, useState } from "react";
import { Check, Copy, UserPlus } from "lucide-react";
import { useThesisT } from "@/lib/thesis-copy";
import { callInviteUrl, type CallParticipant } from "@/lib/group-call";

/**
 * The invitation for a group defence: one link, copied and sent however the
 * group already talks — WhatsApp, mostly. Who has joined is said underneath,
 * so the host knows when to start the exposition.
 */
export function GroupInvite({
  roomId,
  opening,
  failed,
  joined,
  onOpen,
}: {
  roomId: string | null;
  opening: boolean;
  failed: boolean;
  joined: CallParticipant[];
  onOpen: () => void;
}) {
  const t = useThesisT();
  const [copied, setCopied] = useState(false);
  const [shown, setShown] = useState(false);
  // Once someone is in, the card folds back to the line that says who: the
  // call is the thing to look at now, not the link.
  const count = joined.length;
  useEffect(() => {
    if (count > 0) setShown(false);
  }, [count]);

  const open = () => {
    setShown(true);
    if (!roomId && !opening) onOpen();
  };

  const copy = async () => {
    if (!roomId) return;
    try {
      await navigator.clipboard.writeText(callInviteUrl(roomId));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // The link is on screen to copy by hand.
    }
  };

  if (!shown) {
    return (
      <button
        type="button"
        onClick={open}
        className="focus-ring inline-flex items-center gap-2 self-start rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink transition-transform duration-150 ease-press active:scale-[0.97]"
      >
        <UserPlus className="h-4 w-4" aria-hidden />
        {joined.length > 0 ? t("callConnected", { names: joined.map((entry) => entry.name).join(", ") }) : t("callInvite")}
      </button>
    );
  }

  return (
    <section className="rounded-2xl bg-surface-card p-4 ring-1 ring-cream/10 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-cream-bright">{t("callInvite")}</h2>
          <p className="mt-1 text-sm text-cream-dim">{t("callInviteBody")}</p>
        </div>
        <button
          type="button"
          onClick={() => setShown(false)}
          className="focus-ring shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold text-cream-dim transition-[color,transform] duration-150 ease-press hover:text-cream-bright active:scale-[0.97]"
        >
          {t("discClose")}
        </button>
      </div>

      {failed ? (
        <p className="mt-3 text-sm text-step-text" role="alert">
          {t("callFailed")}{" "}
          <button type="button" onClick={onOpen} className="focus-ring underline">
            {t("callRetry")}
          </button>
        </p>
      ) : !roomId ? (
        <p className="mt-3 text-sm text-cream-faint">{t("callOpening")}</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="min-w-0 flex-1 truncate rounded-xl bg-surface-lift px-3 py-2 text-sm text-cream-bright">
            {callInviteUrl(roomId)}
          </code>
          <button
            type="button"
            onClick={() => void copy()}
            className="focus-ring inline-flex items-center justify-center gap-2 rounded-full bg-cream-bright px-4 py-2 text-sm font-semibold text-surface-base transition-transform duration-150 ease-press active:scale-[0.97]"
          >
            {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
            {copied ? t("callCopied") : t("callCopy")}
          </button>
        </div>
      )}

      <p className="mt-3 text-sm text-cream-dim" aria-live="polite">
        {joined.length > 0 ? t("callConnected", { names: joined.map((entry) => entry.name).join(", ") }) : t("callWaiting")}
      </p>
    </section>
  );
}
