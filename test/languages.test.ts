import { describe, expect, it } from "vitest";
import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  findLanguage,
  voiceFor,
} from "../src/languages.js";
import { PERSONAS } from "../src/personas.js";
import { AURA_VOICES } from "../src/voice/tts.js";
import { liveQuery } from "../src/voice/deepgram.js";
import { buildInterviewerPrompt } from "../src/prompts/interviewer.js";
import { buildEvaluatorPrompt } from "../src/prompts/evaluator.js";
import { capabilitiesFor } from "../src/entitlements.js";
import { nameFromEmail } from "../src/user-store.js";
import type { InterviewContext } from "../src/types.js";

/**
 * The language the interview is conducted in.
 *
 * The failure this guards against is the quiet one: a Spanish interview
 * transcribed by an English-only model returns confident nonsense rather than
 * an error, and a Spanish answer graded against an English rubric marks a
 * fluent candidate down for not being fluent in a language they were not
 * speaking. Both look like the product working.
 */

const context = (): InterviewContext => ({
  candidateName: "Mariana",
  targetRole: "Backend Engineer",
  companyName: "Stripe",
  companyCulture: "Rigour, ownership, evidence",
  industry: "Fintech",
  interviewStage: "Behavioral",
});

describe("findLanguage", () => {
  it("resolves the three we offer", () => {
    expect(findLanguage("en").id).toBe("en");
    expect(findLanguage("es").id).toBe("es");
    expect(findLanguage("pt").id).toBe("pt");
  });

  it("falls back to English rather than throwing", () => {
    // An unknown code means a stale client. Refusing to interview someone
    // over it is a worse answer than running the one the product is named for.
    expect(findLanguage("klingon").id).toBe(DEFAULT_LANGUAGE);
    expect(findLanguage(null).id).toBe(DEFAULT_LANGUAGE);
    expect(findLanguage(undefined).id).toBe(DEFAULT_LANGUAGE);
  });
});

describe("transcription follows the language", () => {
  it("uses an English-capable model for English", () => {
    const query = new URLSearchParams(liveQuery("en"));
    expect(query.get("language")).toBe("en-US");
    expect(query.get("model")).toBe("nova-3");
  });

  it("drops to a model that actually hears Spanish", () => {
    // Nova-3 is English-only on this account. Sending Spanish to it does not
    // fail — it returns English words that were never said.
    const query = new URLSearchParams(liveQuery("es"));
    expect(query.get("language")).toBe("es-419");
    expect(query.get("model")).toBe("nova-2");
  });

  it("does the same for Portuguese", () => {
    const query = new URLSearchParams(liveQuery("pt"));
    expect(query.get("language")).toBe("pt-BR");
    expect(query.get("model")).toBe("nova-2");
  });

  it("keeps the endpointing that makes a conversation feel live", () => {
    // Whatever the language, a candidate still pauses to think.
    for (const language of LANGUAGES) {
      const query = new URLSearchParams(liveQuery(language.id));
      expect(query.get("endpointing"), language.id).toBe("700");
      expect(query.get("interim_results"), language.id).toBe("true");
    }
  });
});

describe("voiceFor", () => {
  it("gives every interviewer a real Spanish voice", () => {
    for (const persona of PERSONAS) {
      const voice = voiceFor(persona.id, persona.voice.model, findLanguage("es"));
      expect(voice, persona.id).not.toBeNull();
      expect(voice, persona.id).toContain("-es");
    }
  });

  it("keeps the English voice for English", () => {
    for (const persona of PERSONAS) {
      expect(voiceFor(persona.id, persona.voice.model, findLanguage("en"))).toBe(
        persona.voice.model,
      );
    }
  });

  it("returns null for Portuguese, because the vendor has no voice", () => {
    // Checked against Deepgram's model list: Aura covers de, en, es, fr, it,
    // ja and nl. Null is the honest answer and the client falls back to the
    // browser's own synthesiser.
    for (const persona of PERSONAS) {
      expect(voiceFor(persona.id, persona.voice.model, findLanguage("pt"))).toBeNull();
    }
  });

  it("names a voice the allowlist has not been told about", () => {
    // The Spanish voices are not in AURA_VOICES, which only lists the English
    // set — a reminder that the allowlist has to grow with this map or the
    // speak route will refuse every Spanish phrase.
    const spanish = voiceFor("measured", "aura-2-orion-en", findLanguage("es"));
    expect(spanish).toBeTruthy();
    expect(AURA_VOICES.has(spanish!)).toBe(true);
  });
});

describe("the prompts are told which language", () => {
  it("tells the interviewer to conduct it in Spanish", () => {
    const prompt = buildInterviewerPrompt(context(), {
      personaId: "measured",
      language: "es",
    });
    expect(prompt).toContain("entire interview in Spanish");
    // Technical terms have no natural translation and inventing them is worse
    // than borrowing them.
    expect(prompt).toContain("pull request");
  });

  it("defaults to English when nobody chose", () => {
    const prompt = buildInterviewerPrompt(context(), { personaId: "measured" });
    expect(prompt).toContain("entire interview in English");
  });

  it("tells the evaluator which language it is grading", () => {
    const prompt = buildEvaluatorPrompt(context(), undefined, "pt");
    expect(prompt).toContain("Brazilian Portuguese");
    // The report is still read in English.
    expect(prompt).toContain("write your feedback in English");
  });
});

describe("the paywall", () => {
  it("is a paid feature", () => {
    expect(capabilitiesFor("free").interviewLanguage).toBe(false);
    expect(capabilitiesFor("premium").interviewLanguage).toBe(true);
  });
});

describe("what the interviewer calls you", () => {
  it("takes a first name from an email that has one", () => {
    expect(nameFromEmail("jean.perez@work.com")).toBe("Jean");
    expect(nameFromEmail("mariana_lopes@work.com")).toBe("Mariana");
    expect(nameFromEmail("ANA@work.com")).toBe("Ana");
  });

  it("returns nothing for the shapes that are clearly not a name", () => {
    // Initials and digits, which no greeting should ever use.
    expect(nameFromEmail("jp@work.com")).toBe("");
    expect(nameFromEmail("j.perez@work.com")).toBe("");
    expect(nameFromEmail("42@work.com")).toBe("");
    expect(nameFromEmail(null)).toBe("");
    expect(nameFromEmail("")).toBe("");
  });

  it("cannot tell a squashed login from a short name, and says so", () => {
    // "jperez" and "ana" are the same shape to any rule that does not know
    // which one is a person. This returns "Jperez", and the honest fix is not
    // a cleverer heuristic — it is the name field in settings, which always
    // wins over this guess.
    expect(nameFromEmail("jperez@work.com")).toBe("Jperez");
  });

  it("keeps accented names intact", () => {
    expect(nameFromEmail("joão@work.com")).toBe("João");
  });
});
