import { describe, expect, it, vi } from "vitest";
import {
  InterviewRefusalError,
  InterviewSession,
  splitCompletionFlag,
  withholdFlagTail,
} from "../src/interviewer.js";
import { INTERVIEWER_MODEL } from "../src/client.js";
import type {
  ChatRequest,
  ChatResponse,
  ModelProvider,
} from "../src/providers/index.js";
import { context } from "./fixtures.js";

/** Builds a provider stub that replays canned turns and records requests. */
function stubProvider(turns: { text: string; refused?: boolean }[]) {
  const chat = vi.fn(async (request: ChatRequest): Promise<ChatResponse> => {
    const next = turns.shift() ?? { text: "" };
    // Streaming callers get the whole turn as one chunk.
    request.onDelta?.(next.text);
    return {
      text: next.text,
      stopReason: next.refused ? "refusal" : "end_turn",
      refused: next.refused ?? false,
      usage: {
        inputTokens: 10,
        outputTokens: 10,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
      },
      latency: { ttftMs: 5, totalMs: 20 },
    };
  });
  const provider: ModelProvider = {
    name: "stub",
    chat,
    json: async () => {
      throw new Error("not used");
    },
  };
  return { provider, chat };
}

describe("splitCompletionFlag", () => {
  it("detects and strips the flag", () => {
    expect(splitCompletionFlag("Thanks for your time. [INTERVIEW_COMPLETE]")).toEqual(
      { text: "Thanks for your time.", isComplete: true },
    );
  });

  it("leaves ordinary text untouched", () => {
    expect(splitCompletionFlag("What did you measure?")).toEqual({
      text: "What did you measure?",
      isComplete: false,
    });
  });
});

describe("withholdFlagTail", () => {
  it("holds back a partial flag at a chunk boundary", () => {
    expect(withholdFlagTail("Goodbye. [INTERV")).toBe("Goodbye. ");
  });

  it("passes through an unrelated bracket", () => {
    expect(withholdFlagTail("Use O[n] notation")).toBe("Use O[n] notation");
  });

  it("removes a whole flag inside one chunk", () => {
    expect(withholdFlagTail("Bye.[INTERVIEW_COMPLETE]")).toBe("Bye.");
  });
});

describe("InterviewSession", () => {
  it("opens with a user turn and returns the first question", async () => {
    const { provider, chat } = stubProvider([
      { text: "Hi Mariana, tell me about a project you're proud of." },
    ]);
    const session = new InterviewSession(context, { provider });

    const turn = await session.start();

    expect(turn.turnNumber).toBe(1);
    expect(turn.isComplete).toBe(false);
    const params = chat.mock.calls[0]![0];
    expect(params.messages[0]!.role).toBe("user");
    expect(params.model).toBe(INTERVIEWER_MODEL);
  });

  it("passes the rendered system prompt to the provider", async () => {
    const { provider, chat } = stubProvider([{ text: "Hello." }]);
    const session = new InterviewSession(context, { provider });
    await session.start();

    expect(chat.mock.calls[0]![0].system).toBe(session.renderedSystemPrompt);
  });

  it("rejects a second start()", async () => {
    const { provider } = stubProvider([{ text: "Hello." }]);
    const session = new InterviewSession(context, { provider });
    await session.start();
    await expect(session.start()).rejects.toThrow(/already started/);
  });

  it("rejects an empty candidate answer", async () => {
    const { provider } = stubProvider([{ text: "Hello." }]);
    const session = new InterviewSession(context, { provider });
    await session.start();
    await expect(session.submitAnswer("   ")).rejects.toThrow(/empty/);
  });

  it("marks the session complete on the flag and refuses further answers", async () => {
    const { provider } = stubProvider([
      { text: "Hello." },
      { text: "Great, thanks. [INTERVIEW_COMPLETE]" },
    ]);
    const session = new InterviewSession(context, { provider });
    await session.start();

    const last = await session.submitAnswer("I led a design system rollout.");

    expect(last.isComplete).toBe(true);
    expect(last.text).not.toContain("[INTERVIEW_COMPLETE]");
    expect(session.isComplete).toBe(true);
    await expect(session.submitAnswer("Anything else?")).rejects.toThrow(
      /already complete/,
    );
  });

  it("injects the wrap-up nudge on the final allowed turn", async () => {
    const { provider, chat } = stubProvider([
      { text: "Q1" },
      { text: "Q2" },
    ]);
    const session = new InterviewSession(context, { provider, maxTurns: 2 });
    await session.start();
    await session.submitAnswer("My answer.");

    // The params object holds a live reference to the session's message list,
    // so read the last *user* turn rather than the tail of the array.
    const params = chat.mock.calls[1]![0];
    const lastCandidateTurn = params.messages
      .filter((message) => message.role === "user")
      .at(-1)!;
    expect(lastCandidateTurn.text).toContain("final turn of the interview");
  });

  it("surfaces a refusal as a typed error", async () => {
    const { provider } = stubProvider([{ text: "", refused: true }]);
    const session = new InterviewSession(context, { provider });
    await expect(session.start()).rejects.toBeInstanceOf(InterviewRefusalError);
  });

  it("accumulates token usage across turns", async () => {
    const { provider } = stubProvider([
      { text: "Q1" },
      { text: "Q2" },
    ]);
    const session = new InterviewSession(context, { provider, maxTurns: 2 });
    await session.start();
    await session.submitAnswer("My answer.");

    // The stub reports 10 in / 10 out per call.
    expect(session.usage.inputTokens).toBe(20);
    expect(session.usage.outputTokens).toBe(20);
  });

  it("builds a transcript with operator notes removed", async () => {
    const { provider } = stubProvider([
      { text: "Hi Mariana, what are you proud of?" },
      { text: "Got it. Thanks. [INTERVIEW_COMPLETE]" },
    ]);
    const session = new InterviewSession(context, { provider, maxTurns: 2 });
    await session.start();
    await session.submitAnswer("I led a design system rollout.");

    expect(session.transcript).toEqual([
      { speaker: "interviewer", text: "Hi Mariana, what are you proud of?" },
      { speaker: "candidate", text: "I led a design system rollout." },
      { speaker: "interviewer", text: "Got it. Thanks." },
    ]);
  });
});

describe("snapshot and restore", () => {
  it("round-trips a session across processes", async () => {
    const { provider } = stubProvider([
      { text: "Q1" },
      { text: "Q2. [INTERVIEW_COMPLETE]" },
    ]);
    const original = new InterviewSession(context, { provider, maxTurns: 3 });
    await original.start();
    await original.submitAnswer("I led a design system rollout.");

    // Through JSON, the way it actually travels to a store and back.
    const wire = JSON.parse(JSON.stringify(original.snapshot()));
    const { provider: second } = stubProvider([{ text: "Q3" }]);
    const restored = InterviewSession.restore(wire, { provider: second });

    expect(restored.transcript).toEqual(original.transcript);
    expect(restored.turnCount).toBe(original.turnCount);
    expect(restored.usage).toEqual(original.usage);
    expect(restored.isComplete).toBe(original.isComplete);
  });

  it("keeps the conversation going after a restore", async () => {
    const { provider } = stubProvider([{ text: "Q1" }]);
    const original = new InterviewSession(context, { provider });
    await original.start();

    const { provider: second } = stubProvider([{ text: "Q2" }]);
    const restored = InterviewSession.restore(original.snapshot(), {
      provider: second,
    });
    const next = await restored.submitAnswer("My answer.");

    // Turn numbering continues rather than restarting at 1.
    expect(next.turnNumber).toBe(2);
    expect(restored.transcript).toHaveLength(3);
  });

  it("refuses a snapshot from a future version", () => {
    const { provider } = stubProvider([]);
    const snapshot = new InterviewSession(context, { provider }).snapshot();
    expect(() =>
      InterviewSession.restore({ ...snapshot, version: 2 as 1 }),
    ).toThrow(/Unsupported session snapshot version/);
  });
});
