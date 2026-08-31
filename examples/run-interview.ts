/**
 * End-to-end demo: live interview in the terminal, then the async evaluation.
 * Run with `npm run demo` (needs ANTHROPIC_API_KEY or an `ant auth login` profile).
 */
import * as readline from "node:readline/promises";
import process, { stdin, stdout } from "node:process";
import { InterviewSession, evaluateInterview } from "../src/index.js";
import type { InterviewContext } from "../src/index.js";

// Load .env into process.env. Node's built-in loader — no dotenv dependency.
// A missing .env is fine: the key may already be exported, or come from a
// stored `ant auth login` profile.
try {
  process.loadEnvFile(".env");
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

const context: InterviewContext = {
  candidateName: "Mariana",
  targetRole: "Senior Product Designer",
  companyName: "Stripe",
  companyCulture: "Craft, user obsession, high trust, written communication",
  industry: "Fintech",
  interviewStage: "Behavioral",
};

const rl = readline.createInterface({ input: stdin, output: stdout });
const session = new InterviewSession(context);

// `startStream` / `submitAnswerStream` are what a voice backend pipes to TTS.
let turn = await session.startStream((chunk) => stdout.write(chunk));
stdout.write("\n");

while (!turn.isComplete) {
  const answer = await rl.question("\nyou > ");
  if (answer.trim() === "") continue;
  stdout.write("\ninterviewer > ");
  turn = await session.submitAnswerStream(answer, (chunk) => stdout.write(chunk));
  stdout.write("\n");
}
rl.close();

console.log("\n--- evaluating transcript ---\n");
const evaluation = await evaluateInterview(context, session.transcript);
console.log(JSON.stringify(evaluation, null, 2));
