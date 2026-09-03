import { INTERVIEWER_FALLBACKS, INTERVIEWER_MODEL } from "./client.js";
import { resolveProvider } from "./providers/index.js";
import type {
  ChatTurn,
  ModelProvider,
  ProviderUsage,
} from "./providers/index.js";
import {
  buildInterviewerPrompt,
  WRAP_UP_INSTRUCTION,
} from "./prompts/interviewer.js";
import { defaultPersonaFor } from "./personas.js";
import {
  INTERVIEW_COMPLETE_FLAG,
  type InterviewContext,
  type InterviewerTurn,
  type TranscriptTurn,
} from "./types.js";

/** Opens the session: the API requires the first message to be from `user`. */
export const SESSION_KICKOFF_MESSAGE =
  "[SESSION NOTE — not spoken by the candidate] The candidate has joined the call. Begin the interview.";

/** Raised when the model declines the request (`stop_reason: "refusal"`). */
export class InterviewRefusalError extends Error {
  constructor(
    message: string,
    readonly category: string | null,
  ) {
    super(message);
    this.name = "InterviewRefusalError";
  }
}

/** Token spend accumulated across a session — the real per-interview cost. */
export type SessionUsage = ProviderUsage;

/**
 * Everything needed to rebuild a session on another process. Plain JSON — a
 * live `InterviewSession` holds a provider client and methods, neither of
 * which survives a round trip through a store.
 */
export interface SessionSnapshot {
  version: 1;
  context: InterviewContext;
  model: string;
  maxTokens: number;
  minTurns: number;
  maxTurns: number;
  fallbackModels: string[];
  /** Optional: a snapshot written before personas existed has none. */
  personaId?: string;
  /** The candidate briefing in force for this session, if any. */
  candidateBrief?: string | null;
  /** Verified questions this session was built with. */
  knownQuestions?: string[];
  messages: ChatTurn[];
  interviewerTurns: number;
  complete: boolean;
  usage: SessionUsage;
  turnLatencies: number[];
  ttfts: number[];
}

export interface InterviewSessionOptions {
  /** Defaults to the vendor implied by `model`. Inject a stub in tests. */
  provider?: ModelProvider;
  model?: string;
  /** Responses are voice-length (<40 words), so this stays deliberately small. */
  maxTokens?: number;
  minTurns?: number;
  maxTurns?: number;
  /**
   * Models to try in order if the primary is unavailable. Server-side routing
   * on OpenRouter; ignored by providers without it.
   */
  fallbackModels?: string[];
  /** Interviewer archetype. Defaults to the one the company implies. */
  personaId?: string;
  /** Candidate briefing, from an uploaded CV or portfolio. */
  candidateBrief?: string | null;
  /** Verified crowd-reported questions for this company. */
  knownQuestions?: readonly string[];
}

/**
 * Splits `[INTERVIEW_COMPLETE]` off a response.
 * The flag is a control signal for the backend, never something TTS should say.
 */
export function splitCompletionFlag(raw: string): {
  text: string;
  isComplete: boolean;
} {
  const isComplete = raw.includes(INTERVIEW_COMPLETE_FLAG);
  const text = raw.split(INTERVIEW_COMPLETE_FLAG).join("").trim();
  return { text, isComplete };
}

/**
 * Phase 1 driver. Holds the conversation state for one live interview; the
 * caller feeds it transcribed candidate speech and gets back text to speak.
 */
export class InterviewSession {
  private readonly provider: ModelProvider;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly minTurns: number;
  private readonly maxTurns: number;
  private readonly fallbackModels: string[];
  private readonly personaId: string;
  private readonly candidateBrief: string | null;
  private readonly knownQuestions: string[];
  private readonly systemPrompt: string;
  private readonly messages: ChatTurn[] = [];
  private interviewerTurns = 0;
  private complete = false;
  private readonly turnLatencies: number[] = [];
  private readonly ttfts: number[] = [];
  private readonly usageTotals: SessionUsage = {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
  };

  constructor(
    readonly context: InterviewContext,
    options: InterviewSessionOptions = {},
  ) {
    const maxTurns = options.maxTurns ?? 7;
    // A caller who shortens the session shouldn't also have to restate the floor.
    const minTurns = Math.min(options.minTurns ?? 5, maxTurns);
    this.model = options.model ?? INTERVIEWER_MODEL;
    this.provider = options.provider ?? resolveProvider(this.model);
    this.maxTokens = options.maxTokens ?? 512;
    this.minTurns = minTurns;
    this.maxTurns = maxTurns;
    this.fallbackModels = options.fallbackModels ?? INTERVIEWER_FALLBACKS;
    this.personaId = options.personaId ?? defaultPersonaFor(context.companyName).id;
    this.candidateBrief = options.candidateBrief ?? null;
    this.knownQuestions = [...(options.knownQuestions ?? [])];
    this.systemPrompt = buildInterviewerPrompt(context, {
      minTurns,
      maxTurns,
      personaId: this.personaId,
      candidateBrief: this.candidateBrief,
      knownQuestions: this.knownQuestions,
    });
  }

  /** True once the model has emitted `[INTERVIEW_COMPLETE]`. */
  get isComplete(): boolean {
    return this.complete;
  }

  /** Token spend so far. Multiply by the model's rates to price a session. */
  get usage(): SessionUsage {
    return { ...this.usageTotals };
  }

  /**
   * Per-turn wall clock. TTFT is what a voice pipeline actually feels — a model
   * with good median latency but a slow first token still sounds laggy.
   */
  get latency(): { ttftMs: number | null; medianTurnMs: number | null } {
    const median = (values: number[]): number | null => {
      if (values.length === 0) return null;
      const sorted = [...values].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length / 2)] ?? null;
    };
    return { ttftMs: median(this.ttfts), medianTurnMs: median(this.turnLatencies) };
  }

  /** Number of interviewer turns produced so far. */
  get turnCount(): number {
    return this.interviewerTurns;
  }

  /**
   * Serializes the whole conversation so it can be stored and picked up by
   * another process. The system prompt is deliberately not stored: it is
   * derived from the context, so a prompt fix reaches sessions already in
   * flight rather than only new ones.
   */
  snapshot(): SessionSnapshot {
    return {
      version: 1,
      context: this.context,
      model: this.model,
      maxTokens: this.maxTokens,
      minTurns: this.minTurns,
      maxTurns: this.maxTurns,
      fallbackModels: [...this.fallbackModels],
      personaId: this.personaId,
      candidateBrief: this.candidateBrief,
      knownQuestions: [...this.knownQuestions],
      messages: this.messages.map((message) => ({ ...message })),
      interviewerTurns: this.interviewerTurns,
      complete: this.complete,
      usage: { ...this.usageTotals },
      turnLatencies: [...this.turnLatencies],
      ttfts: [...this.ttfts],
    };
  }

  /** Rebuilds a session from {@link snapshot}. */
  static restore(
    snapshot: SessionSnapshot,
    options: Pick<InterviewSessionOptions, "provider"> = {},
  ): InterviewSession {
    if (snapshot.version !== 1) {
      throw new Error(`Unsupported session snapshot version ${snapshot.version}.`);
    }
    const session = new InterviewSession(snapshot.context, {
      ...options,
      model: snapshot.model,
      maxTokens: snapshot.maxTokens,
      minTurns: snapshot.minTurns,
      maxTurns: snapshot.maxTurns,
      fallbackModels: snapshot.fallbackModels,
      // A session must keep the temperament it started with; swapping it
      // mid-interview would read as the interviewer becoming another person.
      ...(snapshot.personaId ? { personaId: snapshot.personaId } : {}),
      // Restored rather than re-read: the brief the interview started with is
      // the one it must finish with, even if the candidate re-uploads midway.
      candidateBrief: snapshot.candidateBrief ?? null,
      knownQuestions: snapshot.knownQuestions ?? [],
    });
    session.messages.push(...snapshot.messages);
    session.interviewerTurns = snapshot.interviewerTurns;
    session.complete = snapshot.complete;
    Object.assign(session.usageTotals, snapshot.usage);
    session.turnLatencies.push(...snapshot.turnLatencies);
    session.ttfts.push(...snapshot.ttfts);
    return session;
  }

  /** The Phase 1 system prompt actually sent — useful for logging/debugging. */
  get renderedSystemPrompt(): string {
    return this.systemPrompt;
  }

  /**
   * Conversation so far, in the shape Phase 2 expects. Operator notes are
   * stripped so the evaluator only ever sees real speech.
   */
  get transcript(): TranscriptTurn[] {
    const turns: TranscriptTurn[] = [];
    for (const message of this.messages) {
      const spoken = stripOperatorNotes(message.text);
      if (spoken === "") continue;
      turns.push({
        speaker: message.role === "assistant" ? "interviewer" : "candidate",
        text: spoken,
      });
    }
    return turns;
  }

  /** First turn: greeting + opening question. */
  async start(): Promise<InterviewerTurn> {
    if (this.messages.length > 0) {
      throw new Error("Interview already started.");
    }
    this.messages.push({ role: "user", text: SESSION_KICKOFF_MESSAGE });
    return this.runTurn();
  }

  /** Feeds the candidate's transcribed answer and returns the next question. */
  async submitAnswer(answer: string): Promise<InterviewerTurn> {
    this.pushAnswer(answer);
    return this.runTurn();
  }

  /**
   * Streaming variant — call this when piping into TTS so audio starts before
   * the full response is generated. `onDelta` receives text chunks with the
   * completion flag already withheld.
   */
  async submitAnswerStream(
    answer: string,
    onDelta: (chunk: string) => void,
  ): Promise<InterviewerTurn> {
    this.pushAnswer(answer);
    return this.runTurn(onDelta);
  }

  /** Streaming variant of {@link start}. */
  async startStream(onDelta: (chunk: string) => void): Promise<InterviewerTurn> {
    if (this.messages.length > 0) {
      throw new Error("Interview already started.");
    }
    this.messages.push({ role: "user", text: SESSION_KICKOFF_MESSAGE });
    return this.runTurn(onDelta);
  }

  private pushAnswer(answer: string): void {
    if (this.messages.length === 0) {
      throw new Error("Call start() before submitting an answer.");
    }
    if (this.complete) {
      throw new Error("Interview already complete.");
    }
    const trimmed = answer.trim();
    if (trimmed === "") {
      throw new Error("Candidate answer is empty.");
    }
    // On the last allowed turn, tell the interviewer to close out.
    const content =
      this.interviewerTurns >= this.maxTurns - 1
        ? `${trimmed}\n\n${WRAP_UP_INSTRUCTION}`
        : trimmed;
    this.messages.push({ role: "user", text: content });
  }

  private async runTurn(
    onDelta?: (chunk: string) => void,
  ): Promise<InterviewerTurn> {
    const response = await this.provider.chat({
      model: this.model,
      system: this.systemPrompt,
      messages: this.messages,
      maxTokens: this.maxTokens,
      ...(this.fallbackModels.length > 0
        ? { fallbacks: this.fallbackModels }
        : {}),
      // This is the call a candidate is waiting on with their mouth shut.
      latencyFirst: true,
      ...(onDelta
        ? {
            onDelta: (chunk: string) => {
              // Never let a partially-streamed completion flag reach TTS.
              const safe = withholdFlagTail(chunk);
              if (safe !== "") onDelta(safe);
            },
          }
        : {}),
    });

    if (response.refused) {
      throw new InterviewRefusalError(
        "The interviewer model declined to continue this interview.",
        response.stopReason,
      );
    }

    this.recordUsage(response.usage);
    this.turnLatencies.push(response.latency.totalMs);
    if (response.latency.ttftMs !== null) this.ttfts.push(response.latency.ttftMs);

    const { text, isComplete } = splitCompletionFlag(response.text);
    this.messages.push({ role: "assistant", text: response.text });
    this.interviewerTurns += 1;
    this.complete = isComplete;

    return {
      text,
      isComplete,
      turnNumber: this.interviewerTurns,
      stopReason: response.stopReason,
    };
  }

  private recordUsage(usage: ProviderUsage): void {
    this.usageTotals.inputTokens += usage.inputTokens;
    this.usageTotals.outputTokens += usage.outputTokens;
    this.usageTotals.cacheReadTokens += usage.cacheReadTokens;
    this.usageTotals.cacheCreationTokens += usage.cacheCreationTokens;
  }
}

/** Removes bracketed operator notes the candidate never actually said. */
function stripOperatorNotes(text: string): string {
  return text
    .replace(/\[SESSION NOTE[^\]]*\][^\n]*/g, "")
    .split(INTERVIEW_COMPLETE_FLAG)
    .join("")
    .trim();
}

/**
 * Drops any trailing fragment that could be the start of the completion flag,
 * so a chunk boundary inside `[INTERVIEW_COMPLETE]` never reaches the speaker.
 */
export function withholdFlagTail(chunk: string): string {
  const clean = chunk.split(INTERVIEW_COMPLETE_FLAG).join("");
  const bracket = clean.lastIndexOf("[");
  if (bracket === -1) return clean;
  const tail = clean.slice(bracket);
  return INTERVIEW_COMPLETE_FLAG.startsWith(tail) ? clean.slice(0, bracket) : clean;
}
