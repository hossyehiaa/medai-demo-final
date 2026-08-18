'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { getPDFDisplayName } from '@/lib/pdfMap';

interface SourceViewerProps {
  isOpen: boolean;
  onClose: () => void;
  docName: string;
  page?: number;
  quote?: string;
}

export function SourceViewer({ isOpen, onClose, docName, page, quote }: SourceViewerProps) {
  const t = useTranslations('sourceViewer');
  const locale = useLocale() as 'en' | 'ar';
  const isRTL = locale === 'ar';
  const [pdfPage, setPdfPage] = useState(page || 1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [DocumentComponent, setDocumentComponent] = useState<React.ComponentType<Record<string, unknown>> | null>(null);
  const [PageComponent, setPageComponent] = useState<React.ComponentType<Record<string, unknown>> | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    // Dynamic import of react-pdf with SSR: false
    import('react-pdf').then((mod) => {
      mod.pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;
      setDocumentComponent(() => mod.Document);
      setPageComponent(() => mod.Page);
    }).catch(() => {
      // Fallback: PDF viewer not available
    });
  }, [isOpen]);

  useEffect(() => {
    if (page) setPdfPage(page);
  }, [page]);

  const onDocumentLoadSuccess = useCallback(({ numPages: n }: { numPages: number }) => {
    setNumPages(n);
  }, []);

  const displayName = getPDFDisplayName(docName, locale);
  const pdfPath = `/pdfs/${docName}.pdf`;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer — slides from right in LTR, left in RTL */}
          <motion.div
            className={`fixed top-0 bottom-0 z-50 w-full max-w-lg bg-navy-800 border-${
              isRTL ? 'l' : 'r'
            } border-navy-600 flex flex-col`}
            style={{ [isRTL ? 'left' : 'right']: 0 }}
            initial={{ x: isRTL ? -400 : 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: isRTL ? -400 : 400, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 120, damping: 14 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-navy-600">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-400" />
                <h2 className="text-text-primary font-semibold text-sm">{displayName}</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-md hover:bg-navy-700 text-text-secondary hover:text-text-primary transition-colors"
                aria-label={t('close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quote highlight */}
            {quote && (
              <div className="p-4 border-b border-navy-600 bg-navy-700/50">
                <p className="text-sm text-teal-400 italic">"{quote}"</p>
              </div>
            )}

            {/* PDF Viewer */}
            <div className="flex-1 overflow-auto p-4 flex items-start justify-center bg-navy-900">
              {DocumentComponent && PageComponent ? (
                <DocumentComponent
                  file={pdfPath}
                  onLoadSuccess={onDocumentLoadSuccess}
                  loading={
                    <div className="flex items-center justify-center p-8">
                      <div className="animate-pulse text-text-secondary text-sm">{t('loading')}</div>
                    </div>
                  }
                  error={
                    <div className="flex items-center justify-center p-8">
                      <div className="text-text-muted text-sm">PDF unavailable</div>
                    </div>
                  }
                >
                  <PageComponent
                    pageNumber={pdfPage}
                    width={350}
                    className="mx-auto"
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                </DocumentComponent>
              ) : (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-pulse text-text-secondary text-sm">{t('loading')}</div>
                </div>
              )}
            </div>

            {/* Page navigation */}
            {numPages && (
              <div className="flex items-center justify-between p-4 border-t border-navy-600">
                <button
                  onClick={() => setPdfPage((p) => Math.max(1, p - 1))}
                  disabled={pdfPage <= 1}
                  className="p-2 rounded-md hover:bg-navy-700 text-text-secondary hover:text-text-primary disabled:opacity-30 transition-colors"
                  aria-label="Previous page"
                >
                  {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
                <span className="text-sm text-text-secondary">
                  {t('page')} {pdfPage} / {numPages}
                </span>
                <button
                  onClick={() => setPdfPage((p) => Math.min(numPages, p + 1))}
                  disabled={pdfPage >= numPages}
                  className="p-2 rounded-md hover:bg-navy-700 text-text-secondary hover:text-text-primary disabled:opacity-30 transition-colors"
                  aria-label="Next page"
                >
                  {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
