/**
 * The roles an interview can be for.
 *
 * A shared list rather than free text, because contributed questions are
 * filtered by it: "what does Stripe ask a Backend Engineer" is only answerable
 * if the reports agree on what a backend engineer is called. Free text gives
 * "Backend Engineer", "backend engineer", "BE" and "Ingeniero Backend" as four
 * different roles with one question each.
 */
/**
 * The function a role belongs to.
 *
 * The list began as six roles, five of them in or next to engineering, which
 * told a finance analyst or a lawyer preparing for an interview in English
 * that this product was not for them. Grouping by area does two jobs: the
 * picker can show forty roles without becoming a wall, and the interviewer
 * can carry a job title that belongs in that room (see `Area.titles`).
 */
export type AreaId =
  | "engineering"
  | "product"
  | "design"
  | "data"
  | "growth"
  | "marketing"
  | "finance"
  | "legal"
  | "people"
  | "sales"
  | "customer-success"
  | "operations";

export interface Area {
  id: AreaId;
  label: string;
  /**
   * The interviewers' job titles in this area, keyed by the title they carry
   * in engineering (`personas.ts`).
   *
   * A persona is a temperament with a job attached, and the job was always an
   * engineering one. Asked to interview an accountant, "Diane Kovac, Director
   * of Engineering" is a convincing person in the wrong building — the
   * failure the per-role stage list was written to prevent. The temperament
   * stays; the title follows the room. Titles not listed here (the talent
   * partner, the founder) are the same in every area.
   *
   * Keyed by the engineering title rather than by persona id because rounds
   * cast by title (`Stage.titles`), and the casting has to keep working
   * unchanged whatever name the person is introduced by.
   */
  titles: Partial<Record<string, string>>;
}

export const AREAS: Area[] = [
  { id: "engineering", label: "Engineering", titles: {} },
  {
    id: "product",
    label: "Product",
    titles: {
      "Engineering Manager": "Group Product Manager",
      "Director of Engineering": "Director of Product",
      "Principal Architect": "Principal Product Manager",
    },
  },
  {
    id: "design",
    label: "Design",
    titles: {
      "Engineering Manager": "Design Manager",
      "Director of Engineering": "Design Director",
      "Principal Architect": "Principal Designer",
    },
  },
  {
    id: "data",
    label: "Data",
    titles: {
      "Engineering Manager": "Analytics Manager",
      "Director of Engineering": "Director of Data",
      "Principal Architect": "Principal Data Scientist",
    },
  },
  {
    id: "growth",
    label: "Growth",
    titles: {
      "Engineering Manager": "Growth Lead",
      "Director of Engineering": "Director of Growth",
      "Principal Architect": "Principal Growth Analyst",
    },
  },
  {
    id: "marketing",
    label: "Marketing",
    titles: {
      "Engineering Manager": "Marketing Manager",
      "Director of Engineering": "Marketing Director",
      "Principal Architect": "Head of Brand",
      "Head of Product": "Head of Growth",
    },
  },
  {
    id: "finance",
    label: "Finance",
    titles: {
      "Engineering Manager": "Finance Manager",
      "Director of Engineering": "Finance Director",
      "Principal Architect": "Head of FP&A",
      "Head of Product": "Chief Financial Officer",
    },
  },
  {
    id: "legal",
    label: "Legal",
    titles: {
      "Engineering Manager": "Senior Legal Counsel",
      "Director of Engineering": "General Counsel",
      "Principal Architect": "Head of Compliance",
      "Head of Product": "Chief Operating Officer",
    },
  },
  {
    id: "people",
    label: "People",
    titles: {
      "Engineering Manager": "HR Manager",
      "Director of Engineering": "Director of People",
      "Principal Architect": "Head of Talent",
      "Head of Product": "Chief People Officer",
    },
  },
  {
    id: "sales",
    label: "Sales",
    titles: {
      "Engineering Manager": "Sales Manager",
      "Director of Engineering": "VP of Sales",
      "Principal Architect": "Head of Revenue Operations",
      "Head of Product": "Chief Revenue Officer",
    },
  },
  {
    id: "customer-success",
    label: "Customer success",
    titles: {
      "Engineering Manager": "Customer Success Lead",
      "Director of Engineering": "Director of Customer Success",
      "Principal Architect": "Head of Support",
      "Head of Product": "VP of Customer Experience",
    },
  },
  {
    id: "operations",
    label: "Operations",
    titles: {
      "Engineering Manager": "Operations Lead",
      "Director of Engineering": "Director of Operations",
      "Principal Architect": "Principal Program Manager",
      "Head of Product": "Chief Operating Officer",
    },
  },
];

export interface Role {
  id: string;
  label: string;
  /** What this role is asked about, for the picker's hint. */
  focus: string;
  area: AreaId;
}

/**
 * Ids are stored on contributed questions and labels on past sessions, so the
 * original six keep both exactly — "Senior Product Designer" included — and
 * everything else is added around them.
 */
export const ROLES: Role[] = [
  // Engineering
  {
    id: "backend-engineer",
    label: "Backend Engineer",
    focus: "systems, data modelling, failure, and what you would do at scale",
    area: "engineering",
  },
  {
    id: "frontend-engineer",
    label: "Frontend Engineer",
    focus: "interface performance, accessibility, and state that outgrew its shape",
    area: "engineering",
  },
  {
    id: "qa-engineer",
    label: "QA Engineer",
    focus: "test strategy, the bug nobody believed, and holding a release you cannot sign off",
    area: "engineering",
  },
  {
    id: "engineering-manager",
    label: "Engineering Manager",
    focus: "delivery under constraint, and the conversation you avoided too long",
    area: "engineering",
  },
  // Product
  {
    id: "product-manager",
    label: "Product Manager",
    focus: "discovery, prioritisation, and the tradeoff you would defend to engineering",
    area: "product",
  },
  {
    id: "product-owner",
    label: "Product Owner",
    focus: "the backlog, acceptance criteria, and saying no to a stakeholder",
    area: "product",
  },
  {
    id: "technical-product-manager",
    label: "Technical Product Manager",
    focus: "platforms and APIs, and translating between engineering and the business",
    area: "product",
  },
  // Design
  {
    id: "product-designer",
    label: "Senior Product Designer",
    focus: "craft, research, and defending a design decision with evidence",
    area: "design",
  },
  {
    id: "ux-designer",
    label: "UX Designer",
    focus: "flows, usability evidence, and the problem behind the request",
    area: "design",
  },
  {
    id: "ui-designer",
    label: "UI Designer",
    focus: "visual systems, hierarchy, and why this detail and not another",
    area: "design",
  },
  {
    id: "service-designer",
    label: "Service Designer",
    focus: "journeys across channels, the backstage, and who owns each step",
    area: "design",
  },
  {
    id: "content-designer",
    label: "Content Designer",
    focus: "words as interface, tone, and the sentence that confused people",
    area: "design",
  },
  {
    id: "design-researcher",
    label: "Design Researcher",
    focus: "study design, synthesis, and the finding that changed a decision",
    area: "design",
  },
  // Data
  {
    id: "data-analyst",
    label: "Data Analyst",
    focus: "what the data supports, what it does not, and how you knew",
    area: "data",
  },
  {
    id: "data-scientist",
    label: "Data Scientist",
    focus: "models, experiments, and explaining uncertainty to people who want a yes",
    area: "data",
  },
  {
    id: "data-engineer",
    label: "Data Engineer",
    focus: "pipelines, data quality, and what happens when a source changes shape",
    area: "data",
  },
  // Growth
  {
    id: "growth-pm",
    label: "Growth PM",
    focus: "funnels, experiments, and the number you moved",
    area: "growth",
  },
  {
    id: "growth-marketing-manager",
    label: "Growth Marketing Manager",
    focus: "acquisition channels, CAC and payback, and the test you would run first",
    area: "growth",
  },
  {
    id: "lifecycle-marketing-manager",
    label: "Lifecycle Marketing Manager",
    focus: "activation, retention, and the message that brought people back",
    area: "growth",
  },
  // Marketing
  {
    id: "product-marketing-manager",
    label: "Product Marketing Manager",
    focus: "positioning, launches, and what the customer actually heard",
    area: "marketing",
  },
  {
    id: "content-marketing-manager",
    label: "Content Marketing Manager",
    focus: "editorial strategy, distribution, and content that moved pipeline",
    area: "marketing",
  },
  {
    id: "brand-manager",
    label: "Brand Manager",
    focus: "brand strategy, consistency, and measuring what resists measurement",
    area: "marketing",
  },
  // Finance
  {
    id: "fpa-analyst",
    label: "FP&A Analyst",
    focus: "forecasts, variance, and the assumption that broke the model",
    area: "finance",
  },
  {
    id: "accountant",
    label: "Accountant",
    focus: "the close, reconciliations, and controls that catch mistakes early",
    area: "finance",
  },
  {
    id: "finance-manager",
    label: "Finance Manager",
    focus: "budgets, business partnering, and the cost you challenged",
    area: "finance",
  },
  // Legal
  {
    id: "legal-counsel",
    label: "Legal Counsel",
    focus: "contracts, risk, and explaining a legal position to non-lawyers",
    area: "legal",
  },
  {
    id: "compliance-analyst",
    label: "Compliance Analyst",
    focus: "regulation, monitoring, and the control you would add first",
    area: "legal",
  },
  {
    id: "paralegal",
    label: "Paralegal",
    focus: "contract review, deadlines, and keeping a matter organised",
    area: "legal",
  },
  // People
  {
    id: "recruiter",
    label: "Recruiter",
    focus: "sourcing, candidate experience, and closing a hard hire",
    area: "people",
  },
  {
    id: "hr-business-partner",
    label: "HR Business Partner",
    focus: "employee relations, org change, and advising a manager who disagrees",
    area: "people",
  },
  {
    id: "people-operations-specialist",
    label: "People Operations Specialist",
    focus: "onboarding, policy, and the process people actually follow",
    area: "people",
  },
  // Sales
  {
    id: "account-executive",
    label: "Account Executive",
    focus: "discovery, objections, and the deal you lost and why",
    area: "sales",
  },
  {
    id: "sales-development-representative",
    label: "Sales Development Representative",
    focus: "outreach, qualification, and handling a no in the first ten seconds",
    area: "sales",
  },
  {
    id: "account-manager",
    label: "Account Manager",
    focus: "renewals, expansion, and the client relationship you rescued",
    area: "sales",
  },
  // Customer success
  {
    id: "customer-success-manager",
    label: "Customer Success Manager",
    focus: "adoption, churn risk, and the conversation about value",
    area: "customer-success",
  },
  {
    id: "customer-support-specialist",
    label: "Customer Support Specialist",
    focus: "troubleshooting, tone under pressure, and the ticket you escalated",
    area: "customer-success",
  },
  {
    id: "implementation-consultant",
    label: "Implementation Consultant",
    focus: "onboarding a customer, scoping, and keeping a rollout on time",
    area: "customer-success",
  },
  // Operations
  {
    id: "operations-manager",
    label: "Operations Manager",
    focus: "processes, metrics, and the bottleneck you removed",
    area: "operations",
  },
  {
    id: "project-manager",
    label: "Project Manager",
    focus: "scope, timelines, and the risk you raised before it landed",
    area: "operations",
  },
  {
    id: "business-analyst",
    label: "Business Analyst",
    focus: "requirements, process maps, and the gap between what was asked and what was needed",
    area: "operations",
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

const AREA_BY_ID = new Map(AREAS.map((area) => [area.id, area]));

/**
 * The job title an interviewer carries for this role.
 *
 * `baseTitle` is the persona's own (engineering) title. An unknown role keeps
 * it, which is the behaviour every session had before areas existed.
 */
export function interviewerTitle(baseTitle: string, role: string | null | undefined): string {
  const area = AREA_BY_ID.get(findRole(role)?.area ?? "engineering");
  return area?.titles[baseTitle] ?? baseTitle;
}
