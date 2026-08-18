'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Download, FileText, Check } from 'lucide-react';
import { useState } from 'react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

interface ExportReportProps {
  messages: ChatMessage[];
}

export function ExportReport({ messages }: ExportReportProps) {
  const t = useTranslations('export');
  const [copied, setCopied] = useState(false);

  const generateMarkdown = (): string => {
    const lines: string[] = [
      '# medAI Clinical Report',
      '',
      `**Date:** ${new Date().toLocaleDateString()}`,
      `**Time:** ${new Date().toLocaleTimeString()}`,
      '',
      '---',
      '',
    ];

    for (const msg of messages) {
      if (msg.role === 'user') {
        lines.push(`## Question\n\n${msg.content}\n`);
      } else {
        lines.push(`## Response\n\n${msg.content}\n`);
      }
      lines.push('---\n');
    }

    lines.push(
      '## Disclaimer\n\n' +
      'This information is based on USPSTF guidance current as of June 2023 and is for clinical ' +
      'decision support only. It is not a substitute for professional medical judgment. Always verify ' +
      'current guidelines and consult appropriate specialists for individual patient care.\n'
    );

    return lines.join('\n');
  };

  const handleExport = () => {
    const md = generateMarkdown();
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medai-report-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    const md = generateMarkdown();
    await navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2">
      <motion.button
        onClick={handleExport}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-700 border border-navy-600 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:border-teal-400/30 transition-colors"
        whileTap={{ scale: 0.95 }}
        aria-label={t('download')}
      >
        <Download className="w-3.5 h-3.5" />
        <span>{t('markdown')}</span>
      </motion.button>
      <motion.button
        onClick={handleCopy}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-700 border border-navy-600 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:border-teal-400/30 transition-colors"
        whileTap={{ scale: 0.95 }}
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-teal-400">{t('copied')}</span>
          </>
        ) : (
          <>
            <FileText className="w-3.5 h-3.5" />
            <span>Copy</span>
          </>
        )}
      </motion.button>
    </div>
  );
}
