/**
 * Worst-case data, for looking at the product the way real accounts will.
 *
 * Dev-only. The demo data the screens were built against — "Stripe", "Senior
 * Product Designer", a score of 62 — happens to fit every box. These are the
 * values real candidates produce: a German law firm's full legal name, a role
 * typed in Arabic, a session abandoned before scoring, a hundred-and-something
 * interviews, a score of exactly 0 and of exactly 100.
 *
 * They enter at the API boundary (see `api.ts`), the same door the real data
 * uses, so what breaks here is the screen and not a hand-edited copy of it.
 * Switch with `?data=worst | empty | one | many`, or the toggle in the corner;
 * `?data=demo` goes back to the real API. Never active in a production build.
 */
import type { Evaluation } from "./evaluation";
import type { SessionMetrics, SessionSummary } from "./api";

export type DataMode = "demo" | "worst" | "empty" | "one" | "many";

const MODES: readonly DataMode[] = ["demo", "worst", "empty", "one", "many"];
const KEY = "mockio.dev.data";

/** The mode in force, read from the URL first and remembered for the tab. */
export function dataMode(): DataMode {
  if (!import.meta.env.DEV || typeof window === "undefined") return "demo";
  try {
    const asked = new URLSearchParams(window.location.search).get("data");
    if (asked && (MODES as readonly string[]).includes(asked)) {
      window.sessionStorage.setItem(KEY, asked);
      return asked as DataMode;
    }
    const kept = window.sessionStorage.getItem(KEY);
    return kept && (MODES as readonly string[]).includes(kept) ? (kept as DataMode) : "demo";
  } catch {
    return "demo";
  }
}

export function setDataMode(mode: DataMode): void {
  try {
    window.sessionStorage.setItem(KEY, mode);
  } catch {
    /* private mode: the URL still carries it */
  }
  const url = new URL(window.location.href);
  url.searchParams.set("data", mode);
  // A reload rather than a re-render: every screen fetches on mount, and the
  // point is to watch the real loading path take the fixture.
  window.location.assign(url.toString());
}

const DAY = 86_400_000;
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString();

const METRICS_EXTREME: SessionMetrics = {
  words: 12_840,
  fillerPer100: 0.1 + 0.2,
  vocabularyRange: 0.987654321,
  wordShare: 1,
  speakingMs: 1_284 * 60 * 60 * 1000,
  wpm: 0,
  avgResponseMs: 98_765,
  longPauses: 1_284,
  timeToFirstMs: 0,
  fromSpeech: true,
};

function session(overrides: Partial<SessionSummary> & { id: string }): SessionSummary {
  return {
    company: "Stripe",
    sectorId: null,
    role: "Senior Product Designer",
    stage: "Recruiter screen",
    mode: "practice",
    personaId: null,
    level: "B2",
    startedAt: ago(1),
    completedAt: ago(1),
    score: 62,
    vocabularyScore: 7,
    structureScore: 8,
    metrics: null,
    shareToken: null,
    ...overrides,
  };
}

/** Spread across the first rows on purpose: the first few are what is on screen. */
const WORST_SESSIONS: SessionSummary[] = [
  session({
    id: "worst-1",
    company: "Oberhauser-Wettstein Rechtsanwaltsgesellschaft mbH & Co. KG",
    role: "Senior Product Design Engineer, Platform Infrastructure",
    stage: "Behavioral + Technical deep dive + Recruiter screen",
    level: "C2",
    score: 100,
    vocabularyScore: 10,
    structureScore: 10,
    metrics: METRICS_EXTREME,
    startedAt: ago(0),
    completedAt: ago(0),
    shareToken: "9f8e7d6c-5b4a-4c3d-8e2f-1a0b9c8d7e6f",
  }),
  session({ id: "worst-2", company: "王秀英科技有限公司", role: "PM", score: 0, vocabularyScore: 0, structureScore: 0, startedAt: ago(3), completedAt: ago(3) }),
  session({ id: "worst-3", company: "Mercado Libre", role: "Benachrichtigungseinstellungen-Spezialistin", score: null, vocabularyScore: null, structureScore: null, completedAt: null, startedAt: ago(12) }),
  session({ id: "worst-4", company: "نور الهدى للتقنية", role: "مهندس برمجيات أول", score: 55, level: null, startedAt: ago(400), completedAt: ago(400) }),
  session({ id: "worst-5", company: "<script>alert(1)</script> & Co.", role: "**Bold** Engineer", score: 1, startedAt: ago(1100), completedAt: ago(1100) }),
  session({ id: "worst-6", company: "a well-regarded technology company", role: "Backend Engineer", score: 99 }),
  session({ id: "worst-7", company: "a well-regarded technology company", role: "Backend Engineer", score: 99 }),
  session({ id: "worst-8", company: "Đặng Thị Ngọc Hân Consulting", role: "Ólafur's 👩🏽‍💻 Team Lead", score: 38, startedAt: ago(30), completedAt: ago(30) }),
];

function many(): SessionSummary[] {
  return Array.from({ length: 1_000 }, (_, index) =>
    session({
      id: `many-${index}`,
      company: ["Stripe", "Amazon", "Airbnb", "Mercado Libre"][index % 4]!,
      score: (index * 37) % 101,
      startedAt: ago(index),
      completedAt: ago(index),
    }),
  );
}

export function devHistory():
  | { sessions: SessionSummary[]; withheld: number; levelUp: null }
  | null {
  switch (dataMode()) {
    case "worst":
      return { sessions: WORST_SESSIONS, withheld: 1_284, levelUp: null };
    case "empty":
      return { sessions: [], withheld: 0, levelUp: null };
    case "one":
      return {
        sessions: [session({ id: "one-1", score: 1, vocabularyScore: 1, structureScore: 1 })],
        withheld: 1,
        levelUp: null,
      };
    case "many":
      return { sessions: many(), withheld: 0, levelUp: null };
    default:
      return null;
  }
}

const WORST_EVALUATION: Evaluation = {
  overall_score_percentage: 100,
  strengths: [
    "You opened every answer with the result first — the 40% drop in onboarding abandonment, the €12,345,678.90 recovered in failed payments, the 1,284 enterprise seats — and only then explained how you got there, which is exactly the order a hiring manager who is skimming listens in. When pressed on the failover incident you named the specific decision you made under time pressure, who disagreed with it and why, and what you would change now; that is the kind of self-aware specificity that separates a senior answer from a rehearsed one, and you sustained it for the whole round rather than for one question.",
    "Clear.",
  ],
  areas_for_improvement: [
    "Preposition errors recur under pressure: “depends of”, “assisted to the meeting”, “explain me the process”, “discuss about”, “married with”, “arrive to”.",
  ],
  vocabulary_feedback: {
    score_out_of_10: 10,
    good_usage: [
      "drop-off",
      "funnel analysis",
      "customer-feedback-from-enterprise-onboarding",
      "cohort",
      "design system",
      "Benachrichtigungseinstellungen",
      "trade-off",
      "north-star metric",
      "p95 latency",
      "SLO",
      "idempotency",
      "back-pressure",
    ],
    missed_opportunities_or_errors: [],
  },
  structure_feedback: {
    score_out_of_10: 0,
    feedback_text: "",
  },
  actionable_next_steps: Array.from(
    { length: 8 },
    (_, index) =>
      [
        "Rehearse two STAR stories out loud until the result sentence comes first.",
        "Drill “depends on” and “attend a meeting” — both appeared more than once.",
        "Practise a 15-second answer to “how did you measure that?” with no preamble.",
        "Read https://example.com/workspaces/acme/projects/q3-launch/docs/9f8e7d6c5b4a?tab=comments&filter=unresolved before Thursday.",
      ][index % 4]!,
  ),
};

export function devHistoryEntry(id: string) {
  const mode = dataMode();
  if (mode === "demo") return null;
  const base = devHistory()?.sessions.find((entry) => entry.id === id) ?? WORST_SESSIONS[0]!;
  return {
    session: {
      ...base,
      evaluation: mode === "worst" ? WORST_EVALUATION : null,
      withheld: { metrics: false, nextSteps: false },
      turns: [],
    },
  };
}

/** The signed-in address the shell shows — the long one, in the worst case. */
export function devEmail(): string | null {
  return dataMode() === "worst"
    ? "bartholomew.fitzgerald@northwind-industries-holdings.example.com"
    : null;
}
