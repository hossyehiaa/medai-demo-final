"use client";

// Evidence Library — the source guideline documents with PDF viewer access.
import { PDF_MAP } from "@/lib/pdfMap";
import { useI18n } from "@/lib/i18n";
import type { ViewerTarget } from "./SourceViewer";
import { FileText } from "lucide-react";

const PRIMARY_DOCS = [
  "USPSTF Clinician Summary (JAMA 2023)",
  "USPSTF Final Evidence Summary (2023)",
  "AHRQ Evidence Review (USPSTF Bookshelf)",
];

export default function EvidencePanel({
  onOpenSource,
}: {
  onOpenSource: (target: ViewerTarget) => void;
}) {
  const { t, lang } = useI18n();

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold text-gray-900">{t("tabEvidence")}</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PRIMARY_DOCS.map((key) => {
          const doc = PDF_MAP[key];
          if (!doc) return null;
          return (
            <div key={key} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-teal-light text-teal">
                <FileText className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">
                {lang === "ar" ? doc.displayNameAr : doc.displayName}
              </h3>
              {doc.totalPages && (
                <p className="mt-1 text-xs text-gray-400">
                  ~{doc.totalPages} {t("page")}s
                </p>
              )}
              <button
                onClick={() => onOpenSource({ docName: key, page: 1 })}
                className="mt-4 w-full rounded-full bg-teal px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-dark"
              >
                {t("viewPdf")}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
