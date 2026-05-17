'use client';

import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

interface PageTransitionProps {
  children: React.ReactNode;
}

/**
 * PageTransition
 *
 * Wraps page content in a subtle fade-in / slight-slide-up animation.
 *
 * This component is consumed by `app/template.tsx`, which Next.js App Router
 * remounts on every navigation. The remount itself acts as the mount/unmount
 * trigger for AnimatePresence — no `usePathname` key needed here.
 *
 * Accessibility: fully respects `prefers-reduced-motion`. When enabled,
 * only a quick opacity fade is applied with no vertical movement.
 */
export default function PageTransition({ children }: PageTransitionProps) {
  const shouldReduceMotion = useReducedMotion() ?? false;

  const variants = {
    hidden:  { opacity: 0, y: shouldReduceMotion ? 0 : 10 },
    visible: { opacity: 1, y: 0 },
    exit:    { opacity: 0, y: shouldReduceMotion ? 0 : -6 },
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        variants={variants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={{
          duration: shouldReduceMotion ? 0.15 : 0.35,
          ease: [0.25, 0.1, 0.25, 1],
        }}
        style={{ minHeight: '100%' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
