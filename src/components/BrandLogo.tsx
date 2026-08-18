'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';

interface BrandLogoProps {
  variant?: 'image' | 'ecg' | 'full';
  className?: string;
  size?: number;
}

export function BrandLogo({ variant = 'ecg', className = '', size = 40 }: BrandLogoProps) {
  if (variant === 'image') {
    return (
      <Image
        src="/medai-logo.png"
        alt="medAI logo"
        width={size}
        height={size}
        className={className}
        priority
      />
    );
  }

  if (variant === 'full') {
    return (
      <Image
        src="/medai-logo-full.png"
        alt="medAI Clinical Assistant"
        width={size * 3}
        height={size}
        className={className}
        priority
      />
    );
  }

  // Default: ECG heartbeat SVG variant
  return (
    <motion.div
      className={`flex items-center gap-1 ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <svg viewBox="0 0 120 32" fill="none" width={size * 3} height={size * 0.8}>
        <motion.path
          d="M0,20 L8,20 L12,20 L14,8 L18,28 L22,4 L26,18 L28,20 L36,20"
          stroke="#4ECDC4"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
        />
        <text x="40" y="22" fill="#F5F7FB" fontFamily="Inter, sans-serif" fontSize="18" fontWeight="600">
          edai
        </text>
      </svg>
    </motion.div>
  );
}
