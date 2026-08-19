"use client";

// History panel — per-user past queries with search, reopen, and delete.
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useI18n } from "@/lib/i18n";
import { Trash2, ChevronDown, ChevronUp, Search } from "lucide-react";
import type { ViewerTarget } from "./SourceViewer";
import { FileText } from "lucide-react";

interface HistoryItem {
  id: string;
  query: string;
  response: string;
  status: string;
  citations: string;
  wellnessNotes: string;
  createdAt: string;
}

function statusStyle(status: string) {
  switch (status) {
    case "CRISIS":
      return "bg-red-100 text-red-700";
    case "REFUSAL":
    case "ERROR":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-teal-light text-teal-dark";
  }
}

export default function HistoryPanel({
  onOpenSource,
}: {
  onOpenSource: (target: ViewerTarget) => void;
}) {
  const { t } = useI18n();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/history");
      if (res.ok) setItems(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string) {
    await fetch(`/api/history?id=${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  const filtered = items.filter((i) => {
    const matchesSearch =
      !search ||
      i.query.toLowerCase().includes(search.toLowerCase()) ||
      i.response.toLowerCase().includes(search.toLowerCase());
    const matchesDate = !dateFilter || i.createdAt.startsWith(dateFilter);
    return matchesSearch && matchesDate;
  });

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold text-gray-900">{t("historyTitle")}</h2>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchHistory")}
            className="w-full rounded-full border border-gray-200 py-2.5 ps-9 pe-4 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
          />
        </div>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="rounded-full border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-teal"
        />
      </div>

      {loading ? (
        <p className="mt-8 text-center text-sm text-gray-400">…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-8 text-center text-sm text-gray-400">{t("historyEmpty")}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {filtered.map((item) => {
            const isOpen = openId === item.id;
            let citations: Array<{ doc: string; page: string; quote: string }> = [];
            try {
              citations = JSON.parse(item.citations || "[]");
            } catch {
              citations = [];
            }
            return (
              <div key={item.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <button
                    onClick={() => setOpenId(isOpen ? null : item.id)}
                    className="min-w-0 flex-1 text-start"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusStyle(item.status)}`}>
                        {item.status}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm font-semibold text-gray-900">{item.query}</p>
                    {!isOpen && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">
                        {item.response.replace(/[#*\[\]]/g, "").slice(0, 180)}
                      </p>
                    )}
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => setOpenId(isOpen ? null : item.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
                      aria-label={t("reopen")}
                    >
                      {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-red-50 hover:text-red-500"
                      aria-label={t("deleteQuery")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    <div className="prose prose-sm max-w-none prose-headings:text-teal-dark prose-headings:text-sm">
                      <ReactMarkdown>{item.response}</ReactMarkdown>
                    </div>
                    {citations.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {citations.map((c, j) => (
                          <button
                            key={j}
                            onClick={() => onOpenSource({ docName: c.doc, page: parseInt(c.page) || 1 })}
                            className="inline-flex items-center gap-1 rounded-full border border-teal/30 bg-teal-light px-3 py-1 text-xs font-medium text-teal-dark hover:bg-teal hover:text-white"
                          >
                            <FileText className="h-3 w-3" />
                            {c.doc} {c.page && `· p.${c.page}`}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
