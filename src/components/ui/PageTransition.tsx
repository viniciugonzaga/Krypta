import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
  // Variantes: 'fade' | 'slide-up' | 'slide-left' | 'zoom'
  variant?: 'fade' | 'slide-up' | 'slide-left' | 'zoom';
}

const VARIANTS = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  'slide-up': {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
  },
  'slide-left': {
    initial: { opacity: 0, x: 30 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  },
  zoom: {
    initial: { opacity: 0, scale: 0.96 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.02 },
  },
};

export function PageTransition({ children, variant = 'slide-up' }: PageTransitionProps) {
  const v = VARIANTS[variant];

  return (
    <motion.div
      initial={v.initial}
      animate={v.animate}
      exit={v.exit}
      transition={{
        duration: 0.45,
        ease: [0.22, 1, 0.36, 1], // curva cubic-bezier suave
      }}
      className="min-h-screen"
    >
      {children}
    </motion.div>
  );
}