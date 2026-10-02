import { describe, expect, it } from "vitest";
import {
  availableTemplates,
  fittingScale,
  TEMPLATES,
  templateById,
} from "../src/lib/share-templates";
import { frameFor } from "../src/lib/share-frame";
import type { ShareStat } from "../src/lib/share-stats";

/**
 * The gallery of finished designs.
 *
 * What is worth pinning here is which stats each design asks for and that a
 * design nobody can fill is never offered — the drawing itself is held by
 * having rendered all four across four crops and looked, which is how the
 * receipt's overlapping labels and the ring's spilling caption were found.
 */
const EFFORT: ShareStat[] = [
  { id: "streak", value: "6", labelKey: "share.statStreak", sensitive: false },
  { id: "thisWeek", value: "3", labelKey: "share.statThisWeek", sensitive: false },
  { id: "total", value: "12", labelKey: "share.statTotal", sensitive: false },
  { id: "spoken", value: "124", labelKey: "share.statSpoken", sensitive: false },
];
const SCORE: ShareStat = {
  id: "best",
  value: "78%",
  labelKey: "share.statBest",
  sensitive: true,
};

const drawable = (stats: ShareStat[]) =>
  stats.map((stat) => ({ value: stat.value, label: "a label of some length" }));

describe("what each design asks for", () => {
  it("gives the streak design exactly one number", () => {
    // The whole design is that the number is enormous. Two enormous numbers
    // is a stack in a larger font.
    expect(templateById("streak").pick(EFFORT)).toHaveLength(1);
    expect(templateById("streak").pick(EFFORT)[0]?.id).toBe("streak");
  });

  it("keeps the score out of the stacked design", () => {
    const picked = templateById("stack").pick([...EFFORT, SCORE]);
    expect(picked.some((stat) => stat.sensitive)).toBe(false);
  });

  it("lets the receipt carry the score", () => {
    // A receipt is a record rather than a boast, which is the one context
    // where a percentage about your own English reads as honest.
    const picked = templateById("receipt").pick([EFFORT[0]!, SCORE]);
    expect(picked.some((stat) => stat.id === "best")).toBe(true);
  });

  it("offers the score design only to somebody who has a score", () => {
    expect(templateById("best").pick(EFFORT)).toEqual([]);
    expect(templateById("best").pick([...EFFORT, SCORE])).toHaveLength(1);
  });
});

describe("the gallery", () => {
  it("leaves out a design that cannot be filled", () => {
    // A card rendering "—" is worse than one that was never on the menu.
    const ids = availableTemplates(EFFORT).map((template) => template.id);
    expect(ids).not.toContain("best");
    expect(ids).toContain("stack");
  });

  it("offers nothing at all when there are no stats", () => {
    expect(availableTemplates([])).toEqual([]);
  });

  it("puts the score last, so it is never the one picked by default", () => {
    const ids = availableTemplates([...EFFORT, SCORE]).map((template) => template.id);
    expect(ids[ids.length - 1]).toBe("best");
  });
});

describe("every design, at every crop", () => {
  it("fits inside the frame, even at the top of the size slider", () => {
    /**
     * Width was the obvious one — a fixed width overlaps its own content on a
     * narrow crop, which is what the receipt did. Height is the one no
     * template controls: four stacked rows at 1.4x is taller than a 16:9
     * crop, and the overflow falls off the bottom edge, where the preview
     * cannot show it to the person making the card.
     */
    for (const crop of [9 / 16, 1, 4 / 5, 16 / 9]) {
      const frame = frameFor(crop);
      for (const template of TEMPLATES) {
        const stats = drawable(template.pick([...EFFORT, SCORE]));
        if (stats.length === 0) continue;
        const asked = { origin: { x: 0, y: 0 }, tone: "cream" as const, backdrop: false, scale: 1.4 };
        const scale = fittingScale(template, frame, stats, asked);
        const size = template.measure(frame, stats, { ...asked, scale });
        expect(size.width).toBeLessThanOrEqual(frame.width);
        expect(size.height).toBeLessThanOrEqual(frame.height);
      }
    }
  });
});
