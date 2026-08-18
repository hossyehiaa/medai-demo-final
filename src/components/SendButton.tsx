'use client';

import { motion } from 'framer-motion';
import { Send, Loader2 } from 'lucide-react';

interface SendButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export function SendButton({ onClick, disabled = false, loading = false }: SendButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        relative w-10 h-10 rounded-full flex items-center justify-center
        bg-teal-600 dark:bg-teal-500
        text-white
        shadow-lg shadow-teal-500/20
        hover:shadow-teal-500/40
        disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
        transition-shadow duration-200 cursor-pointer
        focus-visible:outline-2 focus-visible:outline-teal-500 focus-visible:outline-offset-2
      `}
      whileHover={!disabled && !loading ? { scale: 1.05 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.95 } : {}}
      aria-label={loading ? 'Sending...' : 'Send message'}
    >
      {loading ? (
        <Loader2 className="w-4.5 h-4.5 animate-spin" />
      ) : (
        <Send className="w-4.5 h-4.5" />
      )}
    </motion.button>
  );
}
