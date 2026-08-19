"use client";

// Chat panel — streaming SSE chat with pipeline trace stepper, evidence panel,
// quality HUD, citation pills (open Source Viewer), and Wellness Notes card.
import { useCallback, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useI18n } from "@/lib/i18n";
import {
  streamChat,
  type EvidenceChunk,
  type MetaEvent,
  type CitationItem,
  type StageEvent,
  type WellnessNoteItem,
} from "@/lib/stream-chat";
import type { ViewerTarget } from "./SourceViewer";
import {
  Send,
  ShieldCheck,
  Search,
  Cpu,
  HeartHandshake,
  FileText,
  AlertTriangle,
  Gauge,
} from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  status?: string;
  stages?: StageEvent[];
  evidence?: EvidenceChunk[];
  meta?: MetaEvent;
  citations?: CitationItem[];
  wellness?: WellnessNoteItem[];
}

const STAGE_ICONS: Record<string, typeof ShieldCheck> = {
  safety: ShieldCheck,
  retrieval: Search,
  generation: Cpu,
  wellness: HeartHandshake,
};

function StatusBadge({ status }: { status?: string }) {
  if (!status || status === "OK") return null;
  const isCrisis = status === "CRISIS";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
        isCrisis ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
      }`}
    >
      <AlertTriangle className="h-3 w-3" />
      {isCrisis ? "CRISIS" : "REFUSAL"}
    </span>
  );
}

export default function ChatPanel({
  onOpenSource,
  initialQuery,
}: {
  onOpenSource: (target: ViewerTarget) => void;
  initialQuery?: string;
}) {
  const { t, lang } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState(initialQuery || "");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollDown = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  const updateLast = useCallback((updater: (m: ChatMessage) => ChatMessage) => {
    setMessages((prev) => {
      const next = [...prev];
      next[next.length - 1] = updater(next[next.length - 1]);
      return next;
    });
  }, []);

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    const query = input.trim();
    if (!query || busy) return;

    setBusy(true);
    setInput("");
    setMessages((prev) => [
      ...prev,
      { role: "user", content: query },
      { role: "assistant", content: "", stages: [] },
    ]);
    scrollDown();

    await streamChat(
      query,
      {
        onStage: (stage) =>
          updateLast((m) => ({ ...m, stages: [...(m.stages || []), stage] })),
        onEvidence: (chunks) => updateLast((m) => ({ ...m, evidence: chunks })),
        onMeta: (meta) => updateLast((m) => ({ ...m, meta: { ...m.meta, ...meta } })),
        onToken: (token) => {
          updateLast((m) => ({ ...m, content: m.content + token }));
          scrollDown();
        },
        onCitations: (citations) => updateLast((m) => ({ ...m, citations })),
        onWellness: (notes) => updateLast((m) => ({ ...m, wellness: notes })),
        onComplete: (meta) => {
          updateLast((m) => ({ ...m, status: meta.status }));
          setBusy(false);
          scrollDown();
        },
        onError: (err) => {
          updateLast((m) => ({
            ...m,
            content: m.content || `⚠️ ${err.message}`,
            status: "ERROR",
          }));
          setBusy(false);
        },
      },
      undefined,
      lang
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="mx-auto mt-16 max-w-md text-center">
            <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-light text-teal">
              <FileText className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">{t("heroTitle")}</h2>
            <p className="mt-2 text-sm text-gray-500">{t("heroDesc")}</p>
          </div>
        )}

        {messages.map((msg, i) =>
          msg.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-cta px-4 py-2.5 text-sm text-white">
                {msg.content}
              </div>
            </div>
          ) : (
            <div key={i} className="space-y-3">
              {/* Pipeline trace stepper */}
              {msg.stages && msg.stages.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    {t("pipelineTrace")}:
                  </span>
                  {msg.stages.map((s, j) => {
                    const Icon = STAGE_ICONS[s.name] || Cpu;
                    return (
                      <span
                        key={j}
                        className="inline-flex items-center gap-1 rounded-full bg-teal-light px-2.5 py-1 text-xs font-medium text-teal-dark"
                      >
                        <Icon className="h-3 w-3" />
                        {s.name} · {s.ms}ms
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Evidence panel */}
              {msg.evidence && msg.evidence.length > 0 && (
                <details className="rounded-xl border border-gray-100 bg-white p-3">
                  <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {t("evidencePanel")} ({msg.evidence.length})
                  </summary>
                  <div className="mt-2 space-y-2">
                    {msg.evidence.map((ev, j) => (
                      <button
                        key={j}
                        onClick={() =>
                          onOpenSource({ docName: ev.displayName || ev.doc, page: ev.page })
                        }
                        className="block w-full rounded-lg border border-gray-100 bg-gray-50 p-2.5 text-left text-xs hover:border-teal"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-gray-800">
                            {ev.displayName || ev.doc}
                          </span>
                          <span className="shrink-0 rounded-full bg-teal-light px-2 py-0.5 font-mono text-teal-dark">
                            {ev.score}
                          </span>
                        </div>
                        <div className="mt-0.5 text-gray-500">
                          {ev.section} · {t("page")} {ev.page}
                        </div>
                        {ev.text && <p className="mt-1 line-clamp-2 text-gray-400">{ev.text}</p>}
                      </button>
                    ))}
                  </div>
                </details>
              )}

              {/* Answer */}
              <div className="rounded-2xl rounded-bl-md border border-gray-100 bg-white p-4 shadow-sm">
                <StatusBadge status={msg.status} />
                {msg.content ? (
                  <div className="prose prose-sm mt-1 max-w-none prose-headings:text-teal-dark prose-headings:text-base prose-h2:mb-1 prose-h2:mt-4 first:prose-h2:mt-0">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 py-1 text-sm text-gray-400">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-teal" />
                    {t("thinking")}
                  </div>
                )}
              </div>

              {/* Citation pills */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    {t("citations")}:
                  </span>
                  {msg.citations.map((c, j) => (
                    <button
                      key={j}
                      onClick={() =>
                        onOpenSource({ docName: c.doc, page: parseInt(c.page) || 1 })
                      }
                      className="inline-flex items-center gap-1 rounded-full border border-teal/30 bg-teal-light px-3 py-1 text-xs font-medium text-teal-dark transition hover:bg-teal hover:text-white"
                    >
                      <FileText className="h-3 w-3" />
                      {c.doc} {c.page && `· p.${c.page}`}
                    </button>
                  ))}
                </div>
              )}

              {/* Quality HUD */}
              {msg.meta && (msg.meta.model || msg.meta.confidence !== undefined) && (
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                  <Gauge className="h-3.5 w-3.5" />
                  {msg.meta.confidence !== undefined && (
                    <span>
                      {t("confidence")}: <b className="text-gray-600">{msg.meta.confidence}</b>
                    </span>
                  )}
                  {msg.meta.model && (
                    <span>
                      {t("model")}: <b className="text-gray-600">{msg.meta.model}</b>
                    </span>
                  )}
                  {msg.meta.latency_ms !== undefined && (
                    <span>
                      {t("latency")}: <b className="text-gray-600">{msg.meta.latency_ms}ms</b>
                    </span>
                  )}
                </div>
              )}

              {/* Wellness Notes 💚 */}
              {msg.wellness && msg.wellness.length > 0 && (
                <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-green-800">
                    <HeartHandshake className="h-4 w-4" /> {t("wellnessTitle")}
                  </h3>
                  <div className="mt-2 space-y-3">
                    {msg.wellness.map((note, j) => (
                      <div key={j} className="rounded-xl bg-white/70 p-3">
                        <p className="text-sm italic text-green-900">"{note.quote}"</p>
                        <a
                          href={note.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-block text-xs font-semibold text-green-700 underline"
                        >
                          {note.source} ↗
                        </a>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs font-medium text-green-600">
                    {t("wellnessDisclaimer")}
                  </p>
                </div>
              )}
            </div>
          )
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="border-t border-gray-100 bg-white p-3">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("chatPlaceholder")}
            disabled={busy}
            className="flex-1 rounded-full border border-gray-200 px-5 py-3 text-sm outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/20 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cta text-white transition hover:bg-cta-dark disabled:opacity-50"
            aria-label={t("send")}
          >
            <Send className="h-4 w-4 rtl:-scale-x-100" />
          </button>
        </div>
      </form>
    </div>
  );
}
