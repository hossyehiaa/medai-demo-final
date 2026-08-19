"use client";

// Main app shell — tabbed interface: Chat / History / Evidence / About / Admin.
// Animated tab underline via framer-motion layoutId.
import { useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import ChatPanel from "@/components/ChatPanel";
import HistoryPanel from "@/components/HistoryPanel";
import EvidencePanel from "@/components/EvidencePanel";
import AdminPanel from "@/components/AdminPanel";
import SourceViewer, { type ViewerTarget } from "@/components/SourceViewer";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/auth-client";

type TabId = "chat" | "history" | "evidence" | "about" | "admin";

export default function AppShell() {
  const { t } = useI18n();
  const session = useSession();
  const [tab, setTab] = useState<TabId>("chat");
  const [viewerTarget, setViewerTarget] = useState<ViewerTarget | null>(null);

  const isAdmin = session.user?.role === "admin";

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: "chat", label: t("tabChat") },
    { id: "history", label: t("tabHistory") },
    { id: "evidence", label: t("tabEvidence") },
    { id: "about", label: t("tabAbout") },
    ...(isAdmin ? [{ id: "admin" as TabId, label: t("tabAdmin") }] : []),
  ];

  return (
    <div className="flex h-screen flex-col bg-mint">
      <Navbar />

      {/* Tabs */}
      <div className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
          {tabs.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`relative shrink-0 px-4 py-3 text-sm font-semibold transition ${
                tab === item.id ? "text-teal" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {item.label}
              {tab === item.id && (
                <motion.span
                  layoutId="tab-underline"
                  className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-teal"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Panel */}
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col overflow-hidden">
        {tab === "chat" && <ChatPanel onOpenSource={setViewerTarget} />}
        {tab === "history" && (
          <div className="flex-1 overflow-y-auto">
            <HistoryPanel onOpenSource={setViewerTarget} />
          </div>
        )}
        {tab === "evidence" && (
          <div className="flex-1 overflow-y-auto">
            <EvidencePanel onOpenSource={setViewerTarget} />
          </div>
        )}
        {tab === "about" && (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="mx-auto max-w-2xl rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">{t("tabAbout")}</h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">{t("aboutText")}</p>
              <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-600">
                ⚠️ {t("footer988")}
              </p>
              <p className="mt-3 text-xs text-gray-400">{t("footerDisclaimer")}</p>
            </div>
          </div>
        )}
        {tab === "admin" && isAdmin && (
          <div className="flex-1 overflow-y-auto">
            <AdminPanel />
          </div>
        )}
      </div>

      <SourceViewer target={viewerTarget} onClose={() => setViewerTarget(null)} />
    </div>
  );
}
