/**
 * Writes the candidate briefing that the interviewer reads before the call.
 *
 * Runs once per upload rather than per interview: the CV does not change
 * between sessions, and paying for a summarisation on every session start
 * would be the most expensive thing in the product for no added value.
 */
import { COACH_FALLBACKS, COACH_MODEL } from "./client.js";
import { resolveProvider } from "./providers/index.js";
import type { ModelProvider } from "./providers/index.js";
import { BRIEF_TEMPLATE, UNUSABLE } from "./prompts/brief.js";

export class BriefError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BriefError";
  }
}

/** Raw CV text longer than this is truncated before being summarised. */
const MAX_INPUT_CHARS = 24_000;

export async function writeBrief(
  sourceText: string,
  options: { provider?: ModelProvider; model?: string } = {},
): Promise<string> {
  const model = options.model ?? COACH_MODEL;
  const provider = options.provider ?? resolveProvider(model);

  const response = await provider.chat({
    model,
    system: BRIEF_TEMPLATE,
    // Truncated at the front rather than the back: the most recent role is at
    // the top of every CV, and it is what an interviewer opens on.
    messages: [{ role: "user", text: sourceText.slice(0, MAX_INPUT_CHARS) }],
    maxTokens: 512,
    ...(COACH_FALLBACKS.length > 0 ? { fallbacks: COACH_FALLBACKS } : {}),
  });

  if (response.refused) {
    throw new BriefError("The model declined to read that document.");
  }

  const brief = response.text.trim();
  if (brief === "" || brief.toUpperCase().startsWith(UNUSABLE)) {
    throw new BriefError(
      "That did not read as a CV or portfolio. Try a different file, or paste the text.",
    );
  }
  return brief;
}
