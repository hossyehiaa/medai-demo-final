'use client';

import { motion } from 'framer-motion';

export function TypingIndicator() {
  return (
    <motion.div
      className="flex items-start gap-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#4ECDC4]/15 flex items-center justify-center">
        <span className="text-[#4ECDC4] text-sm font-bold">M</span>
      </div>
      <div className="bg-[#131B3F] border border-[#223058] rounded-2xl rounded-tl-sm px-4 py-3 shadow-lg shadow-[#4ECDC4]/5">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-2 h-2 rounded-full bg-[#4ECDC4]"
              animate={{ y: [0, -6, 0] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.15,
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
