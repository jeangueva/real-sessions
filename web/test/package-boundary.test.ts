import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * `web/` has to build with nothing but `web/`.
 *
 * The Dockerfile builds the client in a stage that copies only this directory,
 * so an import reaching up into the repo's own `src/` resolves on a developer's
 * machine and fails in the image — the worst shape a break can have, because
 * every local check passes and only the deploy says no. That is exactly how the
 * avatar module broke production: `web/src/lib/avatar.ts` re-exported
 * `../../../src/avatar`, three deploys failed on `TS2307`, and nothing before
 * the build log noticed.
 *
 * Shared logic belongs in `web/` when the client is what uses it, and a test
 * that spans both halves belongs in the root suite, which can see both.
 */

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry) ? [path] : [];
  });
}

describe("the web package's boundary", () => {
  it("never imports from outside web/", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles("src")) {
      const text = readFileSync(file, "utf8");
      // Every shape a specifier comes in: `from "…"`, a bare side-effect
      // `import "…"`, and a dynamic `import("…")`. Matching only the first
      // is how this guard passed while an escape sat in the tree.
      const specifiers = [
        /\bfrom\s*"([^"]*)"/g,
        /\bimport\s+"([^"]*)"/g,
        /\bimport\s*\(\s*"([^"]*)"\s*\)/g,
      ];
      for (const pattern of specifiers) {
        for (const match of text.matchAll(pattern)) {
          // Three or more levels up from anywhere under src/ leaves web/.
          if (/^(?:\.\.\/){3,}/.test(match[1]!)) {
            offenders.push(`${file} → ${match[1]}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
