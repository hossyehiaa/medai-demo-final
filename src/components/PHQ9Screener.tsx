'use client';

import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useCallback } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';

interface PHQ9ScreenerProps {
  onComplete?: (score: number, severity: string) => void;
}

const OPTIONS = [0, 1, 2, 3] as const;

export function PHQ9Screener({ onComplete }: PHQ9ScreenerProps) {
  const t = useTranslations('phq9');
  const [answers, setAnswers] = useState<(number | null)[]>(new Array(9).fill(null));
  const [isComplete, setIsComplete] = useState(false);

  const setAnswer = useCallback((questionIdx: number, value: number) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[questionIdx] = value;
      return next;
    });
  }, []);

  const totalScore = answers.reduce((sum, a) => sum + (a ?? 0), 0);
  const allAnswered = answers.every((a) => a !== null);

  const getSeverity = (score: number): string => {
    if (score <= 4) return t('minimal');
    if (score <= 9) return t('mild');
    if (score <= 14) return t('moderate');
    if (score <= 19) return t('moderatelySevere');
    return t('severe');
  };

  const handleSubmit = () => {
    if (!allAnswered) return;
    setIsComplete(true);
    onComplete?.(totalScore, getSeverity(totalScore));
  };

  const handleRetake = () => {
    setAnswers(new Array(9).fill(null));
    setIsComplete(false);
  };

  const optionLabels = [t('notAtAll'), t('severalDays'), t('moreThanHalf'), t('nearlyEveryDay')];

  return (
    <div className="bg-navy-800 border border-navy-600 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-navy-600">
        <h3 className="text-xl font-bold text-text-primary mb-1">{t('title')}</h3>
        <p className="text-sm text-text-secondary">{t('subtitle')}</p>
      </div>

      <div className="p-6 space-y-4">
        {/* Frequency header */}
        <p className="text-sm text-text-secondary font-medium">{t('frequency')}</p>

        {/* Questions */}
        <div className="space-y-4">
          {Array.from({ length: 9 }, (_, i) => (
            <motion.div
              key={i}
              className="space-y-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, stiffness: 120, damping: 14 }}
            >
              <p className="text-sm text-text-primary">
                <span className="font-medium text-teal-400">{i + 1}.</span>{' '}
                {t(`questions.${i}` as 'questions.0')}
              </p>
              <div className="flex flex-wrap gap-2">
                {OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setAnswer(i, opt)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      answers[i] === opt
                        ? 'bg-teal-400/20 text-teal-400 border border-teal-400/40'
                        : 'bg-navy-700 border border-navy-600 text-text-secondary hover:text-text-primary hover:border-navy-600'
                    }`}
                    aria-pressed={answers[i] === opt}
                  >
                    {optionLabels[opt]}
                  </button>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Question 9 note */}
        {answers[8] !== null && answers[8]! > 0 && (
          <motion.div
            className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300">{t('question9Note')}</p>
          </motion.div>
        )}

        {/* Results */}
        <AnimatePresence>
          {isComplete && (
            <motion.div
              className="p-4 bg-navy-700 border border-navy-600 rounded-xl text-center space-y-2"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ stiffness: 120, damping: 14 }}
            >
              <p className="text-sm text-text-secondary">{t('score')}</p>
              <p className="text-4xl font-bold text-teal-400">{totalScore}</p>
              <p className="text-lg font-semibold text-text-primary">{getSeverity(totalScore)}</p>
              <p className="text-xs text-text-muted">{t('disclaimer')}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          {!isComplete ? (
            <motion.button
              onClick={handleSubmit}
              disabled={!allAnswered}
              className="px-6 py-2.5 bg-teal-400 text-navy-900 font-semibold rounded-full disabled:opacity-40 disabled:cursor-not-allowed hover:bg-teal-600 transition-colors"
              whileTap={{ scale: 0.97 }}
            >
              {t('score')}
            </motion.button>
          ) : (
            <motion.button
              onClick={handleRetake}
              className="flex items-center gap-2 px-4 py-2 bg-navy-700 border border-navy-600 rounded-full text-sm text-text-secondary hover:text-text-primary transition-colors"
              whileTap={{ scale: 0.97 }}
            >
              <RotateCcw className="w-4 h-4" />
              {t('retake')}
            </motion.button>
          )}
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-text-muted text-center">{t('disclaimer')}</p>
      </div>
    </div>
  );
}
