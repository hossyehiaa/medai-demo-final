'use client';

import { useState, useCallback, Suspense } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Mail, Lock, Loader2, Info } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { BrandLogo } from '@/components/BrandLogo';

function LoginForm() {
  const t = useTranslations('login');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  const callbackUrl = searchParams.get('callbackUrl') || `/${locale}/app`;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setIsLoading(true);

      try {
        const result = await login(email, password);
        if (result.success) {
          router.push(callbackUrl);
        } else {
          setError(result.error || t('invalidCredentials'));
          setShakeKey((k) => k + 1);
        }
      } catch {
        setError(t('invalidCredentials'));
        setShakeKey((k) => k + 1);
      } finally {
        setIsLoading(false);
      }
    },
    [email, password, login, router, callbackUrl, t]
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #06B6D4 50%, #22D3EE 100%)' }}>
      {/* Subtle grid overlay */}
      <div
        className="fixed inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* White card */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <BrandLogo variant="ecg" size={36} />
              </div>
              <h1 className="text-2xl font-bold" style={{ color: '#0F1117' }}>
                {t('title')}
              </h1>
              <p className="text-sm mt-1" style={{ color: '#64748B' }}>
                {t('subtitle')}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error state with shake */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={shakeKey}
                  className="space-y-5"
                  initial={error ? { x: -10 } : {}}
                  animate={error ? { x: [0, -8, 8, -4, 4, 0] } : {}}
                  transition={{ duration: 0.4 }}
                >
                  {/* Email */}
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium mb-1.5"
                      style={{ color: '#0F1117' }}
                    >
                      {t('email')}
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="physician@medai.ai"
                        required
                        autoComplete="email"
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#E2E8F0] text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30 focus:border-[#3B82F6] transition-all duration-200"
                        style={{ color: '#0F1117' }}
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium mb-1.5"
                      style={{ color: '#0F1117' }}
                    >
                      {t('password')}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        autoComplete="current-password"
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#E2E8F0] text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30 focus:border-[#3B82F6] transition-all duration-200"
                        style={{ color: '#0F1117' }}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Error text */}
              {error && (
                <motion.p
                  className="text-sm text-red-600 font-medium"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {error}
                </motion.p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-full bg-[#3B82F6] text-white font-semibold text-sm hover:bg-[#2563EB] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('loggingIn')}
                  </>
                ) : (
                  t('signIn')
                )}
              </button>

              {/* Forgot password */}
              <p className="text-center">
                <button
                  type="button"
                  className="text-sm hover:underline transition-colors"
                  style={{ color: '#64748B' }}
                >
                  {t('forgotPassword')}
                </button>
              </p>
            </form>

            {/* Demo credentials hint */}
            <div
              className="mt-6 rounded-lg p-4 flex items-start gap-3"
              style={{ backgroundColor: '#EFF6FF' }}
            >
              <Info className="w-4 h-4 mt-0.5 shrink-0 text-[#3B82F6]" />
              <div>
                <p className="text-sm font-medium" style={{ color: '#1E40AF' }}>
                  {t('demoHintTitle')}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#3B82F6' }}>
                  {t('demoHint')}
                </p>
              </div>
            </div>

            {/* Back to home */}
            <div className="mt-6 text-center">
              <button
                onClick={() => router.push(`/${locale}`)}
                className="inline-flex items-center gap-1.5 text-sm hover:underline transition-colors"
                style={{ color: '#64748B' }}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {t('backToHome')}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #06B6D4 50%, #22D3EE 100%)' }}>
        <div className="animate-pulse text-white text-lg">Loading…</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
