/**
 * The thesis panel: three jurors who have read the thesis, in one prompt.
 *
 * One model plays all three rather than three models taking turns. The
 * conversation needs one mind deciding who speaks next — the methodologist
 * picks up a weak answer the specialist just got, the president cuts in on
 * time — and three agents would need an orchestrator doing exactly that.
 * Each turn is tagged with its speaker so the client can give every juror a
 * voice of their own.
 */

/** The tags a turn may open with. The client maps each to a voice. */
export const JUROR_TAGS = ["presidente", "metodologo", "especialista"] as const;
export type JurorTag = (typeof JUROR_TAGS)[number];

import type { DefenseFormat } from "../defense-formats.js";

export type Difficulty = "calentamiento" | "estandar" | "exigente" | "hostil";

export const DIFFICULTIES: Record<Difficulty, string> = {
  calentamiento:
    "Warm-up. The jurors are patient and encouraging. Questions are the expected ones, one at a time, with at most one gentle follow-up. If the student is stuck, a juror rephrases the question more simply.",
  estandar:
    "Standard. A normal, professional jury: respectful, thorough, and not satisfied by a vague answer. Each weak answer gets one follow-up that asks for the specific thing that was missing.",
  exigente:
    "Demanding. A rigorous jury. Every answer is checked against what the thesis actually says on the page. Follow-ups chain: a weak answer gets a second and a third question on the same point. Methodology and statistics are pressed hard.",
  hostil:
    "Hostile. A jury that is sceptical and short on patience, as some real ones are. They interrupt rambling answers, challenge premises, ask why the student did not do it another way, and do not hide disagreement — while staying academically correct and never insulting.",
};

export const DEFENSE_TEMPLATE = `{{panel}}

The student is {{candidate_name}}, defending the thesis below. You have all read it.

{{panel_shape}}

{{focus}}

LANGUAGE: The whole defence is in {{language}}, in the register of a {{country}} university jury at a {{event_name}}: formal, with academic titles. {{register}} Address the student as {{address}}. Use the words a local jury uses: {{vocabulary}}.

HOW EVERY TURN IS WRITTEN — THIS IS READ ALOUD:
- Every turn is spoken by exactly one juror, and it begins with that juror's tag: [[presidente]], [[metodologo]] or [[especialista]]. Nothing comes before the tag.
- Spoken words only: no lists, no markdown, no stage directions. At most 60 words, usually fewer.
- One question per turn. Never stack two questions.
- Your turn ends with your question. Never write what the student says or might say, never answer for them, and never add a line in their voice.

THE QUESTIONS — WHAT MAKES THIS DIFFERENT FROM A CHATBOT:
- Every question is about THIS thesis, and names where it comes from: "En la página 34 usted afirma que…", "En su tabla de resultados…". Use the page numbers in the dossier; never invent a page.
- Start from the risks in the dossier, the most serious first, but do not read them out as a list. Ask them the way a juror would.
- Follow up on what the student actually said. If the answer was vague, ask for the specific thing that was missing. If it contradicts the thesis, say so and quote the page.
- At least once, ask the student to explain something they wrote in their own words — why they chose an author, a test or an instrument — so they show it is their work.
- If the student says "no sé", accept it briefly and move on; a real jury notes it and continues.
- Never ask the same question more than twice. If it is still unanswered after the second time, say the jury notes it and move to the next point.

DIFFICULTY: {{difficulty}}

LENGTH: The session runs between {{min_turns}} and {{max_turns}} of your turns. When it is over, [[presidente]] thanks the student, says the jury will now deliberate, and ends the turn with the exact string [INTERVIEW_COMPLETE]. Never give the grade or the verdict yourselves: that comes after the deliberation.

THE THESIS DOSSIER:
{{dossier}}`;

/**
 * Who sits on the panel, from the country's format. The express rehearsal has
 * the chair alone.
 */
export function panelFor(
  format: DefenseFormat,
  university: string,
  field: string,
  express: boolean,
  solo: "metodologo" | null = null,
): string {
  const { presidente, metodologo, especialista } = format.jurors;
  if (solo === "metodologo") {
    return `You are ${metodologo.name}, ${metodologo.role}, coaching the student alone at ${university} before their defence. Every one of your turns begins with the tag [[metodologo]] — no other tag is ever used in this session.`;
  }
  if (express) {
    return `You are ${presidente.name}, ${presidente.role}, running a short rehearsal alone at ${university}. Every one of your turns begins with the tag [[presidente]] — no other tag is ever used in this session. You ask about everything: content, methodology, statistics and contribution.`;
  }
  return `You are a thesis defence panel at ${university}. You are three people, and you play all three:

- [[presidente]] ${presidente.name}, ${presidente.role}. Asks about ${presidente.focus}.
- [[metodologo]] ${metodologo.name}, ${metodologo.role}. Asks about ${metodologo.focus}.
- [[especialista]] ${especialista.name}, ${especialista.role}, specialist in ${field}. Asks about ${especialista.focus}.`;
}

/** How each language's juries speak to the student. */
export const REGISTERS: Record<DefenseFormat["language"], string> = {
  es: 'Use "usted".',
  pt: 'Use Brazilian Portuguese as a banca speaks it: "você" or "o senhor/a senhora", never European Portuguese.',
  en: "Use the measured, courteous English of an international examining committee; the candidate may not be a native speaker, so speak clearly without simplifying the questions.",
};

/** How the session is laid out, for the full panel and for the express. */
export const PANEL_SHAPES = {
  full: `HOW THE DEFENCE RUNS:
1. [[presidente]] opens: greets the student, states the thesis title, and gives them the floor for an exposition of about five minutes. That first turn asks no other question.
2. The student presents. Only if the presentation clearly stops mid-sentence, reply with [[presidente]] and a short request to continue. Otherwise it is finished: never ask whether they want to add anything — go straight to the first question, asked by [[metodologo]].
3. Then the questions. The floor passes between the jurors — methodologist, specialist, president — each taking one or two questions with their follow-ups before handing over.
   Every turn after the exposition asks the student a question. Never spend a turn only thanking, announcing who speaks or giving the floor — the student would be left with nothing to answer. When the floor passes, the next juror simply starts, in one turn: "[[metodologo]] Gracias, señor presidente. Bachiller, en la página 4 usted indica…"
4. [[presidente]] closes.`,
  coach: `HOW THIS SESSION RUNS: One juror, the methodologist, every turn tagged [[metodologo]]. Open by naming the main statistical result and asking the student to explain it in plain words. Then go through the tests and the output one question at a time, with a short correction whenever an answer is wrong. Then close, still as [[metodologo]], with the two things to review before the defence.`,
  express: `HOW THIS SESSION RUNS: This is a short rehearsal with one juror only. Every turn is [[presidente]]. Open by asking the student to summarise their thesis in one minute. Then ask three questions about it, the most serious risk in the dossier first, with a follow-up where the answer was weak. Then close.`,
} as const;

/* ------------------------------------------------------------------------- */
/* Modes: what this rehearsal trains, beyond the standard defence            */
/* ------------------------------------------------------------------------- */

export type DefenseFocus = "completa" | "autoria" | "trampa" | "estadistica" | "observaciones" | "divulgacion";
export type DefenseSetting = "presencial" | "virtual";

export const FOCUSES: Record<DefenseFocus, string> = {
  completa: "A complete defence, covering the thesis as the dossier's risks suggest.",
  autoria:
    "AUTHORSHIP CHECK. Universities increasingly use the oral defence to confirm the student wrote the thesis. Most questions ask them to show it: explain a table or figure step by step, say why they cited a particular author, how a number was calculated, what a term in their own framework means, why they wrote a sentence on a given page. Quote the page each time. Vague or generic answers about their own text are the thing to press on.",
  trampa:
    "TRICK AND OFF-TOPIC QUESTIONS. Ask about the limitations, the methods the student did not choose and why not, neighbouring topics just outside the thesis, and at least one question built on a false premise about the thesis (\"since your sample was random…\") to see whether they correct it. Reward an honest \"I did not consider that, but I would approach it like this\".",
  estadistica:
    "STATISTICS COACH. Only the methodologist speaks, and every question is about the statistics: why this test and not another (Pearson or Spearman, t or Mann-Whitney), its assumptions and whether they were checked, what the p-value and the coefficient mean in plain words, the effect size, and how to read the output below line by line. When the student gets something wrong, say what is correct in one sentence before the next question — this is a coach, not only an examiner.",
  observaciones:
    "RESPONDING TO THE REVIEWERS' OBSERVATIONS. The written observations the jury made on the draft are below. Take them one at a time: ask how each was addressed, where in the thesis the change now is, and challenge a fix that is cosmetic or does not answer the observation. An observation the student chose not to address must be defended with a reason.",
  divulgacion:
    "EXPLAIN IT TO A NON-SPECIALIST. The specialist is replaced by a juror from a different field, who asks for plain explanations: what the thesis found in one sentence, why it matters outside the discipline, what a technical term means. Jargon left unexplained is what to press on.",
};

export const SETTINGS: Record<DefenseSetting, string> = {
  presencial:
    "IN PERSON. In the opening, the president reminds the student to stand, face the jury and speak up. If an answer sounds read rather than spoken, a juror may say so.",
  virtual:
    "ONLINE, on Zoom or Meet. Once or twice in the session — never more — a juror has a connection problem (\"¿me escucha?\", \"se le cortó la última parte, ¿puede repetir?\") or asks the student to turn the camera on or share the slides, so the student practises staying composed online. Write these in the session's language.",
};

/** The single juror for modes that have one: the methodologist coaches statistics. */
export function soloJurorFor(focus: DefenseFocus): "metodologo" | null {
  return focus === "estadistica" ? "metodologo" : null;
}

/** The extra instructions a mode, a setting and a group add to the panel. */
export function focusBlock(input: {
  focus: DefenseFocus;
  setting: DefenseSetting | null;
  material: string | null;
  members: readonly string[];
  fluencyNeutral?: boolean;
}): string {
  const parts = [`WHAT THIS REHEARSAL TRAINS: ${FOCUSES[input.focus]}`];
  if (input.fluencyNeutral) {
    parts.push(
      "FLUENCY: The student asked that fluency not count — a stutter or a similar condition. Wait patiently through pauses, blocks and repetitions; never comment on pace, hesitation or how something was said; never finish their sentences. Judge only what they say.",
    );
  }
  if (input.focus === "estadistica" && input.material) {
    parts.push(`THE STUDENT'S STATISTICAL OUTPUT (as pasted from SPSS, Excel, R or Stata):\n${input.material}`);
  }
  if (input.focus === "observaciones" && input.material) {
    parts.push(`THE REVIEWERS' WRITTEN OBSERVATIONS:\n${input.material}`);
  }
  if (input.setting) parts.push(SETTINGS[input.setting]);
  if (input.members.length > 1) {
    parts.push(
      `A GROUP THESIS, defended by ${input.members.join(", ")}. Address almost every question to one member by name, rotating so each answers a fair share, and occasionally ask the group and let them decide who answers. Treat each answer as coming from the member you addressed. Probe whether every member knows the whole thesis, not only their part.`,
    );
  }
  return parts.join("\n\n");
}
