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

/**
 * Where a component sits in Atomic Design. `utility` is for behaviours —
 * motion wrappers that add no visual of their own and wrap any level.
 */
export type AtomicLevel = "atom" | "molecule" | "organism" | "template" | "utility";

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

export interface I18nContract {
  /** Right-to-left: what mirrors (arrows, alignment, slide direction) and what must not (numbers, logos). */
  rtl: string;
  /** How the layout copes with text 30–40% longer than Spanish (German, Portuguese) — wraps, truncates or grows. */
  textExpansion: string;
  /** Numbers, dates and plurals: who formats them (the component or the caller) and with which locale. */
  formatting: string;
  /** Every user-facing string the component renders itself, and the prop that overrides it. Empty when all copy comes from props. */
  strings: { text: string; prop: string }[];
}

export interface ResponsiveContract {
  /** How it changes from 320px phones to wide desktops. */
  behaviour: string[];
  /** The narrowest container it is designed for, e.g. "280px". */
  minWidth: string;
}

/** How a design tool (Lunagraph, a shadcn-style canvas) should present it. */
export interface DesignToolContract {
  /** The item's name in registry.json. */
  registryItem: string;
  /** The import line a canvas or an assistant writes. */
  importStatement: string;
  /** Props a designer edits from a properties panel, in order of importance. */
  canvasProps: string[];
  /** Where it can be dropped, and what it needs around it. */
  placement: string;
}

/** Where the product's own copy lives, so the two can be compared. Null when the system is the only home. */
export interface AppCounterpart {
  /** Path under web/src, e.g. "design-system/primitives.tsx". */
  file: string;
  /** The export name there (or "default"). */
  exportName: string;
  /** Deliberate differences between the system's version and the app's. */
  differences: string[];
}

export interface ChangelogEntry {
  version: string;
  changes: string[];
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
  i18n: I18nContract;
  responsive: ResponsiveContract;
  designTool: DesignToolContract;
  /** The product's copy of this component, for the drift test; null if none. */
  appCounterpart: AppCounterpart | null;
  /** Semver of the contract. A breaking change to a prop or state bumps the major. */
  version: string;
  changelog: ChangelogEntry[];
}

/**
 * Identity, typed. Exists so a contract file reads as a declaration and so a
 * misspelt field is a type error rather than a silently missing row.
 */
export function defineContract<const T extends ComponentContract>(contract: T): T {
  return contract;
}
