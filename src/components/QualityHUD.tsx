'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { Shield, Cpu, Clock, Hash, CheckCircle2 } from 'lucide-react';

interface QualityHUDProps {
  confidence?: number;
  model?: string;
  latencyMs?: number;
  tokens?: number;
  citationsVerified?: number;
  citationsTotal?: number;
}

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let start = 0;
    const duration = 800;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out
      const eased = 1 - Math.pow(1 - progress, 3);
      start = Math.round(eased * target);
      setCount(start);
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [target]);

  return <span ref={ref}>{count}{suffix}</span>;
}

export function QualityHUD({
  confidence,
  model,
  latencyMs,
  tokens,
  citationsVerified,
  citationsTotal,
}: QualityHUDProps) {
  const t = useTranslations('quality');

  const badges = [
    {
      icon: <Shield className="w-3.5 h-3.5" />,
      label: t('confidence'),
      value: confidence != null ? <AnimatedCounter target={Math.round(confidence * 100)} suffix="%" /> : '—',
      show: confidence != null,
    },
    {
      icon: <Cpu className="w-3.5 h-3.5" />,
      label: t('model'),
      value: model || '—',
      show: !!model,
    },
    {
      icon: <Clock className="w-3.5 h-3.5" />,
      label: t('latency'),
      value: latencyMs != null ? <AnimatedCounter target={latencyMs} suffix={t('ms')} /> : '—',
      show: latencyMs != null,
    },
    {
      icon: <Hash className="w-3.5 h-3.5" />,
      label: t('tokens'),
      value: tokens != null ? <AnimatedCounter target={tokens} /> : '—',
      show: tokens != null,
    },
    {
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      label: t('citationsVerified'),
      value: citationsVerified != null && citationsTotal != null
        ? `${citationsVerified}/${citationsTotal}`
        : '—',
      show: citationsVerified != null,
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2" role="status" aria-label={t('title')}>
      {badges.filter((b) => b.show).map((badge, idx) => (
        <motion.div
          key={idx}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-navy-700/60 border border-navy-600 rounded-full"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: idx * 0.1, stiffness: 120, damping: 14 }}
        >
          <span className="text-teal-400">{badge.icon}</span>
          <span className="text-xs text-text-secondary">{badge.label}</span>
          <span className="text-xs font-medium text-text-primary">{badge.value}</span>
        </motion.div>
      ))}
    </div>
  );
}
