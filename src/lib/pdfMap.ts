/**
 * PDF Map — Maps document names to their PDF file paths for the Source Viewer.
 */

export interface PDFMapping {
  fileName: string;
  filePath: string;
  displayName: string;
  displayNameAr: string;
  totalPages?: number;
}

export const PDF_MAP: Record<string, PDFMapping> = {
  'Bookshelf_NBK592805': {
    fileName: 'Bookshelf_NBK592805.pdf',
    filePath: '/pdfs/Bookshelf_NBK592805.pdf',
    displayName: 'AHRQ Evidence Review (USPSTF Bookshelf)',
    displayNameAr: 'مراجعة الأدلة AHRQ (USPSTF)',
    totalPages: 200,
  },
  'depression-suicide-risk-adults-clinician-summ (2)': {
    fileName: 'depression-suicide-risk-adults-clinician-summ (2).pdf',
    filePath: '/pdfs/depression-suicide-risk-adults-clinician-summ (2).pdf',
    displayName: 'USPSTF Clinician Summary (JAMA 2023)',
    displayNameAr: 'ملخص الطبيب USPSTF (JAMA 2023)',
    totalPages: 6,
  },
  'depression-suicide-risk-adults-final-evidence-summary (2)': {
    fileName: 'depression-suicide-risk-adults-final-evidence-summary (2).pdf',
    filePath: '/pdfs/depression-suicide-risk-adults-final-evidence-summary (2).pdf',
    displayName: 'USPSTF Final Evidence Summary (2023)',
    displayNameAr: 'ملخص الأدلة النهائي USPSTF (2023)',
    totalPages: 30,
  },
};

export function getPDFPath(docName: string): string | null {
  const cleanKey = docName.replace('.pdf', '').trim();
  if (cleanKey in PDF_MAP) return PDF_MAP[cleanKey].filePath;
  for (const [k, v] of Object.entries(PDF_MAP)) {
    if (k.includes(cleanKey) || cleanKey.includes(k)) return v.filePath;
  }
  return null;
}

export function getPDFDisplayName(docName: string, locale: 'en' | 'ar'): string {
  const cleanKey = docName.replace('.pdf', '').trim();
  if (cleanKey in PDF_MAP) {
    return locale === 'ar' ? PDF_MAP[cleanKey].displayNameAr : PDF_MAP[cleanKey].displayName;
  }
  for (const [k, v] of Object.entries(PDF_MAP)) {
    if (k.includes(cleanKey) || cleanKey.includes(k)) {
      return locale === 'ar' ? v.displayNameAr : v.displayName;
    }
  }
  return cleanKey;
}
