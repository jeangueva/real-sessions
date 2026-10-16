/**
 * The contract every component in this system signs.
 *
 * A contract is the part of a component that other people rely on, written
 * down so that it can be checked. The code says what a component does today;
 * the contract says what it promises to keep doing — which props exist and
 * what they mean, which states it can be in, what it does for a keyboard or a
 * screen reader, what its words must sound like, and when not to use it.
 *
 * Three readers depend on it:
 *   - People: the documentation site renders every field as a table or a list.
 *   - Tools: `registry.json` is built from the contracts, so a design tool or
 *     an AI assistant importing the system reads the same facts a person does.
 *   - Tests: `test/contracts.test.ts` fails when a contract and its component
 *     disagree — a prop documented but not accepted, a preview missing, a
 *     state promised but never shown.
 *
 * Nothing here is decoration. A field that is not true is a bug.
 */

/** Where a component sits in Atomic Design. */
export type AtomicLevel = "atom" | "molecule" | "organism" | "template";

/** How far a consumer can lean on it. */
export type Status = "stable" | "beta" | "deprecated";

export interface PropContract {
  /** The TypeScript type, as written in the component's props. */
  type: string;
  required: boolean;
  /** The default when omitted, as code (`"md"`, `false`). Absent when required. */
  default?: string;
  /** What it does, in one or two sentences — the effect, not the type again. */
  description: string;
  /** For a union: what each value is for. */
  values?: Record<string, string>;
}

export interface StateContract {
  /** `default`, `hover`, `pressed`, `focus-visible`, `disabled`, `loading`, `selected`, `open`… */
  name: string;
  /** How it looks and behaves in that state. */
  description: string;
  /** How a consumer puts it there, e.g. "disabled={true}" or "user hovers (pointer: fine)". */
  trigger: string;
}

export interface EventContract {
  /** The prop name, e.g. `onChange`. */
  name: string;
  /** The callback's signature. */
  signature: string;
  /** When it fires — and when it does not. */
  firesWhen: string;
}

export interface AccessibilityContract {
  /** The ARIA role the rendered element carries (implicit or explicit). */
  role: string;
  /** Keyboard behaviour: key → effect. Empty only for non-interactive components. */
  keyboard: { key: string; effect: string }[];
  /** ARIA attributes managed by the component, and those the consumer must supply. */
  aria: { attribute: string; managedBy: "component" | "consumer"; note: string }[];
  /** What happens under `prefers-reduced-motion: reduce`. */
  reducedMotion: string;
  /** Colour contrast guarantees and the tokens they rely on. */
  contrast: string;
  /** Focus treatment: ring, order, trapping. */
  focus: string;
  /** Minimum target size for pointer and touch, or "not interactive". */
  targetSize: string;
  /** Anything a screen-reader user hears that a sighted user does not, or vice versa. */
  screenReader: string;
}

export interface ContentContract {
  /** How labels and messages inside this component are written. */
  voice: string[];
  /** Length limits, e.g. "Label: 1–3 words, ≤ 24 characters". */
  limits: string[];
  /** Good copy, quoted from the product. */
  examples: string[];
}

export interface UsageContract {
  /** Situations this component is the right answer for. */
  when: string[];
  /** Situations it is not, each with what to use instead. */
  whenNot: { situation: string; instead: string }[];
  /** Short do / don't pairs. */
  do: string[];
  dont: string[];
}

export interface ComponentContract {
  /** The exported component name. */
  name: string;
  level: AtomicLevel;
  status: Status;
  /** One sentence: what it is for. */
  summary: string;
  /** The component's file, relative to the package root. */
  source: string;
  /** Other components of this system it renders. */
  composes: string[];
  /** npm packages it imports at runtime (beyond react). */
  dependencies: string[];
  /** Every prop the component accepts, keyed by name. */
  props: Record<string, PropContract>;
  /** Named slots (children, render props) and what goes in them. */
  slots: { name: string; description: string }[];
  states: StateContract[];
  events: EventContract[];
  /** Motion: what moves, how long, which easing, and why. */
  motion: string[];
  accessibility: AccessibilityContract;
  content: ContentContract;
  usage: UsageContract;
  /** Design tokens it reads (CSS variables or Tailwind token names). */
  tokens: string[];
  /** Related components, by name, and how they differ. */
  related: { name: string; difference: string }[];
}

/**
 * Identity, typed. Exists so a contract file reads as a declaration and so a
 * misspelt field is a type error rather than a silently missing row.
 */
export function defineContract<const T extends ComponentContract>(contract: T): T {
  return contract;
}
