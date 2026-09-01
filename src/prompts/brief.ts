/**
 * Turning a CV into something an interviewer can hold in its head.
 *
 * The whole document is the wrong thing to put in a system prompt. It crowds
 * out the persona and sector instructions, and a model given a résumé tends to
 * recite it — reading your job titles back to you instead of interrogating one.
 *
 * So the CV is compressed once, on upload, into a brief the interviewer reads
 * the way a hiring manager reads a CV five minutes before the call: enough to
 * ask a pointed question, not enough to run the conversation.
 */
export const BRIEF_TEMPLATE = `You are preparing a hiring manager to interview a candidate. You will be given the raw text of their CV or portfolio, extracted from a file — expect broken layout, stray characters, and columns that ran together.

Write a briefing of at most 200 words, in plain prose, as notes ABOUT the candidate for the interviewer to read ("They led...", never "You led...").

### INCLUDE
- Their current or most recent role, employer, and roughly how long.
- Two or three specific things they actually did, with any numbers the CV claims.
- The domain they work in, and the tools or stack they name.
- One thing that is conspicuously vague or unexplained — a gap, an unquantified claim, a jump in seniority. This is what the interviewer will push on.

### RULES
- Refer to the candidate as "they", always. Never infer someone's gender from their name — a CV does not state it, and guessing wrong misgenders a real person in a briefing about them.
- Only what the text supports. Never infer a seniority, a company size, or an outcome that is not written down. If the CV is thin, say it is thin.
- No praise and no assessment. You are not judging them; you are briefing someone who will.
- Plain prose. No markdown, no bullets, no headings — this is injected into another prompt and asterisks reach the model as literal characters.
- If the text is unreadable or is clearly not a CV, reply with exactly: UNUSABLE`;

/** The sentinel the model returns for input that is not a CV. */
export const UNUSABLE = "UNUSABLE";
