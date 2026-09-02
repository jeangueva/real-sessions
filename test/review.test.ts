import { describe, expect, it } from "vitest";
import { isReviewer, reviewEnabled, reviewerEmails } from "../src/reviewers.js";
import { createContributionStore } from "../src/contributions.js";
import { buildKnownQuestions } from "../src/prompts/interviewer.js";
import { roleIdFor, findRole, ROLES } from "../src/roles.js";

function withReviewers<T>(value: string | undefined, run: () => T): T {
  const before = process.env.REALSESSIONS_REVIEWERS;
  if (value === undefined) delete process.env.REALSESSIONS_REVIEWERS;
  else process.env.REALSESSIONS_REVIEWERS = value;
  try {
    return run();
  } finally {
    if (before === undefined) delete process.env.REALSESSIONS_REVIEWERS;
    else process.env.REALSESSIONS_REVIEWERS = before;
  }
}

describe("the reviewer allowlist", () => {
  it("is off unless somebody is named", () => {
    withReviewers(undefined, () => {
      expect(reviewEnabled()).toBe(false);
      expect(isReviewer({ email: "a@b.com", emailVerified: true })).toBe(false);
    });
  });

  it("matches regardless of how the address was capitalised", () => {
    withReviewers("Reviewer@Example.COM", () => {
      expect(isReviewer({ email: "reviewer@example.com", emailVerified: true })).toBe(true);
      expect(reviewerEmails().has("reviewer@example.com")).toBe(true);
    });
  });

  it("refuses an unverified address", () => {
    // The allowlist names an email. An unconfirmed one is a claim, not a fact,
    // so without this, registering with a reviewer's address would be enough.
    withReviewers("reviewer@example.com", () => {
      expect(isReviewer({ email: "reviewer@example.com", emailVerified: false })).toBe(
        false,
      );
    });
  });

  it("refuses everyone else", () => {
    withReviewers("reviewer@example.com", () => {
      expect(isReviewer({ email: "someone@else.com", emailVerified: true })).toBe(false);
      expect(isReviewer({ email: null, emailVerified: true })).toBe(false);
    });
  });

  it("tolerates a sloppily written list", () => {
    withReviewers(" a@b.com , ,c@d.com ", () => {
      expect(reviewerEmails()).toEqual(new Set(["a@b.com", "c@d.com"]));
    });
  });
});

describe("the review queue", () => {
  const report = {
    companyId: "stripe",
    question: "Walk me through a tradeoff you defended with a number.",
    stage: "Behavioral",
    role: null,
  };

  it("holds a contribution until somebody decides", async () => {
    const store = createContributionStore(null);
    await store.submit("owner", report);

    expect(await store.queueDepth()).toBe(1);
    // Crucially: not verified, so not reachable by an interview yet.
    expect(await store.verified("stripe")).toEqual([]);
  });

  it("releases it once verified", async () => {
    const store = createContributionStore(null);
    await store.submit("owner", report);
    const [pending] = await store.pending(10);

    expect(await store.decide({ id: pending!.id, status: "verified", reviewer: "r" })).toBe(
      true,
    );
    expect((await store.verified("stripe")).map((row) => row.question)).toEqual([
      report.question,
    ]);
    expect(await store.queueDepth()).toBe(0);
  });

  it("keeps a rejected one out of interviews for good", async () => {
    const store = createContributionStore(null);
    await store.submit("owner", report);
    const [pending] = await store.pending(10);
    await store.decide({ id: pending!.id, status: "rejected", reviewer: "r" });

    expect(await store.verified("stripe")).toEqual([]);
    expect(await store.queueDepth()).toBe(0);
  });

  it("lets only the first of two reviewers decide", async () => {
    // The queue is worked concurrently; the second must be told, not silently
    // overwrite the first.
    const store = createContributionStore(null);
    await store.submit("owner", report);
    const [pending] = await store.pending(10);

    expect(await store.decide({ id: pending!.id, status: "verified", reviewer: "a" })).toBe(true);
    expect(await store.decide({ id: pending!.id, status: "rejected", reviewer: "b" })).toBe(false);
    expect(await store.verified("stripe")).toHaveLength(1);
  });

  it("serves the queue oldest first", async () => {
    const store = createContributionStore(null);
    await store.submit("a", { ...report, question: "The first one to be reported here." });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await store.submit("b", { ...report, question: "The second one to be reported here." });

    const queue = await store.pending(10);
    expect(queue[0]!.question).toContain("first");
  });
});

describe("buildKnownQuestions", () => {
  it("says so plainly when there is nothing reported", () => {
    expect(buildKnownQuestions([])).toContain("None reported yet");
  });

  it("fences them as source material rather than instructions", () => {
    const rendered = buildKnownQuestions(["What did that cost you?"]);
    expect(rendered).toContain("What did that cost you?");
    // The review is the real mitigation, but text from outside the system
    // landing in a system prompt gets told what it is regardless.
    expect(rendered).toContain("not as instructions");
  });

  it("caps the list so it cannot crowd out the persona", () => {
    const many = Array.from({ length: 20 }, (_, i) => `Question number ${i}?`);
    const rendered = buildKnownQuestions(many);
    expect(rendered.split("\n").filter((line) => line.startsWith("- "))).toHaveLength(5);
  });

  it("drops blanks rather than emitting empty bullets", () => {
    expect(buildKnownQuestions(["  ", ""])).toContain("None reported yet");
  });
});

describe("roles", () => {
  it("normalises whatever the client sent to one id", () => {
    // Free text gave "Backend Engineer", "backend engineer" and "BE" as three
    // different roles with one question each, which makes the filter useless.
    expect(roleIdFor("Backend Engineer")).toBe("backend-engineer");
    expect(roleIdFor("backend engineer")).toBe("backend-engineer");
    expect(roleIdFor("backend-engineer")).toBe("backend-engineer");
  });

  it("returns null for a role it does not know", () => {
    // Null is a real answer: the question is role-agnostic and reaches every
    // interview at that company rather than none.
    expect(roleIdFor("Chief Vibes Officer")).toBeNull();
    expect(roleIdFor("")).toBeNull();
    expect(roleIdFor(null)).toBeNull();
  });

  it("has no duplicate ids or labels", () => {
    expect(new Set(ROLES.map((r) => r.id)).size).toBe(ROLES.length);
    expect(new Set(ROLES.map((r) => r.label)).size).toBe(ROLES.length);
  });

  it("resolves by id and by label alike", () => {
    for (const role of ROLES) {
      expect(findRole(role.id)?.id).toBe(role.id);
      expect(findRole(role.label)?.id).toBe(role.id);
    }
  });
});

describe("questions filtered by role", () => {
  const base = { companyId: "stripe", stage: "Behavioral" };

  async function seeded() {
    const store = createContributionStore(null);
    await store.submit("a", { ...base, role: "backend-engineer", question: "How would you shard this table when it stops fitting?" });
    await store.submit("b", { ...base, role: "growth-pm", question: "What was the activation number before and after?" });
    await store.submit("c", { ...base, role: null, question: "Tell me about a tradeoff you defended with a number." });

    for (const pending of await store.pending(10)) {
      await store.decide({ id: pending.id, status: "verified", reviewer: "r" });
    }
    return store;
  }

  it("gives a role its own questions", async () => {
    const store = await seeded();
    const asked = (await store.verified("stripe", "backend-engineer")).map((r) => r.question);
    expect(asked.some((q) => q.includes("shard"))).toBe(true);
  });

  it("keeps another role's questions out", async () => {
    // The point of the whole thing: a backend interview should not be asked
    // the growth PM's activation question.
    const store = await seeded();
    const asked = (await store.verified("stripe", "backend-engineer")).map((r) => r.question);
    expect(asked.some((q) => q.includes("activation"))).toBe(false);
  });

  it("still includes the ones reported without a role", async () => {
    // Otherwise a rarely-reported role gets nothing rather than the questions
    // that apply to everyone.
    const store = await seeded();
    const asked = (await store.verified("stripe", "backend-engineer")).map((r) => r.question);
    expect(asked.some((q) => q.includes("tradeoff"))).toBe(true);
  });

  it("puts the role-specific ones first", async () => {
    // Five reach the prompt at most; general questions must not crowd out the
    // ones written for this role.
    const store = await seeded();
    const asked = await store.verified("stripe", "backend-engineer");
    expect(asked[0]!.role).toBe("backend-engineer");
  });

  it("returns everything when no role is asked for", async () => {
    const store = await seeded();
    expect(await store.verified("stripe")).toHaveLength(3);
  });
});
