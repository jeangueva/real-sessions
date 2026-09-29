import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * How the interview opens.
 *
 * Three judgements that are invisible on screen when they break — the call
 * still works, it just feels like a form instead of a conversation — so they
 * are held against the source rather than a render.
 */
const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "../src/platform/LiveInterview.tsx"), "utf8");

describe("the opening turn", () => {
  it("has voice on before the first turn arrives", () => {
    // Off, the interviewer's introduction — the turn that sets up the whole
    // rehearsal — lands in silence and waits for a button.
    expect(source).toMatch(/useState\(true\);?\s*$/m);
    expect(source).toContain("const [voiceOn, setVoiceOn] = useState(true)");
  });

  it("waits for the interviewer to stop before opening the microphone", () => {
    // Recognition started while they are still talking hears the interviewer
    // through the speakers and answers for the candidate.
    expect(source).toContain("voice.speaking) return");
  });

  it("routes a blocked click back through startVoice", () => {
    // With voice on from the start, a browser that refused to play needs the
    // click to reach the code that speaks the pending turn. Straight to the
    // microphone would open it and leave the interviewer mute.
    expect(source).toContain("if (!voiceOn || voice.blocked)");
  });
});
