/**
 * Serving the built web app from the API process.
 *
 * One deployable unit rather than two. A separate static host is arguably the
 * better architecture and is what this should become under real traffic, but it
 * doubles what has to be provisioned and configured before anything is live,
 * and the app is a few hundred kilobytes.
 *
 * Only active when `web/dist` exists, which is true in the container image and
 * false in development — where Vite serves the app and proxies `/api` here.
 */
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import type { ServerResponse } from "node:http";

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

/**
 * Resolves a URL path to a file inside `root`, or null.
 *
 * The containment check is the whole point. `path.resolve` collapses `..`
 * before the check runs, so a request for `/../../etc/passwd` resolves to a
 * path outside the root and is rejected rather than served. Decoding happens
 * first, because `%2e%2e%2f` is the same attack spelled differently.
 */
export function resolveAsset(root: string, urlPath: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    // A malformed escape is not a path we should guess at.
    return null;
  }
  // A null byte can truncate a path in some syscalls, making a check pass for
  // one string and the open happen on another.
  if (decoded.includes("\0")) return null;

  const resolved = path.resolve(root, "." + path.posix.normalize(decoded));
  const contained =
    resolved === root || resolved.startsWith(root + path.sep);
  return contained ? resolved : null;
}

export interface StaticSite {
  /** Returns true when it handled the request. */
  serve(urlPath: string, res: ServerResponse): Promise<boolean>;
}

export async function createStaticSite(root: string): Promise<StaticSite | null> {
  const absolute = path.resolve(root);
  try {
    const index = await stat(path.join(absolute, "index.html"));
    if (!index.isFile()) return null;
  } catch {
    // No build here. Development, where Vite serves the app instead.
    return null;
  }

  const send = (res: ServerResponse, file: string, immutable: boolean) => {
    const type = TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": type,
      // Vite fingerprints everything under /assets, so those can be cached
      // forever. index.html must not be, or a deploy never reaches anyone
      // holding a stale copy.
      "Cache-Control": immutable
        ? "public, max-age=31536000, immutable"
        : "no-cache",
    });
    createReadStream(file).pipe(res);
  };

  return {
    async serve(urlPath, res) {
      const file = resolveAsset(absolute, urlPath);
      if (!file) {
        res.writeHead(400).end();
        return true;
      }

      try {
        const found = await stat(file);
        if (found.isFile()) {
          send(res, file, urlPath.startsWith("/assets/"));
          return true;
        }
      } catch {
        /* falls through to the app shell */
      }

      // Anything else is a client-side route — /app/progress and friends exist
      // only in the browser's router, so the shell has to answer for them.
      send(res, path.join(absolute, "index.html"), false);
      return true;
    },
  };
}
