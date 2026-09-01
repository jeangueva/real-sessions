import { describe, expect, it } from "vitest";
import {
  capabilitiesFor,
  contributorHash,
  createEntitlementStore,
  earlyAccessUntil,
  EARLY_ACCESS_MONTHS,
  GENERIC_COMPANY,
  GENERIC_INDUSTRY,
} from "../src/entitlements.js";
import { COMPANIES, SECTORS } from "../src/sectors.js";
import { classifyLink, renderProfileBrief } from "../src/profile.js";
import { readQuestion, MAX_QUESTION_CHARS } from "../src/contributions.js";

describe("capabilities", () => {
  it("keeps the free tier a real product", () => {
    const free = capabilitiesFor("free");
    // A trial that shows nothing converts nobody: the score is honest and
    // there is enough history to see a second session beside the first.
    expect(free.historyLimit).toBeGreaterThan(0);
  });

  it("puts everything that needs to know you behind the wall", () => {
    const free = capabilitiesFor("free");
    expect(free.targetCompany).toBe(false);
    expect(free.candidateProfile).toBe(false);
    expect(free.liveCoaching).toBe(false);
    expect(free.advancedFeedback).toBe(false);
  });

  it("opens all of it on premium", () => {
    const premium = capabilitiesFor("premium");
    expect(premium.targetCompany).toBe(true);
    expect(premium.candidateProfile).toBe(true);
    expect(premium.liveCoaching).toBe(true);
    expect(premium.historyLimit).toBeGreaterThan(capabilitiesFor("free").historyLimit);
  });
});

describe("entitlement store", () => {
  it("starts everyone on free", async () => {
    const store = createEntitlementStore(null);
    expect(await store.planFor("nobody")).toBe("free");
  });

  it("honours an unexpired grant", async () => {
    const store = createEntitlementStore(null);
    await store.grant("owner", "premium", "manual", earlyAccessUntil());
    expect(await store.planFor("owner")).toBe("premium");
  });

  it("ignores a grant that has lapsed", async () => {
    const store = createEntitlementStore(null);
    await store.grant("owner", "premium", "early-access", new Date(Date.now() - 1000));
    expect(await store.planFor("owner")).toBe("free");
  });

  it("grants six months on redemption, once", async () => {
    const store = createEntitlementStore(null);
    await store.recordEarlyAccess("a@b.com", "PM", "Nubank", earlyAccessUntil());

    expect(await store.redeemEarlyAccess("a@b.com", "account-1")).toBe(true);
    expect(await store.planFor("account-1")).toBe("premium");
    // A shared address must not mint premium for a second account.
    expect(await store.redeemEarlyAccess("a@b.com", "account-2")).toBe(false);
    expect(await store.planFor("account-2")).toBe("free");
  });

  it("does not register the same address twice", async () => {
    const store = createEntitlementStore(null);
    const until = earlyAccessUntil();
    expect(await store.recordEarlyAccess("a@b.com", "PM", "X", until)).toBe(true);
    expect(await store.recordEarlyAccess("a@b.com", "PM", "X", until)).toBe(false);
  });

  it("carries a guest's grant onto their new account", async () => {
    const store = createEntitlementStore(null);
    await store.grant("guest", "premium", "manual", null);
    await store.transfer("guest", "account");
    expect(await store.planFor("account")).toBe("premium");
    expect(await store.planFor("guest")).toBe("free");
  });

  it("grants exactly the advertised window", () => {
    const from = new Date("2026-09-01T12:00:00.000Z");
    const until = earlyAccessUntil(from);
    // Compared as absolute months rather than `getMonth()`, which wraps at
    // December and would make this pass or fail depending on the month it runs.
    const months = (date: Date) => date.getFullYear() * 12 + date.getMonth();
    expect(months(until) - months(from)).toBe(EARLY_ACCESS_MONTHS);
  });
});

describe("contributorHash", () => {
  it("is stable for one identity and different across identities", () => {
    expect(contributorHash("a")).toBe(contributorHash("a"));
    expect(contributorHash("a")).not.toBe(contributorHash("b"));
  });

  it("does not contain the identity it came from", () => {
    // The button promises anonymity; the column has to be unable to answer
    // "who wrote this".
    expect(contributorHash("owner-12345")).not.toContain("owner-12345");
  });
});

describe("classifyLink", () => {
  it("recognises the platforms people actually link", () => {
    expect(classifyLink("github.com/mariana")?.kind).toBe("github");
    expect(classifyLink("https://www.linkedin.com/in/mariana")?.kind).toBe("linkedin");
    expect(classifyLink("https://figma.com/file/abc")?.kind).toBe("figma");
    expect(classifyLink("https://mariana.design")?.kind).toBe("portfolio");
  });

  it("adds a scheme to a bare host", () => {
    expect(classifyLink("mariana.design")?.url).toBe("https://mariana.design/");
  });

  it("refuses anything that is not http", () => {
    // These would otherwise be rendered as clickable links on a page.
    expect(classifyLink("javascript:alert(1)")).toBeNull();
    expect(classifyLink("file:///etc/passwd")).toBeNull();
    expect(classifyLink("data:text/html,<script>")).toBeNull();
  });

  it("refuses junk", () => {
    expect(classifyLink("")).toBeNull();
    expect(classifyLink("   ")).toBeNull();
    expect(classifyLink("not a url at all with spaces")).toBeNull();
  });
});

describe("renderProfileBrief", () => {
  it("is empty when there is nothing to say", () => {
    // The caller omits the whole prompt section rather than announcing an
    // absence, which a model reads as a fact worth mentioning.
    expect(renderProfileBrief({ brief: null, links: [], sourceName: null, updatedAt: null })).toBe("");
  });

  it("names the links by kind", () => {
    const rendered = renderProfileBrief({
      brief: "They led activation at a lending product.",
      links: [{ url: "https://github.com/m", kind: "github", label: "github.com" }],
      sourceName: "cv.pdf",
      updatedAt: null,
    });
    expect(rendered).toContain("activation");
    expect(rendered).toContain("github: https://github.com/m");
  });
});

describe("readQuestion", () => {
  it("accepts a real question and squashes its whitespace", () => {
    expect(readQuestion("  Tell me   about a\n hard tradeoff. ")).toBe(
      "Tell me about a hard tradeoff.",
    );
  });

  it("rejects a fragment and an essay", () => {
    expect(readQuestion("why?")).toBeNull();
    expect(readQuestion("x".repeat(MAX_QUESTION_CHARS + 1))).toBeNull();
    expect(readQuestion(42)).toBeNull();
  });
});

describe("the free plan's fixed context", () => {
  it("does not leave a sector reachable through another field", () => {
    // The company name was gated but `industry` was still read from the
    // request, so a free caller could send industry: "Fintech" and get the
    // sector-grounded interview the company picker is meant to sell.
    expect(GENERIC_INDUSTRY).toBe("Technology");
    expect(SECTORS.map((sector) => sector.label)).not.toContain(GENERIC_INDUSTRY);
  });

  it("names no real employer", () => {
    expect(COMPANIES.map((company) => company.name)).not.toContain(GENERIC_COMPANY);
  });
});
