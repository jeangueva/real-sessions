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

/**
 * Parses a `Range` header against a known file size.
 *
 * Only the single-range forms a media element actually sends: `bytes=start-`,
 * `bytes=start-end`, and the suffix form `bytes=-n`. Multipart ranges are
 * legal and nothing here needs them, so an unrecognised header is treated as
 * absent — answering the whole file is always a correct response to a range
 * request, where a wrong 206 is not.
 *
 * Returns null for "send the whole thing", or `unsatisfiable` for a range that
 * starts past the end, which owes a 416 rather than a body.
 */
export function parseRange(
  header: string | undefined,
  size: number,
): { start: number; end: number } | { unsatisfiable: true } | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;
  const [, rawStart, rawEnd] = match;
  if (rawStart === "" && rawEnd === "") return null;

  let start: number;
  let end: number;
  if (rawStart === "") {
    // `bytes=-500` is the last 500 bytes, not the first.
    const suffix = Number(rawEnd);
    if (suffix === 0) return { unsatisfiable: true };
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd === "" ? size - 1 : Math.min(Number(rawEnd), size - 1);
  }

  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (start >= size) return { unsatisfiable: true };
  if (end < start) return { unsatisfiable: true };
  return { start, end };
}

/** A week, which is what an unfingerprinted asset is allowed to go stale by. */
const WEEK_SECONDS = 604800;

/**
 * How long a response may be reused.
 *
 * Three tiers, because this directory holds three kinds of file.
 *
 * Vite fingerprints everything under `/assets`, so those can never go stale:
 * a changed file is a changed URL. `index.html` is the opposite — it is what
 * names the current fingerprints, so caching it means a deploy never reaches
 * anyone holding an old copy.
 *
 * Everything else is unfingerprinted but static: `hero-2.mp4` and `robots.txt`.
 * These used to fall in with `index.html` and be re-fetched every visit, which
 * for a two-megabyte video meant every visitor downloaded it again. A week is
 * the trade that buys: replacing the video means up to seven days of returning
 * visitors seeing the old one, since the URL does not change with it.
 */
export function cacheControl(urlPath: string, file: string): string {
  if (urlPath.startsWith("/assets/")) return "public, max-age=31536000, immutable";
  if (path.extname(file).toLowerCase() === ".html") return "no-cache";
  return `public, max-age=${WEEK_SECONDS}`;
}

export interface StaticSite {
  /** Returns true when it handled the request. */
  serve(
    urlPath: string,
    res: ServerResponse,
    options?: { range?: string; headOnly?: boolean },
  ): Promise<boolean>;
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

  /**
   * @param range The request's `Range` header, if it sent one.
   * @param size The file's size, needed to answer a range at all.
   */
  const send = (
    res: ServerResponse,
    file: string,
    cache: string,
    size: number,
    range?: string,
    headOnly = false,
  ) => {
    const type = TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream";
    const headers: Record<string, string> = {
      "Content-Type": type,
      "Cache-Control": cache,
      /**
       * Advertised on everything, because a media element decides whether it
       * can seek by looking for this before it asks for anything.
       *
       * Without range support the hero video never played: Chrome opens a
       * video with `Range: bytes=0-`, this answered 200 with the whole two
       * megabytes, and the element stalled at `readyState` 0 without raising
       * an error — a black hero and a silent failure. The reduced-motion path
       * is hit hardest, since holding the first frame is a seek by definition.
       */
      "Accept-Ranges": "bytes",
    };

    const wanted = parseRange(range, size);

    if (wanted && "unsatisfiable" in wanted) {
      res
        .writeHead(416, { ...headers, "Content-Range": `bytes */${size}` })
        .end();
      return;
    }

    if (wanted) {
      const length = wanted.end - wanted.start + 1;
      res.writeHead(206, {
        ...headers,
        "Content-Range": `bytes ${wanted.start}-${wanted.end}/${size}`,
        "Content-Length": String(length),
      });
      if (headOnly) return void res.end();
      createReadStream(file, { start: wanted.start, end: wanted.end }).pipe(res);
      return;
    }

    res.writeHead(200, { ...headers, "Content-Length": String(size) });
    // HEAD is the same headers with no body, which is how a caller asks how
    // big something is before deciding to fetch it.
    if (headOnly) return void res.end();
    createReadStream(file).pipe(res);
  };

  return {
    async serve(urlPath, res, options) {
      const { range, headOnly = false } = options ?? {};
      const file = resolveAsset(absolute, urlPath);
      if (!file) {
        res.writeHead(400).end();
        return true;
      }

      try {
        const found = await stat(file);
        if (found.isFile()) {
          send(res, file, cacheControl(urlPath, file), found.size, range, headOnly);
          return true;
        }
      } catch {
        /* falls through to the app shell */
      }

      // Anything else is a client-side route — /app/progress and friends exist
      // only in the browser's router, so the shell has to answer for them.
      const shell = path.join(absolute, "index.html");
      send(res, shell, cacheControl("/index.html", shell), (await stat(shell)).size, undefined, headOnly);
      return true;
    },
  };
}
