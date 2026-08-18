'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';

interface SuggestedQueriesProps {
  onSelect: (query: string) => void;
}

export function SuggestedQueries({ onSelect }: SuggestedQueriesProps) {
  const t = useTranslations('hero');

  // Access array items by index
  const queries = [
    t('sampleQuestions.0'),
    t('sampleQuestions.1'),
    t('sampleQuestions.2'),
    t('sampleQuestions.3'),
  ];

  return (
    <div className="flex flex-wrap gap-2 justify-center max-w-2xl mx-auto">
      {queries.map((query, i) => (
        <motion.button
          key={i}
          className="
            px-4 py-2 rounded-full text-sm font-medium
            bg-[#131B3F] border border-[#223058]
            text-[#AAB4D4] hover:text-[#F5F7FB]
            hover:bg-[#1A2647] hover:border-[#4ECDC4]/30
            hover:-translate-y-0.5
            hover:shadow-[0_0_12px_rgba(78,205,196,0.12)]
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
