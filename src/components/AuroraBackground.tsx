'use client';

import { motion, useReducedMotion } from 'framer-motion';

export function AuroraBackground() {
  const prefersReducedMotion = useReducedMotion();

  const blobs = [
    { color: '#0D9488', x: '15%', y: '20%', delay: 0 },
    { color: '#3B82F6', x: '55%', y: '50%', delay: 6.67 },
    { color: '#8B5CF6', x: '75%', y: '25%', delay: 13.33 },
  ];

  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      {blobs.map((blob, i) => (
        <motion.div
          key={i}
          className="absolute w-[600px] h-[600px] rounded-full blur-3xl"
          style={{
            background: `radial-gradient(circle, ${blob.color}40, transparent 70%)`,
            left: blob.x,
            top: blob.y,
            opacity: 0.25,
          }}
          animate={
            prefersReducedMotion
              ? { opacity: 0.2 }
              : {
                  x: [0, 40, -20, -30, 0],
                  y: [0, -50, 30, -15, 0],
                  scale: [1, 1.1, 0.95, 1.05, 1],
                  opacity: [0.25, 0.3, 0.2, 0.28, 0.25],
                }
          }
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : {
                  duration: 20,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: blob.delay,
                }
          }
        />
      ))}
    </div>
  );
}
