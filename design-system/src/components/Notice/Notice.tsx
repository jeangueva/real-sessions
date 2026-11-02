import type { HTMLAttributes, ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

export type NoticeTone = "error" | "success" | "info";

export interface NoticeProps extends HTMLAttributes<HTMLParagraphElement> {
  /**
   * error = what you just did did not work, and what to do next. Orange (step), never red.
   * success = it worked. info = something happened that is neither.
   */
  tone?: NoticeTone;
  /** The message, one or two sentences of inline text. It sits inside a <p>, so no blocks, lists or headings. */
  children: ReactNode;
  /** Extra classes, appended. For layout (margin, width) — not for recolouring the box. */
  className?: string;
}

const LOOK = {
  error: { box: "bg-step-soft", icon: "text-step-text", Icon: AlertCircle },
  success: { box: "bg-grow-soft", icon: "text-grow-text", Icon: CheckCircle2 },
  info: { box: "bg-surface-lift", icon: "text-cream-dim", Icon: Info },
} as const;

/**
 * A message about what just happened, in a tinted box with its mark.
 *
 * The box and the icon make it read as the answer to what you just did,
 * rather than one more line of instructions. Never red: `step` is "what to do
 * next", not "wrong". An error is an alert (announced at once); the other
 * tones are a polite status. Pass `role` to override that.
 */
export function Notice({ tone = "info", children, className = "", ...props }: NoticeProps) {
  const look = LOOK[tone];
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-2.5 rounded-2xl px-4 py-3 text-sm leading-relaxed text-cream-bright ${look.box} ${className}`}
      {...props}
    >
      <look.Icon aria-hidden className={`mt-0.5 h-4 w-4 shrink-0 ${look.icon}`} />
      <span className="min-w-0">{children}</span>
    </p>
  );
}
