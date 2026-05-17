'use client';

/**
 * app/template.tsx
 *
 * Next.js `template` files re-render a fresh instance on every navigation,
 * making them the correct place for page-level enter/exit animations.
 *
 * Unlike `layout.tsx` (which persists and must NOT remount), template.tsx
 * is designed to unmount/remount on route changes — which is exactly the
 * lifecycle Framer Motion's AnimatePresence requires to run transitions.
 */
import PageTransition from '../src/components/PageTransition';

export default function Template({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
