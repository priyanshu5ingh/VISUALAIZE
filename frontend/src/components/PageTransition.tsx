'use client';

import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';

interface PageTransitionProps {
  children: React.ReactNode;
}

/**
 * PageTransition
 *
 * Wraps every page in a subtle fade-in / slide-up animation.
 * Uses `usePathname` as the AnimatePresence key so Framer Motion
 * treats each route change as a genuine mount/unmount cycle.
 *
 * Fully respects `prefers-reduced-motion`: when the OS setting is
 * enabled, only a quick opacity fade is applied — no y-movement.
 */
export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion() ?? false;

  /** Variants used when motion is fully allowed. */
  const variants = {
    hidden:  { opacity: 0, y: shouldReduceMotion ? 0 : 10 },
    visible: { opacity: 1, y: 0 },
    exit:    { opacity: 0, y: shouldReduceMotion ? 0 : -6 },
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        variants={variants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={{
          duration: shouldReduceMotion ? 0.15 : 0.35,
          ease: [0.25, 0.1, 0.25, 1], // smooth cubic-bezier
        }}
        // Prevent the wrapper from interfering with any
        // full-screen canvas / ReactFlow layouts beneath it.
        style={{ minHeight: '100%' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
