/**
 * What the candidate has told us about themselves.
 *
 * The interviewer is far more convincing when it can ask about the migration
 * on your CV than when it asks a generic question about "a hard tradeoff". This
 * is where that context comes from: an uploaded CV or portfolio, plus the links
 * you consider part of your work.
 *
 * Two rules shape everything here.
 *
 * **Links are recorded, never fetched.** A server that retrieves arbitrary
 * user-supplied URLs is a server-side request forgery primitive pointed at its
 * own network, and the usual mitigations (blocklists, DNS checks) leak through
 * redirects and rebinding. Telling the model "their GitHub is github.com/x"
 * gets most of the value with none of that. Fetching can come later behind a
 * per-host allowlist and an egress proxy, which is a deliberate piece of work
 * rather than a flag.
 *
 * **The model sees a brief, not the document.** A whole CV pasted into the
 * system prompt crowds out the persona and sector instructions — the model
 * starts reciting your résumé instead of interviewing you. The brief is a few
 * hundred words, written once per upload.
 */
import type { DbPool } from "./db/index.js";

export type LinkKind =
  | "github"
  | "linkedin"
  | "figma"
  | "portfolio"
  | "behance"
  | "dribbble"
  | "other";

export interface ProfileLink {
  url: string;
  kind: LinkKind;
  label: string | null;
}

export interface CandidateProfile {
  sourceName: string | null;
  brief: string | null;
  links: ProfileLink[];
  updatedAt: string | null;
}

export const EMPTY_PROFILE: CandidateProfile = {
  sourceName: null,
  brief: null,
  links: [],
  updatedAt: null,
};

/** Cap on stored CV text. Longer than any real CV, short enough to bound cost. */
export const MAX_SOURCE_CHARS = 60_000;
/** Cap on the brief that reaches the prompt. */
export const MAX_BRIEF_CHARS = 2_000;
/** More than this many links is a link dump, not a portfolio. */
export const MAX_LINKS = 8;

/**
 * Classifies a URL by host so the interviewer knows what it is looking at.
 *
 * Returns null for anything that is not a plain http(s) URL. That check is the
 * only thing standing between this and `javascript:` or `file:` reaching the
 * page as a link, so it rejects rather than guessing.
 */
export function classifyLink(raw: string): ProfileLink | null {
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed.length > 2_000) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  const kind: LinkKind = host.endsWith("github.com")
    ? "github"
    : host.endsWith("linkedin.com")
      ? "linkedin"
      : host.endsWith("figma.com")
        ? "figma"
        : host.endsWith("behance.net")
          ? "behance"
          : host.endsWith("dribbble.com")
            ? "dribbble"
            : "portfolio";

  return { url: parsed.toString(), kind, label: host };
}

export interface ProfileStore {
  get(ownerId: string): Promise<CandidateProfile>;
  /** Raw text is kept so the brief can be rebuilt when the prompt changes. */
  putSource(ownerId: string, name: string, text: string, brief: string): Promise<void>;
  putLinks(ownerId: string, links: ProfileLink[]): Promise<void>;
  clear(ownerId: string): Promise<void>;
  /** Moves a guest's profile onto an account, like every other store. */
  transfer(fromOwnerId: string, toOwnerId: string): Promise<void>;
}

class PostgresProfileStore implements ProfileStore {
  constructor(private readonly pool: DbPool) {}

  async get(ownerId: string): Promise<CandidateProfile> {
    const [profile, links] = await Promise.all([
      this.pool.query(
        `SELECT source_name, brief, updated_at FROM profiles WHERE owner_id = $1`,
        [ownerId],
      ),
      this.pool.query(
        `SELECT url, kind, label FROM profile_links WHERE owner_id = $1 ORDER BY kind, url`,
        [ownerId],
      ),
    ]);
    const row = profile.rows[0];
    return {
      sourceName: (row?.source_name as string | null) ?? null,
      brief: (row?.brief as string | null) ?? null,
      updatedAt: row?.updated_at ? new Date(row.updated_at).toISOString() : null,
      links: links.rows.map((link) => ({
        url: link.url as string,
        kind: link.kind as LinkKind,
        label: (link.label as string | null) ?? null,
      })),
    };
  }

  async putSource(ownerId: string, name: string, text: string, brief: string) {
    await this.pool.query(
      `INSERT INTO profiles (owner_id, source_name, source_text, brief, updated_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (owner_id) DO UPDATE SET
         source_name = EXCLUDED.source_name,
         source_text = EXCLUDED.source_text,
         brief = EXCLUDED.brief,
         updated_at = now()`,
      [ownerId, name.slice(0, 200), text.slice(0, MAX_SOURCE_CHARS), brief.slice(0, MAX_BRIEF_CHARS)],
    );
  }

  async putLinks(ownerId: string, links: ProfileLink[]) {
    const client = await this.pool.connect();
    try {
      // Replace rather than merge: the client sends the whole list, so a
      // removed link has to actually disappear.
      await client.query("BEGIN");
      await client.query(`DELETE FROM profile_links WHERE owner_id = $1`, [ownerId]);
      for (const link of links.slice(0, MAX_LINKS)) {
        await client.query(
          `INSERT INTO profile_links (owner_id, url, kind, label)
           VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
          [ownerId, link.url, link.kind, link.label],
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async clear(ownerId: string) {
    await this.pool.query(`DELETE FROM profiles WHERE owner_id = $1`, [ownerId]);
    await this.pool.query(`DELETE FROM profile_links WHERE owner_id = $1`, [ownerId]);
  }

  async transfer(fromOwnerId: string, toOwnerId: string) {
    if (fromOwnerId === toOwnerId) return;
    // The account's own profile wins if it already has one — it is the more
    // deliberate record.
    await this.pool.query(
      `UPDATE profiles SET owner_id = $2 WHERE owner_id = $1
        AND NOT EXISTS (SELECT 1 FROM profiles WHERE owner_id = $2)`,
      [fromOwnerId, toOwnerId],
    );
    await this.pool.query(`DELETE FROM profiles WHERE owner_id = $1`, [fromOwnerId]);
    await this.pool.query(
      `UPDATE profile_links SET owner_id = $2 WHERE owner_id = $1
        AND NOT EXISTS (SELECT 1 FROM profile_links WHERE owner_id = $2)`,
      [fromOwnerId, toOwnerId],
    );
    await this.pool.query(`DELETE FROM profile_links WHERE owner_id = $1`, [fromOwnerId]);
  }
}

class MemoryProfileStore implements ProfileStore {
  private readonly profiles = new Map<string, CandidateProfile & { sourceText: string }>();

  async get(ownerId: string): Promise<CandidateProfile> {
    const held = this.profiles.get(ownerId);
    if (!held) return { ...EMPTY_PROFILE, links: [] };
    const { sourceText: _ignored, ...profile } = held;
    return { ...profile, links: [...profile.links] };
  }

  async putSource(ownerId: string, name: string, text: string, brief: string) {
    const held = this.profiles.get(ownerId);
    this.profiles.set(ownerId, {
      sourceName: name.slice(0, 200),
      sourceText: text.slice(0, MAX_SOURCE_CHARS),
      brief: brief.slice(0, MAX_BRIEF_CHARS),
      links: held?.links ?? [],
      updatedAt: new Date().toISOString(),
    });
  }

  async putLinks(ownerId: string, links: ProfileLink[]) {
    const held = this.profiles.get(ownerId);
    this.profiles.set(ownerId, {
      sourceName: held?.sourceName ?? null,
      sourceText: held?.sourceText ?? "",
      brief: held?.brief ?? null,
      updatedAt: held?.updatedAt ?? new Date().toISOString(),
      links: links.slice(0, MAX_LINKS),
    });
  }

  async clear(ownerId: string) {
    this.profiles.delete(ownerId);
  }

  async transfer(fromOwnerId: string, toOwnerId: string) {
    if (fromOwnerId === toOwnerId) return;
    const incoming = this.profiles.get(fromOwnerId);
    if (!incoming) return;
    if (!this.profiles.has(toOwnerId)) this.profiles.set(toOwnerId, incoming);
    this.profiles.delete(fromOwnerId);
  }
}

export function createProfileStore(pool: DbPool | null): ProfileStore {
  return pool ? new PostgresProfileStore(pool) : new MemoryProfileStore();
}

/**
 * Renders the profile into the sentence the interviewer prompt receives.
 *
 * Returns an empty string when there is nothing to say, and the caller omits
 * the whole section rather than inserting "The candidate has provided no
 * background", which reads to the model as a fact worth mentioning.
 */
export function renderProfileBrief(profile: CandidateProfile): string {
  const parts: string[] = [];
  if (profile.brief) parts.push(profile.brief.trim());
  if (profile.links.length > 0) {
    const listed = profile.links
      .map((link) => `${link.kind}: ${link.url}`)
      .join(", ");
    parts.push(`They also point to ${listed}.`);
  }
  return parts.join("\n\n");
}
