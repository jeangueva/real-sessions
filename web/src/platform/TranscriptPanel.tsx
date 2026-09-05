import { useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { useT } from "@/hooks/useLocale";

/**
 * The side panel: what was said, and a way to say something by typing.
 *
 * The transcript is attributed by name rather than by colour or by which side
 * of the panel a bubble sits on. A candidate reads this back afterwards to
 * find the moment an answer went wrong, and "Interviewer (Marcus)" tells them
 * that at a glance from anywhere on the page — a left-right convention only
 * works while you can see both columns.
 */

export type Speaker = "interviewer" | "candidate";

export interface TranscriptLine {
  id: string;
  speaker: Speaker;
  text: string;
}

/**
 * Who a line is attributed to.
 *
 * The interviewer's first name, because that is what they introduced
 * themselves as in the opening turn and what the candidate heard. "You" for
 * the candidate: their own name is on the account, and reading it back at
 * them in their own transcript is oddly formal.
 */
export function speakerLabel(
  speaker: Speaker,
  interviewer: string | null,
  words: { you: string; interviewer: string } = { you: "You", interviewer: "Interviewer" },
): string {
  if (speaker === "candidate") return words.you;
  const first = (interviewer ?? "").trim().split(/\s+/)[0];
  return first ? `${words.interviewer} (${first})` : words.interviewer;
}

export function TranscriptPanel({
  lines,
  pending,
  interviewerName,
  tab,
  onTab,
  answer,
  onAnswer,
  onSend,
  canSend,
  hint,
}: {
  lines: TranscriptLine[];
  /** The turn still streaming in, shown greyed under the settled lines. */
  pending: string;
  interviewerName: string | null;
  tab: "transcript" | "chat";
  onTab: (next: "transcript" | "chat") => void;
  answer: string;
  onAnswer: (next: string) => void;
  onSend: () => void;
  canSend: boolean;
  hint: string;
}) {
  const t = useT();
  const words = { you: t("call.you"), interviewer: t("call.interviewer") };
  const foot = useRef<HTMLDivElement>(null);

  // Follows the conversation down. A transcript that has to be scrolled by
  // hand while someone is talking to you is a transcript nobody reads.
  useEffect(() => {
    foot.current?.scrollIntoView({ block: "end" });
  }, [lines.length, pending]);

  return (
    <aside className="flex min-h-0 w-full flex-col rounded-3xl border border-line bg-surface-sunken lg:w-[26rem]">
      <div
        role="tablist"
        aria-label={t("panel.label")}
        className="flex shrink-0 gap-1 border-b border-line p-2"
      >
        {(["transcript", "chat"] as const).map((name) => (
          <button
            key={name}
            role="tab"
            aria-selected={tab === name}
            onClick={() => onTab(name)}
            className={`focus-ring flex-1 rounded-full px-3 py-1.5 text-xs capitalize transition-colors sm:text-sm ${
              tab === name
                ? "bg-cream text-surface-base"
                : "text-cream-dim hover:text-cream-bright"
            }`}
          >
            {name === "transcript" ? t("panel.transcript") : t("panel.chat")}
          </button>
        ))}
      </div>

      {tab === "transcript" ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {lines.length === 0 && pending === "" ? (
            <p className="text-xs text-cream-faint">
              {t("panel.empty")}
            </p>
          ) : (
            <ol className="flex flex-col gap-4">
              {lines.map((line) => (
                <li key={line.id}>
                  <p
                    className={`text-xs ${
                      line.speaker === "interviewer"
                        ? "text-cream-bright"
                        : "text-cream-faint"
                    }`}
                  >
                    {speakerLabel(line.speaker, interviewerName, words)}
                  </p>
                  <p className="mt-1 text-sm leading-snug text-cream-dim">{line.text}</p>
                </li>
              ))}
              {pending !== "" && (
                <li>
                  <p className="text-xs text-cream-bright">
                    {speakerLabel("interviewer", interviewerName, words)}
                  </p>
                  <p className="mt-1 text-sm leading-snug text-cream-faint">
                    {pending}
                    <span
                      aria-hidden
                      className="ml-[2px] inline-block h-[0.9em] w-[2px] animate-blink bg-cream align-middle"
                    />
                  </p>
                </li>
              )}
            </ol>
          )}
          <div ref={foot} />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
          <p className="text-xs text-cream-faint">
            {t("panel.typingNote")}
          </p>
          <textarea
            value={answer}
            onChange={(event) => onAnswer(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSend();
              }
            }}
            disabled={!canSend}
            rows={6}
            placeholder={t("panel.placeholder")}
            className="focus-ring min-h-0 flex-1 resize-none rounded-2xl border border-line bg-transparent p-3 text-sm text-cream-bright placeholder:text-cream-faint disabled:opacity-50"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-cream-faint">{hint}</span>
            <button
              onClick={onSend}
              disabled={!canSend || answer.trim() === ""}
              className="focus-ring flex items-center gap-2 rounded-full bg-cream px-4 py-2 text-xs text-surface-base transition-opacity disabled:opacity-40 sm:text-sm"
            >
              <Send className="h-4 w-4" aria-hidden />
              {t("panel.send")}
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
