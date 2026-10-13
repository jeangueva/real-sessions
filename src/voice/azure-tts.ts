/**
 * Microsoft Azure speech, for the accent of each country.
 *
 * The one provider with a neural voice per Latin American country — a
 * Peruvian jury that sounds Peruvian, a Chilean one that sounds Chilean.
 * Each country has a man's and a woman's voice; the third juror is the man's
 * voice spoken lower and slower, so the panel is still three people.
 *
 * Off unless `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION` are set; without
 * them the jury keeps the voices it had.
 */
import { MAX_SPEECH_CHARS, SpeechError } from "./tts.js";

export function azureConfigured(): boolean {
  return Boolean(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION);
}

/** [man, woman] per country, from Azure's neural voice list. */
const BY_COUNTRY: Record<string, { locale: string; man: string; woman: string }> = {
  PE: { locale: "es-PE", man: "es-PE-AlexNeural", woman: "es-PE-CamilaNeural" },
  AR: { locale: "es-AR", man: "es-AR-TomasNeural", woman: "es-AR-ElenaNeural" },
  CL: { locale: "es-CL", man: "es-CL-LorenzoNeural", woman: "es-CL-CatalinaNeural" },
  CO: { locale: "es-CO", man: "es-CO-GonzaloNeural", woman: "es-CO-SalomeNeural" },
  EC: { locale: "es-EC", man: "es-EC-LuisNeural", woman: "es-EC-AndreaNeural" },
  BO: { locale: "es-BO", man: "es-BO-MarceloNeural", woman: "es-BO-SofiaNeural" },
  UY: { locale: "es-UY", man: "es-UY-MateoNeural", woman: "es-UY-ValentinaNeural" },
  PA: { locale: "es-PA", man: "es-PA-RobertoNeural", woman: "es-PA-MargaritaNeural" },
};

export interface AzureVoice {
  locale: string;
  name: string;
  /** SSML prosody, for the juror who shares a voice with another. */
  pitch?: string;
  rate?: string;
}

/** The jury's voices in a country: chair a man, methodologist a woman, specialist the man lower. */
export function azureVoiceFor(personaId: string, country: string | null | undefined): AzureVoice | null {
  const entry = country ? BY_COUNTRY[country] : undefined;
  if (!entry) return null;
  if (personaId === "skeptic") return { locale: entry.locale, name: entry.woman };
  if (personaId === "systems") return { locale: entry.locale, name: entry.man, pitch: "-12%", rate: "-6%" };
  return { locale: entry.locale, name: entry.man };
}

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function synthesizeAzure(text: string, voice: AzureVoice, timeoutMs = 12_000): Promise<Uint8Array> {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  if (!key || !region) throw new SpeechError("Azure speech is not configured.", 0);
  const trimmed = text.trim();
  if (trimmed === "") throw new SpeechError("Nothing to say.", 0);
  if (trimmed.length > MAX_SPEECH_CHARS) throw new SpeechError("Phrase too long to synthesize.", 0);

  const spoken = voice.pitch || voice.rate
    ? `<prosody${voice.pitch ? ` pitch="${voice.pitch}"` : ""}${voice.rate ? ` rate="${voice.rate}"` : ""}>${escapeXml(trimmed)}</prosody>`
    : escapeXml(trimmed);
  const ssml = `<speak version="1.0" xml:lang="${voice.locale}"><voice name="${voice.name}">${spoken}</voice></speak>`;

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), timeoutMs);
  try {
    const response = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        "User-Agent": "mockio",
      },
      body: ssml,
      signal: abort.signal,
    });
    if (!response.ok) throw new SpeechError(`Azure TTS failed (${response.status})`, response.status);
    return new Uint8Array(await response.arrayBuffer());
  } catch (error) {
    if (error instanceof SpeechError) throw error;
    throw new SpeechError(error instanceof Error ? error.message : "Azure TTS failed", 0);
  } finally {
    clearTimeout(timer);
  }
}
