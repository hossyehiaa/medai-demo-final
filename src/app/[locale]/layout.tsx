import type { Metadata } from 'next';
import { Inter, IBM_Plex_Sans_Arabic } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  variable: '--font-ibm-plex-arabic',
  weight: ['400', '500', '600', '700'],
  subsets: ['arabic'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'medAI — Clinical Decision Support',
  description:
    'AI-powered clinical decision support for USPSTF depression and suicide risk screening guidelines. Built with RAG.',
  icons: { icon: '/logo.svg' },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Validate locale
  if (!routing.locales.includes(locale as 'en' | 'ar')) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();
  const isRTL = locale === 'ar';

  return (
    <html
      lang={locale}
      dir={isRTL ? 'rtl' : 'ltr'}
      className="dark"
      suppressHydrationWarning
    >
      <body
        className={`${inter.variable} ${ibmPlexArabic.variable} antialiased`}
        style={{
          backgroundColor: '#0A1128',
          color: '#F5F7FB',
          fontFamily: isRTL
            ? 'var(--font-ibm-plex-arabic), var(--font-inter), sans-serif'
            : 'var(--font-inter), var(--font-ibm-plex-arabic), sans-serif',
        }}
      >
        <NextIntlClientProvider messages={messages}>
          {/* Skip links for accessibility */}
          <a href="#main-content" className="skip-link">
            {isRTL ? 'تخطي إلى المحتوى الرئيسي' : 'Skip to main content'}
          </a>
          <a href="#chat-input" className="skip-link" style={{ left: 'auto', right: 0 }}>
            {isRTL ? 'تخطي إلى المحادثة' : 'Skip to chat'}
          </a>
          <div className="min-h-screen flex flex-col">{children}</div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
