'use client';

import { motion } from 'framer-motion';

interface SuggestedQueriesProps {
  onSelect: (query: string) => void;
}

const SUGGESTED_QUERIES = [
  "Should pregnant women be screened for depression?",
  "What is the USPSTF recommendation grade?",
  "Screening for older adults over 65?",
  "What screening tools are recommended?",
];

export function SuggestedQueries({ onSelect }: SuggestedQueriesProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center max-w-2xl mx-auto">
      {SUGGESTED_QUERIES.map((query, i) => (
        <motion.button
          key={query}
          className="
            px-4 py-2 rounded-full text-sm font-medium
            bg-white/70 dark:bg-white/5 backdrop-blur-xl
            border border-teal-500/20 dark:border-teal-500/15
            text-foreground/80 hover:text-foreground
            hover:bg-teal-500/10 hover:border-teal-500/30
            hover:-translate-y-0.5
            hover:shadow-[0_0_12px_rgba(13,148,136,0.12)]
            active:scale-95
            transition-all duration-200 cursor-pointer
          "
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: i * 0.08,
            type: 'spring',
            stiffness: 120,
            damping: 14,
          }}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelect(query)}
          aria-label={`Ask: ${query}`}
        >
          {query}
        </motion.button>
      ))}
    </div>
  );
}
