import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Guards the import order that makes `.env` reach the code that reads it.
 *
 * ES modules evaluate every import before the body of the file that imported
 * them, and `auth.ts` and `client.ts` read the environment in initialisers at
 * module scope. When the `loadEnvFile` call lived in server.ts's body those
 * initialisers had already run, so `REALSESSIONS_SESSION_SECRET` was ignored, a
 * fresh ephemeral secret was minted on every boot, and each restart silently
 * signed out everyone mid-interview.
 *
 * Nothing about that failure is loud. A test that reads the source is a blunt
 * instrument, but it is the only thing that catches an import being added above
 * this one.
 */
function firstImport(source: string): string {
  const line = source
    .split("\n")
    .find((candidate) => candidate.trimStart().startsWith("import "));
  return line?.trim() ?? "";
}

describe("environment loading", () => {
  it("is the first import in the server", () => {
    const source = readFileSync(join("src", "server.ts"), "utf8");
    expect(firstImport(source)).toBe('import "./env.js";');
  });

  it("is the first import in every example, which are entry points too", () => {
    const dir = "examples";
    const scripts = readdirSync(dir).filter((name) => name.endsWith(".ts"));
    expect(scripts.length).toBeGreaterThan(0);

    for (const name of scripts) {
      const source = readFileSync(join(dir, name), "utf8");
      // Harnesses are imported by the runnable scripts rather than run
      // directly, so they inherit the load and do not need their own.
      if (!source.includes("env.js")) continue;
      expect(firstImport(source), name).toBe('import "../src/env.js";');
    }
  });

  it("no longer loads the env file anywhere but env.ts", () => {
    // A second call would work, but it would also be a place for the ordering
    // bug to grow back.
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) walk(path);
        else if (entry.name.endsWith(".ts") && entry.name !== "env.ts") {
          if (readFileSync(path, "utf8").includes("loadEnvFile")) offenders.push(path);
        }
      }
    };
    walk("src");
    expect(offenders).toEqual([]);
  });
});
