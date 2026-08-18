'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Shield, Search, ArrowRightLeft, Gauge, Cpu, CheckCircle2 } from 'lucide-react';

interface PipelineStage {
  name: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  duration?: number;
}

interface PipelineTraceProps {
  stages?: PipelineStage[];
  activeStage?: number;
}

export function PipelineTrace({ activeStage = -1 }: PipelineTraceProps) {
  const t = useTranslations('pipeline');

  const defaultStages: PipelineStage[] = [
    { name: 'safety', label: t('safety'), icon: <Shield className="w-4 h-4" /> },
    { name: 'retrieval', label: t('retrieval'), icon: <Search className="w-4 h-4" /> },
    { name: 'rerank', label: t('rerank'), icon: <ArrowRightLeft className="w-4 h-4" /> },
    { name: 'confidence', label: t('confidence'), icon: <Gauge className="w-4 h-4" /> },
    { name: 'generation', label: t('generation'), icon: <Cpu className="w-4 h-4" /> },
    { name: 'verification', label: t('verification'), icon: <CheckCircle2 className="w-4 h-4" /> },
  ];

  const stages = defaultStages;

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2" role="list" aria-label={t('title')}>
      {stages.map((stage, idx) => {
        const isActive = idx === activeStage;
        const isCompleted = idx < activeStage;
        const isPending = idx > activeStage;

        return (
          <div key={stage.name} className="flex items-center gap-1">
            <motion.div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-teal-400/20 text-teal-400 border border-teal-400/40'
                  : isCompleted
                  ? 'bg-navy-600/50 text-teal-400 border border-teal-400/20'
                  : 'bg-navy-700/50 text-text-muted border border-navy-600'
              }`}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: idx * 0.08, stiffness: 120, damping: 14 }}
              role="listitem"
              aria-current={isActive ? 'step' : undefined}
            >
              <span className={isActive ? 'text-teal-400' : isCompleted ? 'text-teal-400' : 'text-text-muted'}>
                {stage.icon}
              </span>
              <span>{stage.label}</span>
              {isCompleted && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-teal-400"
                >
                  ✓
                </motion.span>
              )}
            </motion.div>
            {idx < stages.length - 1 && (
              <div className={`w-3 h-px ${isCompleted ? 'bg-teal-400/40' : 'bg-navy-600'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
