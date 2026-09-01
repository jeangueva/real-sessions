/**
 * The sector catalogue.
 *
 * A sector is not a filter on a company list. It is the vocabulary the
 * interview runs in: a fintech hiring manager asks you to defend a take rate,
 * an ecommerce one asks about contribution margin, and a candidate who cannot
 * reach for the right number sounds junior regardless of their English. So
 * `focus` and `metrics` are injected into the Phase 1 prompt, and the picker
 * showing them is a side effect of that, not the point of it.
 *
 * Seeded into Postgres at boot. This file stays the source of truth — the
 * table exists so `sessions.sector_id` has something to reference and so
 * progress can be sliced by sector, not so the catalogue can drift from code.
 */

export interface Sector {
  id: string;
  label: string;
  /** What the conversation is about, in the interviewer's own terms. */
  focus: string;
  /** The numbers a candidate is expected to reach for unprompted. */
  metrics: string;
}

export interface Company {
  id: string;
  name: string;
  sectorId: string;
  culture: string;
  description: string;
  /** Brand-adjacent accent for the picker. Rendered from tokens, never a logo. */
  tint: string;
}

export const SECTORS: Sector[] = [
  {
    id: "fintech",
    label: "Fintech",
    focus:
      "payments, risk and fraud, regulatory constraint, and the unit economics of moving money",
    metrics:
      "take rate, authorization rate, chargeback rate, fraud loss in basis points, CAC payback",
  },
  {
    id: "ecommerce",
    label: "E-commerce",
    focus:
      "marketplace supply and demand, the conversion funnel, logistics cost, and catalogue quality",
    metrics:
      "GMV, conversion rate, average order value, contribution margin, repeat purchase rate",
  },
  {
    id: "travel",
    label: "Travel",
    focus:
      "two-sided supply, seasonality, trust and safety, and cancellation risk",
    metrics:
      "nights booked, take rate, search-to-book conversion, cancellation rate, NPS",
  },
  {
    id: "social",
    label: "Social media",
    focus:
      "engagement loops, ranking and recommendation, creator supply, and content moderation",
    metrics:
      "DAU over MAU, session depth, D1/D7/D30 retention, ARPU, time spent per session",
  },
  {
    id: "devtools",
    label: "Developer tools",
    focus:
      "developer adoption, time to first value, the self-serve to enterprise motion, and reliability",
    metrics:
      "activation rate, time to first deploy, weekly active developers, net revenue retention, p99 latency",
  },
  {
    id: "delivery",
    label: "Delivery and mobility",
    focus:
      "a three-sided marketplace, courier supply, geographic density, and per-order economics",
    metrics:
      "orders per courier hour, contribution margin per order, p90 delivery time, batch rate, rider retention",
  },
];

export const COMPANIES: Company[] = [
  // The first four keep the copy the landing picker already shipped with —
  // changing a company's voice would change what the interview feels like.
  {
    id: "stripe",
    name: "Stripe",
    sectorId: "fintech",
    culture: "Craft · user obsession · written communication",
    description:
      "Expect a hiring manager who pushes on written clarity and asks you to justify every tradeoff with a number. Vague answers get challenged, politely and immediately.",
    tint: "rgba(99,91,255,0.35)",
  },
  {
    id: "amazon",
    name: "Amazon",
    sectorId: "ecommerce",
    culture: "Customer obsession · data-driven · ownership",
    description:
      "Leadership principles run the conversation. Every story needs a situation, your specific action, and a measured result — the STAR structure is not optional here.",
    tint: "rgba(255,153,0,0.32)",
  },
  {
    id: "airbnb",
    name: "Airbnb",
    sectorId: "travel",
    culture: "Belonging · design-led · craft",
    description:
      "Warmer in tone, harder on taste. You will be asked why a decision felt right, not only whether the metric moved, and hand-waving on craft gets noticed.",
    tint: "rgba(255,90,95,0.32)",
  },
  {
    id: "mercado-libre",
    name: "Mercado Libre",
    sectorId: "ecommerce",
    culture: "Scale · pragmatism · regional depth",
    description:
      "The interview assumes Latin American market context and tests whether you can defend decisions made under real constraints rather than ideal ones.",
    tint: "rgba(255,225,0,0.28)",
  },
  {
    id: "nubank",
    name: "Nubank",
    sectorId: "fintech",
    culture: "Customer love · simplicity · challenger mindset",
    description:
      "Built on hating what banks were like, so the interviewer keeps asking who the change is actually for. Jargon that hides the customer gets pulled apart.",
    tint: "rgba(130,10,209,0.32)",
  },
  {
    id: "mercado-pago",
    name: "Mercado Pago",
    sectorId: "fintech",
    culture: "Financial inclusion · scale · regional constraint",
    description:
      "Expect questions grounded in cash-heavy markets and unbanked users. A clean solution that assumes a credit card gets sent back for a second answer.",
    tint: "rgba(0,158,227,0.30)",
  },
  {
    id: "shopify",
    name: "Shopify",
    sectorId: "ecommerce",
    culture: "Merchant obsession · high agency · written first",
    description:
      "The bar is what you shipped without being asked. Expect to defend where you drew the line between the merchant's problem and your team's scope.",
    tint: "rgba(122,192,67,0.30)",
  },
  {
    id: "booking",
    name: "Booking.com",
    sectorId: "travel",
    culture: "Experimentation · data over opinion · scale",
    description:
      "Everything is an A/B test here, so the interviewer will ask how you knew it worked. An answer without a measurement gets treated as an intuition.",
    tint: "rgba(0,53,128,0.38)",
  },
  {
    id: "despegar",
    name: "Despegar",
    sectorId: "travel",
    culture: "Regional depth · margin discipline · resilience",
    description:
      "Latin American travel with thin margins and volatile currency. Expect pressure on how a decision survives a market that moves under it.",
    tint: "rgba(255,102,0,0.30)",
  },
  {
    id: "meta",
    name: "Meta",
    sectorId: "social",
    culture: "Move fast · impact · direct feedback",
    description:
      "The question behind every question is what changed because of you. Expect to be asked for the size of the impact before the story is finished.",
    tint: "rgba(24,119,242,0.32)",
  },
  {
    id: "tiktok",
    name: "TikTok",
    sectorId: "social",
    culture: "Speed · creator obsession · ruthless iteration",
    description:
      "Fast, dense, and impatient with preamble. You get less time per answer here than anywhere else on the list, so the first sentence has to carry the point.",
    tint: "rgba(254,44,85,0.30)",
  },
  {
    id: "discord",
    name: "Discord",
    sectorId: "social",
    culture: "Community first · playfulness · safety by design",
    description:
      "Casual on the surface, exacting about moderation and trust. Expect to be asked who your design hurts, not only who it helps.",
    tint: "rgba(88,101,242,0.32)",
  },
  {
    id: "github",
    name: "GitHub",
    sectorId: "devtools",
    culture: "Developer empathy · asynchronous · open by default",
    description:
      "Written communication is the job, so the interviewer probes how you would have explained this in an issue. Long verbal answers get asked to compress.",
    tint: "rgba(139,148,158,0.30)",
  },
  {
    id: "vercel",
    name: "Vercel",
    sectorId: "devtools",
    culture: "Speed · DX obsession · ship to learn",
    description:
      "Expect an interviewer who cares about the first sixty seconds of a developer's experience and asks what you removed, not what you added.",
    tint: "rgba(255,255,255,0.22)",
  },
  {
    id: "datadog",
    name: "Datadog",
    sectorId: "devtools",
    culture: "Reliability · depth · customer-driven roadmap",
    description:
      "Systems thinking under pressure. You will be asked what you would have seen on a dashboard at the moment things went wrong.",
    tint: "rgba(99,45,166,0.32)",
  },
  {
    id: "uber",
    name: "Uber",
    sectorId: "delivery",
    culture: "Operational rigour · marketplace balance · urgency",
    description:
      "Every answer gets tested against supply and demand at once. Fixing one side while breaking the other is the trap this interview is built around.",
    tint: "rgba(255,255,255,0.20)",
  },
  {
    id: "rappi",
    name: "Rappi",
    sectorId: "delivery",
    culture: "Speed · improvisation · regional density",
    description:
      "Latin American operations at pace. Expect questions about what you did when the ideal answer was not available and the decision could not wait.",
    tint: "rgba(255,68,26,0.30)",
  },
  {
    id: "doordash",
    name: "DoorDash",
    sectorId: "delivery",
    culture: "Analytical · ownership · relentless efficiency",
    description:
      "Unit economics run the conversation. Be ready to explain how your work changed cost per order, not only how it felt to users.",
    tint: "rgba(255,48,8,0.28)",
  },
];

const BY_NAME = new Map(COMPANIES.map((company) => [company.name, company]));
const SECTOR_BY_ID = new Map(SECTORS.map((sector) => [sector.id, sector]));

export function findCompany(name: string): Company | null {
  return BY_NAME.get(name) ?? null;
}

export function findSector(id: string | null | undefined): Sector | null {
  return id ? (SECTOR_BY_ID.get(id) ?? null) : null;
}

/** The sector a company belongs to, or null for a company we do not know. */
export function sectorForCompany(name: string): Sector | null {
  return findSector(findCompany(name)?.sectorId);
}

export function companiesInSector(sectorId: string): Company[] {
  return COMPANIES.filter((company) => company.sectorId === sectorId);
}
