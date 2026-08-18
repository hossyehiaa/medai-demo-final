'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AuroraBackground } from '@/components/AuroraBackground';
import { ChatMessage, type ChatMessageData } from '@/components/ChatMessage';
import { SuggestedQueries } from '@/components/SuggestedQueries';
import { SendButton } from '@/components/SendButton';
import { ScrollToLatest } from '@/components/ScrollToLatest';
import { TypingIndicator } from '@/components/TypingIndicator';
import { StreamCaret } from '@/components/StreamCaret';
import { streamChat, type StreamMetadata } from '@/lib/stream-chat';
import { Stethoscope, Shield, Github } from 'lucide-react';

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [query, setQuery] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [chatId, setChatId] = useState<string>(() => crypto.randomUUID());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Check scroll position for "scroll to latest" button
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const isScrolledUp = el.scrollHeight - el.scrollTop - el.clientHeight > 100;
    setShowScrollButton(isScrolledUp);
  }, []);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (!showScrollButton) {
      scrollToBottom();
    }
  }, [messages, showScrollButton, scrollToBottom]);

  // Handle sending a message
  const handleSend = useCallback(async (queryText?: string) => {
    const q = (queryText || query).trim();
    if (!q || isStreaming) return;

    setQuery('');
    setIsStreaming(true);

    // Add user message
    const userMessage: ChatMessageData = {
      id: crypto.randomUUID(),
      role: 'user',
      content: q,
    };

    // Add placeholder AI message
    const assistantId = crypto.randomUUID();
    const assistantMessage: ChatMessageData = {
      id: assistantId,
      role: 'assistant',
      content: '',
      status: 'OK',
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);

    // Abort previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Stream the response
    await streamChat(
      q,
      // onToken
      (token) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? { ...msg, content: msg.content + token }
              : msg,
          ),
        );
      },
      // onComplete
      (metadata: StreamMetadata & { message?: string }) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? {
                  ...msg,
                  isStreaming: false,
                  status: (metadata.status as ChatMessageData['status']) || 'OK',
                  content: msg.content || metadata.message || '',
                  referral988: metadata.status === 'CRISIS',
                }
              : msg,
          ),
        );
        setIsStreaming(false);
      },
      // onError
      (error) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? {
                  ...msg,
                  isStreaming: false,
                  content: msg.content + `\n\n⚠️ Error: ${error.message}. Please try again.`,
                  status: 'FAILED_OUTPUT',
                }
              : msg,
          ),
        );
        setIsStreaming(false);
      },
      controller.signal,
    );
  }, [query, isStreaming]);

  // Handle keyboard
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // New chat
  const handleNewChat = useCallback(() => {
    if (isStreaming) {
      abortControllerRef.current?.abort();
    }
    setMessages([]);
    setChatId(crypto.randomUUID());
    setIsStreaming(false);
    inputRef.current?.focus();
  }, [isStreaming]);

  // Auto-resize textarea
  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuery(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, []);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-screen relative">
      <AuroraBackground />

      {/* ── Top Navigation ── */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 py-3 bg-white/70 dark:bg-[#0A0F14]/70 backdrop-blur-xl border-b border-white/20 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Stethoscope className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-teal-600 to-teal-500 dark:from-teal-400 dark:to-teal-300 bg-clip-text text-transparent leading-tight">
                medAI
              </h1>
              <p className="text-[10px] text-foreground/50 leading-tight hidden sm:block">
                Clinical Decision Support · USPSTF June 2023
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
            <Shield className="w-3 h-3" />
            Safety-Gated
          </div>
          <ThemeToggle />
          <a
            href="https://github.com/medAI"
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 rounded-full flex items-center justify-center bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 text-foreground/50 hover:text-foreground transition-colors cursor-pointer"
            aria-label="View on GitHub"
          >
            <Github className="w-4 h-4" />
          </a>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto chat-scroll"
        >
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
            {/* Welcome Hero */}
            {!hasMessages && (
              <motion.div
                className="flex flex-col items-center justify-center min-h-[60vh] text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <motion.div
                  className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-xl shadow-teal-500/20 mb-6"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.1 }}
                >
                  <Stethoscope className="w-10 h-10 text-white" />
                </motion.div>

                <motion.h2
                  className="text-3xl sm:text-4xl font-bold mb-2"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <span className="bg-gradient-to-r from-teal-600 to-teal-500 dark:from-teal-400 dark:to-teal-300 bg-clip-text text-transparent">
                    medAI
                  </span>{' '}
                  Clinical Assistant
                </motion.h2>

                <motion.p
                  className="text-foreground/60 text-base sm:text-lg mb-8 max-w-md"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  Evidence-based guidance on USPSTF depression &amp; suicide risk screening for adults
                </motion.p>

                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <SuggestedQueries onSelect={(q) => handleSend(q)} />
                </motion.div>

                <motion.p
                  className="mt-8 text-xs text-foreground/40 max-w-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  For clinical decision support only. Not a substitute for professional medical judgment.
                </motion.p>
              </motion.div>
            )}

            {/* Message List */}
            {hasMessages && (
              <div className="space-y-6 pb-4">
                {messages.map((msg) => (
                  <ChatMessage key={msg.id} message={msg} />
                ))}

                {/* Streaming caret */}
                {isStreaming && messages[messages.length - 1]?.role === 'assistant' && (
                  <div className="flex items-start gap-3">
                    <div className="w-8" />
                    <div className="max-w-[85%] sm:max-w-[75%] px-4 py-1">
                      <StreamCaret />
                    </div>
                  </div>
                )}

                {/* Typing indicator (shown briefly while waiting for first token) */}
                {isStreaming && messages[messages.length - 1]?.content === '' && (
                  <TypingIndicator />
                )}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ── Input Bar ── */}
        <div className="sticky bottom-0 z-10 px-4 sm:px-6 py-3 bg-white/80 dark:bg-[#0A0F14]/80 backdrop-blur-xl border-t border-white/20 dark:border-white/10">
          <div className="max-w-3xl mx-auto flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={query}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="Ask about USPSTF depression screening guidelines..."
                rows={1}
                className="
                  w-full resize-none rounded-2xl px-4 py-3 pr-4
                  bg-white/70 dark:bg-white/5 backdrop-blur-xl
                  border border-white/20 dark:border-white/10
                  focus:border-teal-500/40 focus:ring-2 focus:ring-teal-500/10
                  placeholder:text-foreground/30
                  text-sm leading-relaxed
                  transition-all duration-200
                  outline-none
                "
                style={{ maxHeight: '120px' }}
                disabled={isStreaming}
                aria-label="Type your clinical question"
              />
            </div>
            <SendButton
              onClick={() => handleSend()}
              disabled={!query.trim() || isStreaming}
              loading={isStreaming}
            />
          </div>

          {/* New chat button when messages exist */}
          {hasMessages && (
            <div className="max-w-3xl mx-auto mt-2 flex justify-center">
              <button
                onClick={handleNewChat}
                className="text-xs text-foreground/40 hover:text-foreground/60 transition-colors cursor-pointer"
              >
                Start new conversation
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Scroll to latest */}
      <ScrollToLatest visible={showScrollButton} onClick={scrollToBottom} />

      {/* ── Footer ── */}
      <footer className="mt-auto px-4 py-3 text-center">
        <p className="text-[10px] text-foreground/30 leading-relaxed">
          This tool is for clinical decision support only. It is not a substitute for professional medical judgment.
          Always verify current guidelines and consult appropriate specialists for individual patient care.
          If you are in crisis, call or text 988 (US).
        </p>
      </footer>
    </div>
  );
}
