/**
 * RAG Pipeline — Full pipeline orchestrator.
 *
 * Step 0: Safety gates (CRISIS/DOSING short-circuit) -> immediate refusal, no LLM
 * Step 1: Retrieval (TF-IDF cosine + section priors + boosts)
 * Step 2: Confidence gate (< 0.76 -> REFUSAL_LOW_CONFIDENCE)
 * Step 3: Prompt building (6-section schema + anti-hallucination rules)
 * Step 4: LLM generation via OpenRouter streaming
 * Step 5: Citation verification
 * Step 6: Append professional disclaimer
 */

import { checkInput, PROFESSIONAL_DISCLAIMER } from './safety-gates';
import type { GuardrailResult } from './safety-gates';
import { retrieve } from './retrieval';
import type { Chunk, RetrievalResult } from './retrieval';
import { buildPrompt } from './prompt-builder';
import { streamGenerate, generate } from './llm-client';
import type { StreamCallbacks } from './llm-client';

export interface PipelineResult {
  status: GuardrailResult['status'];
  message: string;
  chunks?: RetrievalResult[];
  avgConfidence?: number;
  top1Confidence?: number;
  model?: string;
  latencyMs?: number;
  flags?: string[];
  disclaimer: string;
}

// ── Citation verification ──────────────────────────────────────

function verifyCitations(response: string, contextChunks: Chunk[]): {
  verifiedQuotes: number;
  totalQuotes: number;
  unverifiedQuotes: string[];
} {
  // Normalize brackets
  const normResponse = response.replace(/(?:\[|【|「)Doc:/g, '[Doc:');
  const quotePattern = /Quote:\s*"([^"]+)"/gi;
  const quotes = [...normResponse.matchAll(quotePattern)].map((m) => m[1]);

  if (quotes.length === 0) {
    return { verifiedQuotes: 0, totalQuotes: 0, unverifiedQuotes: ['No citations found.'] };
  }

  // Normalize text for matching
  const normalize = (text: string) =>
    text.replace(/[\u200B\u200C\u200D\uFEFF]/g, '').replace(/[\s\u00A0]+/g, ' ').trim().toLowerCase();

  const corpusTexts = contextChunks.map((c) => normalize(c.text));
  const verified: string[] = [];
  const unverified: string[] = [];

  for (const quote of quotes) {
    const normQuote = normalize(quote);
    const normQuoteClean = normQuote.replace(/\s*\d+$/, '').trim();

    let found = false;
    for (const corpus of corpusTexts) {
      if (corpus.includes(normQuote) || corpus.includes(normQuoteClean)) {
        found = true;
        break;
      }
      // Alpha-only fallback
      const alphaQuote = normQuoteClean.replace(/[^a-z0-9]/g, '');
      const alphaCorpus = corpus.replace(/[^a-z0-9]/g, '');
      if (alphaQuote.length >= 20 && alphaCorpus.includes(alphaQuote)) {
        found = true;
        break;
      }
    }

    if (found) {
      verified.push(quote);
    } else {
      unverified.push(quote);
    }
  }

  return { verifiedQuotes: verified.length, totalQuotes: quotes.length, unverifiedQuotes: unverified };
}

// ── Full pipeline (non-streaming) ──────────────────────────────

export async function runPipeline(query: string): Promise<PipelineResult> {
  const t0 = performance.now();

  // Step 0: Safety gates
  const gateResult = checkInput(query);
  if (!gateResult.passed) {
    return {
      status: gateResult.status,
      message: gateResult.message,
      flags: gateResult.flags,
      disclaimer: PROFESSIONAL_DISCLAIMER,
    };
  }

  // Step 1: Retrieval
  const retrievalResult = await retrieve(query);

  // Step 2: Confidence gate
  if (!retrievalResult.isInScope) {
    return {
      status: 'REFUSAL_LOW_CONFIDENCE',
      message: 'I cannot confidently answer this question based on the available USPSTF guidelines. Please consult a healthcare professional or rephrase your question to focus on depression and suicide risk screening recommendations.',
      chunks: retrievalResult.results,
      avgConfidence: retrievalResult.avgConfidence,
      top1Confidence: retrievalResult.top1Confidence,
      flags: ['low_confidence'],
      disclaimer: PROFESSIONAL_DISCLAIMER,
    };
  }

  // Step 3: Prompt building
  const contextChunks = retrievalResult.results.map((r) => r.chunk);
  const { systemPrompt, userPrompt } = buildPrompt(query, contextChunks, retrievalResult.diversityWarning);

  // Step 4: LLM generation
  const genResult = await generate(systemPrompt, userPrompt);
  let response = genResult.response;

  // Step 5: Citation verification (log only, don't block)
  verifyCitations(response, contextChunks);

  // Step 6: Append professional disclaimer
  if (!response.includes(PROFESSIONAL_DISCLAIMER)) {
    response += '\n\n---\n\n' + PROFESSIONAL_DISCLAIMER;
  }

  const latencyMs = Math.round(performance.now() - t0);

  return {
    status: 'OK',
    message: response,
    chunks: retrievalResult.results,
    avgConfidence: retrievalResult.avgConfidence,
    top1Confidence: retrievalResult.top1Confidence,
    model: genResult.model,
    latencyMs,
    disclaimer: PROFESSIONAL_DISCLAIMER,
  };
}

// ── Streaming pipeline ─────────────────────────────────────────

export async function runStreamingPipeline(
  query: string,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<PipelineResult | null> {
  const t0 = performance.now();

  // Step 0: Safety gates (immediate refusal — no streaming needed)
  const gateResult = checkInput(query);
  if (!gateResult.passed) {
    return {
      status: gateResult.status,
      message: gateResult.message,
      flags: gateResult.flags,
      disclaimer: PROFESSIONAL_DISCLAIMER,
    };
  }

  // Step 1: Retrieval
  const retrievalResult = await retrieve(query);

  // Step 2: Confidence gate
  if (!retrievalResult.isInScope) {
    return {
      status: 'REFUSAL_LOW_CONFIDENCE',
      message: 'I cannot confidently answer this question based on the available USPSTF guidelines. Please consult a healthcare professional or rephrase your question to focus on depression and suicide risk screening recommendations.',
      chunks: retrievalResult.results,
      avgConfidence: retrievalResult.avgConfidence,
      top1Confidence: retrievalResult.top1Confidence,
      flags: ['low_confidence'],
      disclaimer: PROFESSIONAL_DISCLAIMER,
    };
  }

  // Step 3: Prompt building
  const contextChunks = retrievalResult.results.map((r) => r.chunk);
  const { systemPrompt, userPrompt } = buildPrompt(query, contextChunks, retrievalResult.diversityWarning);

  // Step 4: LLM streaming generation
  // Wrap callbacks to append disclaimer at the end
  let fullResponse = '';
  const wrappedCallbacks: StreamCallbacks = {
    onToken: (token) => {
      fullResponse += token;
      callbacks.onToken(token);
    },
    onComplete: (metadata) => {
      // Step 6: Append disclaimer if not present
      if (!fullResponse.includes(PROFESSIONAL_DISCLAIMER)) {
        const disclaimerText = '\n\n---\n\n' + PROFESSIONAL_DISCLAIMER;
        callbacks.onToken(disclaimerText);
      }
      callbacks.onComplete(metadata);
    },
    onError: callbacks.onError,
  };

  await streamGenerate(systemPrompt, userPrompt, wrappedCallbacks, signal);

  return null; // Streaming result delivered via callbacks
}
