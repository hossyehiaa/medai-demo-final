'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Search, Plus, FileDown, Globe, ClipboardList, Heart, MessageSquare } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNewChat?: () => void;
  onExport?: () => void;
  onScreener?: () => void;
}

export function CommandPalette({ isOpen, onClose, onNewChat, onExport, onScreener }: CommandPaletteProps) {
  const t = useTranslations('commandPalette');
  const locale = useLocale();
  const router = useRouter();
  const [query, setQuery] = useState('');

  const commands = [
    { id: 'new-chat', icon: <Plus className="w-4 h-4" />, label: t('newChat'), action: onNewChat },
    { id: 'export', icon: <FileDown className="w-4 h-4" />, label: t('exportReport'), action: onExport },
    { id: 'toggle-lang', icon: <Globe className="w-4 h-4" />, label: t('toggleLang'), action: () => {
      const newLocale = locale === 'en' ? 'ar' : 'en';
      router.push(`/${newLocale}`);
    }},
    { id: 'screener', icon: <ClipboardList className="w-4 h-4" />, label: t('runScreener'), action: onScreener },
    { id: 'crisis', icon: <Heart className="w-4 h-4" />, label: t('crisisHelp'), action: () => window.open('tel:988') },
  ];

  const filtered = query
    ? commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()))
    : commands;

  const executeCommand = useCallback((cmd: typeof commands[0]) => {
    cmd.action?.();
    onClose();
  }, [onClose]);

  // Keyboard shortcut to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]" role="dialog" aria-label={t('placeholder')}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Palette */}
      <div className="relative w-full max-w-md bg-navy-800 border border-navy-600 rounded-xl shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-2 p-3 border-b border-navy-600">
          <Search className="w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('placeholder')}
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && filtered.length > 0) {
                executeCommand(filtered[0]);
              }
            }}
          />
          <kbd className="text-xs text-text-muted bg-navy-700 px-1.5 py-0.5 rounded">ESC</kbd>
        </div>

        {/* Command list */}
        <div className="max-h-64 overflow-y-auto navy-scroll p-2">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-sm text-text-muted">
              <MessageSquare className="w-6 h-6 mx-auto mb-1" />
              No commands found
            </div>
          ) : (
            filtered.map((cmd) => (
              <button
                key={cmd.id}
                onClick={() => executeCommand(cmd)}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-navy-700 text-start transition-colors group"
              >
                <span className="text-text-secondary group-hover:text-teal-400">{cmd.icon}</span>
                <span className="text-sm text-text-primary">{cmd.label}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
