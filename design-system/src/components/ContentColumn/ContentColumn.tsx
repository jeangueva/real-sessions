import type { HTMLAttributes, ReactNode } from "react";

export interface ContentColumnProps extends HTMLAttributes<HTMLDivElement> {
  /** The page's content: a band, a grid, a row of cards. */
  children: ReactNode;
  /**
   * Extra classes, appended: the column's own layout (a grid, a flex row)
   * and the padding of a band that is not the page's. Not a max-w-* — the
   * ceiling is the same everywhere and does not move.
   */
  className?: string;
}

/**
 * The public site's one column: 1200px of content, the same gutters
 * everywhere.
 *
 * The landing pages, the institutions page and the affiliate page are one
 * site, and this is what makes them one: every band of every page sits in
 * the same column, so a card that moves from one page to another lands in
 * the same place.
 *
 * Not the app's container. `PageBody` is that one, and it is wider and
 * tighter: a screen is not a page.
 */
export function ContentColumn({ children, className = "", ...props }: ContentColumnProps) {
  return (
    <div className={`mx-auto w-full max-w-[75rem] px-5 sm:px-8 ${className}`} {...props}>
      {children}
    </div>
  );
}
