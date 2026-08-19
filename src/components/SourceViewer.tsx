"use client";

// Source Viewer — right drawer that opens the cited PDF at the exact page.
// Local-first (/public/pdfs) with GitHub raw fallback via the pdfMap.
import { useEffect, useState } from "react";
import { X, ExternalLink } from "lucide-react";
import { getPDFMapping } from "@/lib/pdfMap";
import { useI18n } from "@/lib/i18n";

export interface ViewerTarget {
  docName: string;
  page: number;
}

export default function SourceViewer({
  target,
  onClose,
}: {
  target: ViewerTarget | null;
  onClose: () => void;
}) {
  const { t, lang } = useI18n();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [target]);

  if (!target) return null;

  const mapping = getPDFMapping(target.docName);
  const page = Math.max(1, target.page || 1);
  const localSrc = mapping ? `${mapping.localPath}#page=${page}` : null;
  const remoteSrc = mapping ? mapping.remotePath : null;
  const displayName = mapping
    ? lang === "ar"
      ? mapping.displayNameAr
      : mapping.displayName
    : target.docName;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        dir="ltr"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider text-teal">
              {t("sourceViewer")}
            </div>
            <div className="truncate text-sm font-semibold text-gray-900">
              {displayName} — {t("page")} {page}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {localSrc && (
              <a
                href={localSrc}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-teal hover:text-teal"
              >
                <ExternalLink className="h-3.5 w-3.5" /> {t("openInNewTab")}
              </a>
            )}
            <button
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
              aria-label={t("close")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 bg-gray-50">
          {mapping && !failed ? (
            <iframe
              key={`${mapping.localPath}-${page}`}
              src={localSrc || undefined}
              className="h-full w-full"
              title={displayName}
              onError={() => setFailed(true)}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
              <p className="text-sm text-gray-600">
                {failed ? "Could not render the PDF inline." : "PDF mapping not found."}
              </p>
              {remoteSrc && (
                <a
                  href={remoteSrc}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-teal px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-dark"
                >
                  {t("openInNewTab")} ↗
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
