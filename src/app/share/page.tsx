'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { BrandLogo } from '@/components/BrandLogo';
import { ECGDivider } from '@/components/ECGDivider';
import Link from 'next/link';

function ShareContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') || '';
  const encodedData = searchParams.get('d') || '';

  let content = '';
  try {
    content = decodeURIComponent(atob(encodedData));
  } catch {
    content = 'Shared content unavailable.';
  }

  return (
    <div className="min-h-screen bg-[#0A1128] text-[#F5F7FB] flex flex-col">
      <header className="px-6 py-4 border-b border-[#223058] flex items-center gap-3">
        <BrandLogo variant="ecg" size={32} />
        <span className="text-sm text-[#7683AB]">Shared Response</span>
      </header>

      <main className="flex-1 max-w-2xl mx-auto px-6 py-8">
        <motion.div
          className="bg-[#131B3F] border border-[#223058] rounded-2xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ stiffness: 120, damping: 14 }}
        >
          <div className="markdown-content text-sm leading-relaxed whitespace-pre-wrap">
            {content}
          </div>

          <ECGDivider className="my-6" />

          <p className="text-xs text-[#7683AB] text-center">
            This information is based on USPSTF guidance and is for clinical decision support only.
            It is not a substitute for professional medical judgment.
          </p>
        </motion.div>

        <div className="mt-6 text-center">
          <Link
            href="/en"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#4ECDC4] text-[#0A1128] font-semibold rounded-full hover:bg-[#2EA89F] transition-colors"
          >
            Try medAI
          </Link>
        </div>
      </main>
    </div>
  );
}

export default function SharePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A1128] flex items-center justify-center">
        <div className="animate-pulse text-[#AAB4D4]">Loading shared content…</div>
      </div>
    }>
      <ShareContent />
    </Suspense>
  );
}
