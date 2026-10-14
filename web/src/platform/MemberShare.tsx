import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { shareSession } from "@/lib/api";
import { useThesisT } from "@/lib/thesis-copy";

/**
 * In a group defence, one link per member: the same shared report, opened on
 * their own grade and the jury's words about them.
 *
 * The report belongs to whoever ran the rehearsal; the classmates who joined
 * the call have no account to find it in. A link is how a group already
 * passes things around, so each member gets one to copy or send straight to
 * WhatsApp. The first press makes the report public, the same way the share
 * button does, and every link after that reuses it.
 */
export function MemberShare({
  members,
  historyId,
  token,
  onShared,
}: {
  members: string[];
  historyId: string;
  token: string | null;
  onShared: (token: string) => void;
}) {
  const t = useThesisT();
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const linkFor = async (name: string): Promise<string | null> => {
    let base = token ? `${window.location.origin}/r/${token}` : null;
    if (!base) {
      setBusy(true);
      try {
        const result = await shareSession(historyId);
        onShared(result.shared.token);
        base = result.shared.url;
      } catch {
        return null;
      } finally {
        setBusy(false);
      }
    }
    return `${base}?integrante=${encodeURIComponent(name)}`;
  };

  const copy = async (name: string) => {
    const url = await linkFor(name);
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(name);
      window.setTimeout(() => setCopied((current) => (current === name ? null : current)), 2000);
    } catch {
      window.prompt(name, url);
    }
  };

  const whatsapp = async (name: string) => {
    // Opened before the await, from the click: a window opened after it is
    // a popup the browser blocks.
    const opened = window.open("", "_blank");
    const url = await linkFor(name);
    if (!url) {
      opened?.close();
      return;
    }
    const target = `https://wa.me/?text=${encodeURIComponent(t("memberWhatsappText", { name, url }))}`;
    if (opened) opened.location.href = target;
    else window.location.href = target;
  };

  return (
    <div className="mt-2 flex flex-col gap-3 border-t border-cream/10 pt-4 print:hidden">
      <div>
        <h3 className="text-sm font-semibold text-cream-bright">{t("memberShareTitle")}</h3>
        <p className="mt-0.5 text-sm text-cream-dim">{t("memberShareBody")}</p>
      </div>
      <ul className="flex flex-col gap-2">
        {members.map((name) => (
          <li key={name} className="flex flex-wrap items-center justify-between gap-2">
            <span className="min-w-0 truncate text-sm font-semibold text-cream-bright">{name}</span>
            <span className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void copy(name)}
                className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-surface-lift px-3 py-1.5 text-sm font-semibold text-cream-bright transition-transform duration-150 ease-press active:scale-[0.97] disabled:opacity-50"
              >
                {copied === name ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                {copied === name ? t("memberCopied") : t("memberCopy")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void whatsapp(name)}
                className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-grow px-3 py-1.5 text-sm font-semibold text-surface-base transition-transform duration-150 ease-press active:scale-[0.97] disabled:opacity-50"
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
                WhatsApp
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
