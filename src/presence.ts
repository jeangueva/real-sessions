/**
 * How someone came across on camera: eye contact, posture, expression,
 * framing — read from a handful of still frames taken during the session.
 *
 * Stills, not video: a few frames say whether someone looks at the camera or
 * down at their notes, slumps, or sits half out of frame, which is what a
 * jury or an interviewer sees. The frames are read and dropped; only the
 * reading is kept.
 */
import { z } from "zod";
import type { DbPool } from "./db/index.js";
import { resolveProvider } from "./providers/index.js";
import type { ModelProvider } from "./providers/index.js";
import { OCR_MODEL } from "./ocr.js";

export const MAX_FRAMES = 8;
/** Per frame, as a data URL. A 480px JPEG is well under this. */
export const MAX_FRAME_CHARS = 200_000;

export const PresenceSchema = z.object({
  eye_contact: z.number().int().min(0).max(100),
  posture: z.number().int().min(0).max(100),
  expression: z.number().int().min(0).max(100),
  framing: z.number().int().min(0).max(100),
  summary: z.string(),
  tips: z.array(z.string()),
});

export type Presence = z.infer<typeof PresenceSchema>;

const PRESENCE_PROMPT = (count: number, language: string) =>
  `These are ${count} still frames from a webcam, taken through a rehearsal of a thesis defence or a job interview. Judge only how the person comes across on camera — never their appearance, body, clothing style, age or anything about who they are.

Return, each 0 to 100:
- eye_contact: how often they look at the camera rather than down or away.
- posture: upright and steady versus slumped, turned away or leaning out of frame.
- expression: engaged and composed versus tense or blank.
- framing: face and shoulders visible, centred, lit well enough to be seen.
Then \`summary\`: one or two sentences, and \`tips\`: two or three concrete things to change before the real one (for example: raise the camera to eye level, put a light in front, look at the lens when answering). Write the summary and tips in ${language}.

Reply with JSON only: {"eye_contact":n,"posture":n,"expression":n,"framing":n,"summary":"…","tips":["…"]}`;

export async function readPresence(
  frames: string[],
  language: string,
  options: { provider?: ModelProvider } = {},
): Promise<Presence> {
  const provider = options.provider ?? resolveProvider(OCR_MODEL);
  const response = await provider.chat({
    model: OCR_MODEL,
    system: "You give camera-presence feedback for interview and defence rehearsals. You never comment on a person's looks.",
    messages: [{ role: "user", text: PRESENCE_PROMPT(frames.length, language), images: frames }],
    maxTokens: 800,
  });
  const raw = response.text.slice(response.text.indexOf("{"), response.text.lastIndexOf("}") + 1);
  return PresenceSchema.parse(JSON.parse(raw));
}

export interface PresenceStore {
  get(ownerId: string, sessionId: string): Promise<Presence | null>;
  put(ownerId: string, sessionId: string, presence: Presence): Promise<void>;
  eraseOwner(ownerId: string): Promise<void>;
}

class PostgresPresenceStore implements PresenceStore {
  constructor(private readonly pool: DbPool) {}
  async get(ownerId: string, sessionId: string) {
    const { rows } = await this.pool.query(
      `SELECT presence FROM session_presence WHERE owner_id = $1 AND session_id = $2`,
      [ownerId, sessionId],
    );
    return (rows[0]?.presence as Presence | undefined) ?? null;
  }
  async put(ownerId: string, sessionId: string, presence: Presence) {
    await this.pool.query(
      `INSERT INTO session_presence (session_id, owner_id, presence) VALUES ($1, $2, $3)
       ON CONFLICT (session_id) DO UPDATE SET presence = EXCLUDED.presence`,
      [sessionId, ownerId, JSON.stringify(presence)],
    );
  }
  async eraseOwner(ownerId: string) {
    await this.pool.query(`DELETE FROM session_presence WHERE owner_id = $1`, [ownerId]);
  }
}

class MemoryPresenceStore implements PresenceStore {
  private readonly rows = new Map<string, { ownerId: string; presence: Presence }>();
  async get(ownerId: string, sessionId: string) {
    const row = this.rows.get(sessionId);
    return row && row.ownerId === ownerId ? row.presence : null;
  }
  async put(ownerId: string, sessionId: string, presence: Presence) {
    this.rows.set(sessionId, { ownerId, presence });
  }
  async eraseOwner(ownerId: string) {
    for (const [id, row] of this.rows) if (row.ownerId === ownerId) this.rows.delete(id);
  }
}

export function createPresenceStore(pool: DbPool | null): PresenceStore {
  return pool ? new PostgresPresenceStore(pool) : new MemoryPresenceStore();
}
