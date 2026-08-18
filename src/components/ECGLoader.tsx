'use client';

import { motion } from 'framer-motion';

interface ECGLoaderProps {
  className?: string;
  size?: number;
}

export function ECGLoader({ className = '', size = 120 }: ECGLoaderProps) {
  return (
    <div className={`flex items-center justify-center ${className}`} role="status" aria-label="Loading">
      <svg viewBox="0 0 120 32" fill="none" width={size} height={size * 0.27}>
        <motion.path
          d="M0,20 L8,20 L12,20 L14,8 L18,28 L22,4 L26,18 L28,20 L36,20"
          stroke="#4ECDC4"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="200"
          animate={{
            strokeDashoffset: [200, 0, -200],
            opacity: [0.3, 1, 0.3],
          }}
          transition={{
            duration: 2,
            ease: 'easeInOut',
            repeat: Infinity,
          }}
        />
        <motion.text
          x="40"
          y="22"
          fill="#F5F7FB"
          fontFamily="Inter, sans-serif"
          fontSize="18"
          fontWeight="600"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          edai
        </motion.text>
      </svg>
    </div>
  );
}
