'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';

interface SmartFollowupsProps {
  onFollowUp: (query: string) => void;
  topic?: 'recommendation' | 'population' | 'tools' | 'harms' | 'evidence' | 'perinatal' | 'olderAdults' | 'suicideRisk';
}

const TOPIC_FOLLOWUPS: Record<string, string[]> = [
  'recommendation', 'population', 'tools', 'harms', 'evidence', 'perinatal', 'olderAdults', 'suicideRisk',
];

export function SmartFollowups({ onFollowUp, topic }: SmartFollowupsProps) {
  const t = useTranslations('followups');

  const followUpKeys = topic
    ? [topic]
    : TOPIC_FOLLOWUPS.slice(0, 4);

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-text-secondary">{t('title')}</p>
      <div className="flex flex-wrap gap-2">
        {followUpKeys.map((key) => {
          const query = t(key as keyof IntlMessages['followups']);
          return (
            <motion.button
              key={key}
              onClick={() => onFollowUp(query)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-700/60 border border-navy-600 rounded-full text-xs text-text-secondary hover:text-teal-400 hover:border-teal-400/30 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              <MessageCircle className="w-3 h-3" />
              <span className="truncate max-w-48">{query}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
