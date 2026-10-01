import { describe, expect, it } from "vitest";
import { shellHtml, shellText } from "../src/email-shell.js";
import { verifyEmail, weeklyDigestEmail, accountDeletedEmail } from "../src/email.js";

/**
 * What a broken email does not tell you.
 *
 * Nothing here fails loudly: a stripped tag, an unescaped address or a text
 * body that drifted from the HTML all send successfully and look wrong in
 * somebody's inbox, days later, with no error anywhere.
 */
describe("the email shell", () => {
  it("escapes everything that reaches the markup", () => {
    const html = shellHtml({
      heading: `Bad <script>alert(1)</script>`,
      body: [`An address like a"b<c@d.com`],
      action: { label: "Go", url: "https://x.test/?a=1&b=2" },
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("a&quot;b&lt;c@d.com");
    // Ampersands in a link are escaped too, or the href truncates at the first.
    expect(html).toContain("a=1&amp;b=2");
  });

  it("puts the action's URL in the text as well as behind the button", () => {
    // A button is unclickable in a client that strips markup, so the address
    // has to survive on its own.
    const shell = {
      heading: "Confirm",
      body: ["Please confirm."],
      action: { label: "Confirm", url: "https://mockio.test/verify?token=abc" },
    };
    expect(shellText(shell)).toContain("https://mockio.test/verify?token=abc");
    expect(shellHtml(shell)).toContain("https://mockio.test/verify?token=abc");
  });

  it("states its colours rather than inheriting them", () => {
    // A client that paints its own background behind a transparent message
    // would otherwise put cream text on white.
    const html = shellHtml({ heading: "x", body: ["y"] });
    expect(html).toContain("background:#17181c");
    expect(html).toContain('name="color-scheme"');
  });

  it("uses tables, because Outlook renders through Word", () => {
    const html = shellHtml({ heading: "x", body: ["y"] });
    expect(html).toContain("<table");
    expect(html).not.toMatch(/display:\s*(flex|grid)/);
  });
});

describe("every message carries both halves", () => {
  const samples = [
    verifyEmail("someone@example.com", "https://mockio.test/verify?token=t"),
    accountDeletedEmail("someone@example.com"),
    weeklyDigestEmail("someone@example.com", {
      sessions: 2,
      bestScore: 78,
      xp: 140,
      unsubscribeUrl: "https://mockio.test/unsubscribe?t=t",
    }),
  ];

  it("sends text alongside the HTML", () => {
    for (const message of samples) {
      // The plain body is not a fallback nobody reads: it is what a screen
      // reader reads and what survives a filter that strips markup.
      expect(message.text.length, message.subject).toBeGreaterThan(0);
      expect(message.html, message.subject).toBeTruthy();
    }
  });

  it("keeps the unsubscribe link in both halves of a lifecycle mail", () => {
    const digest = samples[2]!;
    expect(digest.text).toContain("unsubscribe");
    expect(digest.html).toContain("unsubscribe");
  });
});
