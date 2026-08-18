'use client';

import { motion } from 'framer-motion';

interface ECGDividerProps {
  className?: string;
}

export function ECGDivider({ className = '' }: ECGDividerProps) {
  return (
    <div className={`w-full overflow-hidden ${className}`} aria-hidden="true">
      <svg
        viewBox="0 0 800 32"
        fill="none"
        className="w-full h-8"
        preserveAspectRatio="none"
      >
        <motion.path
          d="M0,16 L100,16 L120,16 L130,4 L140,28 L150,2 L160,14 L165,16 L200,16 L300,16 L320,16 L330,4 L340,28 L350,2 L360,14 L365,16 L400,16 L500,16 L520,16 L530,4 L540,28 L550,2 L560,14 L565,16 L600,16 L700,16 L720,16 L730,4 L740,28 L750,2 L760,14 L765,16 L800,16"
          stroke="#4ECDC4"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0.3 }}
          animate={{ pathLength: 1, opacity: 0.6 }}
          transition={{
            duration: 2,
            ease: 'easeInOut',
            repeat: Infinity,
            repeatType: 'loop',
          }}
        />
      </svg>
    </div>
  );
}
