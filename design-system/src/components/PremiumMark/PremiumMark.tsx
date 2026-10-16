import { Crown } from "lucide-react";

const DEFAULT_LABEL = "Premium";

export interface PremiumMarkProps {
  /** Read out instead of the crown, and shown as its tooltip. "Premium", "Del plan pago". */
  label?: string;
  /** Extra classes, appended. For placement (ms-auto, an absolute corner) — not for size or colour. */
  className?: string;
}

/**
 * The crown on a paid option.
 *
 * One mark for everything the free plan cannot use, wherever it appears — a
 * nav entry, a tab, a template — so a person learns it once. It names what is
 * behind the option rather than refusing it: the option stays visible and
 * pressable, and what happens on the press is the screen's to decide.
 *
 * Gold is reserved for this mark. Keeping it off everything else is what lets
 * it read as "in the paid plan" at a glance.
 */
export function PremiumMark({ label = DEFAULT_LABEL, className = "" }: PremiumMarkProps) {
  // An image with an empty name is announced as nothing, or as "image".
  // A blank label falls back to the default rather than shipping that.
  const name = label.trim() === "" ? DEFAULT_LABEL : label;
  return (
    <span
      role="img"
      aria-label={name}
      title={name}
      className={`inline-grid h-5 w-5 shrink-0 place-items-center rounded-full bg-premium-soft text-premium ${className}`}
    >
      <Crown aria-hidden className="h-3 w-3" strokeWidth={2.5} fill="currentColor" />
    </span>
  );
}
