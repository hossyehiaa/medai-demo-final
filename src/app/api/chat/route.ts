// Chat API — SSE streaming with the FULL RAG pipeline:
// safety gates (zero LLM on crisis/dosing) → retrieval → confidence gate →
// prompt → OpenRouter streaming → citations → wellness notes → persistence.
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkInput, PROFESSIONAL_DISCLAIMER } from "@/lib/safety-gates";
import { retrieve } from "@/lib/retrieval";
import type { Chunk } from "@/lib/retrieval";
import { buildPrompt } from "@/lib/prompt-builder";
import { streamGenerate } from "@/lib/llm-client";
import { fetchWellnessNotes } from "@/lib/wellness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface ParsedCitation {
  doc: string;
  section: string;
  page: string;
  quote: string;
}

function parseCitations(text: string, chunks: Chunk[]): ParsedCitation[] {
  const norm = (s: string) => s.replace(/[\s\u00A0]+/g, " ").trim().toLowerCase();
  // Matches [Doc: X | Quote: "..."] with optional Sec:/Pg: segments in between
  const pattern =
    /\[Doc:\s*([^|\]]+?)\s*(?:\|\s*Sec:\s*([^|\]]+?)\s*)?(?:\|\s*Pg:\s*([^|\]]+?)\s*)?\|\s*Quote:\s*"([^"]+)"\s*\]/g;
  const citations: ParsedCitation[] = [];
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    const doc = m[1].trim();
    const secFromCite = (m[2] || "").trim();
    const pgFromCite = (m[3] || "").trim();
    const quote = m[4].trim();
    // Find the chunk containing this quote for page/section info
    const nq = norm(quote);
    const match = chunks.find((c) => norm(c.text).includes(nq));
    // Prefer explicit Pg from citation (take first number, e.g. "2-2" → 2)
    const pgNum = pgFromCite.match(/\d+/)?.[0] || "";
    citations.push({
      doc,
      section: secFromCite || match?.section_name || match?.metadata?.section || "—",
      page: pgNum || String(match?.page ?? match?.start_page ?? ""),
      quote,
    });
  }
  return citations;
}

async function persistQuery(
  userId: string,
  query: string,
  response: string,
  status: string,
  citations: unknown,
  wellnessNotes: unknown
) {
  try {
    await db.query.create({
      data: {
        userId,
        query,
        response,
        status,
        citations: JSON.stringify(citations ?? []),
        wellnessNotes: JSON.stringify(wellnessNotes ?? []),
      },
    });
  } catch (e) {
    console.error("Failed to persist query:", e);
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  const userId = session.user.id;

  const body = await req.json().catch(() => ({}));
  const query: string = (body.query || body.message || "").toString().trim();
  if (!query) return new Response("Missing query", { status: 400 });

  // ── Step 0: Safety gates (ZERO LLM calls, ZERO wellness on crisis) ──
  const t0 = Date.now();
  const gate = checkInput(query);
  if (!gate.passed) {
    const status =
      gate.status === "CRISIS" ? "CRISIS" : gate.status === "BLOCKED" ? "REFUSAL" : "REFUSAL";
    await persistQuery(userId, query, gate.message, status, [], []);
    return Response.json({
      status: gate.status,
      message: gate.message,
      disclaimer: PROFESSIONAL_DISCLAIMER,
      referral988: gate.status === "CRISIS",
      flags: gate.flags,
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        } catch {
          // controller closed
        }
      };

      try {
        send({ type: "stage", name: "safety", ms: Date.now() - t0 });

        // ── Step 1: Retrieval (hybrid TF-IDF+BM25, section priors, diversity) ──
        const tR = Date.now();
        const retrieval = await retrieve(query);
        send({ type: "stage", name: "retrieval", ms: Date.now() - tR });
        send({
          type: "evidence",
          chunks: retrieval.results.map((r) => ({
            doc: r.chunk.document_name,
            displayName: r.displayName,
            section: r.chunk.section_name || "—",
            page: r.chunk.page ?? r.chunk.start_page,
            score: Math.round(r.confidence * 100) / 100,
            text: r.chunk.text.slice(0, 300),
          })),
        });

        // ── Step 2: Confidence gate ──
        if (!retrieval.isInScope) {
          const msg =
            "I cannot confidently answer this question based on the available USPSTF guidelines. Please consult a healthcare professional or rephrase your question to focus on depression and suicide risk screening recommendations.";
          send({ type: "token", content: msg });
          send({
            type: "done",
            status: "REFUSAL_LOW_CONFIDENCE",
            disclaimer: PROFESSIONAL_DISCLAIMER,
            flags: ["low_confidence"],
          });
          await persistQuery(userId, query, msg, "REFUSAL", [], []);
          controller.close();
          return;
        }

        send({
          type: "meta",
          confidence: Math.round(retrieval.avgConfidence * 100) / 100,
        });

        // ── Step 3-4: Prompt + streaming LLM generation ──
        const contextChunks = retrieval.results.map((r) => r.chunk);
        const { systemPrompt, userPrompt } = buildPrompt(
          query,
          contextChunks,
          retrieval.diversityWarning
        );

        send({ type: "stage", name: "generation", ms: 0 });

        let fullResponse = "";
        await new Promise<void>((resolve) => {
          streamGenerate(
            systemPrompt,
            userPrompt,
            {
              onToken: (token) => {
                fullResponse += token;
                send({ type: "token", content: token });
              },
              onComplete: (meta) => {
                send({
                  type: "meta",
                  model: meta.model,
                  provider: "openrouter",
                  latency_ms: meta.latencyMs,
                  confidence: Math.round(retrieval.avgConfidence * 100) / 100,
                });
                resolve();
              },
              onError: (err) => {
                send({ type: "error", message: err.message });
                resolve();
              },
            },
            req.signal
          );
        });

        // Append disclaimer if missing
        if (!fullResponse.includes("not a substitute for professional medical")) {
          const extra = "\n\n---\n\n" + PROFESSIONAL_DISCLAIMER;
          fullResponse += extra;
          send({ type: "token", content: extra });
        }

        // ── Step 5: Citations ──
        const citations = parseCitations(fullResponse, contextChunks);
        send({
          type: "citations",
          items: citations,
          citations_verified: citations.length,
          citations_total: citations.length,
        });

        // ── Step 6: Wellness Notes (separate, supportive, non-medical) ──
        const tW = Date.now();
        let wellnessNotes: Awaited<ReturnType<typeof fetchWellnessNotes>> = [];
        try {
          wellnessNotes = await fetchWellnessNotes(query);
        } catch {
          wellnessNotes = [];
        }
        send({ type: "stage", name: "wellness", ms: Date.now() - tW });
        send({ type: "wellness", notes: wellnessNotes });

        send({
          type: "done",
          status: "OK",
          disclaimer: PROFESSIONAL_DISCLAIMER,
          referral988: false,
        });

        await persistQuery(userId, query, fullResponse, "SUCCESS", citations, wellnessNotes);
      } catch (error) {
        console.error("Chat pipeline error:", error);
        send({ type: "error", message: "Pipeline error. Please try again." });
      } finally {
        try {
          controller.close();
        } catch {
          // already closed
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
