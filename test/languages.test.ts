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
import { buildCoachPrompt } from "../src/prompts/coach.js";
import { InterviewSession } from "../src/interviewer.js";
import { startConversation } from "../src/training/conversation.js";
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
  it("resolves the four simulation languages we offer (en, es, fr, pt)", () => {
    expect(findLanguage("en").id).toBe("en");
    expect(findLanguage("es").id).toBe("es");
    expect(findLanguage("fr").id).toBe("fr");
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

  it("does the same for French and Portuguese", () => {
    const frQuery = new URLSearchParams(liveQuery("fr"));
    expect(frQuery.get("language")).toBe("fr");
    expect(frQuery.get("model")).toBe("nova-2");

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
  it("gives every interviewer a real Spanish and French voice in AURA_VOICES", () => {
    for (const persona of PERSONAS) {
      const esVoice = voiceFor(persona.id, persona.voice.model, findLanguage("es"));
      expect(esVoice, persona.id).not.toBeNull();
      expect(esVoice, persona.id).toContain("-es");
      expect(AURA_VOICES.has(esVoice!)).toBe(true);

      const frVoice = voiceFor(persona.id, persona.voice.model, findLanguage("fr"));
      expect(frVoice, persona.id).not.toBeNull();
      expect(frVoice, persona.id).toContain("-fr");
      expect(AURA_VOICES.has(frVoice!)).toBe(true);
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
  it("tells the interviewer to conduct it in Spanish, French, or Portuguese", () => {
    const esPrompt = buildInterviewerPrompt(context(), {
      personaId: "measured",
      language: "es",
    });
    expect(esPrompt).toContain("entire interview in Spanish");
    expect(esPrompt).toContain("pull request");

    const frPrompt = buildInterviewerPrompt(context(), {
      personaId: "measured",
      language: "fr",
    });
    expect(frPrompt).toContain("entire interview in French");

    const ptPrompt = buildInterviewerPrompt(context(), {
      personaId: "measured",
      language: "pt",
    });
    expect(ptPrompt).toContain("entire interview in Brazilian Portuguese");
  });

  it("persists the selected language across InterviewSession snapshot and restore (turn 2+)", () => {
    const provider = {
      name: "stub",
      chat: async () => {
        throw new Error("not used");
      },
      json: async () => {
        throw new Error("not used");
      },
    };
    for (const lang of ["es", "fr", "pt", "en"] as const) {
      const original = new InterviewSession(context(), {
        provider,
        language: lang,
        level: "b1",
        pressure: true,
      });
      const restored = InterviewSession.restore(original.snapshot(), { provider });
      expect(restored.renderedSystemPrompt).toBe(original.renderedSystemPrompt);
      expect(restored.renderedSystemPrompt).toContain(
        `entire interview in ${findLanguage(lang).promptLabel}`,
      );
    }
  });

  it("tells the live coach and training roleplay partner which language to speak", async () => {
    expect(buildCoachPrompt(context(), { language: "fr" })).toContain("interviewing in French");
    expect(buildCoachPrompt(context(), { language: "es" })).toContain("interviewing in Spanish");

    const seenSystems: string[] = [];
    const provider = {
      name: "stub",
      chat: async (req: { system?: string }) => {
        seenSystems.push(req.system ?? "");
        return {
          text: "Bonjour, voyons le périmètre de lancement.",
          stopReason: "end_turn" as const,
          refused: false,
          usage: { inputTokens: 5, outputTokens: 5, cacheReadTokens: 0, cacheCreationTokens: 0 },
          latency: { ttftMs: 1, totalMs: 2 },
        };
      },
      json: async () => {
        throw new Error("not used");
      },
    };
    await startConversation(
      "user-1",
      { scenarioId: "founder-no", culture: "neutral", language: "fr" },
      provider,
    );
    expect(seenSystems[0]).toContain("Speak ONLY French");
  });

  it("defaults to English when nobody chose", () => {
    const prompt = buildInterviewerPrompt(context(), { personaId: "measured" });
    expect(prompt).toContain("entire interview in English");
  });

  it("tells the evaluator which language it is grading", () => {
    const prompt = buildEvaluatorPrompt(context(), undefined, "pt");
    expect(prompt).toContain("Brazilian Portuguese");
    // With no reader language given, the report defaults to English.
    expect(prompt).toContain("Write every piece of feedback in English");
  });

  it("writes the report in the reader's interface language", () => {
    const prompt = buildEvaluatorPrompt(context(), undefined, "en", undefined, false, "Spanish");
    expect(prompt).toContain("Write every piece of feedback in Spanish");
    // Never "the candidate", and no criticism dressed as a strength.
    expect(prompt).toContain('never as "the candidate"');
    expect(prompt).toContain("Never put a criticism there");
  });
});

describe("the paywall", () => {
  it("is part of preparing, so it is free", () => {
    expect(capabilitiesFor("free").interviewLanguage).toBe(true);
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
