'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Stethoscope, User } from 'lucide-react';

interface ClinicianPatientToggleProps {
  mode: 'clinician' | 'patient';
  onToggle: (mode: 'clinician' | 'patient') => void;
}

export function ClinicianPatientToggle({ mode, onToggle }: ClinicianPatientToggleProps) {
  const t = useTranslations('chat');

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-secondary">{t('readingLevel')}:</span>
      <div className="flex items-center gap-0.5 bg-navy-700 rounded-full p-0.5 border border-navy-600">
        <motion.button
          onClick={() => onToggle('clinician')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            mode === 'clinician'
              ? 'bg-teal-400/20 text-teal-400'
              : 'text-text-secondary hover:text-text-primary'
          }`}
          whileTap={{ scale: 0.95 }}
          aria-pressed={mode === 'clinician'}
        >
          <Stethoscope className="w-3 h-3" />
          {t('clinician')}
        </motion.button>
        <motion.button
          onClick={() => onToggle('patient')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            mode === 'patient'
              ? 'bg-teal-400/20 text-teal-400'
              : 'text-text-secondary hover:text-text-primary'
          }`}
          whileTap={{ scale: 0.95 }}
          aria-pressed={mode === 'patient'}
        >
          <User className="w-3 h-3" />
          {t('patient')}
        </motion.button>
      </div>
    </div>
  );
}
