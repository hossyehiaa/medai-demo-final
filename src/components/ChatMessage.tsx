'use client';

import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'framer-motion';
import { User, Bot } from 'lucide-react';
import { CitationPill } from './CitationPill';
import { SafetyBadge } from './SafetyBadge';
import { PROFESSIONAL_DISCLAIMER } from '@/lib/safety-gates';

export interface ChatMessageData {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status?: 'OK' | 'CRISIS' | 'REFUSAL_OOS' | 'REFUSAL_LOW_CONFIDENCE' | 'BLOCKED' | 'FAILED_OUTPUT';
  isStreaming?: boolean;
  referral988?: boolean;
}

interface ChatMessageProps {
  message: ChatMessageData;
}

// Parse citation patterns: [Doc: X | Sec: Y | Pg: Z | Quote: "..."]
function parseCitations(text: string): { text: string; citations: Array<{ doc: string; section: string; page: string; quote: string; full: string }> } {
  const citationRegex = /\[Doc:\s*([^|]+)\|\s*Sec:\s*([^|]+)\|\s*Pg:\s*([^|]+)\|\s*Quote:\s*"([^"]+)"\]/gi;
  const citations: Array<{ doc: string; section: string; page: string; quote: string; full: string }> = [];
  let match;

  while ((match = citationRegex.exec(text)) !== null) {
    citations.push({
      doc: match[1].trim(),
      section: match[2].trim(),
      page: match[3].trim(),
      quote: match[4].trim(),
      full: match[0],
    });
  }

  // Replace citations with markers
  let cleanText = text;
  for (let i = 0; i < citations.length; i++) {
    cleanText = cleanText.replace(citations[i].full, `⟨CITATION_${i}⟩`);
  }

  return { text: cleanText, citations };
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const { text: parsedText, citations } = useMemo(
    () => parseCitations(message.content),
    [message.content],
  );

  // Split disclaimer from content
  const hasDisclaimer = message.content.includes(PROFESSIONAL_DISCLAIMER);
  const disclaimerText = hasDisclaimer ? PROFESSIONAL_DISCLAIMER : null;

  return (
    <motion.div
      className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 120, damping: 14 }}
    >
      {/* Avatar */}
      <div
        className={`
          flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
          ${isUser
            ? 'bg-[#223058] text-[#AAB4D4]'
            : 'bg-[#4ECDC4]/15 text-[#4ECDC4]'
          }
        `}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Message content */}
      <div
        className={`
          max-w-[85%] sm:max-w-[75%]
          ${isUser
            ? 'bg-[#131B3F] border border-[#223058] rounded-2xl rounded-tr-sm'
            : 'bg-[#131B3F] border border-[#223058] rounded-2xl rounded-tl-sm shadow-lg shadow-[#4ECDC4]/5'
          }
          px-4 py-3
        `}
      >
        {/* Safety badge for non-OK statuses */}
        {message.status && message.status !== 'OK' && (
          <div className="mb-2">
            <SafetyBadge status={message.status} />
          </div>
        )}

        {/* 988 Referral */}
        {message.referral988 && (
          <div className="mb-3 p-3 rounded-xl bg-red-500/5 border border-red-500/20 text-sm text-red-300">
            <strong className="block mb-1">Crisis Support</strong>
            If you are in crisis or having thoughts of suicide, call or text{' '}
            <a href="tel:988" className="underline font-semibold text-red-200">988</a> (US) or your local emergency number.
            In Egypt: <a href="tel:08008880700" className="underline font-semibold text-red-200">08008880700</a>
          </div>
        )}

        {/* Markdown content */}
        <div className="markdown-content text-sm leading-relaxed">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h2: ({ children, ...props }) => (
                <h2
                  className="text-base font-bold mt-3 mb-1.5 pb-1 border-b border-[#4ECDC4]/20 text-[#4ECDC4]"
                  {...props}
                >
                  {children}
                </h2>
              ),
              p: ({ children, ...props }) => (
                <p className="mb-2 leading-7 text-[#F5F7FB]" {...props}>
                  {children}
                </p>
              ),
              strong: ({ children, ...props }) => (
                <strong className="font-semibold text-[#F5F7FB]" {...props}>
                  {children}
                </strong>
              ),
              a: ({ children, href, ...props }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#4ECDC4] underline underline-offset-2 hover:text-[#2EA89F]"
                  {...props}
                >
                  {children}
                </a>
              ),
              blockquote: ({ children, ...props }) => (
                <blockquote
                  className="border-l-2 border-[#4ECDC4]/30 pl-3 my-2 text-[#AAB4D4] italic"
                  {...props}
                >
                  {children}
                </blockquote>
              ),
              hr: () => (
                <hr className="my-3 border-[#223058]" />
              ),
            }}
          >
            {parsedText}
          </ReactMarkdown>
        </div>

        {/* Inline citation pills */}
        {citations.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-0.5">
            {citations.map((cit, i) => (
              <CitationPill
                key={i}
                doc={cit.doc}
                section={cit.section}
                page={cit.page}
                quote={cit.quote}
              />
            ))}
          </div>
        )}

        {/* Disclaimer */}
        {disclaimerText && (
          <div className="mt-3 pt-2 border-t border-[#223058] text-xs text-[#7683AB] leading-relaxed">
            {disclaimerText}
          </div>
        )}
      </div>
    </motion.div>
  );
}
