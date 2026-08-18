'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export function LanguageToggle() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const switchLocale = (newLocale: 'en' | 'ar') => {
    // Replace the locale segment in the pathname
    const segments = pathname.split('/');
    segments[1] = newLocale;
    router.push(segments.join('/'));
  };

  return (
    <div className="flex items-center gap-0.5 bg-navy-700 rounded-full p-0.5 border border-navy-600">
      <motion.button
        onClick={() => switchLocale('en')}
        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
          locale === 'en'
            ? 'bg-teal-400 text-navy-900'
            : 'text-text-secondary hover:text-text-primary'
        }`}
        whileTap={{ scale: 0.95 }}
        aria-label="Switch to English"
        aria-pressed={locale === 'en'}
      >
        EN
      </motion.button>
      <motion.button
        onClick={() => switchLocale('ar')}
        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
          locale === 'ar'
            ? 'bg-teal-400 text-navy-900'
            : 'text-text-secondary hover:text-text-primary'
        }`}
        whileTap={{ scale: 0.95 }}
        aria-label="التبديل إلى العربية"
        aria-pressed={locale === 'ar'}
      >
        ع
      </motion.button>
    </div>
  );
}
