'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, ShieldAlert, ShieldX, ShieldQuestion } from 'lucide-react';

interface SafetyBadgeProps {
  status: 'OK' | 'CRISIS' | 'REFUSAL_OOS' | 'REFUSAL_LOW_CONFIDENCE' | 'BLOCKED' | 'FAILED_OUTPUT';
  className?: string;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; bgClass: string; textClass: string; pulse: boolean }> = {
  OK: {
    label: 'Verified',
    icon: ShieldCheck,
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    pulse: false,
  },
  CRISIS: {
    label: 'Crisis Detected',
    icon: ShieldAlert,
    bgClass: 'bg-red-500/10',
    textClass: 'text-red-600 dark:text-red-400',
    pulse: true,
  },
  REFUSAL_OOS: {
    label: 'Out of Scope',
    icon: ShieldX,
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-600 dark:text-amber-400',
    pulse: false,
  },
  REFUSAL_LOW_CONFIDENCE: {
    label: 'Low Confidence',
    icon: ShieldQuestion,
    bgClass: 'bg-yellow-500/10',
    textClass: 'text-yellow-600 dark:text-yellow-400',
    pulse: false,
  },
  BLOCKED: {
    label: 'Blocked',
    icon: ShieldX,
    bgClass: 'bg-red-500/10',
    textClass: 'text-red-600 dark:text-red-400',
    pulse: false,
  },
  FAILED_OUTPUT: {
    label: 'Validation Failed',
    icon: ShieldAlert,
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-600 dark:text-amber-400',
    pulse: false,
  },
};

export function SafetyBadge({ status, className = '' }: SafetyBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.OK;
  const Icon = config.icon;

  return (
    <motion.div
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
        ${config.bgClass} ${config.textClass} ${className}
      `}
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 120, damping: 14 }}
    >
      <div className="relative">
        {config.pulse && (
          <span className="absolute inset-0 rounded-full bg-red-500/40 animate-ping" />
        )}
        <Icon className="w-3.5 h-3.5 relative z-10" />
      </div>
      <span>{config.label}</span>
    </motion.div>
  );
}
