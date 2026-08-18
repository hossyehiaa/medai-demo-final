/**
 * API Route — POST /api/chat
 *
 * Accepts {query: string}
 * Runs safety gates first (immediate refusal for CRISIS/DOSING)
 * Runs RAG pipeline for normal queries
 * Returns Server-Sent Events (SSE) stream for streaming responses
 * For safety refusals, returns JSON immediately (no stream needed)
 */

import { NextRequest, NextResponse } from 'next/server';
import { runStreamingPipeline } from '@/lib/rag-pipeline';
import { checkInput, PROFESSIONAL_DISCLAIMER } from '@/lib/safety-gates';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = body.query as string;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query is required and must be a non-empty string.' },
        { status: 400 },
      );
    }

    // Step 0: Safety gates — immediate refusal for CRISIS/DOSING (no LLM)
    const gateResult = checkInput(query);
    if (!gateResult.passed) {
      const isCrisis = gateResult.status === 'CRISIS';
      return NextResponse.json({
        type: 'refusal',
        status: gateResult.status,
        message: gateResult.message,
        flags: gateResult.flags,
        referral988: isCrisis,
        disclaimer: PROFESSIONAL_DISCLAIMER,
      });
    }

    // For normal queries: SSE streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          const pipelineResult = await runStreamingPipeline(
            query,
            {
              onToken: (token) => {
                sendEvent({ type: 'token', content: token });
              },
              onComplete: (metadata) => {
                sendEvent({ type: 'complete', ...metadata });
              },
              onError: (error) => {
                sendEvent({ type: 'error', message: error.message });
              },
            },
          );

          // If pipeline returned a result (safety refusal or low confidence), send as complete
          if (pipelineResult) {
            if (pipelineResult.message) {
              sendEvent({ type: 'token', content: pipelineResult.message });
            }
            sendEvent({
              type: 'complete',
              status: pipelineResult.status,
              avgConfidence: pipelineResult.avgConfidence,
              top1Confidence: pipelineResult.top1Confidence,
              model: pipelineResult.model,
              flags: pipelineResult.flags,
            });
          }

          controller.close();
        } catch (error: unknown) {
          sendEvent({
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
