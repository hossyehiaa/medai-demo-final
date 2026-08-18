'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface CitationPillProps {
  doc: string;
  section: string;
  page: string;
  quote: string;
}

export function CitationPill({ doc, section, page, quote }: CitationPillProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.span
      className="inline-flex flex-col items-start mr-1.5 my-0.5"
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 120, damping: 14 }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className={`
          inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
          bg-teal-500/10 text-teal-700 dark:text-teal-300
          border border-teal-500/20
          hover:bg-teal-500/20 hover:shadow-[0_0_8px_rgba(13,148,136,0.15)]
          transition-colors duration-200 cursor-pointer
          ${expanded ? 'rounded-b-none' : ''}
        `}
        style={{
          backgroundSize: '200% 100%',
          backgroundImage: expanded
            ? undefined
            : 'linear-gradient(90deg, transparent 0%, rgba(13,148,136,0.06) 50%, transparent 100%)',
          animation: expanded ? undefined : 'shimmer 3s linear infinite',
        }}
        aria-expanded={expanded}
        aria-label={`Citation: ${doc}, ${section}, page ${page}`}
      >
        <span className="truncate max-w-[200px]">{doc}</span>
        <span className="text-teal-500/50">·</span>
        <span className="truncate max-w-[100px]">{section}</span>
        <span className="text-teal-500/50">·</span>
        <span>p.{page}</span>
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-3 h-3" />
        </motion.span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            className="w-full px-2.5 py-2 rounded-b-xl text-xs font-mono leading-relaxed
              bg-teal-500/5 dark:bg-teal-500/10 border border-t-0 border-teal-500/20
              text-foreground/80"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            &ldquo;{quote}&rdquo;
          </motion.div>
        )}
      </AnimatePresence>
    </motion.span>
  );
}
