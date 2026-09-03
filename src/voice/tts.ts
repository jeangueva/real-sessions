/**
 * Interviewer speech through Deepgram Aura.
 *
 * The browser's own `speechSynthesis` needs no key and no round trip, which is
 * why it shipped first. What it cannot do is sound like a person: the voices
 * installed on a given machine are a lottery (this Mac has "Zarvox" and
 * "Bufón" sitting in the same list as "Samantha"), and rate and pitch are the
 * only knobs, so five archetypes end up as one robot at five speeds. A
 * candidate rehearsing for a real interview should be answering something that
 * sounds like a person, or the nerves the rehearsal is supposed to train never
 * show up.
 *
 * Aura is the same vendor and the same key already used for transcription, so
 * this adds a voice without adding a dependency. As with the live socket, the
 * key never leaves the server: the browser asks for a persona, not a model.
 */
import process from "node:process";

/**
 * The voices a persona may name.
 *
 * An allowlist, not a passthrough. The model id lands in a URL sent to
 * Deepgram, and while `personaId` is what the client actually sends, resolving
 * it through this set means a future caller that does pass a model string
 * cannot steer the request anywhere unexpected.
 *
 * Every entry was verified against the live API before being listed here — a
 * name that looks right but 400s would degrade the whole interview to the
 * browser voice with nothing in the UI to say why.
 */
export const AURA_VOICES = new Set([
  "aura-2-thalia-en",
  "aura-2-andromeda-en",
  "aura-2-helena-en",
  "aura-2-apollo-en",
  "aura-2-arcas-en",
  "aura-2-aries-en",
  "aura-2-orion-en",
  "aura-2-orpheus-en",
  "aura-2-cora-en",
  "aura-2-draco-en",
  "aura-2-pandora-en",
  "aura-2-saturn-en",
  "aura-2-athena-en",
  "aura-2-hermes-en",
]);

/** What Aura returns, and what the route forwards unchanged. */
export const SPEECH_MIME = "audio/mpeg";

/**
 * The longest phrase that will be synthesised.
 *
 * The interviewer is told to stay under 40 words, and the client splits a turn
 * at sentence boundaries before asking, so anything approaching this is a
 * malformed request rather than a long sentence. Deepgram's own limit is far
 * higher; this one exists so a caller cannot bill the account by the megabyte.
 */
export const MAX_SPEECH_CHARS = 600;

export function ttsConfigured(): boolean {
  return Boolean(process.env.DEEPGRAM_API_KEY);
}

export class SpeechError extends Error {
  constructor(
    message: string,
    /** Deepgram's status, or 0 when the request never completed. */
    readonly status: number,
  ) {
    super(message);
    this.name = "SpeechError";
  }
}

/**
 * Renders one phrase to MP3.
 *
 * Deliberately not streaming. Aura's REST endpoint answers a 40-word sentence
 * in well under two seconds, the client speaks sentence by sentence while the
 * model is still writing the rest of the turn, and a buffered `Blob` plays
 * through a plain `<audio>` element on every browser — where chunked playback
 * needs MediaSource and a codec dance that Safari still gets wrong.
 */
export async function synthesize(
  text: string,
  model: string,
  timeoutMs = 12_000,
): Promise<Uint8Array> {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) throw new SpeechError("Speech synthesis is not configured.", 0);
  if (!AURA_VOICES.has(model)) throw new SpeechError(`Unknown voice: ${model}`, 0);

  const trimmed = text.trim();
  if (trimmed === "") throw new SpeechError("Nothing to say.", 0);
  if (trimmed.length > MAX_SPEECH_CHARS) {
    throw new SpeechError("Phrase too long to synthesize.", 0);
  }

  // An interview turn is worthless late: a candidate staring at a silent
  // screen has already lost the thread. Better to fail and let the client fall
  // back to the browser voice than to arrive after the moment has passed.
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), timeoutMs);

  try {
    const response = await fetch(
      `https://api.deepgram.com/v1/speak?model=${encodeURIComponent(model)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: trimmed }),
        signal: abort.signal,
      },
    );

    if (!response.ok) {
      // Deepgram's body is JSON on failure and audio on success, so it is only
      // safe to read as text here.
      const detail = await response.text().catch(() => "");
      throw new SpeechError(
        `Deepgram speak failed (${response.status}): ${detail.slice(0, 200)}`,
        response.status,
      );
    }

    return new Uint8Array(await response.arrayBuffer());
  } catch (error) {
    if (error instanceof SpeechError) throw error;
    const aborted = error instanceof Error && error.name === "AbortError";
    throw new SpeechError(
      aborted ? "Speech synthesis timed out." : "Speech synthesis failed.",
      0,
    );
  } finally {
    clearTimeout(timer);
  }
}
