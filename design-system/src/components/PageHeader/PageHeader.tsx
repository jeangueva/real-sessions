import type { ReactNode } from "react";
import type { PageBodyWidth } from "../PageBody/PageBody";

export interface PageHeaderProps {
  /** The screen's name, rendered as its only h1: "Mi tesis", "Tu camino", "Ajustes". */
  title: string;
  /**
   * One line under the title: what the screen is for, or the one fact that
   * places it (a count, the thesis it is about). Clamped to one line; the full
   * text stays in the DOM and in a title tooltip.
   */
  meta?: string;
  /** Controls at the end of the row: one Action, a few Badges. They wrap under the title on a phone. */
  actions?: ReactNode;
  /**
   * For a screen whose content is the point, like a call: a 20px title and
   * less space above it on a phone. From sm up the title is the same 40px as
   * every other screen. The title is clamped to two lines at every width.
   */
  compact?: boolean;
  /** The ceiling, matching the PageBody under it so the title lines up with the content. */
  width?: PageBodyWidth;
}

const CEILING: Record<PageBodyWidth, string> = {
  wide: "max-w-[110rem]",
  reading: "max-w-3xl",
};

/**
 * The title block of every app screen.
 *
 * Apple's large title: no rule under it — the size and the space after it
 * already end the header, and a line would only box it in. Same gutters and
 * ceiling as PageBody, so the title starts where the content starts at every
 * width.
 *
 * The meta is one line. A thesis title of 25 words as meta made the header the
 * longest block of text on the screen and was flagged as cognitive load; the
 * header names the screen, it does not hold the document. The full text stays
 * in the DOM (a screen reader reads all of it) and in a title tooltip.
 */
export function PageHeader({ title, meta, actions, compact = false, width = "wide" }: PageHeaderProps) {
  return (
    <header className={`px-4 pb-2 sm:px-6 lg:px-10 lg:pt-10 ${compact ? "pt-4 sm:pt-8" : "pt-8"}`}>
      <div className={`mx-auto flex w-full ${CEILING[width]} flex-wrap items-end justify-between gap-x-4 gap-y-3`}>
        <div className="min-w-0">
          <h1
            className={`font-bold leading-[1.1] tracking-[-0.028em] text-cream-bright sm:text-[2.5rem] ${
              compact ? "line-clamp-2 text-xl" : "text-[2rem]"
            }`}
          >
            {title}
          </h1>
          {meta && (
            <p className="mt-1.5 line-clamp-1 text-sm text-cream-dim" title={meta}>
              {meta}
            </p>
          )}
        </div>
        {actions}
      </div>
    </header>
  );
}
