import { describe, expect, it } from "vitest";
import {
  computeMetrics,
  countFillers,
  movingTypeTokenRatio,
  responseGaps,
  words,
  LONG_PAUSE_MS,
} from "../src/metrics.js";
import type { RecordedTurn } from "../src/progress-store.js";

/** Builds a turn, defaulting the timings off so text-only cases stay readable. */
function turn(
  idx: number,
  speaker: "interviewer" | "candidate",
  text: string,
  tStartMs: number | null = null,
  tEndMs: number | null = null,
): RecordedTurn {
  return { idx, speaker, text, tStartMs, tEndMs };
}

describe("words", () => {
  it("strips punctuation without splitting contractions", () => {
    expect(words("I don't know — really!")).toEqual(["i", "don't", "know", "really"]);
  });

  it("returns nothing for empty text", () => {
    expect(words("   ")).toEqual([]);
  });
});

describe("countFillers", () => {
  it("counts disfluencies regardless of how they are drawn out", () => {
    expect(countFillers("um, uhh, ummm, er")).toBe(4);
  });

  it("counts multi-word discourse markers", () => {
    expect(countFillers("It was, you know, sort of a big deal")).toBe(2);
  });

  it("does not count 'like' used as a verb", () => {
    // The whole reason single-word markers are excluded: this must be zero,
    // or the metric punishes ordinary English.
    expect(countFillers("I like the approach and they liked it too")).toBe(0);
  });

  it("counts 'like' when it is fenced by commas", () => {
    expect(countFillers("It was, like, three weeks")).toBe(1);
  });
});

describe("movingTypeTokenRatio", () => {
  it("is 1 when every word is distinct", () => {
    expect(movingTypeTokenRatio(["a", "b", "c"])).toBe(1);
  });

  it("falls as words repeat", () => {
    expect(movingTypeTokenRatio(["a", "a", "a", "a"])).toBe(0.25);
  });

  it("does not punish a longer transcript for being longer", () => {
    // The point of the moving average. Plain unique/total would score the
    // long sample far lower purely because it contains more words.
    const vocabulary = Array.from({ length: 50 }, (_, i) => `w${i}`);
    const short = [...vocabulary];
    const long = [...vocabulary, ...vocabulary, ...vocabulary];
    expect(movingTypeTokenRatio(long)!).toBeCloseTo(movingTypeTokenRatio(short)!, 1);
  });

  it("returns null with nothing to measure", () => {
    expect(movingTypeTokenRatio([])).toBeNull();
  });
});

describe("responseGaps", () => {
  it("measures from the interviewer finishing to the candidate starting", () => {
    const turns = [
      turn(0, "interviewer", "Tell me about a project.", 0, 4_000),
      turn(1, "candidate", "Sure, last year I led a migration.", 5_500, 12_000),
    ];
    expect(responseGaps(turns)).toEqual([1_500]);
  });

  it("drops interruptions rather than counting them as fast thinking", () => {
    const turns = [
      turn(0, "interviewer", "Tell me about a project.", 0, 4_000),
      // Started before the interviewer finished. Clamping this to zero would
      // pull the mean down and read as a quick, confident answer.
      turn(1, "candidate", "Yes—", 3_000, 9_000),
    ];
    expect(responseGaps(turns)).toEqual([]);
  });

  it("ignores two turns from the same speaker in a row", () => {
    const turns = [
      turn(0, "candidate", "Sorry, one more thing.", 0, 1_000),
      turn(1, "candidate", "It shipped in March.", 2_000, 4_000),
    ];
    expect(responseGaps(turns)).toEqual([]);
  });
});

describe("computeMetrics", () => {
  const spoken: RecordedTurn[] = [
    turn(0, "interviewer", "Tell me about a hard tradeoff.", 0, 3_000),
    turn(1, "candidate", "um we cut the export feature to ship on time", 5_000, 11_000),
    turn(2, "interviewer", "What did that cost you?", 12_000, 14_000),
    turn(3, "candidate", "about forty users complained in the first week", 20_000, 26_000),
  ];

  it("derives a speaking rate from the timed turns only", () => {
    const metrics = computeMetrics(spoken);
    // 10 + 8 = 18 words across 12s of speech = 90 wpm.
    expect(metrics.words).toBe(18);
    expect(metrics.speakingMs).toBe(12_000);
    expect(metrics.wpm).toBeCloseTo(90, 5);
    expect(metrics.fromSpeech).toBe(true);
  });

  it("counts a slow start as a long pause", () => {
    const metrics = computeMetrics(spoken);
    expect(metrics.timeToFirstMs).toBe(2_000);
    // Gaps are 2s and 6s; only the second is over the threshold.
    expect(metrics.avgResponseMs).toBe(4_000);
    expect(metrics.longPauses).toBe(1);
    expect(LONG_PAUSE_MS).toBe(3_000);
  });

  it("reports the candidate's share of the words", () => {
    const metrics = computeMetrics(spoken);
    // 18 candidate words against 29 in total.
    expect(metrics.wordShare).toBeCloseTo(18 / 29, 5);
  });

  it("still derives the text metrics for a typed session", () => {
    const typed = [
      turn(0, "interviewer", "Why did you leave?"),
      turn(1, "candidate", "I wanted, you know, more ownership of the roadmap"),
    ];
    const metrics = computeMetrics(typed);
    expect(metrics.fromSpeech).toBe(false);
    expect(metrics.words).toBe(9);
    expect(metrics.fillerPer100).toBeCloseTo(100 / 9, 5);
    expect(metrics.vocabularyRange).not.toBeNull();
    // Nothing in the timing block may be invented from an assumed rate.
    expect(metrics.wpm).toBeNull();
    expect(metrics.speakingMs).toBeNull();
    expect(metrics.avgResponseMs).toBeNull();
    expect(metrics.longPauses).toBeNull();
  });

  it("ignores a turn missing one end of its timing", () => {
    const halfTimed = [
      turn(0, "interviewer", "And then?", 0, 1_000),
      turn(1, "candidate", "we shipped it", 2_000, null),
    ];
    const metrics = computeMetrics(halfTimed);
    expect(metrics.fromSpeech).toBe(false);
    expect(metrics.wpm).toBeNull();
    // The text half is unaffected.
    expect(metrics.words).toBe(3);
  });

  it("orders by idx rather than trusting array order", () => {
    const shuffled = [spoken[3]!, spoken[0]!, spoken[2]!, spoken[1]!];
    expect(computeMetrics(shuffled)).toEqual(computeMetrics(spoken));
  });

  it("survives a session with no candidate turns", () => {
    const metrics = computeMetrics([turn(0, "interviewer", "Hello?", 0, 500)]);
    expect(metrics.words).toBe(0);
    expect(metrics.fillerPer100).toBeNull();
    expect(metrics.vocabularyRange).toBeNull();
    expect(metrics.fromSpeech).toBe(false);
  });
});
