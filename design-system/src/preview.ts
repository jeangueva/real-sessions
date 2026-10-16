import type { ReactNode } from "react";

/**
 * Previews: the component, rendered, in the situations its contract names.
 *
 * Kept apart from the component's code on purpose. The code is what ships;
 * a preview is a specimen of it — the default, every state the contract
 * promises, the edge cases (long copy, empty data, narrow screens) and, where
 * it teaches something, a misuse shown next to the right way.
 *
 * Every preview is also a test: `test/previews.test.tsx` renders each one and
 * runs axe against it, so a specimen that crashes or is inaccessible fails CI.
 */

export type PreviewKind =
  /** The component as it is used most of the time. */
  | "default"
  /** One of the states in the contract: hover, disabled, loading, selected… */
  | "state"
  /** A variant or size. */
  | "variant"
  /** Long text, empty data, many items, a narrow container. */
  | "edge"
  /** A real screen fragment from the product, composed with other components. */
  | "in-context"
  /** What not to do — rendered so the difference is visible. Never shipped. */
  | "misuse";

export interface Preview {
  /** Unique within the component, kebab-case: `disabled`, `long-label`. */
  id: string;
  title: string;
  kind: PreviewKind;
  /** What to notice in this specimen. */
  description: string;
  /** For `state` previews: the contract state this one demonstrates. */
  state?: string;
  /** Render on the dark surface, the light one, or let the viewer's theme decide. */
  theme?: "dark" | "light" | "auto";
  /** Narrow the frame, to show the component at phone width. */
  width?: number;
  /** For `misuse`: why it is wrong. Required there, absent elsewhere. */
  why?: string;
  render: () => ReactNode;
  /**
   * The snippet a reader copies. Written by hand, not derived from `render`,
   * so it shows the props that matter and nothing a specimen needs only to
   * display itself.
   */
  code: string;
  /** axe rules that cannot apply to a specimen (e.g. a landmark rule for a lone fragment). */
  axeDisable?: string[];
}

export function definePreviews<const T extends readonly Preview[]>(previews: T): T {
  return previews;
}
