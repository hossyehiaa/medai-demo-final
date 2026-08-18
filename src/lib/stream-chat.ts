/**
 * SSE Streaming Client — Client-side utility for consuming SSE streams from /api/chat.
 */

export interface StreamMetadata {
  status: string;
  model?: string;
  latencyMs?: number;
  avgConfidence?: number;
  top1Confidence?: number;
  flags?: string[];
  chunks?: unknown[];
}

export async function streamChat(
  query: string,
  onToken: (token: string) => void,
  onComplete: (metadata: StreamMetadata) => void,
  onError: (error: Error) => void,
  signal?: AbortSignal,
): Promise<void> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      onError(new Error(errorText || `HTTP ${response.status}`));
      return;
    }

    const contentType = response.headers.get('content-type') || '';

    // Handle immediate JSON responses (safety refusals)
    if (contentType.includes('application/json')) {
      const json = await response.json() as StreamMetadata & { message?: string };
      if (json.message) {
        onToken(json.message);
      }
      onComplete(json);
      return;
    }

    // Handle SSE stream
    const reader = response.body?.getReader();
    if (!reader) {
      onError(new Error('No response body'));
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let metadata: StreamMetadata = { status: 'OK' };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);

          if (parsed.type === 'token') {
            onToken(parsed.content);
          } else if (parsed.type === 'metadata') {
            metadata = { ...metadata, ...parsed };
          } else if (parsed.type === 'complete') {
            metadata = { ...metadata, ...parsed };
            onComplete(metadata);
            return;
          } else if (parsed.type === 'error') {
            onError(new Error(parsed.message || 'Stream error'));
            return;
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }

    // Stream ended without explicit complete signal
    onComplete(metadata);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return;
    }
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}
