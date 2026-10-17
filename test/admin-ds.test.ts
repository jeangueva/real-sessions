import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { contentType, designSystemResponse, resolveInside } from "../admin/ds.js";

/**
 * The design system's site at /ds/ (admin/ds.ts): only for a signed-in admin,
 * and never a file outside design-system/dist.
 */

let sandbox: string;
let root: string;
const viewer = "jean@example.com";

beforeAll(() => {
  sandbox = mkdtempSync(path.join(tmpdir(), "admin-ds-"));
  root = path.join(sandbox, "dist");
  mkdirSync(path.join(root, "assets"), { recursive: true });
  mkdirSync(path.join(root, "empty"));
  writeFileSync(path.join(root, "index.html"), "<!doctype html><title>Mockio design system</title>");
  writeFileSync(path.join(root, "assets", "index-B3kd9a1Q.js"), "console.log('ds')");
  writeFileSync(path.join(root, "assets", "level-1.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  writeFileSync(path.join(root, "guide.md"), "# Guía");
  // Outside the root: what a traversal would be after.
  writeFileSync(path.join(sandbox, "package.json"), '{"secret":true}');
  symlinkSync(path.join(sandbox, "package.json"), path.join(root, "escape.json"));
});

afterAll(() => rmSync(sandbox, { recursive: true, force: true }));

const get = (url: string, who: string | null = viewer, dist = root) =>
  designSystemResponse({ url, method: "GET", viewer: who, root: dist });

describe("/ds/", () => {
  it("leaves every other path to the rest of the admin", () => {
    expect(get("/")).toBeNull();
    expect(get("/dsx")).toBeNull();
    expect(get("/api/data")).toBeNull();
  });

  it("sends a visitor without a session to the sign-in page", () => {
    for (const url of ["/ds", "/ds/", "/ds/assets/index-B3kd9a1Q.js", "/ds/../package.json"]) {
      const response = get(url, null)!;
      expect(response.status, url).toBe(302);
      expect(response.headers.Location, url).toBe("/");
      expect(response.body, url).toBe("");
    }
  });

  it("redirects /ds to /ds/", () => {
    const response = get("/ds")!;
    expect(response.status).toBe(302);
    expect(response.headers.Location).toBe("/ds/");
  });

  it("serves index.html to a signed-in admin, never cached", () => {
    const response = get("/ds/")!;
    expect(response.status).toBe(200);
    expect(response.headers["Content-Type"]).toBe("text/html; charset=utf-8");
    expect(response.headers["Cache-Control"]).toBe("no-store");
    expect(response.headers["Content-Security-Policy"]).toContain("script-src 'self'");
    expect(String(response.body)).toContain("Mockio design system");
  });

  it("serves hashed assets with a long cache and the right types", () => {
    const script = get("/ds/assets/index-B3kd9a1Q.js")!;
    expect(script.status).toBe(200);
    expect(script.headers["Content-Type"]).toBe("text/javascript; charset=utf-8");
    expect(script.headers["Cache-Control"]).toContain("max-age=31536000");
    expect(get("/ds/assets/level-1.png")!.headers["Content-Type"]).toBe("image/png");
    expect(get("/ds/guide.md")!.headers["Cache-Control"]).toBe("private, no-cache");
    expect(contentType("a.woff2")).toBe("font/woff2");
    expect(contentType("a.svg")).toBe("image/svg+xml");
    expect(contentType("a.json")).toBe("application/json; charset=utf-8");
    expect(contentType("a.css")).toBe("text/css; charset=utf-8");
    expect(contentType("a.exe")).toBe("application/octet-stream");
  });

  it("gives a client-side route the app shell and a missing file a 404", () => {
    expect(String(get("/ds/components/action")!.body)).toContain("Mockio design system");
    expect(get("/ds/assets/missing.js")!.status).toBe(404);
  });

  it("lists no directory", () => {
    const response = get("/ds/empty/")!;
    expect(response.status).toBe(404);
    expect(String(response.body)).not.toContain("index");
  });

  it("refuses traversal, plain and encoded", () => {
    for (const url of [
      "/ds/../package.json",
      "/ds/%2e%2e/package.json",
      "/ds/%2E%2E/package.json",
      "/ds/..%2fpackage.json",
      "/ds/..%2Fpackage.json",
      "/ds/assets/..%2f..%2fpackage.json",
      "/ds/%2e%2e%2fpackage.json",
      "/ds/..%5cpackage.json",
      "/ds/%252e%252e/package.json",
      "/ds/%00index.html",
      "/ds/%E0%A4%A",
    ]) {
      const response = get(url)!;
      expect(response.status, url).toBeGreaterThanOrEqual(400);
      expect(String(response.body), url).not.toContain("secret");
    }
  });

  it("does not follow a symlink out of the root", () => {
    const response = get("/ds/escape.json")!;
    expect(response.status).toBe(404);
    expect(String(response.body)).not.toContain("secret");
  });

  it("keeps resolved paths inside the root", () => {
    expect(resolveInside(root, "assets/index-B3kd9a1Q.js")).toBe(path.join(root, "assets", "index-B3kd9a1Q.js"));
    expect(resolveInside(root, "")).toBe(path.resolve(root));
    expect(resolveInside(root, "../package.json")).toBeNull();
    expect(resolveInside(root, "a/../../package.json")).toBeNull();
  });

  it("answers 503 when the site has not been built", () => {
    const response = get("/ds/", viewer, path.join(sandbox, "nowhere"))!;
    expect(response.status).toBe(503);
    expect(String(response.body)).toContain("Design system not built");
    // Still behind the session.
    expect(get("/ds/", null, path.join(sandbox, "nowhere"))!.status).toBe(302);
  });

  it("accepts only reads", () => {
    const response = designSystemResponse({ url: "/ds/", method: "DELETE", viewer, root })!;
    expect(response.status).toBe(405);
    expect(designSystemResponse({ url: "/ds/", method: "HEAD", viewer, root })!.body).toBe("");
  });
});
