'use client';

import { useState, useSyncExternalStore, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MessageSquare, Trash2, PanelLeftClose, PanelLeft } from 'lucide-react';

interface HistoryItem {
  id: string;
  title: string;
  timestamp: number;
}

interface HistorySidebarProps {
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  mobileOpen: boolean;
  onToggleMobile: () => void;
}

const STORAGE_KEY = 'medai-chat-history';

function loadHistory(): HistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(items: HistoryItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore storage errors
  }
}

export function useHistory() {
  const [items, setItems] = useState<HistoryItem[]>(() => {
    if (typeof window === 'undefined') return [];
    return loadHistory();
  });

  const addItem = useCallback((id: string, title: string) => {
    setItems((prev) => {
      const updated = [{ id, title, timestamp: Date.now() }, ...prev].slice(0, 50);
      saveHistory(updated);
      return updated;
    });
  }, []);

  const deleteItem = useCallback((id: string) => {
    setItems((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      saveHistory(updated);
      return updated;
    });
  }, []);

  return { items, addItem, deleteItem };
}

export function HistorySidebar({
  activeId,
  onSelect,
  onNewChat,
  onDelete,
  mobileOpen,
  onToggleMobile,
}: HistorySidebarProps) {
  const { items, addItem, deleteItem } = useHistory();

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={onToggleMobile}
        className="
          lg:hidden fixed top-3 left-3 z-50
          w-9 h-9 rounded-full flex items-center justify-center
          bg-white/70 dark:bg-white/5 backdrop-blur-xl
          border border-white/20 dark:border-white/10
          text-foreground/60 hover:text-foreground
          transition-colors duration-200 cursor-pointer
        "
        aria-label="Toggle chat history"
      >
        {mobileOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
      </button>

      {/* Sidebar */}
      <AnimatePresence>
        {(mobileOpen || true) && (
          <motion.aside
            className={`
              fixed lg:relative z-40 top-0 left-0 h-full
              w-64 flex-shrink-0
              bg-white/80 dark:bg-[#0A0F14]/80 backdrop-blur-xl
              border-r border-white/20 dark:border-white/10
              flex flex-col
              lg:translate-x-0
              ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
              transition-transform duration-300
            `}
            initial={{ x: -256 }}
            animate={{ x: 0 }}
            exit={{ x: -256 }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          >
            {/* New chat button */}
            <div className="p-3 border-b border-white/10 dark:border-white/5">
              <button
                onClick={onNewChat}
                className="
                  w-full flex items-center gap-2 px-3 py-2 rounded-xl
                  bg-teal-500/10 text-teal-700 dark:text-teal-300
                  hover:bg-teal-500/20
                  transition-colors duration-200 cursor-pointer
                  text-sm font-medium
                "
                aria-label="Start new chat"
              >
                <Plus className="w-4 h-4" />
                New Chat
              </button>
            </div>

            {/* History list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {items.map((item, i) => (
                <motion.div
                  key={item.id}
                  className="group relative"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  {/* Active accent bar */}
                  {activeId === item.id && (
                    <motion.div
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full bg-teal-500"
                      layoutId="active-bar"
                      transition={{ type: 'spring', stiffness: 120, damping: 14 }}
                    />
                  )}

                  <button
                    onClick={() => onSelect(item.id)}
                    className={`
                      w-full text-left px-3 py-2.5 rounded-xl text-sm
                      transition-colors duration-150 cursor-pointer
                      ${activeId === item.id
                        ? 'bg-teal-500/10 text-teal-700 dark:text-teal-300 font-medium'
                        : 'text-foreground/70 hover:bg-white/50 dark:hover:bg-white/5 hover:text-foreground'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
                      <span className="truncate">{item.title}</span>
                    </div>
                  </button>

                  {/* Delete button */}
                  <button
                    onClick={() => onDelete(item.id)}
                    className="
                      absolute right-2 top-1/2 -translate-y-1/2
                      w-6 h-6 rounded-md flex items-center justify-center
                      opacity-0 group-hover:opacity-100
                      hover:bg-red-500/10 text-red-500/60 hover:text-red-500
                      transition-all duration-150 cursor-pointer
                    "
                    aria-label={`Delete chat: ${item.title}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}

              {items.length === 0 && (
                <div className="text-center text-foreground/40 text-xs py-8">
                  No chat history yet
                </div>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
