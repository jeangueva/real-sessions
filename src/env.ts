/**
 * Loads `.env`, and must be the first import of every entry point.
 *
 * This is a module rather than two lines at the top of server.ts because of how
 * ES modules evaluate: every import runs to completion before the body of the
 * file that imported it. `auth.ts` reads the cookie secret in an initialiser at
 * module scope, so it ran before server.ts reached its own `loadEnvFile` call,
 * and read nothing.
 *
 * The symptom was quiet and specific. `REALSESSIONS_SESSION_SECRET` in `.env`
 * was ignored, a fresh ephemeral secret was minted on every boot, and every
 * restart silently signed out everyone mid-interview. The same applied to
 * `REALSESSIONS_ACCESS_CODE` and to every model override in `client.ts`, which
 * the README documents as configurable through this file.
 *
 * Importing this first works because imports are evaluated in source order, so
 * it has to stay first — hence its own file, where the requirement is visible,
 * rather than a call buried among other statements.
 */
import process from "node:process";

try {
  process.loadEnvFile(".env");
} catch (error) {
  // No .env is the normal case in production, where the platform supplies the
  // environment directly. Anything else is a real problem worth surfacing.
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}
