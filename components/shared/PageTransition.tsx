'use client';

import { motion } from 'motion/react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { routeEntry } from '@/lib/ui/motion';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Page transition wrapper — AnimatePresence mode="wait".
 *
 * Uses pathname as the motion key so transitions play on route change.
 * Fade + slide-up + blur-out on enter, fade + slide-up on exit.
 * Respects prefers-reduced-motion.
 */
function PageTransition({ children, className }: PageTransitionProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : routeEntry.initial}
      animate={routeEntry.animate}
      transition={shouldReduceMotion ? { duration: 0 } : routeEntry.transition}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export { PageTransition };
export type { PageTransitionProps };
