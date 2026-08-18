'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Shield, BookOpen, AlertTriangle, FileText, Github, Phone, ArrowRight } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';

// ── Animation variants ────────────────────────────────────────────
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
  },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] },
  },
};

// ── Feature icons mapping ─────────────────────────────────────────
const featureIcons = [Shield, BookOpen, AlertTriangle, FileText];
const featureColors = ['#3B82F6', '#22D3EE', '#F59E0B', '#10B981'];

// ── Step numbers ──────────────────────────────────────────────────
const stepNumbers = [1, 2, 3, 4];

export default function LandingPage() {
  const t = useTranslations('landing');
  const locale = useLocale();
  const router = useRouter();

  const handleGetStarted = () => {
    router.push(`/${locale}/login`);
  };

  const handleTryDemo = () => {
    router.push(`/${locale}/app?guest=true`);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F8FAFC' }}>
      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden">
        {/* Aurora gradient background */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, #3B82F6 0%, #06B6D4 50%, #22D3EE 100%)',
          }}
        />
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">
          <motion.div
            className="text-center"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {/* Logo */}
            <motion.div variants={fadeInUp} className="mb-8 flex justify-center">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <BrandLogo variant="ecg" size={40} />
                </div>
              </div>
            </motion.div>

            {/* Title */}
            <motion.h1
              variants={fadeInUp}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight"
            >
              {t('heroTitle')}
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              variants={fadeInUp}
              className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto mb-10"
            >
              {t('heroSubtitle')}
            </motion.p>

            {/* CTAs */}
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={handleGetStarted}
                className="px-8 py-3.5 rounded-full bg-white text-[#3B82F6] font-semibold text-base shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
              >
                {t('getStarted')}
              </button>
              <button
                onClick={handleTryDemo}
                className="px-8 py-3.5 rounded-full border-2 border-white/40 text-white font-semibold text-base hover:bg-white/10 hover:border-white/60 transition-all duration-200"
              >
                {t('tryDemo')}
              </button>
            </motion.div>
          </motion.div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24" style={{ background: 'linear-gradient(to bottom, transparent, #F8FAFC)' }} />
      </section>

      {/* ── Product Story ── */}
      <section className="py-16 sm:py-24" style={{ backgroundColor: '#EFF6FF' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-8 sm:p-12 lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          >
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: '#0F1117' }}>
                {t('storyHeadline')}
              </h2>
              <p className="text-base sm:text-lg leading-relaxed" style={{ color: '#64748B' }}>
                {t('storyBody')}
              </p>
            </div>
            <div className="mt-8 lg:mt-0 flex items-center justify-center">
              <div className="w-full max-w-sm aspect-square rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #DBEAFE 0%, #CFFAFE 100%)' }}>
                <BrandLogo variant="full" size={60} />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Feature Cards ── */}
      <section className="py-16 sm:py-24" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 gap-6"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
          >
            {[1, 2, 3, 4].map((i) => {
              const Icon = featureIcons[i - 1];
              const color = featureColors[i - 1];
              return (
                <motion.div
                  key={i}
                  variants={fadeInUp}
                  className="bg-white rounded-xl border border-[#E2E8F0] p-6 hover:shadow-lg transition-shadow duration-200"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${color}15` }}
                  >
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: '#0F1117' }}>
                    {t(`feature${i}Title`)}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#64748B' }}>
                    {t(`feature${i}Desc`)}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-16 sm:py-24" style={{ backgroundColor: '#EFF6FF' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2
            className="text-3xl font-bold text-center mb-12"
            style={{ color: '#0F1117' }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            {t('howTitle')}
          </motion.h2>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
          >
            {stepNumbers.map((step) => (
              <motion.div key={step} variants={fadeInUp} className="text-center">
                {/* Number circle */}
                <div className="flex justify-center mb-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                    style={{ background: 'linear-gradient(135deg, #3B82F6, #22D3EE)' }}
                  >
                    {step}
                  </div>
                </div>
                {/* Connector line (not on last) */}
                {step < 4 && (
                  <div className="hidden lg:block absolute" />
                )}
                <h3 className="text-lg font-semibold mb-2" style={{ color: '#0F1117' }}>
                  {t(`step${step}Title`)}
                </h3>
                <p className="text-sm" style={{ color: '#64748B' }}>
                  {t(`step${step}Desc`)}
                </p>
              </motion.div>
            ))}
          </motion.div>

          {/* Horizontal connector for desktop */}
          <div className="hidden lg:flex justify-center mt-[-8.5rem] mb-[5.5rem] px-12">
            <div className="w-full max-w-3xl flex items-center">
              <div className="flex-1 h-0.5 bg-gradient-to-r from-[#3B82F6] to-[#22D3EE] opacity-30" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="mt-auto" style={{ backgroundColor: '#0F172A' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <BrandLogo variant="ecg" size={28} />
              <span className="text-white/60 text-sm font-medium">medAI</span>
            </div>

            {/* 988 Badge */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }}>
              <Phone className="w-4 h-4 text-red-400" />
              <span className="text-red-400 text-sm font-semibold">{t('footer988')}</span>
            </div>

            {/* Links */}
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/hossyehiaa/medai-demo-final"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-white/50 hover:text-white/80 transition-colors text-sm"
              >
                <Github className="w-4 h-4" />
                {t('footerGitHub')}
              </a>
            </div>
          </div>

          {/* Disclaimer */}
          <p className="text-center text-xs text-white/30 mt-6 max-w-3xl mx-auto leading-relaxed">
            {t('footerDisclaimer')}
          </p>
        </div>
      </footer>
    </div>
  );
}
