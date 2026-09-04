import { describe, expect, it } from "vitest";
import { applyTheme, resolveTheme, storedChoice } from "../src/lib/theme";

/**
 * Which theme actually renders.
 *
 * Named `.tsx` so it runs under happy-dom: `applyTheme` writes to a real
 * element, and the root suite runs `web/test/*.test.ts` in node. That naming
 * split is the repo's convention for "this one needs a DOM".
 *
 * The three-state choice is the part worth pinning: "follow the system" is a
 * real answer, and collapsing it into a boolean means someone whose laptop
 * switches at dusk has to come back and switch this too.
 */

describe("storedChoice", () => {
  it("reads a stored side", () => {
    expect(storedChoice("dark")).toBe("dark");
    expect(storedChoice("light")).toBe("light");
  });

  it("treats nothing, and anything unrecognised, as following the system", () => {
    // A stale value from an older build must not leave someone stuck in a
    // theme with no way to name what they are in.
    expect(storedChoice(null)).toBe("system");
    expect(storedChoice("")).toBe("system");
    expect(storedChoice("solarized")).toBe("system");
  });
});

describe("resolveTheme", () => {
  it("follows the machine when asked to", () => {
    expect(resolveTheme("system", true)).toBe("light");
    expect(resolveTheme("system", false)).toBe("dark");
  });

  it("ignores the machine once someone has picked a side", () => {
    // That is what picking a side means.
    expect(resolveTheme("dark", true)).toBe("dark");
    expect(resolveTheme("light", false)).toBe("light");
  });
});

describe("applyTheme", () => {
  const root = () => document.createElement("html");

  it("marks light and leaves dark unmarked", () => {
    // Dark is what `:root` declares, so the attribute is an override rather
    // than a switch — a page whose JavaScript never runs still renders the
    // theme the product was designed in.
    const light = root();
    applyTheme("light", light);
    expect(light.getAttribute("data-theme")).toBe("light");

    const dark = root();
    applyTheme("dark", dark);
    expect(dark.hasAttribute("data-theme")).toBe(false);
  });

  it("clears the attribute when switching back", () => {
    const el = root();
    applyTheme("light", el);
    applyTheme("dark", el);
    expect(el.hasAttribute("data-theme")).toBe(false);
  });

  it("tells native controls which way round they are", () => {
    // Scrollbars, form widgets and the caret read `color-scheme`, not our
    // variables, and a dark scrollbar on a white page is a giveaway.
    const el = root();
    applyTheme("light", el);
    expect(el.style.colorScheme).toBe("light");
    applyTheme("dark", el);
    expect(el.style.colorScheme).toBe("dark");
  });
});
