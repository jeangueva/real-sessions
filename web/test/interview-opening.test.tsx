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
    expect(source).toContain("if (voice.speaking || voice.listening) return;");
  });

  it("keeps the microphone open for the rest of the call", () => {
    // Not a one-shot: it reopens after every turn, which is what makes the
    // interview a conversation rather than a sequence of button presses. The
    // first attempt burned a flag before `startListening` had refused, and
    // the microphone stayed shut for the whole interview.
    expect(source).not.toContain("opened.current");
    expect(source).toContain("if (!turn || turn.isComplete) return;");
  });

  it("does not reopen a microphone the candidate closed", () => {
    // An effect that reopened it a frame later is a product arguing with the
    // person using it.
    expect(source).toContain("if (micOff ||");
    expect(source).toContain("setMicOff(true)");
  });

  it("leaves the microphone shut until the candidate opens it", () => {
    // The interviewer introduces themselves either way. What must not happen
    // is a microphone opening because someone opened a page — they land here
    // with a room around them and no reason to expect they are being heard.
    expect(source).toContain("const [micOff, setMicOff] = useState(true)");
  });

  it("routes a blocked click back through startVoice", () => {
    // With voice on from the start, a browser that refused to play needs the
    // click to reach the code that speaks the pending turn. Straight to the
    // microphone would open it and leave the interviewer mute.
    expect(source).toContain("if (!voiceOn || voice.blocked)");
  });
});

/**
 * Which voice says the opening turn.
 *
 * The server picks the interviewer when none was chosen and announces it in
 * the session event — but that arrives as React state, while the first words
 * stream in a moment later against a speech output still built from the empty
 * id. Spoken then, the opening came out in the default voice and everything
 * after it in the assigned one: the interviewer changed person after their
 * first sentence.
 */
describe("the opening voice", () => {
  it("holds the first turn's audio rather than speaking it in the wrong voice", () => {
    expect(source).toContain("held.current.push(chunk)");
    // Released only once a render knows who is speaking.
    expect(source).toContain("if ((!persona && !releaseHeld) || held.current.length === 0) return;");
  });

  it("speaks anyway if the interviewer is never announced", () => {
    // A turn in the wrong voice is a smaller failure than a turn nobody
    // hears, so the wait has an end.
    expect(source).toContain("setReleaseHeld(true)");
  });

  it("shows the words while the audio waits", () => {
    // Only the sound is held. Holding the text too would look like a stall.
    expect(source).toContain("setStreaming((current) => current + chunk);");
  });
});
