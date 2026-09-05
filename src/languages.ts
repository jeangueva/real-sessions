/**
 * The language the interview is conducted in.
 *
 * The product exists to rehearse English interviews, and that stays the
 * default. What this adds is the rehearsal before the rehearsal: a candidate
 * who has never said "I owned the retry queue" out loud to anyone benefits
 * from saying it in their own language first, and plenty of real interviews
 * at Latin American companies are in Spanish or Portuguese anyway.
 *
 * Three things have to agree for a language to work, and one of them is not
 * ours to decide:
 *
 *   `stt` is what Deepgram is told to transcribe.
 *   `promptLabel` is what the interviewer and the evaluator are told to use.
 *   `auraSuffix` is whether the vendor has a voice at all.
 *
 * That last one is why Portuguese is honest rather than absent. Deepgram's
 * Aura has voices for de, en, es, fr, it, ja and nl — checked against their
 * model list, not assumed — and no Portuguese at any tier. A Portuguese
 * interview transcribes correctly, is conducted correctly, and speaks through
 * the browser's own synthesiser. Worse, and said out loud in the picker
 * rather than discovered.
 */

export type LanguageId = "en" | "es" | "pt";

export interface Language {
  id: LanguageId;
  /** Shown in the picker, in the language itself. */
  label: string;
  /** How the prompts refer to it. */
  promptLabel: string;
  /** Deepgram's live-transcription language code. */
  stt: string;
  /** The model to transcribe with. Nova-3 is English-only on this account. */
  sttModel: string;
  /**
   * The Aura voice suffix, or null when the vendor has no voice for it — in
   * which case the browser synthesiser takes over.
   */
  auraSuffix: string | null;
  /** For the browser synthesiser and the `lang` attribute. */
  bcp47: string;
  /** Said in the picker when the experience is degraded. */
  caveat?: string;
}

export const LANGUAGES: Language[] = [
  {
    id: "en",
    label: "English",
    promptLabel: "English",
    stt: "en-US",
    sttModel: "nova-3",
    auraSuffix: "en",
    bcp47: "en-US",
  },
  {
    id: "es",
    label: "Español",
    promptLabel: "Spanish",
    // Latin American Spanish rather than Castilian: it is who this is for.
    stt: "es-419",
    sttModel: "nova-2",
    auraSuffix: "es",
    bcp47: "es-419",
  },
  {
    id: "pt",
    label: "Português",
    promptLabel: "Brazilian Portuguese",
    stt: "pt-BR",
    sttModel: "nova-2",
    auraSuffix: null,
    bcp47: "pt-BR",
    caveat:
      "Deepgram has no Portuguese voice, so your interviewer speaks through your browser's built-in one. Everything else works the same.",
  },
];

export const DEFAULT_LANGUAGE: LanguageId = "en";

const BY_ID = new Map(LANGUAGES.map((language) => [language.id, language]));

/**
 * Resolves whatever the client sent.
 *
 * Falls back to English rather than throwing: an unknown code means a stale
 * client, and refusing to interview someone over it would be a worse answer
 * than running the interview the product is named for.
 */
export function findLanguage(id: string | null | undefined): Language {
  return (id ? BY_ID.get(id as LanguageId) : undefined) ?? BY_ID.get(DEFAULT_LANGUAGE)!;
}

/**
 * The Spanish voice each interviewer speaks with.
 *
 * Cast to match the person rather than assigned in order — the skeptic sounds
 * like the skeptic in either language, or the two versions are two different
 * people wearing one name. Latin American voices throughout: Castilian would
 * be a strange choice for this audience, and Aura has plenty of both.
 */
const SPANISH_VOICES: Record<string, string> = {
  measured: "aura-2-sirio-es",
  skeptic: "aura-2-selena-es",
  rapid: "aura-2-estrella-es",
  warm: "aura-2-celeste-es",
  systems: "aura-2-luciano-es",
  founder: "aura-2-olivia-es",
};

/**
 * The voice a persona uses in a given language, or null to fall back.
 *
 * Null is a real answer, not a failure: Portuguese has no Aura voice, and the
 * client already knows how to speak through the browser when the server has
 * nothing to offer.
 */
export function voiceFor(
  personaId: string,
  englishVoice: string,
  language: Language,
): string | null {
  if (language.auraSuffix === "en") return englishVoice;
  if (language.auraSuffix === "es") return SPANISH_VOICES[personaId] ?? "aura-2-celeste-es";
  return null;
}
