import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

export type NoticeTone = "error" | "success" | "info";

export interface NoticeProps {
  /** What the notice says. */
  children: ReactNode;
  /** How loud it is. error is announced assertively; the others wait their turn. */
  tone?: NoticeTone;
  /** Extra classes, appended. For layout — not for recolouring the notice. */
  className?: string;
}

/**
 * A message about the state of something: saved, done, or not possible.
 *
 * The icon is decoration and the words are the message. The error tone is
 * amber, not red: nothing in this product marks a person wrong, so the
 * colour says "look here" and the words say what happened.
 */
export function Notice({ tone = "info", children, className = "" }: NoticeProps) {
  const look = {
    error: { box: "bg-step-soft", icon: "text-step-text", Icon: AlertCircle },
    success: { box: "bg-grow-soft", icon: "text-grow-text", Icon: CheckCircle2 },
    info: { box: "bg-surface-lift", icon: "text-cream-dim", Icon: Info },
  }[tone];
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-2.5 rounded-2xl px-4 py-3 text-sm leading-relaxed text-cream-bright ${look.box} ${className}`}
    >
      <look.Icon aria-hidden className={`mt-0.5 h-4 w-4 shrink-0 ${look.icon}`} />
      <span className="min-w-0">{children}</span>
    </p>
  );
}
