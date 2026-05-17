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
 * Wraps page content in a subtle fade-in / slight-slide-up animation.
 *
 * Consumed by `app/template.tsx` — Next.js remounts template on every
 * navigation, providing the mount/unmount lifecycle AnimatePresence needs.
 * `key={pathname}` gives each route a stable identity so Framer Motion can
 * reliably fire exit animations before the incoming page mounts.
 *
 * Accessibility: fully respects `prefers-reduced-motion`. When enabled,
 * only a quick opacity fade is applied with no vertical movement.
 */
export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion() ?? false;

  const variants = {
    hidden:  { opacity: 0, y: shouldReduceMotion ? 0 : 10 },
    visible: { opacity: 1, y: 0 },
    exit:    { opacity: 0, y: shouldReduceMotion ? 0 : -6 },
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
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
