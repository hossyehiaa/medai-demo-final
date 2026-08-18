'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Plus, Clock, Trash2, MessageSquare } from 'lucide-react';

interface ChatSession {
  id: string;
  title: string;
  timestamp: number;
  messageCount: number;
  preview: string;
}

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadSession?: (id: string) => void;
  onNewChat?: () => void;
}

const STORAGE_KEY = 'medai-chat-history';

export function HistorySidebar({ isOpen, onClose, onLoadSession, onNewChat }: HistorySidebarProps) {
  const t = useTranslations('chat');
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/40 z-30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed top-0 left-0 bottom-0 z-40 w-72 bg-navy-800 border-r border-navy-600 flex flex-col"
            initial={{ x: -288 }}
            animate={{ x: 0 }}
            exit={{ x: -288 }}
            transition={{ type: 'spring', stiffness: 120, damping: 14 }}
          >
            <div className="flex items-center justify-between p-4 border-b border-navy-600">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-teal-400" />
                <span className="text-sm font-semibold text-text-primary">{t('sessionHistory')}</span>
              </div>
              {onNewChat && (
                <button
                  onClick={onNewChat}
                  className="p-1.5 rounded-md hover:bg-navy-700 text-text-secondary hover:text-teal-400 transition-colors"
                  aria-label={t('newChat')}
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto navy-scroll">
              {sessions.length === 0 ? (
                <div className="p-4 text-center">
                  <MessageSquare className="w-8 h-8 text-text-muted mx-auto mb-2" />
                  <p className="text-xs text-text-muted">{t('noHistory')}</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {sessions.map((session) => (
                    <motion.button
                      key={session.id}
                      onClick={() => onLoadSession?.(session.id)}
                      className="w-full text-start p-3 rounded-lg hover:bg-navy-700 transition-colors group"
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-text-primary truncate">{session.title}</p>
                          <p className="text-xs text-text-muted truncate">{session.preview}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSession(session.id);
                          }}
                          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-navy-600 text-text-muted hover:text-red-400 transition-all"
                          aria-label="Delete session"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-text-muted" />
                        <span className="text-xs text-text-muted">{formatTime(session.timestamp)}</span>
                        <span className="text-xs text-text-muted">·</span>
                        <span className="text-xs text-text-muted">{session.messageCount} msgs</span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function saveSession(session: ChatSession) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const sessions: ChatSession[] = stored ? JSON.parse(stored) : [];
    sessions.unshift(session);
    // Keep only last 20 sessions
    const trimmed = sessions.slice(0, 20);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {}
}
