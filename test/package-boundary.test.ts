import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * The server ships without the client's source.
 *
 * The runtime image copies `src/` and the built `web/dist`, and nothing else —
 * so a server module importing `web/src/...` resolves locally and dies at boot
 * in the container. This is the mirror of the guard in `web/test`, which
 * catches the direction that already broke three deploys.
 *
 * `test/` is exempt and deliberately so: it never reaches the image, which is
 * why the one assertion spanning both halves lives there.
 */

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry) ? [path] : [];
  });
}

describe("the server's boundary", () => {
  it("never imports the client's source", () => {
    const offenders: string[] = [];
    const specifiers = [
      /\bfrom\s*"([^"]*)"/g,
      /\bimport\s+"([^"]*)"/g,
      /\bimport\s*\(\s*"([^"]*)"\s*\)/g,
    ];
    for (const file of sourceFiles("src")) {
      const text = readFileSync(file, "utf8");
      for (const pattern of specifiers) {
        for (const match of text.matchAll(pattern)) {
          if (/(^|\/)web\//.test(match[1]!)) offenders.push(`${file} → ${match[1]}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
