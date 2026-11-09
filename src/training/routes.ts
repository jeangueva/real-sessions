import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import type { ModelProvider } from '../providers/index.js';
import { RULES } from '../rate-limit.js';
import { answerConversation, conversationFeedback, startConversation, TrainingError } from './conversation.js';
import { draftCustomScenario } from './custom.js';
import { CONVERSATION_SCENARIOS, CULTURE_CONTEXTS } from './scenarios.js';
import { INTUITION_CASES, publicIntuitionCases } from './intuition-cases.js';

interface Dependencies {
  owner: string; ip: string; provider?: ModelProvider;
  json: (res: ServerResponse, status: number, data: unknown) => void;
  readJson: (req: IncomingMessage) => Promise<Record<string, unknown>>;
  limited: (res: ServerResponse, key: string, rule: (typeof RULES)[keyof typeof RULES]) => Promise<boolean>;
}
const Token = z.string().min(1).max(62000);
const Answer = z.object({ token: Token, answer: z.string().trim().min(1).max(2000) });
const Feedback = z.object({ token: Token });
const Judgment = z.object({ caseId: z.string(), choice: z.number().int().min(0).max(2), confidence: z.number().int().min(0).max(100), reasoning: z.string().trim().min(1).max(2000) });

/** Called only after the server's identity and revocation gates. No paid gate. */
export async function trainingRoute(req: IncomingMessage, res: ServerResponse, path: string, deps: Dependencies): Promise<void> {
  const { json, limited, readJson, owner, ip, provider } = deps;
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET' && path === '/api/training/catalogue') {
    json(res, 200, { scenarios: CONVERSATION_SCENARIOS, cultures: CULTURE_CONTEXTS, intuition: publicIntuitionCases() }); return;
  }
  const paths = ['/api/training/conversations', '/api/training/conversations/answer', '/api/training/conversations/feedback', '/api/training/intuition/reveal', '/api/training/custom/draft'];
  if (!paths.includes(path) || req.method !== 'POST') { json(res, 404, { error: 'Training route not found.' }); return; }
  const rule = path.endsWith('/feedback') ? RULES.evaluation : path.endsWith('/answer') ? RULES.answer : RULES.startSession;
  // Shared budget across training routes, also bounded per IP to deter identity rotation.
  if (await limited(res, `training:${owner}`, rule) || await limited(res, `training-ip:${ip}`, RULES.answer)) return;
  try {
    let body: unknown;
    try { body = await readJson(req); } catch { throw new TrainingError(400, 'Send a valid JSON body under 64 KB.'); }
    if (path === '/api/training/custom/draft') {
      json(res, 200, { scenario: await draftCustomScenario(body, provider) }); return;
    }
    if (path === '/api/training/conversations') {
      json(res, 201, await startConversation(owner, body, provider)); return;
    }
    if (path.endsWith('/answer')) {
      const value = Answer.parse(body);
      json(res, 200, await answerConversation(owner, value.token, value.answer, provider)); return;
    }
    if (path.endsWith('/feedback')) {
      json(res, 200, { feedback: await conversationFeedback(owner, Feedback.parse(body).token, provider) }); return;
    }
    const value = Judgment.parse(body);
    const item = INTUITION_CASES.find(c => c.id === value.caseId);
    if (!item) throw new TrainingError(404, 'Case not found.');
    json(res, 200, {
      judgment: value, recommended: item.recommended, rationale: item.rationale, reveal: item.reveal,
      reflection: 'Compare your reasoning with the evidence, not just the outcome. One case cannot establish calibration or prove that an alternative would have succeeded.',
      presentation: 'This is an anonymized educational reconstruction. Options and recommendations are teaching interpretations; only the cited outcome is historical.',
    });
  } catch (error) {
    if (error instanceof TrainingError) { json(res, error.status, { error: error.message }); return; }
    if (error instanceof z.ZodError) { json(res, 400, { error: 'Check your training input and try again.' }); return; }
    throw error;
  }
}
