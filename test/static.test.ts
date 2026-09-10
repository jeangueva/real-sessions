import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { cacheControl, createStaticSite, parseRange, resolveAsset } from "../src/static.js";

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

describe("range requests", () => {
  const SIZE = 1000;

  it("treats an absent or unparseable header as the whole file", () => {
    expect(parseRange(undefined, SIZE)).toBeNull();
    expect(parseRange("", SIZE)).toBeNull();
    expect(parseRange("bytes=abc", SIZE)).toBeNull();
    expect(parseRange("items=0-10", SIZE)).toBeNull();
    // Multipart is legal and unsupported; the whole file is a correct answer
    // to it, where a 206 covering only the first part would not be.
    expect(parseRange("bytes=0-10,20-30", SIZE)).toBeNull();
    expect(parseRange("bytes=-", SIZE)).toBeNull();
  });

  it("reads the forms a media element actually sends", () => {
    // How Chrome opens a video.
    expect(parseRange("bytes=0-", SIZE)).toEqual({ start: 0, end: 999 });
    expect(parseRange("bytes=100-199", SIZE)).toEqual({ start: 100, end: 199 });
    // Seeking near the end, which is where the moov atom often is.
    expect(parseRange("bytes=900-", SIZE)).toEqual({ start: 900, end: 999 });
  });

  it("reads the suffix form as the last n bytes, not the first", () => {
    expect(parseRange("bytes=-500", SIZE)).toEqual({ start: 500, end: 999 });
    // A suffix longer than the file is the whole file, not a negative start.
    expect(parseRange("bytes=-5000", SIZE)).toEqual({ start: 0, end: 999 });
  });

  it("clamps an end past the last byte rather than refusing", () => {
    expect(parseRange("bytes=0-5000", SIZE)).toEqual({ start: 0, end: 999 });
  });

  it("refuses a range that starts past the end", () => {
    expect(parseRange("bytes=1000-", SIZE)).toEqual({ unsatisfiable: true });
    expect(parseRange("bytes=1500-1600", SIZE)).toEqual({ unsatisfiable: true });
    expect(parseRange("bytes=-0", SIZE)).toEqual({ unsatisfiable: true });
    expect(parseRange("bytes=50-10", SIZE)).toEqual({ unsatisfiable: true });
  });
});

/**
 * The wiring, not the parser.
 *
 * `parseRange` being right proves nothing about whether `serve` ever calls it
 * — and that gap is where the bug lived: the header was correct on the way in
 * and dropped on the way through, so every response was a 200 carrying the
 * whole file. These drive the real `serve` against a temporary directory and
 * assert on what it writes.
 */
describe("serving a file over the wire", () => {
  let root = "";
  const BODY = Buffer.from("0123456789".repeat(10)); // 100 bytes

  beforeAll(async () => {
    root = await mkdtemp(path.join(tmpdir(), "static-"));
    await writeFile(path.join(root, "index.html"), "<!doctype html>");
    await writeFile(path.join(root, "clip.mp4"), BODY);
  });
  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  /** Just enough ServerResponse to record what was written. */
  function recorder() {
    const chunks: Buffer[] = [];
    const res = {
      statusCode: 0,
      headers: {} as Record<string, string>,
      writeHead(code: number, headers?: Record<string, string>) {
        res.statusCode = code;
        Object.assign(res.headers, headers ?? {});
        return res;
      },
      end() {
        res.finished = true;
        return res;
      },
      finished: false,
      on() {
        return res;
      },
      once() {
        return res;
      },
      emit() {
        return false;
      },
      write(chunk: Buffer) {
        chunks.push(chunk);
        return true;
      },
      get body() {
        return Buffer.concat(chunks);
      },
    };
    return res;
  }

  /** Waits for the piped stream to finish writing. */
  async function settle() {
    await new Promise((r) => setTimeout(r, 50));
  }

  it("advertises range support and a length on a plain request", async () => {
    const site = await createStaticSite(root);
    const res = recorder();
    await site!.serve("/clip.mp4", res as never);
    await settle();
    expect(res.statusCode).toBe(200);
    expect(res.headers["Accept-Ranges"]).toBe("bytes");
    expect(res.headers["Content-Length"]).toBe("100");
  });

  it("answers a range with 206 and only those bytes", async () => {
    const site = await createStaticSite(root);
    const res = recorder();
    await site!.serve("/clip.mp4", res as never, { range: "bytes=10-19" });
    await settle();
    expect(res.statusCode).toBe(206);
    expect(res.headers["Content-Range"]).toBe("bytes 10-19/100");
    expect(res.headers["Content-Length"]).toBe("10");
  });

  it("answers an unsatisfiable range with 416", async () => {
    const site = await createStaticSite(root);
    const res = recorder();
    await site!.serve("/clip.mp4", res as never, { range: "bytes=500-" });
    await settle();
    expect(res.statusCode).toBe(416);
    expect(res.headers["Content-Range"]).toBe("bytes */100");
  });

  it("answers HEAD with the headers and no body", async () => {
    const site = await createStaticSite(root);
    const res = recorder();
    await site!.serve("/clip.mp4", res as never, { headOnly: true });
    await settle();
    expect(res.statusCode).toBe(200);
    expect(res.headers["Content-Length"]).toBe("100");
    expect(res.body.length).toBe(0);
  });
});

describe("how long a response may be reused", () => {
  it("never expires a fingerprinted asset", () => {
    // The filename changes when the bytes do, so there is nothing to go stale.
    expect(cacheControl("/assets/index-C0Ii51ZE.js", "/d/assets/index-C0Ii51ZE.js")).toBe(
      "public, max-age=31536000, immutable",
    );
  });

  it("never caches the shell", () => {
    // index.html is what names the current fingerprints. Cache it and a deploy
    // never reaches anyone still holding the previous one.
    expect(cacheControl("/index.html", "/d/index.html")).toBe("no-cache");
    // Client-side routes are served the shell too, and must not be cached
    // under their own URL either.
    expect(cacheControl("/app/progress", "/d/index.html")).toBe("no-cache");
  });

  it("gives unfingerprinted static files a week", () => {
    expect(cacheControl("/hero.mp4", "/d/hero.mp4")).toBe("public, max-age=604800");
    expect(cacheControl("/robots.txt", "/d/robots.txt")).toBe("public, max-age=604800");
  });
});
