'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, FileText, ExternalLink } from 'lucide-react';
import { getPDFDisplayName, getPDFMapping, getPDFRemoteUrl } from '@/lib/pdfMap';

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
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [tryingRemote, setTryingRemote] = useState(false);

  // Resolve PDF source: try local first, fallback to remote
  useEffect(() => {
    if (!isOpen) return;
    setPdfError(null);
    setTryingRemote(false);

    const mapping = getPDFMapping(docName);
    if (!mapping) {
      setPdfError('not_found');
      return;
    }

    // Try local path first
    const tryLocal = async () => {
      try {
        const headResp = await fetch(mapping.localPath, { method: 'HEAD' });
        if (headResp.ok) {
          setPdfUrl(mapping.localPath);
          return;
        }
      } catch {
        // Local fetch failed, try remote
      }
      // Fallback to remote
      tryRemote();
    };

    const tryRemote = async () => {
      setTryingRemote(true);
      try {
        const remoteUrl = getPDFRemoteUrl(docName);
        if (remoteUrl) {
          const headResp = await fetch(remoteUrl, { method: 'HEAD' });
          if (headResp.ok) {
            setPdfUrl(remoteUrl);
            return;
          }
        }
      } catch {
        // Remote also failed
      }
      setPdfError('unavailable');
    };

    tryLocal();
  }, [isOpen, docName]);

  // Dynamic import of react-pdf with SSR: false + worker fix
  useEffect(() => {
    if (!isOpen) return;
    import('react-pdf').then((mod) => {
      try {
        // Try local worker first (works on Vercel with ?url import)
        mod.pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;
      } catch {
        // Fallback: disable worker
        mod.pdfjs.GlobalWorkerOptions.workerSrc = '';
      }
      setDocumentComponent(() => mod.Document);
      setPageComponent(() => mod.Page);
    }).catch(() => {
      setPdfError('viewer_failed');
    });
  }, [isOpen]);

  useEffect(() => {
    if (page) setPdfPage(page);
  }, [page]);

  const onDocumentLoadSuccess = useCallback(({ numPages: n }: { numPages: number }) => {
    setNumPages(n);
    setPdfError(null);
  }, []);

  const onDocumentLoadError = useCallback(() => {
    // If local failed, try remote
    const remoteUrl = getPDFRemoteUrl(docName);
    if (remoteUrl && pdfUrl !== remoteUrl) {
      setTryingRemote(true);
      setPdfUrl(remoteUrl);
    } else {
      setPdfError('unavailable');
    }
  }, [docName, pdfUrl]);

  const displayName = getPDFDisplayName(docName, locale);
  const mapping = getPDFMapping(docName);

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
                {tryingRemote && (
                  <span className="text-xs text-text-muted ml-1">(remote)</span>
                )}
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
                <p className="text-sm text-teal-400 italic">&ldquo;{quote}&rdquo;</p>
              </div>
            )}

            {/* PDF Viewer */}
            <div className="flex-1 overflow-auto p-4 flex items-start justify-center bg-navy-900">
              {pdfError ? (
                /* Error / Fallback card */
                <div className="flex flex-col items-center justify-center p-8 text-center gap-4">
                  <FileText className="w-12 h-12 text-text-muted" />
                  <div>
                    <p className="text-text-secondary text-sm font-medium mb-2">
                      {pdfError === 'not_found'
                        ? (locale === 'ar' ? 'المستند غير موجود' : 'Document not found')
                        : (locale === 'ar' ? 'PDF غير متاح' : 'PDF unavailable')
                      }
                    </p>
                    <p className="text-text-muted text-xs mb-4">
                      {locale === 'ar'
                        ? 'لا يمكن تحميل ملف PDF. يمكنك عرضه على GitHub بدلاً من ذلك.'
                        : 'The PDF file could not be loaded. You can view it on GitHub instead.'
                      }
                    </p>
                  </div>
                  {mapping && (
                    <a
                      href={mapping.remotePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-teal-400/10 text-teal-400 rounded-lg text-sm font-medium hover:bg-teal-400/20 transition-colors"
                    >
                      {locale === 'ar' ? 'فتح على GitHub' : 'Open on GitHub'}
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              ) : DocumentComponent && PageComponent && pdfUrl ? (
                <DocumentComponent
                  file={pdfUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={
                    <div className="flex items-center justify-center p-8">
                      <div className="animate-pulse text-text-secondary text-sm">{t('loading')}</div>
                    </div>
                  }
                  error={
                    <div className="flex flex-col items-center justify-center p-8 text-center gap-3">
                      <p className="text-text-muted text-sm">
                        {locale === 'ar' ? 'خطأ في تحميل PDF' : 'Error loading PDF'}
                      </p>
                      {mapping && (
                        <a
                          href={mapping.remotePath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-400/10 text-teal-400 rounded-lg text-xs font-medium hover:bg-teal-400/20 transition-colors"
                        >
                          {locale === 'ar' ? 'فتح على GitHub' : 'Open on GitHub'}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
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
