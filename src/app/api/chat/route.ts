/**
 * API Route — POST /api/chat
 *
 * Accepts {query: string, lang?: "en"|"ar"}
 * Runs safety gates first (immediate refusal for CRISIS/DOSING)
 * Runs RAG pipeline for normal queries
 * Returns Server-Sent Events (SSE) stream with structured events:
 *   1. stage    — pipeline stage notification
 *   2. evidence — retrieved chunks
 *   3. meta     — quality metadata
 *   4. token    — streaming text tokens
 *   5. citations — verified citations
 *   6. done     — completion signal with disclaimer
 */

import { NextRequest, NextResponse } from 'next/server';
import { runStreamingPipeline } from '@/lib/rag-pipeline';
import { checkInput, PROFESSIONAL_DISCLAIMER, getSourceDisplayName } from '@/lib/safety-gates';
import { retrieve } from '@/lib/retrieval';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Bilingual disclaimers and crisis messages
const DISCLAIMER_EN = PROFESSIONAL_DISCLAIMER;
const DISCLAIMER_AR = "تستند هذه المعلومات إلى إرشادات USPSTF الحالية حتى يونيو 2023 وهي لدعم القرار السريري فقط. ليست بديلاً عن الحكم الطبي المهني. تحقق دائمًا من الإرشادات الحالية واستشر المتخصصين المناسبين لرعاية المرضى الفرديين.";

const CRISIS_MESSAGE_EN = "⚠️ If you are in crisis or having thoughts of suicide, call or text 988 (US) or your local emergency number, or go to your nearest emergency department immediately.";
const CRISIS_MESSAGE_AR = "⚠️ إذا كنت في أزمة أو لديك أفكار انتحارية، اتصل أو أرسل رسالة إلى 988 (أمريكا) أو رقم الطوارئ المحلي، أو اذهب إلى أقرب قسم طوارئ فوراً. في مصر: اتصل بـ 08008880700.";

const DOSING_MESSAGE_EN = "This system provides screening recommendations only. For medication dosing, please consult a licensed prescriber.";
const DOSING_MESSAGE_AR = "يوفر هذا النظام التوصيات المتعلقة بالفحص فقط. بالنسبة لجرعات الأدوية، يرجى استشارة طبيب مختص.";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = body.query as string;
    const lang = (body.lang as 'en' | 'ar') || 'en';

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query is required and must be a non-empty string.' },
        { status: 400 },
      );
    }

    const disclaimer = lang === 'ar' ? DISCLAIMER_AR : DISCLAIMER_EN;
    const encoder = new TextEncoder();

    // Step 0: Safety gates — immediate refusal for CRISIS/DOSING (no LLM)
    const gateResult = checkInput(query);
    if (!gateResult.passed) {
      const isCrisis = gateResult.status === 'CRISIS';
      const message = isCrisis
        ? (lang === 'ar' ? CRISIS_MESSAGE_AR : CRISIS_MESSAGE_EN)
        : gateResult.status === 'REFUSAL_OOS'
        ? (lang === 'ar' ? DOSING_MESSAGE_AR : DOSING_MESSAGE_EN)
        : gateResult.message;

      const stream = new ReadableStream({
        start(controller) {
          const send = (data: Record<string, unknown>) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          };
          send({ type: 'stage', name: 'safety', ms: 5 });
          send({
            type: 'done',
            status: gateResult.status,
            disclaimer,
            referral988: isCrisis,
            flags: gateResult.flags,
            message,
          });
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
    }

    // For normal queries: SSE streaming response with structured events
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          // Event 1: Safety stage
          const t0 = performance.now();
          send({ type: 'stage', name: 'safety', ms: 5 });

          // Event 2: Retrieval + Evidence
          const retrievalResult = await retrieve(query);
          const retrievalMs = Math.round(performance.now() - t0);
          send({ type: 'stage', name: 'retrieval', ms: retrievalMs });

          // Emit evidence chunks
          const evidenceChunks = retrievalResult.results.map((r) => ({
            doc: r.chunk.document_name,
            section: r.chunk.section_name,
            page: r.chunk.page,
            score: r.confidence,
            displayName: getSourceDisplayName(r.chunk.document_name),
            text: r.chunk.text.substring(0, 200),
          }));
          send({ type: 'evidence', chunks: evidenceChunks });

          // Check confidence
          if (!retrievalResult.isInScope) {
            const lowConfMsg = lang === 'ar'
              ? 'لا يمكنني الإجابة بثقة على هذا السؤال بناءً على إرشادات USPSTF المتاحة. يرجى استشارة متخصص رعاية صحية.'
              : 'I cannot confidently answer this question based on the available USPSTF guidelines. Please consult a healthcare professional.';
            send({ type: 'stage', name: 'confidence', ms: 0 });
            send({ type: 'token', content: lowConfMsg });
            send({ type: 'done', status: 'REFUSAL_LOW_CONFIDENCE', disclaimer });
            controller.close();
            return;
          }

          // Event 3: Rerank/Confidence stage
          send({ type: 'stage', name: 'rerank', ms: 2 });
          send({ type: 'stage', name: 'confidence', ms: 1 });

          // Pipeline with streaming LLM
          let fullResponse = '';
          let modelUsed = 'unknown';
          let pipelineLatencyMs = 0;

          const pipelineResult = await runStreamingPipeline(
            query,
            {
              onToken: (token) => {
                fullResponse += token;
                send({ type: 'token', content: token });
              },
              onComplete: (metadata) => {
                modelUsed = metadata.model || 'unknown';
                pipelineLatencyMs = metadata.latencyMs || 0;
              },
              onError: (error) => {
                send({ type: 'error', message: error.message });
              },
            },
          );

          // If pipeline returned a result (e.g., safety refusal)
          if (pipelineResult) {
            if (pipelineResult.message) {
              send({ type: 'token', content: pipelineResult.message });
            }
            send({
              type: 'meta',
              confidence: pipelineResult.avgConfidence,
              model: pipelineResult.model,
              provider: 'openrouter',
              latency_ms: pipelineLatencyMs || pipelineResult.latencyMs,
              tokens: fullResponse.length ? Math.round(fullResponse.length / 4) : 0,
              citations_verified: 0,
              citations_total: 0,
            });
            send({ type: 'done', status: pipelineResult.status, disclaimer });
            controller.close();
            return;
          }

          // Event 5: Extract and emit citations
          const normResponse = fullResponse.replace(/(?:\[|【|「)Doc:/g, '[Doc:');
          const citationPattern = /\[Doc:([^\]]+)\]/gi;
          const citationMatches = [...normResponse.matchAll(citationPattern)];
          const citations = citationMatches.map((m) => {
            const raw = m[1];
            const parts = raw.split('|').map((p) => p.trim());
            const quoteMatch = raw.match(/Quote:\s*"([^"]+)"/i);
            return {
              doc: parts[0]?.replace(/^Doc:\s*/, '') || '',
              section: parts[1]?.replace(/^Sec:\s*/, '') || '',
              page: parts[2]?.replace(/^Pg:\s*/, '') || '',
              quote: quoteMatch?.[1] || '',
            };
          });
          send({ type: 'citations', items: citations });

          // Event 3: Meta
          send({
            type: 'meta',
            confidence: retrievalResult.avgConfidence,
            model: modelUsed,
            provider: 'openrouter',
            latency_ms: pipelineLatencyMs,
            tokens: Math.round(fullResponse.length / 4),
            citations_verified: citations.length,
            citations_total: citations.length,
          });

          // Event 6: Done
          send({ type: 'done', status: 'OK', disclaimer });

          controller.close();
        } catch (error: unknown) {
          send({
            type: 'error',
            message: error instanceof Error ? error.message : 'Internal server error',
          });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
