/**
 * The design system's documentation site, served at /ds/ to signed-in admins.
 *
 * The site is a static Vite build (design-system/dist, made by
 * `npm --prefix design-system run build`). It is internal: it documents the
 * product's components, copy and rules, so it sits behind the same session as
 * every other admin page rather than on a public host.
 *
 * Kept apart from server.ts so the routing, the session gate and the path
 * handling can be tested without a database or Redis.
 *
 * Static serving, the safe way:
 *   - the path is decoded once; a malformed escape, a NUL byte, a backslash or
 *     a ".." segment is refused outright, before touching the disk
 *   - the resolved file (symlinks followed) must stay inside the dist root
 *   - a directory is served only through its index.html; there is no listing
 *   - an extensionless path that is not a file gets index.html, so a
 *     client-side route survives a reload; a missing file with an extension
 *     is a plain 404
 */
import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import path from "node:path";

export const DS_PREFIX = "/ds";

export interface DsResponse {
  status: number;
  headers: Record<string, string>;
  body: string | Buffer;
}

export interface DsRequest {
  /** The raw request URL (req.url): path and query, still percent-encoded. */
  url: string;
  method: string | undefined;
  /** The signed-in admin, or null. */
  viewer: string | null;
  /** Absolute path of design-system/dist. */
  root: string;
  /** Headers every admin response carries (server.ts's SECURITY_HEADERS). */
  baseHeaders?: Record<string, string>;
}

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

/** The Content-Type for a file name; unknown types download rather than render. */
export function contentType(file: string): string {
  return TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream";
}

/**
 * Vite names built assets `name-<hash>.ext` (assets/index-B3kd9a1Q.js), so a
 * changed file is a new URL and the old one can be cached for a year. Anything
 * else, index.html above all, is revalidated or not stored.
 */
function cacheControl(relative: string): string {
  if (relative.endsWith(".html")) return "no-store";
  if (/^assets\/.+[-.][A-Za-z0-9_-]{8,}\.[a-z0-9]+$/.test(relative)) return "private, max-age=31536000, immutable";
  return "private, no-cache";
}

// The site's own scripts and styles only, as for the rest of the admin. It
// may frame its own pages (component previews), so frames are 'self' here
// rather than 'none'.
const CSP =
  "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; " +
  "font-src 'self' data:; connect-src 'self'; frame-src 'self'; base-uri 'self'; form-action 'none'; frame-ancestors 'self'";

/**
 * A path below the dist root, as a file inside it, or null when the path is
 * malformed or tries to leave the root. `relative` is still percent-encoded.
 */
export function resolveInside(root: string, relative: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(relative);
  } catch {
    return null;
  }
  if (decoded.includes("\0") || decoded.includes("\\")) return null;
  const segments = decoded.split("/");
  if (segments.some((segment) => segment === "..")) return null;
  const base = path.resolve(root);
  const resolved = path.resolve(base, "." + path.posix.sep + segments.filter((s) => s && s !== ".").join(path.sep));
  if (resolved !== base && !resolved.startsWith(base + path.sep)) return null;
  return resolved;
}

/** True when `file` exists and, symlinks followed, still lies inside `root`. */
function realInside(root: string, file: string): boolean {
  try {
    const realRoot = realpathSync(root);
    const real = realpathSync(file);
    return real === realRoot || real.startsWith(realRoot + path.sep);
  } catch {
    return false;
  }
}

function page(status: number, title: string, text: string, base: Record<string, string>): DsResponse {
  const body = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>${title} · Mockio admin</title><link rel="stylesheet" href="/styles.css"></head>
<body><main style="max-width:560px;margin:15vh auto;padding:0 24px"><h1>${title}</h1><p>${text}</p><p><a href="/">Back to the admin</a></p></main></body></html>`;
  return {
    status,
    headers: { ...base, "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": CSP, "Cache-Control": "no-store" },
    body,
  };
}

/**
 * The response for a /ds request, or null when the URL is not under /ds and
 * belongs to the rest of the admin.
 */
export function designSystemResponse(request: DsRequest): DsResponse | null {
  const base = { ...(request.baseHeaders ?? {}), "X-Frame-Options": "SAMEORIGIN", "X-Content-Type-Options": "nosniff" };
  // Only the path, cut from the raw URL so the escapes are still there to
  // inspect. (new URL() would already have folded "/ds/%2e%2e/x" into "/x",
  // which is safe but leaves nothing to refuse explicitly.)
  const rawPath = (request.url.split(/[?#]/)[0] ?? "/") || "/";
  if (rawPath !== DS_PREFIX && !rawPath.startsWith(`${DS_PREFIX}/`)) return null;

  // Exactly like the other admin pages: no session, no content. A browser is
  // sent to the sign-in page rather than shown a JSON error.
  if (!request.viewer) return { status: 302, headers: { ...base, "Cache-Control": "no-store", Location: "/" }, body: "" };

  if (request.method !== "GET" && request.method !== "HEAD") {
    return { status: 405, headers: { ...base, Allow: "GET, HEAD", "Cache-Control": "no-store" }, body: "" };
  }
  if (rawPath === DS_PREFIX) return { status: 302, headers: { ...base, "Cache-Control": "no-store", Location: `${DS_PREFIX}/` }, body: "" };

  const root = path.resolve(request.root);
  const index = path.join(root, "index.html");
  if (!existsSync(index)) {
    return page(
      503,
      "Design system not built",
      "There is no build of the documentation site on this server. Run <code>npm --prefix design-system run build</code> (the mockio-admin build command does) and reload.",
      base,
    );
  }

  const relative = rawPath.slice(DS_PREFIX.length + 1);
  let file = resolveInside(root, relative);
  if (!file) return { status: 400, headers: { ...base, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }, body: "Bad path" };

  const notFound = (): DsResponse => ({
    status: 404,
    headers: { ...base, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    body: "Not found",
  });

  const isFile = (candidate: string) => existsSync(candidate) && statSync(candidate).isFile();
  if (existsSync(file) && statSync(file).isDirectory()) {
    // A directory only through its index.html; never a listing.
    file = path.join(file, "index.html");
    if (!isFile(file)) return notFound();
  } else if (!isFile(file)) {
    // A client-side route (no extension): the app shell. Anything else: 404.
    if (path.extname(file) !== "") return notFound();
    file = index;
  }
  if (!realInside(root, file)) return notFound();

  const served = path.relative(root, file).split(path.sep).join("/");
  const body = readFileSync(file);
  return {
    status: 200,
    headers: {
      ...base,
      "Content-Type": contentType(file),
      "Content-Length": String(body.length),
      "Cache-Control": cacheControl(served),
      ...(served.endsWith(".html") ? { "Content-Security-Policy": CSP } : {}),
    },
    body: request.method === "HEAD" ? "" : body,
  };
}
