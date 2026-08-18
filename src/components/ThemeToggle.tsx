'use client';

import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  if (!mounted) {
    return <div className="w-9 h-9" />;
  }

  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="
        relative w-9 h-9 rounded-full flex items-center justify-center
        bg-white/70 dark:bg-white/5 backdrop-blur-xl
        border border-white/20 dark:border-white/10
        hover:bg-teal-500/10 hover:border-teal-500/20
        transition-colors duration-200 cursor-pointer
        focus-visible:outline-2 focus-visible:outline-teal-500 focus-visible:outline-offset-2
      "
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={isDark ? 'moon' : 'sun'}
          initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.2 }}
        >
          {isDark ? (
            <Moon className="w-4 h-4 text-teal-400" />
          ) : (
            <Sun className="w-4 h-4 text-teal-600" />
          )}
        </motion.div>
      </AnimatePresence>
    </button>
  );
}
