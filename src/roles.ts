/**
 * The roles an interview can be for.
 *
 * A shared list rather than free text, because contributed questions are
 * filtered by it: "what does Stripe ask a Backend Engineer" is only answerable
 * if the reports agree on what a backend engineer is called. Free text gives
 * "Backend Engineer", "backend engineer", "BE" and "Ingeniero Backend" as four
 * different roles with one question each.
 */
export interface Role {
  id: string;
  label: string;
  /** What this role is asked about, for the picker's hint. */
  focus: string;
}

export const ROLES: Role[] = [
  {
    id: "product-designer",
    label: "Senior Product Designer",
    focus: "craft, research, and defending a design decision with evidence",
  },
  {
    id: "backend-engineer",
    label: "Backend Engineer",
    focus: "systems, data modelling, failure, and what you would do at scale",
  },
  {
    id: "frontend-engineer",
    label: "Frontend Engineer",
    focus: "interface performance, accessibility, and state that outgrew its shape",
  },
  {
    id: "growth-pm",
    label: "Growth PM",
    focus: "funnels, experiments, and the number you moved",
  },
  {
    id: "data-analyst",
    label: "Data Analyst",
    focus: "what the data supports, what it does not, and how you knew",
  },
  {
    id: "engineering-manager",
    label: "Engineering Manager",
    focus: "delivery under constraint, and the conversation you avoided too long",
  },
];

const BY_ID = new Map(ROLES.map((role) => [role.id, role]));
const BY_LABEL = new Map(ROLES.map((role) => [role.label.toLowerCase(), role]));

export function findRole(value: string | null | undefined): Role | null {
  if (!value) return null;
  const key = value.trim();
  return BY_ID.get(key) ?? BY_LABEL.get(key.toLowerCase()) ?? null;
}

/**
 * Resolves whatever the client sent to a known role id, or null.
 *
 * Null is a real answer, not a failure: a question can be role-agnostic
 * ("tell me about a hard tradeoff"), and those should reach every interview at
 * that company rather than none.
 */
export function roleIdFor(value: string | null | undefined): string | null {
  return findRole(value)?.id ?? null;
}
