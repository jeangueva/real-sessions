import { useState } from "react";
import { MessageSquareQuote } from "lucide-react";
import { Panel } from "@/design-system";
import { ApiError, shareRealQuestions } from "@/lib/api";
import { useThesisT } from "@/lib/thesis-copy";

/**
 * Asked after the real defence, of the person who just had it: what the jury
 * asked. Anonymous, consented, and reviewed before any panel uses it.
 */
export function ShareRealQuestions({ country }: { country: string }) {
  const t = useThesisT();
  const [university, setUniversity] = useState(() => {
    try {
      return localStorage.getItem("mockio.university") ?? "";
    } catch {
      return "";
    }
  });
  const [text, setText] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      const questions = text.split("\n").map((line) => line.trim()).filter(Boolean);
      const result = await shareRealQuestions({ university, country, questions, consent });
      setDone(t("shareThanks", { count: result.saved }));
      setText("");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t("error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <details className="rounded-3xl bg-surface-card p-5 shadow-card sm:p-6">
      <summary className="focus-ring flex cursor-pointer list-none items-center gap-2 rounded-xl text-base font-semibold text-cream-bright">
        <MessageSquareQuote aria-hidden className="h-5 w-5 text-accent-text" />
        {t("shareTitle")}
      </summary>
      <Panel className="mt-4 flex flex-col gap-3 bg-transparent p-0 shadow-none">
        <p className="text-sm text-cream-dim">{t("shareBody")}</p>
        <input
          value={university}
          onChange={(event) => setUniversity(event.target.value)}
          placeholder={t("universityPlaceholder")}
          maxLength={160}
          className="focus-ring rounded-2xl bg-surface-lift px-4 py-3 text-sm text-cream-bright placeholder:text-cream-faint"
        />
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={5}
          placeholder={t("sharePlaceholder")}
          className="focus-ring rounded-2xl bg-surface-lift px-4 py-3 text-sm text-cream-bright placeholder:text-cream-faint"
        />
        <label className="flex items-center gap-2 text-sm text-cream">
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
          {t("shareConsent")}
        </label>
        {done && <p className="text-sm text-grow-text">{done}</p>}
        {error && (
          <p role="alert" className="text-sm text-step-text">
            {error}
          </p>
        )}
        <button
          type="button"
          disabled={busy || !consent || text.trim() === "" || university.trim() === ""}
          onClick={() => void send()}
          className="focus-ring self-start rounded-full bg-surface-lift px-4 py-2 text-sm font-semibold text-cream-bright transition-transform duration-150 active:scale-[0.97] disabled:opacity-50"
        >
          {t("shareSend")}
        </button>
      </Panel>
    </details>
  );
}
