'use client';

import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Phone, MessageCircle, AlertTriangle, ArrowLeft } from 'lucide-react';

interface CrisisScreenProps {
  isVisible: boolean;
  onReturn: () => void;
}

export function CrisisScreen({ isVisible, onReturn }: CrisisScreenProps) {
  const t = useTranslations('crisis');
  const locale = useLocale();
  const [breathPhase, setBreathPhase] = useState<'in' | 'out'>('in');

  // Breathing animation cycle
  useEffect(() => {
    if (!isVisible) return;
    const interval = setInterval(() => {
      setBreathPhase((prev) => (prev === 'in' ? 'out' : 'in'));
    }, 4000);
    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-navy-900/95 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      role="alertdialog"
      aria-label={t('title')}
    >
      <motion.div
        className="max-w-md w-full bg-navy-800 border border-navy-600 rounded-2xl p-8 text-center space-y-6"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ stiffness: 120, damping: 14 }}
      >
        {/* Alert icon */}
        <div className="flex justify-center">
          <motion.div
            className="w-16 h-16 rounded-full bg-teal-4003/10 flex items-center justify-center"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <AlertTriangle className="w-8 h-8 text-teal-400" />
          </motion.div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-text-primary">{t('title')}</h2>
        <p className="text-text-secondary">{t('subtitle')}</p>

        {/* Breathing animation */}
        <div className="flex flex-col items-center gap-2 py-2">
          <motion.div
            className="w-20 h-20 rounded-full border-2 border-teal-400/40 flex items-center justify-center"
            animate={{
              scale: breathPhase === 'in' ? 1.2 : 0.8,
              borderColor: breathPhase === 'in' ? '#4ECDC4' : '#2EA89F',
            }}
            transition={{ duration: 4, ease: 'easeInOut' }}
          >
            <motion.span
              className="text-sm font-medium text-teal-400"
              key={breathPhase}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {breathPhase === 'in' ? t('breatheIn') : t('breatheOut')}
            </motion.span>
          </motion.div>
          <span className="text-xs text-text-muted">{t('breathing')}</span>
        </div>

        {/* Crisis resources */}
        <div className="space-y-3">
          {/* 988 Lifeline */}
          <motion.a
            href="tel:988"
            className="flex items-center gap-3 w-full p-4 bg-teal-400/10 border border-teal-400/30 rounded-xl text-start hover:bg-teal-400/20 transition-colors"
            whileTap={{ scale: 0.98 }}
          >
            <Phone className="w-6 h-6 text-teal-400 shrink-0" />
            <div>
              <div className="text-sm font-semibold text-text-primary">{t('lifeline988')}</div>
              <div className="text-xs text-text-secondary">{t('lifeline988Desc')}</div>
            </div>
          </motion.a>

          {/* 988 Chat */}
          <motion.a
            href="https://988lifeline.org/chat"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 w-full p-4 bg-navy-700 border border-navy-600 rounded-xl text-start hover:border-teal-400/30 transition-colors"
            whileTap={{ scale: 0.98 }}
          >
            <MessageCircle className="w-6 h-6 text-teal-400 shrink-0" />
            <div>
              <div className="text-sm font-semibold text-text-primary">{t('chat988')}</div>
              <div className="text-xs text-text-secondary">{t('chat988Desc')}</div>
            </div>
          </motion.a>

          {/* Egypt line (shown for Arabic) */}
          {locale === 'ar' && (
            <motion.a
              href="tel:08008880700"
              className="flex items-center gap-3 w-full p-4 bg-navy-700 border border-navy-600 rounded-xl text-start hover:border-teal-400/30 transition-colors"
              whileTap={{ scale: 0.98 }}
            >
              <Phone className="w-6 h-6 text-teal-400 shrink-0" />
              <div>
                <div className="text-sm font-semibold text-text-primary">خط نجدة الصحة النفسية</div>
                <div className="text-xs text-text-secondary">08008880700 — الأمانة العامة للصحة النفسية</div>
              </div>
            </motion.a>
          )}

          {/* Emergency services */}
          <div className="flex items-center gap-3 w-full p-4 bg-navy-700/50 border border-navy-600 rounded-xl">
            <AlertTriangle className="w-6 h-6 text-text-muted shrink-0" />
            <div>
              <div className="text-sm font-medium text-text-secondary">{t('emergency')}</div>
              <div className="text-xs text-text-muted">{t('emergencyDesc')}</div>
            </div>
          </div>
        </div>

        {/* Return button */}
        <motion.button
          onClick={onReturn}
          className="flex items-center gap-2 mx-auto px-6 py-2.5 bg-navy-700 border border-navy-600 rounded-full text-sm text-text-secondary hover:text-text-primary hover:border-teal-400/30 transition-colors"
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft className="w-4 h-4" />
          {t('returnChat')}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
