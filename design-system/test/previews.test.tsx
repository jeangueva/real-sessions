import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import axe from "axe-core";
import { catalog } from "../src/catalog";

/**
 * Every specimen renders, and every specimen that is not a deliberate misuse
 * passes axe. A preview is documentation people copy from — an inaccessible
 * one teaches the mistake.
 */

afterEach(cleanup);

const cases = catalog.flatMap((entry) =>
  entry.previews.map((preview) => [`${entry.name}/${preview.id}`, preview] as const),
);

describe("previews", () => {
  it.each(cases)("%s renders and passes axe", async (_label, preview) => {
    const { container } = render(<main>{preview.render()}</main>);
    expect(container.firstChild).not.toBeNull();
    if (preview.kind === "misuse") return;
    const rules: Record<string, { enabled: boolean }> = {
      // happy-dom computes no layout or colours; contrast is checked by the
      // token tests and in the browser, not here.
      "color-contrast": { enabled: false },
      region: { enabled: false },
    };
    for (const rule of preview.axeDisable ?? []) rules[rule] = { enabled: false };
    const result = await axe.run(container, { rules });
    const violations = result.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`);
    expect(violations).toEqual([]);
  });
});
