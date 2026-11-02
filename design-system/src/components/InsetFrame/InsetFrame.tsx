import type { ReactNode } from "react";

export interface InsetFrameProps {
  /** The content the frame holds: a screen, a document, a page of the public site. */
  children: ReactNode;
  /** Extra classes, appended. For the frame's own surface, not for the padding. */
  className?: string;
}

/**
 * The frame the public site's content sits in: a rounded window, inset from
 * the edge of the screen.
 *
 * The site is a document on a table. The frame says so — the padding is the
 * table's edge and the radius is the paper's corner — and it is the reason
 * the site's own layout can be plain: the frame carries the polish.
 */
export function InsetFrame({ children, className = "" }: InsetFrameProps) {
  return (
    <div className="h-[100svh] p-2 md:p-3">
      <div className={`relative h-full overflow-hidden rounded-2xl md:rounded-inset ${className}`}>
        {children}
      </div>
    </div>
  );
}
