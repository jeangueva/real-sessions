import { describe, expect, it } from "vitest";
import { readLevel, UNMEASURED } from "../src/lib/audio-level";

/**
 * The number behind the bars.
 *
 * The waveform is only worth drawing if it tracks the audio, so what is pinned
 * here is that silence reads as silence, that louder is higher, and that the
 * scaling puts ordinary speech somewhere a person can see — a meter that never
 * leaves the bottom decile is decoration with extra steps.
 */

/** An analyser that always hands back the same frame. */
function analyserOf(samples: number[]): AnalyserNode {
  return {
    getByteTimeDomainData: (buffer: Uint8Array) => {
      for (let i = 0; i < buffer.length; i += 1) buffer[i] = samples[i % samples.length]!;
    },
  } as unknown as AnalyserNode;
}

/** A sine wave at the given amplitude, in the byte-centred form the API uses. */
function tone(amplitude: number, length = 512): number[] {
  return Array.from({ length }, (_, i) =>
    Math.round(128 + Math.sin((i / length) * Math.PI * 2 * 8) * 127 * amplitude),
  );
}

const frame = () => new Uint8Array(new ArrayBuffer(512));

describe("readLevel", () => {
  it("reads silence as zero", () => {
    // A flat frame sits at 128, the midpoint — no deviation, no level.
    expect(readLevel(analyserOf([128]), frame())).toBe(0);
  });

  it("rises with amplitude", () => {
    const quiet = readLevel(analyserOf(tone(0.05)), frame());
    const talking = readLevel(analyserOf(tone(0.2)), frame());
    const loud = readLevel(analyserOf(tone(0.6)), frame());
    expect(quiet).toBeLessThan(talking);
    expect(talking).toBeLessThan(loud);
  });

  it("puts conversational speech in the visible middle of the range", () => {
    // Raw RMS for speech is around 0.05–0.15, which is invisible on a bar.
    // The scaling is the difference between a meter and a flat line.
    const speech = readLevel(analyserOf(tone(0.15)), frame());
    expect(speech).toBeGreaterThan(0.2);
    expect(speech).toBeLessThan(0.9);
  });

  it("never exceeds one, however loud the signal", () => {
    // Clipping the number here is what keeps a shout from scaling a bar past
    // its own container.
    expect(readLevel(analyserOf(tone(1)), frame())).toBeLessThanOrEqual(1);
    expect(readLevel(analyserOf([0, 255]), frame())).toBeLessThanOrEqual(1);
  });
});

describe("the unmeasured meter", () => {
  it("says so, and reads zero", () => {
    // The waveform branches on this: false means animate something generic
    // rather than draw a number that means nothing.
    expect(UNMEASURED.measured).toBe(false);
    expect(UNMEASURED.level()).toBe(0);
    expect(() => UNMEASURED.stop()).not.toThrow();
  });
});
