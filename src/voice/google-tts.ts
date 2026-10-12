/**
 * Google Cloud Text-to-Speech, for the languages the main voice provider
 * does not speak — Brazilian Portuguese above all, for the banca.
 *
 * The same contract as Aura's route: a phrase in, MP3 bytes out, a persona
 * mapped to a voice on the server so a caller cannot pick an arbitrary one.
 * Off unless `GOOGLE_TTS_API_KEY` is set; without it the client keeps using
 * the browser's voice, exactly as before.
 */
import { MAX_SPEECH_CHARS, SpeechError } from "./tts.js";

export function googleTtsConfigured(): boolean {
  return Boolean(process.env.GOOGLE_TTS_API_KEY);
}

/**
 * Brazilian Portuguese, cast per persona the way the Spanish voices are: the
 * three thesis jurors (measured, skeptic, systems) are three different people,
 * two men and a woman, and every interviewer archetype keeps one voice.
 */
const PORTUGUESE_VOICES: Record<string, string> = {
  measured: "pt-BR-Neural2-B",
  skeptic: "pt-BR-Neural2-C",
  systems: "pt-BR-Wavenet-B",
  warm: "pt-BR-Neural2-A",
  rapid: "pt-BR-Wavenet-C",
  founder: "pt-BR-Wavenet-A",
};

/** The Google voice for a persona in a language, or null when there is none. */
export function googleVoiceFor(personaId: string, languageId: string): { name: string; languageCode: string } | null {
  if (languageId !== "pt") return null;
  return { name: PORTUGUESE_VOICES[personaId] ?? "pt-BR-Neural2-A", languageCode: "pt-BR" };
}

export async function synthesizeGoogle(
  text: string,
  voice: { name: string; languageCode: string },
  timeoutMs = 12_000,
): Promise<Uint8Array> {
  const key = process.env.GOOGLE_TTS_API_KEY;
  if (!key) throw new SpeechError("Google speech is not configured.", 0);
  const trimmed = text.trim();
  if (trimmed === "") throw new SpeechError("Nothing to say.", 0);
  if (trimmed.length > MAX_SPEECH_CHARS) throw new SpeechError("Phrase too long to synthesize.", 0);

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), timeoutMs);
  try {
    const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text: trimmed },
        voice,
        audioConfig: { audioEncoding: "MP3", speakingRate: 1.0 },
      }),
      signal: abort.signal,
    });
    if (!response.ok) {
      // The body can carry project detail; the status is enough for the log.
      throw new SpeechError(`Google TTS failed (${response.status})`, response.status);
    }
    const body = (await response.json()) as { audioContent?: string };
    if (!body.audioContent) throw new SpeechError("Google TTS returned no audio.", 502);
    return new Uint8Array(Buffer.from(body.audioContent, "base64"));
  } catch (error) {
    if (error instanceof SpeechError) throw error;
    throw new SpeechError(error instanceof Error ? error.message : "Google TTS failed", 0);
  } finally {
    clearTimeout(timer);
  }
}
