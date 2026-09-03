/**
 * The interviewers.
 *
 * A single interviewer voice made every company feel like the same person with
 * a different logo, and the flat default text-to-speech read as a robot reading
 * a script — which is the wrong thing to rehearse against. Real interviews vary
 * far more by who is across the table than by which company they work for.
 *
 * So each of these is a person, not a setting: a name, a job, a temperament,
 * and a voice. The name is not decoration — it goes into the system prompt, so
 * the interviewer introduces themselves and the candidate practises the part of
 * an interview that starts before the first question.
 *
 * Three halves have to agree:
 *
 *   `behaviour` goes into the Phase 1 system prompt and changes what the
 *   interviewer does — how hard they push, how much silence they leave, how
 *   they react to a vague answer.
 *
 *   `voice.model` is the Deepgram Aura voice they speak with.
 *
 *   `voice.fallback` is what the browser's own synthesiser is asked for when
 *   Aura is unavailable. Worse, and knowingly so.
 *
 * Keeping them in one record is the point. A warm, patient persona delivered at
 * a clipped 1.1x rate is uncanny in a way that is worse than either alone.
 */

/**
 * The browser-synthesiser half of a voice.
 *
 * Only reached when the server has no Deepgram key. Installed voices differ by
 * OS, browser and language pack, so `prefer` can only ever be a preference —
 * rate and pitch are what actually differentiate the archetypes everywhere,
 * because they apply to whatever voice is found.
 */
export interface FallbackVoice {
  /**
   * Speaking rate multiplier. Anything under about 0.85 sounds sedated and
   * over 1.15 starts clipping consonants in most browser voices.
   */
  rate: number;
  /** 0.8–1.2 is the usable band; outside it the synthesiser sounds cartoonish. */
  pitch: number;
  /** Substrings matched against the browser's voice names, in order. */
  prefer: string[];
}

export interface PersonaVoice {
  /** A Deepgram Aura voice id. Must be listed in `AURA_VOICES`. */
  model: string;
  fallback: FallbackVoice;
}

export interface Persona {
  id: string;
  /** The archetype, e.g. "The skeptic". What you are choosing between. */
  label: string;
  /** Their name. Said out loud in the interview's first turn. */
  name: string;
  /** Their job at the company. Also said out loud. */
  title: string;
  /** Two letters for the avatar, so the roster reads as faces not options. */
  initials: string;
  /** One line, shown when picking. */
  summary: string;
  /** Injected into the Phase 1 prompt. Second person, addressed to the model. */
  behaviour: string;
  voice: PersonaVoice;
}

export const PERSONAS: Persona[] = [
  {
    id: "measured",
    label: "The measured lead",
    name: "Marcus Hale",
    title: "Engineering Manager",
    initials: "MH",
    summary: "Even, unhurried, leaves silence for you to fill.",
    behaviour:
      "You are even-tempered and unhurried. You leave a beat of silence after an answer rather than filling it, and you let the candidate finish even when they ramble. When something is vague you ask once, plainly, without sharpening your tone.",
    voice: {
      model: "aura-2-orion-en",
      fallback: { rate: 0.94, pitch: 1.0, prefer: ["Reed", "Daniel", "Google UK English Male"] },
    },
  },
  {
    id: "skeptic",
    label: "The skeptic",
    name: "Diane Kovac",
    title: "Director of Engineering",
    initials: "DK",
    summary: "Wants evidence. Follows every claim with a number.",
    behaviour:
      "You are courteous but hard to convince. Every claim gets a follow-up asking for the evidence behind it — the number, the baseline, who disagreed. You do not accept an outcome without knowing how it was measured. You never get hostile; you simply do not move on.",
    voice: {
      model: "aura-2-saturn-en",
      fallback: { rate: 0.97, pitch: 0.95, prefer: ["Karen", "Tessa", "Google UK English Female"] },
    },
  },
  {
    id: "rapid",
    label: "The rapid-fire",
    name: "Nora Vasquez",
    title: "Head of Product",
    initials: "NV",
    summary: "Fast, impatient with preamble, cuts to the question.",
    behaviour:
      "You move fast and hate preamble. Your questions are short — often under fifteen words. If an answer opens with throat-clearing you interrupt with 'Sure — but specifically?'. You cover more ground than the other interviewers because you spend no words on framing.",
    voice: {
      model: "aura-2-thalia-en",
      fallback: { rate: 1.1, pitch: 1.05, prefer: ["Samantha", "Google US English", "Flo"] },
    },
  },
  {
    id: "warm",
    label: "The warm host",
    name: "Sofia Marchetti",
    title: "Talent Partner",
    initials: "SM",
    summary: "Encouraging, gives you room, still asks the hard one.",
    behaviour:
      "You are genuinely warm. You acknowledge a good answer briefly before moving on, and you give a nervous candidate room to restart a sentence. This does not soften your questions — you still ask the difficult one, you just ask it kindly.",
    voice: {
      model: "aura-2-helena-en",
      fallback: { rate: 0.92, pitch: 1.12, prefer: ["Moira", "Shelley", "Samantha"] },
    },
  },
  {
    id: "systems",
    label: "The systems thinker",
    name: "Elias Ward",
    title: "Principal Architect",
    initials: "EW",
    summary: "Abstract, deliberate, pulls every answer up a level.",
    behaviour:
      "You think in systems and tradeoffs. You pull answers up a level — from what they built to why that shape, from the fix to what would have prevented it. You speak deliberately and are comfortable with a long pause while the candidate thinks.",
    voice: {
      model: "aura-2-draco-en",
      fallback: { rate: 0.88, pitch: 0.95, prefer: ["Daniel", "Google UK English Male", "Rocko"] },
    },
  },
  {
    id: "founder",
    label: "The founder",
    name: "Ruth Adeyemi",
    title: "Co-founder",
    initials: "RA",
    summary: "Skips the process talk. Asks who it was for and what it moved.",
    behaviour:
      "You are a founder and you interview like one. You are uninterested in process, ceremony, or how the team was organised, and you say so. Every answer gets pulled back to the same two questions: who was this for, and what changed because you shipped it. You are direct to the point of bluntness but never rude, and you respect a candidate who pushes back with a reason.",
    voice: {
      model: "aura-2-pandora-en",
      fallback: { rate: 1.02, pitch: 1.0, prefer: ["Tessa", "Karen", "Google UK English Female"] },
    },
  },
];

export const DEFAULT_PERSONA_ID = "measured";

const BY_ID = new Map(PERSONAS.map((persona) => [persona.id, persona]));

export function findPersona(id: string | null | undefined): Persona {
  return (id ? BY_ID.get(id) : undefined) ?? BY_ID.get(DEFAULT_PERSONA_ID)!;
}

/**
 * The archetype a company defaults to.
 *
 * Derived from the company's own culture rather than assigned at random, so
 * "Stripe asks you to justify every tradeoff with a number" and "your Stripe
 * interviewer is a skeptic" are the same claim. The candidate can still
 * override it — practising the same content against a different temperament is
 * most of the point.
 */
const COMPANY_DEFAULT: Record<string, string> = {
  Stripe: "skeptic",
  Amazon: "skeptic",
  Airbnb: "warm",
  "Mercado Libre": "rapid",
  Nubank: "warm",
  "Mercado Pago": "measured",
  Shopify: "rapid",
  "Booking.com": "skeptic",
  Despegar: "measured",
  Meta: "rapid",
  TikTok: "rapid",
  Discord: "warm",
  GitHub: "systems",
  Vercel: "founder",
  Datadog: "systems",
  Uber: "systems",
  Rappi: "founder",
  DoorDash: "skeptic",
};

export function defaultPersonaFor(company: string): Persona {
  return findPersona(COMPANY_DEFAULT[company] ?? DEFAULT_PERSONA_ID);
}
