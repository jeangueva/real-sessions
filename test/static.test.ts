import { describe, expect, it } from "vitest";
import path from "node:path";
import { resolveAsset } from "../src/static.js";

const ROOT = path.resolve("/srv/web/dist");

/** The property that matters: whatever comes back is inside the root. */
function contained(result: string | null): boolean {
  return result === null || result === ROOT || result.startsWith(ROOT + path.sep);
}

describe("resolveAsset", () => {
  it("resolves an ordinary asset", () => {
    expect(resolveAsset(ROOT, "/assets/index-abc.js")).toBe(
      path.join(ROOT, "assets", "index-abc.js"),
    );
  });

  it("never escapes the root, however the path is written", () => {
    // Serving files by concatenating a request path onto a directory is the
    // classic way to hand out /etc/passwd. Traversal is neutralised rather
    // than rejected — `..` is collapsed before the containment check — so the
    // assertion is on the property, not on a particular mechanism.
    const attempts = [
      "/../../../etc/passwd",
      "/../package.json",
      "/%2e%2e%2f%2e%2e%2fetc/passwd",
      "/..%2f..%2fetc/passwd",
      "/....//....//etc/passwd",
      "/assets/../../../../etc/passwd",
      "/./../../srv/web/dist-evil/x.js",
    ];
    for (const attempt of attempts) {
      const resolved = resolveAsset(ROOT, attempt);
      expect(contained(resolved), attempt).toBe(true);
      // Substring matching on a path would be the wrong check here:
      // /srv/web/dist/etc/passwd legitimately contains "/etc/passwd" and is
      // harmless. What matters is that it is not the file itself.
      expect(resolved, attempt).not.toBe("/etc/passwd");
    }
  });

  it("refuses a path carrying a null byte", () => {
    // It can truncate a path inside a syscall, so the check and the open would
    // be looking at different strings.
    expect(resolveAsset(ROOT, "/index.html\0.png")).toBeNull();
  });

  it("refuses a malformed escape rather than guessing", () => {
    expect(resolveAsset(ROOT, "/%zz")).toBeNull();
  });

  it("does not treat a sibling directory as inside the root", () => {
    // `startsWith(root)` without the separator would accept /srv/web/dist-evil.
    expect(contained(path.resolve("/srv/web/dist-evil/x.js"))).toBe(false);
  });
});
