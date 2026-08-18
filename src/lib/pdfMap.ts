/**
 * PDF Map — Maps document names to their PDF file paths for the Source Viewer.
 * Supports local-first with remote fallback for Vercel deployments.
 */

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/hossyehiaa/MEDAI/main/raw_documents';

export interface PDFMapping {
  fileName: string;
  localPath: string;
  remotePath: string;
  displayName: string;
  displayNameAr: string;
  totalPages?: number;
}

export const PDF_MAP: Record<string, PDFMapping> = {
  'AHRQ Evidence Review (USPSTF Bookshelf)': {
    fileName: 'bookshelf.pdf',
    localPath: '/pdfs/bookshelf.pdf',
    remotePath: `${GITHUB_RAW_BASE}/Bookshelf_NBK592805.pdf`,
    displayName: 'AHRQ Evidence Review (USPSTF Bookshelf)',
    displayNameAr: 'مراجعة الأدلة AHRQ (USPSTF)',
    totalPages: 200,
  },
  'USPSTF Clinician Summary (JAMA 2023)': {
    fileName: 'clinician-summary.pdf',
    localPath: '/pdfs/clinician-summary.pdf',
    remotePath: `${GITHUB_RAW_BASE}/depression-suicide-risk-adults-clinician-summ%20(2).pdf`,
    displayName: 'USPSTF Clinician Summary (JAMA 2023)',
    displayNameAr: 'ملخص الطبيب USPSTF (JAMA 2023)',
    totalPages: 6,
  },
  'USPSTF Final Evidence Summary (2023)': {
    fileName: 'evidence-summary.pdf',
    localPath: '/pdfs/evidence-summary.pdf',
    remotePath: `${GITHUB_RAW_BASE}/depression-suicide-risk-adults-final-evidence-summary%20(2).pdf`,
    displayName: 'USPSTF Final Evidence Summary (2023)',
    displayNameAr: 'ملخص الأدلة النهائي USPSTF (2023)',
    totalPages: 30,
  },
  // Legacy key aliases (old filenames)
  'Bookshelf_NBK592805': {
    fileName: 'bookshelf.pdf',
    localPath: '/pdfs/bookshelf.pdf',
    remotePath: `${GITHUB_RAW_BASE}/Bookshelf_NBK592805.pdf`,
    displayName: 'AHRQ Evidence Review (USPSTF Bookshelf)',
    displayNameAr: 'مراجعة الأدلة AHRQ (USPSTF)',
    totalPages: 200,
  },
  'depression-suicide-risk-adults-clinician-summ (2)': {
    fileName: 'clinician-summary.pdf',
    localPath: '/pdfs/clinician-summary.pdf',
    remotePath: `${GITHUB_RAW_BASE}/depression-suicide-risk-adults-clinician-summ%20(2).pdf`,
    displayName: 'USPSTF Clinician Summary (JAMA 2023)',
    displayNameAr: 'ملخص الطبيب USPSTF (JAMA 2023)',
    totalPages: 6,
  },
  'depression-suicide-risk-adults-final-evidence-summary (2)': {
    fileName: 'evidence-summary.pdf',
    localPath: '/pdfs/evidence-summary.pdf',
    remotePath: `${GITHUB_RAW_BASE}/depression-suicide-risk-adults-final-evidence-summary%20(2).pdf`,
    displayName: 'USPSTF Final Evidence Summary (2023)',
    displayNameAr: 'ملخص الأدلة النهائي USPSTF (2023)',
    totalPages: 30,
  },
};

/**
 * Resolve a document name to its PDFMapping.
 * Tries exact match first, then fuzzy (substring) match.
 */
function resolveMapping(docName: string): PDFMapping | null {
  const cleanKey = docName.replace('.pdf', '').trim();
  if (cleanKey in PDF_MAP) return PDF_MAP[cleanKey];
  for (const [k, v] of Object.entries(PDF_MAP)) {
    if (k.includes(cleanKey) || cleanKey.includes(k)) return v;
  }
  return null;
}

/**
 * Get the best available PDF URL (local-first, remote fallback).
 * Returns { url, isLocal } or null if no mapping found.
 */
export function getPDFSource(docName: string): { url: string; isLocal: boolean; mapping: PDFMapping } | null {
  const mapping = resolveMapping(docName);
  if (!mapping) return null;
  return { url: mapping.localPath, isLocal: true, mapping };
}

/**
 * Get remote fallback URL for a document.
 */
export function getPDFRemoteUrl(docName: string): string | null {
  const mapping = resolveMapping(docName);
  if (!mapping) return null;
  return mapping.remotePath;
}

export function getPDFPath(docName: string): string | null {
  const mapping = resolveMapping(docName);
  return mapping ? mapping.localPath : null;
}

export function getPDFDisplayName(docName: string, locale: 'en' | 'ar'): string {
  const mapping = resolveMapping(docName);
  if (!mapping) return docName.replace('.pdf', '').trim();
  return locale === 'ar' ? mapping.displayNameAr : mapping.displayName;
}

export function getPDFMapping(docName: string): PDFMapping | null {
  return resolveMapping(docName);
}
