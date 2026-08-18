'use client';

import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { useState } from 'react';
import { getSourceDisplayName } from '@/lib/safety-gates';

interface EvidenceChunk {
  doc: string;
  section: string;
  page: number;
  score: number;
  text?: string;
}

interface EvidencePanelProps {
  chunks: EvidenceChunk[];
  onViewSource?: (docName: string, page: number) => void;
}

export function EvidencePanel({ chunks, onViewSource }: EvidencePanelProps) {
  const t = useTranslations('evidence');
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="bg-navy-700/50 border border-navy-600 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-navy-700 transition-colors"
        aria-expanded={isExpanded}
      >
        <span className="text-sm font-medium text-text-primary">{t('topChunks')}</span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-text-secondary" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-secondary" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ stiffness: 120, damping: 14 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2 max-h-64 overflow-y-auto navy-scroll">
              {chunks.map((chunk, idx) => {
                const confidence = Math.round(chunk.score * 100);
                const displayName = getSourceDisplayName(chunk.doc);

                return (
                  <motion.div
                    key={idx}
                    className="bg-navy-800/50 border border-navy-600 rounded-md p-2.5"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <FileText className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                          <span className="text-xs font-medium text-text-primary truncate">
                            {displayName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-text-secondary">
                          <span>{t('section')}: {chunk.section}</span>
                          <span>·</span>
                          <span>{t('page')}: {chunk.page}</span>
                        </div>
                      </div>
                      {onViewSource && (
                        <button
                          onClick={() => onViewSource(chunk.doc, chunk.page)}
                          className="text-xs text-teal-400 hover:text-teal-600 shrink-0 transition-colors"
                        >
                          {t('viewSource')}
                        </button>
                      )}
                    </div>
                    {/* Confidence bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-navy-900 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-teal-400"
                          initial={{ width: 0 }}
                          animate={{ width: `${confidence}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                      </div>
                      <span className="text-xs text-text-secondary shrink-0">{confidence}%</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
