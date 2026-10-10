import { useState } from "react";
import { Mic, RotateCcw, Square } from "lucide-react";
import { Action, Panel, PopIn } from "@/design-system";
import { useLocale, useT } from "@/hooks/useLocale";
import { useVoice } from "@/hooks/useVoice";
import { ApiError, retryAnswer } from "@/lib/api";
import type { Evaluation } from "@/lib/evaluation";
import type { MessageKey } from "@/lib/i18n";

type Item = NonNullable<Evaluation["answer_feedback"]>[number];

/** The model sometimes quotes the phrase itself; the card adds its own quotes. */
const unquote = (text: string) => text.trim().replace(/^["“”']+|["“”']+$/g, "");
type Verdict = Item["verdict"];

const VERDICT: Record<Verdict, { label: MessageKey; className: string }> = {
  strong: { label: "answers.strong", className: "bg-grow-soft text-grow-text" },
  ok: { label: "answers.ok", className: "bg-accent-soft text-accent-text" },
  weak: { label: "answers.weak", className: "bg-step-soft text-step-text" },
};

/**
 * Each answer on its own, with a way to say it again.
 *
 * The rest of the report says what to work on; this says which answer and
 * hands over the version to say instead. "Try this answer again" is the
 * loop the other tools have and Mockio did not: say it, see whether it got
 * better, say it again — one question at a time, in a minute, without
 * restarting a whole interview.
 */
export function AnswerByAnswer({ items, historyId }: { items: Item[]; historyId: string | null }) {
  const t = useT();
  const [open, setOpen] = useState<number | null>(null);
  if (items.length === 0) return null;

  return (
    <Panel className="p-6 sm:p-8">
      <h2 className="text-base font-semibold text-cream-bright">{t("answers.title")}</h2>
      <ol className="mt-4 flex flex-col gap-3">
        {items.map((item, index) => (
          <li key={index} className="rounded-2xl bg-surface-lift p-4 [overflow-wrap:anywhere]">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-cream-bright">{item.question}</p>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${VERDICT[item.verdict].className}`}>
                {t(VERDICT[item.verdict].label)}
              </span>
            </div>
            <p className="mt-1.5 text-sm text-cream-dim">{item.feedback}</p>
            <p className="mt-3 rounded-xl bg-surface-card px-3 py-2 text-sm text-cream-bright">
              <span className="block text-xs font-semibold text-accent-text">{t("answers.better")}</span>
              “{unquote(item.better)}”
            </p>
            {historyId &&
              (open === index ? (
                <Retry historyId={historyId} index={index} onClose={() => setOpen(null)} />
              ) : (
                <button
                  type="button"
                  onClick={() => setOpen(index)}
                  className="focus-ring mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-accent-text transition-[background-color,transform] duration-150 hover:bg-accent-soft active:scale-[0.97]"
                >
                  <RotateCcw aria-hidden className="h-4 w-4" />
                  {t("answers.retry")}
                </button>
              ))}
          </li>
        ))}
      </ol>
    </Panel>
  );
}

function Retry({ historyId, index, onClose }: { historyId: string; index: number; onClose: () => void }) {
  const t = useT();
  const { locale } = useLocale();
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ verdict: Verdict; feedback: string; better: string; improved: boolean } | null>(null);
  // Dictation: what is heard lands in the box, where it can still be edited.
  const voice = useVoice({
    enabled: true,
    sessionStartedAt: Date.now(),
    onFinalAnswer: (text) => setAnswer((current) => `${current} ${text}`.trim()),
  });

  const check = async () => {
    if (voice.listening) voice.stopListening();
    setBusy(true);
    setError(null);
    try {
      const response = await retryAnswer(historyId, index, answer, locale);
      setResult(response.result);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t("answers.failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 flex flex-col gap-3 rounded-xl bg-surface-card p-3">
      <div className="relative">
        <textarea
          value={voice.listening && voice.transcript ? `${answer} ${voice.transcript}`.trim() : answer}
          onChange={(event) => setAnswer(event.target.value)}
          rows={3}
          placeholder={t("answers.placeholder")}
          className="field-control resize-none text-sm text-cream-bright placeholder:text-cream-faint"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {voice.inputSupported && (
          <Action tone="glass" onClick={() => (voice.listening ? voice.stopListening() : voice.startListening())}>
            {voice.listening ? <Square aria-hidden className="h-4 w-4" /> : <Mic aria-hidden className="h-4 w-4" />}
            {t(voice.listening ? "answers.stop" : "answers.speak")}
          </Action>
        )}
        <Action onClick={() => void check()} disabled={busy || answer.trim().length < 3}>
          {t(busy ? "answers.checking" : "answers.check")}
        </Action>
        <button type="button" onClick={onClose} className="focus-ring rounded-full px-3 py-1.5 text-sm text-cream-dim hover:text-cream-bright">
          {t("answers.close")}
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-step-text">{error}</p>}
      {result && (
        <PopIn>
          <div className="rounded-xl bg-surface-lift p-3" role="status">
            <p className={`text-sm font-semibold ${result.improved ? "text-grow-text" : "text-cream-bright"}`}>
              {t(result.improved ? "answers.improved" : "answers.notYet")}
            </p>
            <p className="mt-1 text-sm text-cream-dim">{result.feedback}</p>
            {!result.improved && <p className="mt-2 text-sm text-cream-bright">“{unquote(result.better)}”</p>}
          </div>
        </PopIn>
      )}
    </div>
  );
}
