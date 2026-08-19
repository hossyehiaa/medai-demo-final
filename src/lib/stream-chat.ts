/**
 * SSE Streaming Client — Client-side utility for consuming SSE streams from /api/chat.
 *
 * Supports all new structured event types:
 *   - stage: pipeline stage notification
 *   - evidence: retrieved chunks
 *   - meta: quality metadata
 *   - token: streaming text tokens
 *   - citations: verified citations
 *   - done: completion signal
 *   - error: error message
 */

export interface StageEvent {
  name: string;
  ms: number;
}

export interface EvidenceChunk {
  doc: string;
  section: string;
  page: number;
  score: number;
  displayName?: string;
  text?: string;
}

export interface MetaEvent {
  confidence?: number;
  model?: string;
  provider?: string;
  latency_ms?: number;
  tokens?: number;
  citations_verified?: number;
  citations_total?: number;
}

export interface CitationItem {
  doc: string;
  section: string;
  page: string;
  quote: string;
}

export interface WellnessNoteItem {
  source: string;
  url: string;
  quote: string;
}

export interface StreamCallbacks {
  onStage?: (stage: StageEvent) => void;
  onEvidence?: (chunks: EvidenceChunk[]) => void;
  onMeta?: (meta: MetaEvent) => void;
  onToken: (token: string) => void;
  onCitations?: (citations: CitationItem[]) => void;
  onWellness?: (notes: WellnessNoteItem[]) => void;
  onComplete: (metadata: { status: string; disclaimer?: string; referral988?: boolean; flags?: string[]; message?: string }) => void;
  onError: (error: Error) => void;
}

export async function streamChat(
  query: string,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
  lang: 'en' | 'ar' = 'en',
): Promise<void> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, lang }),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      callbacks.onError(new Error(errorText || `HTTP ${response.status}`));
      return;
    }

    const contentType = response.headers.get('content-type') || '';

    // Handle immediate JSON responses (error cases)
    if (contentType.includes('application/json')) {
      const json = await response.json() as Record<string, unknown>;
      if (json.message) {
        callbacks.onToken(json.message as string);
      }
      callbacks.onComplete({
        status: (json.status as string) || 'error',
        disclaimer: json.disclaimer as string | undefined,
      });
      return;
    }

    // Handle SSE stream
    const reader = response.body?.getReader();
    if (!reader) {
      callbacks.onError(new Error('No response body'));
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    const metadata: { status: string; disclaimer?: string; referral988?: boolean; flags?: string[]; message?: string } = { status: 'OK' };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);

          switch (parsed.type) {
            case 'stage':
              callbacks.onStage?.({ name: parsed.name, ms: parsed.ms });
              break;

            case 'evidence':
              callbacks.onEvidence?.(parsed.chunks || []);
              break;

            case 'meta':
              callbacks.onMeta?.({
                confidence: parsed.confidence,
                model: parsed.model,
                provider: parsed.provider,
                latency_ms: parsed.latency_ms,
                tokens: parsed.tokens,
                citations_verified: parsed.citations_verified,
                citations_total: parsed.citations_total,
              });
              break;

            case 'token':
              callbacks.onToken(parsed.content);
              break;

            case 'citations':
              callbacks.onCitations?.(parsed.items || []);
              break;

            case 'wellness':
              callbacks.onWellness?.(parsed.notes || []);
              break;

            case 'done':
              metadata.status = parsed.status || 'OK';
              metadata.disclaimer = parsed.disclaimer;
              metadata.referral988 = parsed.referral988;
              metadata.flags = parsed.flags;
              metadata.message = parsed.message;
              callbacks.onComplete(metadata);
              return;

            case 'error':
              callbacks.onError(new Error(parsed.message || 'Stream error'));
              return;

            case 'complete':
              // Legacy support
              metadata.status = parsed.status || 'OK';
              callbacks.onComplete(metadata);
              return;
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }

    // Stream ended without explicit done signal
    callbacks.onComplete(metadata);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return;
    }
    callbacks.onError(err instanceof Error ? err : new Error(String(err)));
  }
}
