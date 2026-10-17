import type { HTMLAttributes, ReactNode } from "react";

export type PanelVariant = "card" | "raised" | "glass";

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * What sits on the surface. Panel adds no padding of its own: the caller
   * sets it, `p-6 sm:p-8` for a block and `p-5` for a row.
   */
  children: ReactNode;
  /**
   * card = the lighter fill, for panels side by side in a grid.
   * raised = one block on the page ground: an upload step, an empty state, a wait.
   * glass = over video or imagery; on a plain page, an unfilled sheet with an edge.
   */
  variant?: PanelVariant;
  /** Extra classes, appended. Padding, layout and width — not a fill, a border or a radius. */
  className?: string;
}

const SURFACE: Record<PanelVariant, string> = {
  card: "bg-surface-card shadow-card",
  raised: "bg-surface-raised shadow-card",
  // The class carries its own edge, blur and theme overrides (styles.css):
  // glass on dark and over footage, a white sheet with a hairline on paper.
  glass: "liquid-glass",
};

/**
 * The surface. Every card, block and sheet in the product is a Panel.
 *
 * A shadow rather than a border: the shadow token carries its own hairline,
 * so a panel separates from white and from #F5F5F7 alike without a grey rule
 * drawn around every block. It is a surface and nothing else — no padding, no
 * hover, no press — so the same Panel holds a pricing tier, a settings form
 * and a wait message, and a card you can press is a link, not a Panel.
 *
 * Every other <div> attribute is passed through, so a panel can be a named
 * region, a tabpanel, a status or an alert without a wrapper.
 */
export function Panel({ children, variant = "card", className = "", ...props }: PanelProps) {
  return (
    <div className={`overflow-hidden rounded-card ${SURFACE[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
}
