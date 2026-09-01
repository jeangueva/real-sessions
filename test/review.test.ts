import { describe, expect, it } from "vitest";
import { isReviewer, reviewEnabled, reviewerEmails } from "../src/reviewers.js";
import { createContributionStore } from "../src/contributions.js";
import { buildKnownQuestions } from "../src/prompts/interviewer.js";

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
