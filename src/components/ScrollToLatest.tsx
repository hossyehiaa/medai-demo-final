'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown } from 'lucide-react';

interface ScrollToLatestProps {
  visible: boolean;
  onClick: () => void;
}

export function ScrollToLatest({ visible, onClick }: ScrollToLatestProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          className="
            fixed bottom-24 right-6 z-30
            w-10 h-10 rounded-full flex items-center justify-center
            bg-teal-600/90 dark:bg-teal-500/90 backdrop-blur-sm
            text-white shadow-lg shadow-teal-500/20
            hover:bg-teal-600 dark:hover:bg-teal-500
            transition-colors duration-200 cursor-pointer
            focus-visible:outline-2 focus-visible:outline-teal-500 focus-visible:outline-offset-2
          "
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 120, damping: 14 }}
          onClick={onClick}
          aria-label="Scroll to latest message"
        >
          <ArrowDown className="w-4.5 h-4.5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
