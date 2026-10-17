import type { HTMLAttributes, ReactNode } from "react";

export type PageBodyWidth = "wide" | "reading";

export interface PageBodyProps extends HTMLAttributes<HTMLDivElement> {
  /** The screen's content: Panels, a list, a grid. */
  children: ReactNode;
  /**
   * The ceiling. wide = 110rem, for every screen whose content is a grid,
   * a table or a call. reading = 48rem (max-w-3xl), for a screen read top to
   * bottom: a report, a session's detail, the day-of warm-up.
   */
  width?: PageBodyWidth;
  /**
   * Extra classes, appended, on the same element that holds the children:
   * the screen's layout (flex flex-col gap-4, lg:grid-cols-2) and padding
   * overrides. Not a max-w-* — that is width.
   */
  className?: string;
}

const CEILING: Record<PageBodyWidth, string> = {
  wide: "max-w-[110rem]",
  reading: "max-w-3xl",
};

/**
 * The one container every app screen sits in.
 *
 * Width and gutters live here rather than in each screen. A ceiling exists,
 * because a line of text at 2000px is unreadable, but it is one prop with two
 * values rather than a max-w-* typed per file.
 *
 * One element, not two: the gutters, the ceiling and the layout the screen
 * asks for all land on the element that holds the children. With the layout
 * on an outer wrapper, a screen asking for lg:grid-cols-2 laid out the
 * wrapper's single child and every column stacked inside the first.
 *
 * The ceiling is a prop rather than a className because the class merge has
 * no tailwind-merge: in the generated CSS max-w-[110rem] comes after
 * max-w-3xl, so a narrower max-w-* passed in className silently lost.
 */
export function PageBody({ children, width = "wide", className = "", ...props }: PageBodyProps) {
  return (
    <div className={`mx-auto w-full ${CEILING[width]} px-4 py-8 sm:px-6 lg:px-10 lg:py-10 ${className}`} {...props}>
      {children}
    </div>
  );
}
