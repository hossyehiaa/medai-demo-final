'use client';

import { useState, useRef, useCallback, useEffect, Suspense } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// Brand & Layout
import { BrandLogo } from '@/components/BrandLogo';
import { ECGLoader } from '@/components/ECGLoader';
import { ECGDivider } from '@/components/ECGDivider';
import { LanguageToggle } from '@/components/LanguageToggle';

// Chat Core
import { ChatMessage, type ChatMessageData } from '@/components/ChatMessage';
import { SuggestedQueries } from '@/components/SuggestedQueries';
import { SendButton } from '@/components/SendButton';
import { ScrollToLatest } from '@/components/ScrollToLatest';
import { TypingIndicator } from '@/components/TypingIndicator';
import { StreamCaret } from '@/components/StreamCaret';

// F1: Source Viewer
import { SourceViewer } from '@/components/SourceViewer';

// F2: Pipeline Trace
import { PipelineTrace } from '@/components/PipelineTrace';

// F3: Evidence Panel
import { EvidencePanel, type EvidenceChunk } from '@/components/EvidencePanel';

// F4: Quality HUD
import { QualityHUD } from '@/components/QualityHUD';

// F5: Crisis Experience
import { CrisisScreen } from '@/components/CrisisScreen';

// F7: Export Report
import { ExportReport } from '@/components/ExportReport';

// F8: Smart Follow-ups
import { SmartFollowups } from '@/components/SmartFollowups';

// F9: PHQ-9 Screener
import { PHQ9Screener } from '@/components/PHQ9Screener';

// F10: Clinician/Patient Mode
import { ClinicianPatientToggle } from '@/components/ClinicianPatientToggle';

// F11: Session History
import { HistorySidebar, saveSession } from '@/components/HistorySidebar';

// F12: Command Palette
import { CommandPalette } from '@/components/CommandPalette';

// Streaming
import {
  streamChat,
  type StreamMetadata,
  type StageEvent,
  type EvidenceChunk as StreamEvidenceChunk,
  type MetaEvent,
  type CitationItem,
} from '@/lib/stream-chat';

// Auth
import { useAuth } from '@/components/AuthProvider';
import { setGuestMode } from '@/lib/auth-client';

// PDF Map
import { PDF_MAP } from '@/lib/pdfMap';

// Icons
import {
  Shield,
  Github,
  History,
  FileDown,
  ClipboardList,
  Command,
  Share2,
  Check,
  MessageSquare,
  BookOpen,
  Clock,
  Info,
  LogOut,
  User,
  AlertTriangle,
  Trash2,
  ExternalLink,
  Phone,
} from 'lucide-react';

// ── Extended ChatMessageData with full metadata ────────────────────
interface ExtendedChatMessageData extends ChatMessageData {
  evidence?: EvidenceChunk[];
  citations?: CitationItem[];
  meta?: MetaEvent;
  stages?: StageEvent[];
}

// ── F13: Shareable Link ────────────────────────────────────────────
function generateShareLink(messageId: string, content: string): string {
  const data = btoa(encodeURIComponent(content.substring(0, 500)));
  return `${typeof window !== 'undefined' ? window.location.origin : ''}/share?id=${messageId}&d=${data}`;
}

// ── Tab type ──────────────────────────────────────────────────────
type TabId = 'chat' | 'evidence' | 'history' | 'about';

const TAB_CONFIG: { id: TabId; icon: typeof MessageSquare; labelKey: string }[] = [
  { id: 'chat', icon: MessageSquare, labelKey: 'tabs.chat' },
  { id: 'evidence', icon: BookOpen, labelKey: 'tabs.evidence' },
  { id: 'history', icon: Clock, labelKey: 'tabs.history' },
  { id: 'about', icon: Info, labelKey: 'tabs.about' },
];

// ── Evidence library cards data ───────────────────────────────────
const EVIDENCE_CARDS = [
  { key: 'USPSTF Clinician Summary (JAMA 2023)', cardIndex: 1, pages: 6 },
  { key: 'USPSTF Final Evidence Summary (2023)', cardIndex: 2, pages: 30 },
  { key: 'AHRQ Evidence Review (USPSTF Bookshelf)', cardIndex: 3, pages: 200 },
];

// ── History type ──────────────────────────────────────────────────
interface HistoryEntry {
  id: string;
  title: string;
  timestamp: number;
  messageCount: number;
  preview: string;
}

// ── App Page Component ────────────────────────────────────────────
function AppPageContent() {
  const t = useTranslations();
  const locale = useLocale() as 'en' | 'ar';
  const isRTL = locale === 'ar';
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isGuest, logout } = useAuth();

  // ── Tab state (synced with URL) ────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    if (typeof window !== 'undefined') {
      const tab = new URLSearchParams(window.location.search).get('tab');
      if (tab && ['chat', 'evidence', 'history', 'about'].includes(tab)) {
        return tab as TabId;
      }
    }
    return 'chat';
  });

  const handleTabChange = useCallback(
    (tab: TabId) => {
      setActiveTab(tab);
      const url = new URL(window.location.href);
      if (tab === 'chat') {
        url.searchParams.delete('tab');
      } else {
        url.searchParams.set('tab', tab);
      }
      router.replace(url.pathname + url.search, { scroll: false });
    },
    [router]
  );

  // ── Guest mode from URL ────────────────────────────────────────
  useEffect(() => {
    const guestParam = searchParams.get('guest');
    if (guestParam === 'true') {
      setGuestMode(true);
    }
  }, [searchParams]);

  // ── Core Chat State ────────────────────────────────────────────
  const [messages, setMessages] = useState<ExtendedChatMessageData[]>([]);
  const [query, setQuery] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [chatId, setChatId] = useState<string>(() => crypto.randomUUID());

  // ── Feature State ──────────────────────────────────────────────
  const [showCrisis, setShowCrisis] = useState(false);
  const [activePipelineStage, setActivePipelineStage] = useState(-1);
  const [currentEvidence, setCurrentEvidence] = useState<EvidenceChunk[]>([]);
  const [currentMeta, setCurrentMeta] = useState<MetaEvent | null>(null);
  const [mode, setMode] = useState<'clinician' | 'patient'>('clinician');
  const [showScreener, setShowScreener] = useState(false);

  // F11: History sidebar
  const [showHistory, setShowHistory] = useState(false);

  // F12: Command palette
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // F1: Source Viewer
  const [sourceViewer, setSourceViewer] = useState<{
    isOpen: boolean;
    docName: string;
    page?: number;
    quote?: string;
  }>({ isOpen: false, docName: '' });

  // F13: Shareable link
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  // ── Refs ───────────────────────────────────────────────────────
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Auto-scroll ────────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const isScrolledUp = el.scrollHeight - el.scrollTop - el.clientHeight > 100;
    setShowScrollButton(isScrolledUp);
  }, []);

  useEffect(() => {
    if (!showScrollButton) scrollToBottom();
  }, [messages, showScrollButton, scrollToBottom]);

  // ── F12: Command Palette Keyboard Shortcut ─────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Handle Sending a Message ───────────────────────────────────
  const handleSend = useCallback(
    async (queryText?: string) => {
      const q = (queryText || query).trim();
      if (!q || isStreaming) return;

      setQuery('');
      setIsStreaming(true);
      setActivePipelineStage(0);
      setCurrentEvidence([]);
      setCurrentMeta(null);

      const userMessage: ExtendedChatMessageData = {
        id: crypto.randomUUID(),
        role: 'user',
        content: q,
      };

      const assistantId = crypto.randomUUID();
      const assistantMessage: ExtendedChatMessageData = {
        id: assistantId,
        role: 'assistant',
        content: '',
        status: 'OK',
        isStreaming: true,
        evidence: [],
        citations: [],
        stages: [],
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const stageIndexMap: Record<string, number> = {
        safety: 0,
        retrieval: 1,
        rerank: 2,
        confidence: 3,
        generation: 4,
        verification: 5,
      };

      await streamChat(
        q,
        {
          onToken: (token) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantId
                  ? { ...msg, content: msg.content + token }
                  : msg,
              ),
            );
          },

          onStage: (stage) => {
            const idx = stageIndexMap[stage.name] ?? activePipelineStage;
            setActivePipelineStage(idx);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantId
                  ? { ...msg, stages: [...(msg.stages || []), stage] }
                  : msg,
              ),
            );
          },

          onEvidence: (chunks) => {
            setCurrentEvidence(chunks);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantId ? { ...msg, evidence: chunks } : msg,
              ),
            );
          },

          onMeta: (meta) => {
            setCurrentMeta(meta);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantId ? { ...msg, meta } : msg,
              ),
            );
          },

          onCitations: (citations) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantId ? { ...msg, citations } : msg,
              ),
            );
          },

          onComplete: (metadata) => {
            const isCrisis = metadata.referral988 || metadata.status === 'CRISIS';
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantId
                  ? {
                      ...msg,
                      isStreaming: false,
                      status:
                        (metadata.status as ExtendedChatMessageData['status']) ||
                        'OK',
                      content: msg.content || metadata.message || '',
                      referral988: isCrisis,
                    }
                  : msg,
              ),
            );
            setIsStreaming(false);
            setActivePipelineStage(-1);

            if (isCrisis) {
              setShowCrisis(true);
            }

            const lastMessages = messages.slice(-4);
            saveSession({
              id: chatId,
              title: q.substring(0, 60),
              timestamp: Date.now(),
              messageCount: lastMessages.length + 2,
              preview: q.substring(0, 80),
            });
          },

          onError: (error) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantId
                  ? {
                      ...msg,
                      isStreaming: false,
                      content:
                        msg.content +
                        `\n\n⚠️ Error: ${error.message}. Please try again.`,
                      status: 'FAILED_OUTPUT',
                    }
                  : msg,
              ),
            );
            setIsStreaming(false);
            setActivePipelineStage(-1);
          },
        },
        controller.signal,
        locale,
      );
    },
    [query, isStreaming, locale, chatId, messages, activePipelineStage],
  );

  // ── Keyboard Handler ───────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // ── New Chat ───────────────────────────────────────────────────
  const handleNewChat = useCallback(() => {
    if (isStreaming) abortControllerRef.current?.abort();
    setMessages([]);
    setChatId(crypto.randomUUID());
    setIsStreaming(false);
    setCurrentEvidence([]);
    setCurrentMeta(null);
    setActivePipelineStage(-1);
    inputRef.current?.focus();
  }, [isStreaming]);

  // ── Auto-resize Textarea ───────────────────────────────────────
  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setQuery(e.target.value);
      const el = e.target;
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    },
    [],
  );

  // ── F13: Copy Share Link ───────────────────────────────────────
  const handleShare = useCallback(async (msgId: string, content: string) => {
    const link = generateShareLink(msgId, content);
    await navigator.clipboard.writeText(link);
    setCopiedLinkId(msgId);
    setTimeout(() => setCopiedLinkId(null), 2000);
  }, []);

  // ── F1: Open Source Viewer ─────────────────────────────────────
  const handleViewSource = useCallback((docName: string, page: number) => {
    setSourceViewer({ isOpen: true, docName, page });
  }, []);

  const hasMessages = messages.length > 0;
  const lastAssistant = messages
    .filter((m) => m.role === 'assistant')
    .pop();

  // ── History management ─────────────────────────────────────────
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const userEmail = user?.email || 'guest';

  // Load history when tab switches to history or user changes
  useEffect(() => {
    if (activeTab !== 'history') return;
    let entries: HistoryEntry[] = [];
    try {
      const key = `medai_history_${userEmail}`;
      const stored = localStorage.getItem(key);
      entries = stored ? JSON.parse(stored) : [];
    } catch {
      entries = [];
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate: loading from localStorage on tab change
    setHistoryEntries(entries);
  }, [activeTab, userEmail]);

  const deleteHistoryEntry = useCallback(
    (id: string) => {
      try {
        const key = `medai_history_${userEmail}`;
        const stored = localStorage.getItem(key);
        if (stored) {
          const entries: HistoryEntry[] = JSON.parse(stored);
          const filtered = entries.filter((e) => e.id !== id);
          localStorage.setItem(key, JSON.stringify(filtered));
          setHistoryEntries(filtered);
        }
      } catch {
        // ignore
      }
      setDeleteConfirmId(null);
    },
    [userEmail]
  );

  // ── Role badge colors ──────────────────────────────────────────
  const role = (user?.role as string) || (isGuest ? 'guest' : '');
  const roleBadgeColor =
    role === 'physician'
      ? 'bg-blue-500/20 text-blue-400'
      : role === 'patient'
        ? 'bg-green-500/20 text-green-400'
        : 'bg-gray-500/20 text-gray-400';

  const roleLabel =
    role === 'physician'
      ? t('auth.physician')
      : role === 'patient'
        ? t('auth.patient')
        : t('auth.guest');

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : isGuest
      ? 'G'
      : '?';

  return (
    <div className="flex flex-col h-screen relative bg-[#0A1128]">
      {/* ── Top Navigation ── */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 py-3 bg-[#0A1128]/80 backdrop-blur-xl border-b border-[#223058]">
        <div className="flex items-center gap-3">
          {/* History toggle */}
          <button
            onClick={() => setShowHistory(true)}
            className="p-1.5 rounded-md hover:bg-[#1A2647] text-[#AAB4D4] hover:text-[#4ECDC4] transition-colors"
            aria-label={t('chat.sessionHistory')}
          >
            <History className="w-4 h-4" />
          </button>

          {/* Brand Logo */}
          <BrandLogo variant="ecg" size={36} />
        </div>

        <div className="flex items-center gap-2">
          {/* User avatar + role */}
          {((isAuthenticated && user) || isGuest) && (
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#4ECDC4]/20 flex items-center justify-center text-xs font-semibold text-[#4ECDC4]">
                {userInitials}
              </div>
              <span className="text-xs text-[#AAB4D4] max-w-[100px] truncate">
                {user?.name || (isGuest ? t('auth.guest') : '')}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${roleBadgeColor}`}>
                {roleLabel}
              </span>
            </div>
          )}

          {/* Safety badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#4ECDC4]/10 text-[#4ECDC4] text-xs font-medium">
            <Shield className="w-3 h-3" />
            Safety-Gated
          </div>

          {/* F10: Clinician/Patient Mode */}
          <ClinicianPatientToggle mode={mode} onToggle={setMode} />

          {/* F6: Language Toggle */}
          <LanguageToggle />

          {/* F12: Command Palette trigger */}
          <button
            onClick={() => setShowCommandPalette(true)}
            className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-[#131B3F] border border-[#223058] text-xs text-[#AAB4D4] hover:text-[#F5F7FB] hover:border-[#4ECDC4]/30 transition-colors"
          >
            <Command className="w-3 h-3" />
            <kbd className="text-[10px] text-[#7683AB]">⌘K</kbd>
          </button>

          {/* Logout */}
          {(isAuthenticated || isGuest) && (
            <button
              onClick={logout}
              className="p-1.5 rounded-md hover:bg-[#1A2647] text-[#AAB4D4] hover:text-[#F87171] transition-colors"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}

          {/* GitHub */}
          <a
            href="https://github.com/hossyehiaa/medai-demo-final"
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 rounded-full flex items-center justify-center bg-[#131B3F] border border-[#223058] text-[#AAB4D4] hover:text-[#F5F7FB] hover:border-[#4ECDC4]/30 transition-colors"
            aria-label="GitHub"
          >
            <Github className="w-4 h-4" />
          </a>
        </div>
      </header>

      {/* ── Guest Banner ── */}
      {isGuest && !isAuthenticated && (
        <div className="px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/20 flex items-center justify-center gap-2 text-xs text-yellow-400">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>{t('auth.guestBanner')}</span>
          <button
            onClick={() => router.push(`/${locale}/login`)}
            className="underline font-medium hover:text-yellow-300 transition-colors"
          >
            {t('login.signIn')}
          </button>
        </div>
      )}

      {/* ── Tab Bar (Desktop) ── */}
      <nav className="hidden md:flex items-center gap-1 px-4 sm:px-6 py-2 bg-[#0A1128] border-b border-[#223058]">
        {TAB_CONFIG.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'text-[#4ECDC4]'
                  : 'text-[#AAB4D4] hover:text-[#F5F7FB] hover:bg-[#131B3F]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t(tab.labelKey)}
              {isActive && (
                <motion.div
                  className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#4ECDC4] rounded-full"
                  layoutId="tab-underline"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Main Content ── */}
      <main id="main-content" className="flex-1 flex flex-col overflow-hidden">
        {/* ── CHAT TAB ── */}
        {activeTab === 'chat' && (
          <>
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto chat-scroll"
            >
              <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
                {/* ── Welcome Hero ── */}
                {!hasMessages && !showScreener && (
                  <motion.div
                    className="flex flex-col items-center justify-center min-h-[60vh] text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <motion.div
                      className="mb-6"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.1 }}
                    >
                      <ECGLoader size={160} />
                    </motion.div>

                    <motion.h2
                      className="text-3xl sm:text-4xl font-bold mb-2"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <span className="bg-gradient-to-r from-[#4ECDC4] to-[#2EA89F] bg-clip-text text-transparent">
                        {t('hero.title')}
                      </span>
                    </motion.h2>

                    <motion.p
                      className="text-[#AAB4D4] text-base sm:text-lg mb-8 max-w-md"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      {t('hero.subtitle')}
                    </motion.p>

                    <motion.div
                      className="w-full max-w-lg mb-6"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.35 }}
                    >
                      <ECGDivider />
                    </motion.div>

                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      <SuggestedQueries onSelect={(q) => handleSend(q)} />
                    </motion.div>

                    <motion.button
                      onClick={() => setShowScreener(true)}
                      className="mt-6 flex items-center gap-2 px-4 py-2 rounded-full bg-[#4ECDC4]/10 border border-[#4ECDC4]/30 text-sm text-[#4ECDC4] hover:bg-[#4ECDC4]/20 transition-colors"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <ClipboardList className="w-4 h-4" />
                      {t('phq9.title')}
                    </motion.button>

                    <motion.p
                      className="mt-6 text-xs text-[#7683AB] max-w-sm"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                    >
                      {t('hero.disclaimer')}
                    </motion.p>
                  </motion.div>
                )}

                {/* ── PHQ-9 Screener (F9) ── */}
                {showScreener && !hasMessages && (
                  <motion.div
                    className="max-w-xl mx-auto"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ stiffness: 120, damping: 14 }}
                  >
                    <button
                      onClick={() => setShowScreener(false)}
                      className="mb-4 text-sm text-[#AAB4D4] hover:text-[#4ECDC4] transition-colors"
                    >
                      ← {t('chat.chat')}
                    </button>
                    <PHQ9Screener
                      onComplete={(score, severity) => {
                        // Optionally send the score as a message
                      }}
                    />
                  </motion.div>
                )}

                {/* ── Message List ── */}
                {hasMessages && (
                  <div className="space-y-6 pb-4">
                    {messages.map((msg) => (
                      <div key={msg.id}>
                        <ChatMessage message={msg} />

                        {msg.role === 'assistant' && !msg.isStreaming && msg.content && (
                          <motion.div
                            className="mt-3 ml-11 space-y-3"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                          >
                            {msg.evidence && msg.evidence.length > 0 && (
                              <EvidencePanel
                                chunks={msg.evidence}
                                onViewSource={(doc, page) => handleViewSource(doc, page)}
                              />
                            )}

                            <div className="space-y-2">
                              {msg.stages && msg.stages.length > 0 && (
                                <PipelineTrace activeStage={5} />
                              )}
                              {msg.meta && (
                                <QualityHUD
                                  confidence={msg.meta.confidence}
                                  model={msg.meta.model}
                                  latencyMs={msg.meta.latency_ms}
                                  tokens={msg.meta.tokens}
                                  citationsVerified={msg.meta.citations_verified}
                                  citationsTotal={msg.meta.citations_total}
                                />
                              )}
                            </div>

                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <SmartFollowups onFollowUp={(q) => handleSend(q)} />
                              <div className="flex items-center gap-2 shrink-0">
                                <ExportReport messages={messages.map((m) => ({ role: m.role, content: m.content }))} />
                                <motion.button
                                  onClick={() => handleShare(msg.id, msg.content)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#131B3F] border border-[#223058] rounded-lg text-xs text-[#AAB4D4] hover:text-[#F5F7FB] hover:border-[#4ECDC4]/30 transition-colors"
                                  whileTap={{ scale: 0.95 }}
                                  aria-label={t('chat.copyLink')}
                                >
                                  {copiedLinkId === msg.id ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-[#4ECDC4]" />
                                      <span className="text-[#4ECDC4]">{t('chat.copied')}</span>
                                    </>
                                  ) : (
                                    <>
                                      <Share2 className="w-3.5 h-3.5" />
                                      <span>{t('chat.copyLink')}</span>
                                    </>
                                  )}
                                </motion.button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    ))}

                    {isStreaming &&
                      messages[messages.length - 1]?.role === 'assistant' && (
                        <div className="flex items-start gap-3">
                          <div className="w-8" />
                          <div className="max-w-[85%] sm:max-w-[75%] px-4 py-1">
                            <StreamCaret />
                          </div>
                        </div>
                      )}

                    {isStreaming && messages[messages.length - 1]?.content === '' && (
                      <TypingIndicator />
                    )}

                    {isStreaming && activePipelineStage >= 0 && (
                      <div className="ml-11">
                        <PipelineTrace activeStage={activePipelineStage} />
                      </div>
                    )}

                    {isStreaming && currentEvidence.length > 0 && (
                      <div className="ml-11">
                        <EvidencePanel
                          chunks={currentEvidence}
                          onViewSource={(doc, page) => handleViewSource(doc, page)}
                        />
                      </div>
                    )}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* ── Input Bar ── */}
            <div className="sticky bottom-0 z-10 px-4 sm:px-6 py-3 bg-[#0A1128]/80 backdrop-blur-xl border-t border-[#223058]">
              <div className="max-w-3xl mx-auto flex items-end gap-2">
                <button
                  onClick={() => setShowScreener(true)}
                  className="shrink-0 p-2.5 rounded-xl bg-[#131B3F] border border-[#223058] text-[#AAB4D4] hover:text-[#4ECDC4] hover:border-[#4ECDC4]/30 transition-colors"
                  aria-label={t('phq9.title')}
                  title={t('phq9.title')}
                >
                  <ClipboardList className="w-4 h-4" />
                </button>

                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={query}
                    onChange={handleInput}
                    onKeyDown={handleKeyDown}
                    placeholder={t('chat.placeholder')}
                    rows={1}
                    className="
                      w-full resize-none rounded-2xl px-4 py-3 pr-4
                      bg-[#131B3F] border border-[#223058]
                      focus:border-[#4ECDC4]/40 focus:ring-2 focus:ring-[#4ECDC4]/10
                      placeholder:text-[#7683AB]
                      text-sm leading-relaxed text-[#F5F7FB]
                      transition-all duration-200
                      outline-none
                    "
                    style={{ maxHeight: '120px' }}
                    disabled={isStreaming}
                    aria-label="Type your clinical question"
                    id="chat-input"
                  />
                </div>
                <SendButton
                  onClick={() => handleSend()}
                  disabled={!query.trim() || isStreaming}
                  loading={isStreaming}
                />
              </div>

              {hasMessages && (
                <div className="max-w-3xl mx-auto mt-2 flex justify-center">
                  <button
                    onClick={handleNewChat}
                    className="text-xs text-[#7683AB] hover:text-[#AAB4D4] transition-colors cursor-pointer"
                  >
                    {t('chat.newChat')}
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── EVIDENCE LIBRARY TAB ── */}
        {activeTab === 'evidence' && (
          <div className="flex-1 overflow-y-auto chat-scroll">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h2 className="text-2xl font-bold text-[#F5F7FB] mb-2">
                  {t('evidenceLib.title')}
                </h2>
                <p className="text-sm text-[#AAB4D4] mb-8">
                  {t('evidenceLib.subtitle')}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {EVIDENCE_CARDS.map((card) => {
                    const mapping = PDF_MAP[card.key];
                    return (
                      <motion.div
                        key={card.cardIndex}
                        className="bg-[#131B3F] border border-[#223058] rounded-xl p-5 hover:border-[#4ECDC4]/30 transition-colors"
                        whileHover={{ y: -2 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="w-10 h-10 rounded-lg bg-[#4ECDC4]/10 flex items-center justify-center mb-3">
                          <BookOpen className="w-5 h-5 text-[#4ECDC4]" />
                        </div>
                        <h3 className="text-sm font-semibold text-[#F5F7FB] mb-2">
                          {t(`evidenceLib.card${card.cardIndex}Title`)}
                        </h3>
                        <p className="text-xs text-[#AAB4D4] mb-3 leading-relaxed">
                          {t(`evidenceLib.card${card.cardIndex}Desc`)}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-[#7683AB]">
                            {card.pages} {t('evidenceLib.pages')}
                          </span>
                          <button
                            onClick={() => handleViewSource(card.key, 1)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#4ECDC4]/10 text-xs text-[#4ECDC4] hover:bg-[#4ECDC4]/20 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {t('evidenceLib.openPdf')}
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {activeTab === 'history' && (
          <div className="flex-1 overflow-y-auto chat-scroll">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h2 className="text-2xl font-bold text-[#F5F7FB] mb-6">
                  {t('history.title')}
                </h2>

                {isGuest && !isAuthenticated && (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 text-[#7683AB] mx-auto mb-4" />
                    <p className="text-[#AAB4D4] mb-2">{t('auth.guestBanner')}</p>
                    <button
                      onClick={() => router.push(`/${locale}/login`)}
                      className="px-4 py-2 rounded-lg bg-[#4ECDC4]/10 text-sm text-[#4ECDC4] hover:bg-[#4ECDC4]/20 transition-colors"
                    >
                      {t('login.signIn')}
                    </button>
                  </div>
                )}

                {!isGuest && historyEntries.length === 0 && (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 text-[#7683AB] mx-auto mb-4" />
                    <p className="text-[#AAB4D4]">{t('history.empty')}</p>
                  </div>
                )}

                {!isGuest && historyEntries.length > 0 && (
                  <div className="space-y-3">
                    {historyEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between bg-[#131B3F] border border-[#223058] rounded-lg px-4 py-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#F5F7FB] font-medium truncate">
                            {entry.title || entry.preview}
                          </p>
                          <p className="text-xs text-[#7683AB] mt-0.5">
                            {new Date(entry.timestamp).toLocaleDateString(locale, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <button
                            onClick={() => {
                              handleTabChange('chat');
                              handleNewChat();
                            }}
                            className="px-3 py-1.5 rounded-md text-xs text-[#4ECDC4] hover:bg-[#4ECDC4]/10 transition-colors"
                          >
                            {t('history.open')}
                          </button>
                          {deleteConfirmId === entry.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => deleteHistoryEntry(entry.id)}
                                className="px-2 py-1 rounded-md text-xs text-red-400 bg-red-400/10 hover:bg-red-400/20 transition-colors"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2 py-1 rounded-md text-xs text-[#AAB4D4] hover:bg-[#223058] transition-colors"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(entry.id)}
                              className="p-1.5 rounded-md text-[#7683AB] hover:text-red-400 hover:bg-red-400/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        )}

        {/* ── ABOUT TAB ── */}
        {activeTab === 'about' && (
          <div className="flex-1 overflow-y-auto chat-scroll">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-bold text-[#F5F7FB]">
                  {t('about.title')}
                </h2>

                {/* Scope */}
                <div className="bg-[#131B3F] border border-[#223058] rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-[#4ECDC4] mb-2">
                    {t('about.scopeTitle')}
                  </h3>
                  <p className="text-sm text-[#AAB4D4] leading-relaxed">
                    {t('about.scopeBody')}
                  </p>
                </div>

                {/* Methods */}
                <div className="bg-[#131B3F] border border-[#223058] rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-[#4ECDC4] mb-2">
                    {t('about.methodsTitle')}
                  </h3>
                  <p className="text-sm text-[#AAB4D4] leading-relaxed">
                    {t('about.methodsBody')}
                  </p>
                </div>

                {/* Limitations */}
                <div className="bg-[#131B3F] border border-[#223058] rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-[#F59E0B] mb-2">
                    {t('about.limitationsTitle')}
                  </h3>
                  <p className="text-sm text-[#AAB4D4] leading-relaxed">
                    {t('about.limitationsBody')}
                  </p>
                </div>

                {/* Judging Criteria */}
                <div className="bg-[#131B3F] border border-[#223058] rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-[#4ECDC4] mb-2">
                    {t('about.criteriaTitle')}
                  </h3>
                  <p className="text-sm text-[#AAB4D4] leading-relaxed">
                    {t('about.criteriaBody')}
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="px-4 py-3 text-center border-t border-[#223058]/50">
        <div className="flex items-center justify-center gap-4 text-[10px] text-[#7683AB]">
          <span>{t('footer.crisisLine')}</span>
          {locale === 'ar' && <span>{t('footer.egyptLine')}</span>}
          <span>|</span>
          <span>{t('footer.madeInEgypt')}</span>
        </div>
        <p className="text-[10px] text-[#7683AB]/60 mt-1 max-w-2xl mx-auto leading-relaxed">
          {t('footer.disclaimer')}
        </p>
      </footer>

      {/* ── Mobile Bottom Navigation ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around bg-[#0A1128]/95 backdrop-blur-xl border-t border-[#223058] py-2 px-2 safe-area-bottom">
        {TAB_CONFIG.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                isActive
                  ? 'text-[#4ECDC4]'
                  : 'text-[#7683AB]'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px]">{t(tab.labelKey)}</span>
            </button>
          );
        })}
      </nav>

      {/* ── Overlays ── */}

      {/* F5: Crisis Screen */}
      <CrisisScreen isVisible={showCrisis} onReturn={() => setShowCrisis(false)} />

      {/* F1: Source Viewer Drawer */}
      <SourceViewer
        isOpen={sourceViewer.isOpen}
        onClose={() => setSourceViewer({ isOpen: false, docName: '' })}
        docName={sourceViewer.docName}
        page={sourceViewer.page}
        quote={sourceViewer.quote}
      />

      {/* F11: History Sidebar */}
      <HistorySidebar
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onNewChat={handleNewChat}
        onLoadSession={() => {
          setShowHistory(false);
        }}
      />

      {/* F12: Command Palette */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onNewChat={handleNewChat}
        onExport={() => {}}
        onScreener={() => setShowScreener(true)}
      />

      {/* Scroll to latest */}
      <ScrollToLatest visible={showScrollButton} onClick={scrollToBottom} />

      {/* ── PHQ-9 Modal (when chat has messages) ── */}
      <AnimatePresence>
        {showScreener && hasMessages && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowScreener(false)}
            />
            <motion.div
              className="relative max-w-xl w-full max-h-[80vh] overflow-y-auto navy-scroll"
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ stiffness: 120, damping: 14 }}
            >
              <button
                onClick={() => setShowScreener(false)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-[#131B3F] border border-[#223058] text-[#AAB4D4] hover:text-[#F5F7FB] transition-colors"
              >
                ✕
              </button>
              <PHQ9Screener />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Default export with Suspense boundary for useSearchParams ─────
export default function AppPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-[#0A1128]">
        <div className="w-8 h-8 border-2 border-[#4ECDC4]/30 border-t-[#4ECDC4] rounded-full animate-spin" />
      </div>
    }>
      <AppPageContent />
    </Suspense>
  );
}
