/**
 * LLM Client — OpenRouter paid cascade with streaming support.
 *
 * Primary: deepseek/deepseek-chat-v3-0324
 * Fallbacks: meta-llama/llama-3.3-70b-instruct, qwen/qwen3-235b-a22b
 * Uses OpenAI SDK with OpenRouter base URL.
 * 60s timeout, ONE 429 retry.
 * Mock fallback if all fail.
 */

import OpenAI from 'openai';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const PRIMARY_MODEL = 'deepseek/deepseek-chat-v3-0324';
const FALLBACK_MODELS = [
  'meta-llama/llama-3.3-70b-instruct',
  'qwen/qwen3-235b-a22b',
];
const TIMEOUT_MS = 60000;
const MAX_OUTPUT_TOKENS = 3000;
const TEMPERATURE = 0.0;

const OR_HEADERS: Record<string, string> = {
  'HTTP-Referer': 'https://medai.local',
  'X-Title': 'medAI Clinical RAG',
};

const MOCK_RESPONSE =
  "MOCK FALLBACK MODE: LLM endpoint unreachable. This system is operating in degraded mode " +
  "and cannot generate clinical claims. Please retry when connectivity is restored.\n\n" +
  "If you or someone you know is struggling or in crisis, help is available. " +
  "Call or text 988 (US) or contact your local emergency services for immediate, confidential 24/7 support.\n\n" +
  "This information is based on USPSTF guidance current as of June 2023 and is for clinical " +
  "decision support only. It is not a substitute for professional medical judgment. " +
  "Always verify current guidelines and consult appropriate specialists for individual patient care.";

// Clean response: strip think blocks and chain-of-thought preambles
function cleanResponse(raw: string): string {
  // Strip <think>...</think>
  let c = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  if (!c && raw) {
    c = raw.trim();
  }

  // Strip chain-of-thought preamble
  const cotMarkers = [
    "Here's a thinking process",
    "Here is a thinking process",
    "Let me analyze",
    "Step-by-step reasoning",
    "Thinking Process:",
    "Thinking process:",
    "Let's think step by step",
  ];
  const hasCot = cotMarkers.some((marker) => c.includes(marker));
  if ((hasCot || !c.startsWith('##')) && c.includes('##')) {
    const idx = c.indexOf('##');
    c = c.substring(idx).trim();
  }

  return c;
}

// Get API key
function getApiKey(): string | null {
  const key = process.env.OPENROUTER_API_KEY;
  if (key && key.trim() !== '' && key.trim() !== 'invalid' && key.trim() !== 'your_openrouter_api_key_here') {
    return key;
  }
  return null;
}

// Create OpenAI client for OpenRouter
function createClient(): OpenAI | null {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    return new OpenAI({
      apiKey,
      baseURL: OPENROUTER_BASE_URL,
      timeout: TIMEOUT_MS,
      defaultHeaders: OR_HEADERS,
    });
  } catch {
    return null;
  }
}

// ── Streaming generation ────────────────────────────────────────

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (metadata: { model: string; status: string; latencyMs: number }) => void;
  onError: (error: Error) => void;
}

export async function streamGenerate(
  systemPrompt: string,
  userPrompt: string,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const t0 = performance.now();
  const client = createClient();
  const candidateModels = [PRIMARY_MODEL, ...FALLBACK_MODELS];

  if (!client) {
    // Mock fallback
    const latencyMs = Math.round(performance.now() - t0);
    callbacks.onToken(MOCK_RESPONSE);
    callbacks.onComplete({ model: 'mock-fallback', status: 'error', latencyMs });
    return;
  }

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  let lastError: Error | null = null;

  for (let idx = 0; idx < candidateModels.length; idx++) {
    const model = candidateModels[idx];
    if (!model) continue;

    try {
      const stream = await client.chat.completions.create(
        {
          model,
          messages,
          temperature: TEMPERATURE,
          max_tokens: MAX_OUTPUT_TOKENS,
          stream: true,
        },
        { signal },
      );

      let fullResponse = '';

      for await (const chunk of stream) {
        const content = chunk.choices?.[0]?.delta?.content;
        if (content) {
          fullResponse += content;
          callbacks.onToken(content);
        }
      }

      const cleaned = cleanResponse(fullResponse);
      if (cleaned && cleaned.length >= 150) {
        const latencyMs = Math.round(performance.now() - t0);
        callbacks.onComplete({
          model,
          status: idx === 0 ? 'success' : 'fallback',
          latencyMs,
        });
        return;
      }
    } catch (err: unknown) {
      const errStr = String(err);
      if (errStr.includes('429') || errStr.includes('rate_limit')) {
        // Wait and retry once
        await new Promise((resolve) => setTimeout(resolve, 2000));
        try {
          const stream = await client.chat.completions.create(
            {
              model,
              messages,
              temperature: TEMPERATURE,
              max_tokens: MAX_OUTPUT_TOKENS,
              stream: true,
            },
            { signal },
          );

          let fullResponse = '';
          for await (const chunk of stream) {
            const content = chunk.choices?.[0]?.delta?.content;
            if (content) {
              fullResponse += content;
              callbacks.onToken(content);
            }
          }

          const cleaned = cleanResponse(fullResponse);
          if (cleaned && cleaned.length >= 150) {
            const latencyMs = Math.round(performance.now() - t0);
            callbacks.onComplete({ model, status: 'fallback-retry', latencyMs });
            return;
          }
        } catch (retryErr) {
          lastError = retryErr instanceof Error ? retryErr : new Error(String(retryErr));
          continue;
        }
      } else if (signal?.aborted) {
        callbacks.onError(new Error('Request cancelled'));
        return;
      } else {
        lastError = err instanceof Error ? err : new Error(String(err));
        continue;
      }
    }
  }

  // All models failed — mock fallback
  const latencyMs = Math.round(performance.now() - t0);
  callbacks.onToken(MOCK_RESPONSE);
  callbacks.onComplete({ model: 'mock-fallback', status: 'unreachable', latencyMs });
}

// ── Non-streaming generation ────────────────────────────────────

export async function generate(
  systemPrompt: string,
  userPrompt: string,
): Promise<{ response: string; model: string; status: string; latencyMs: number }> {
  const t0 = performance.now();
  const client = createClient();
  const candidateModels = [PRIMARY_MODEL, ...FALLBACK_MODELS];

  if (!client) {
    const latencyMs = Math.round(performance.now() - t0);
    return { response: MOCK_RESPONSE, model: 'mock-fallback', status: 'unreachable', latencyMs };
  }

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  for (let idx = 0; idx < candidateModels.length; idx++) {
    const model = candidateModels[idx];
    if (!model) continue;

    try {
      const resp = await client.chat.completions.create({
        model,
        messages,
        temperature: TEMPERATURE,
        max_tokens: MAX_OUTPUT_TOKENS,
      });

      const rawContent = resp.choices?.[0]?.message?.content || '';
      const cleaned = cleanResponse(rawContent);

      if (cleaned && cleaned.length >= 150) {
        const latencyMs = Math.round(performance.now() - t0);
        return {
          response: cleaned,
          model,
          status: idx === 0 ? 'success' : 'fallback',
          latencyMs,
        };
      }
    } catch (err: unknown) {
      const errStr = String(err);
      if (errStr.includes('429') || errStr.includes('rate_limit')) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      continue;
    }
  }

  const latencyMs = Math.round(performance.now() - t0);
  return { response: MOCK_RESPONSE, model: 'mock-fallback', status: 'unreachable', latencyMs };
}
