'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
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

// ── Main Page Component ─────────────────────────────────────────────
export default function LocaleChatPage() {
  const t = useTranslations();
  const locale = useLocale() as 'en' | 'ar';
  const isRTL = locale === 'ar';

  // ── Core State ───────────────────────────────────────────────────
  const [messages, setMessages] = useState<ExtendedChatMessageData[]>([]);
  const [query, setQuery] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [chatId, setChatId] = useState<string>(() => crypto.randomUUID());

  // ── Feature State ────────────────────────────────────────────────
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

  // ── Refs ─────────────────────────────────────────────────────────
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Auto-scroll ──────────────────────────────────────────────────
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

  // ── F12: Command Palette Keyboard Shortcut (Ctrl/Cmd+K) ─────────
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

  // ── Handle Sending a Message ─────────────────────────────────────
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

      // Map stage names to indices
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

            // Show crisis screen for crisis queries
            if (isCrisis) {
              setShowCrisis(true);
            }

            // Save session to history
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

  // ── Keyboard Handler ─────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // ── New Chat ─────────────────────────────────────────────────────
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

  // ── Auto-resize Textarea ─────────────────────────────────────────
  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setQuery(e.target.value);
      const el = e.target;
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    },
    [],
  );

  // ── F13: Copy Share Link ─────────────────────────────────────────
  const handleShare = useCallback(async (msgId: string, content: string) => {
    const link = generateShareLink(msgId, content);
    await navigator.clipboard.writeText(link);
    setCopiedLinkId(msgId);
    setTimeout(() => setCopiedLinkId(null), 2000);
  }, []);

  // ── F1: Open Source Viewer ───────────────────────────────────────
  const handleViewSource = useCallback((docName: string, page: number) => {
    setSourceViewer({ isOpen: true, docName, page });
  }, []);

  const hasMessages = messages.length > 0;
  const lastAssistant = messages
    .filter((m) => m.role === 'assistant')
    .pop();

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

          {/* Brand Logo (F14: ECG) */}
          <BrandLogo variant="ecg" size={36} />
        </div>

        <div className="flex items-center gap-2">
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

      {/* ── Main Content ── */}
      <main id="main-content" className="flex-1 flex flex-col overflow-hidden">
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
                {/* ECG Loader (F14) */}
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

                {/* ECG Divider */}
                <motion.div
                  className="w-full max-w-lg mb-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                >
                  <ECGDivider />
                </motion.div>

                {/* Suggested Queries */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <SuggestedQueries onSelect={(q) => handleSend(q)} />
                </motion.div>

                {/* PHQ-9 Screener button */}
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

                {/* Disclaimer */}
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

                    {/* Post-message features for assistant messages */}
                    {msg.role === 'assistant' && !msg.isStreaming && msg.content && (
                      <motion.div
                        className="mt-3 ml-11 space-y-3"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        {/* F3: Evidence Panel */}
                        {msg.evidence && msg.evidence.length > 0 && (
                          <EvidencePanel
                            chunks={msg.evidence}
                            onViewSource={(doc, page) => handleViewSource(doc, page)}
                          />
                        )}

                        {/* F4: Quality HUD + F2: Pipeline Trace */}
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

                        {/* F8: Smart Follow-ups + F7: Export + F13: Share */}
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <SmartFollowups onFollowUp={(q) => handleSend(q)} />
                          <div className="flex items-center gap-2 shrink-0">
                            <ExportReport messages={messages.map((m) => ({ role: m.role, content: m.content }))} />
                            {/* F13: Shareable link */}
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

                {/* Streaming caret */}
                {isStreaming &&
                  messages[messages.length - 1]?.role === 'assistant' && (
                    <div className="flex items-start gap-3">
                      <div className="w-8" />
                      <div className="max-w-[85%] sm:max-w-[75%] px-4 py-1">
                        <StreamCaret />
                      </div>
                    </div>
                  )}

                {/* Typing indicator */}
                {isStreaming && messages[messages.length - 1]?.content === '' && (
                  <TypingIndicator />
                )}

                {/* Active pipeline trace while streaming */}
                {isStreaming && activePipelineStage >= 0 && (
                  <div className="ml-11">
                    <PipelineTrace activeStage={activePipelineStage} />
                  </div>
                )}

                {/* Active evidence while streaming */}
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
            {/* PHQ-9 quick launch */}
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

          {/* New chat button */}
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
