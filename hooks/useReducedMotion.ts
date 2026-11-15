'use client';

import { useReducedMotion as motionUseReducedMotion } from 'motion/react';
import { useDataSaver } from '@/lib/dataSaver/useDataSaver';

/**
 * Check if user prefers reduced motion.
 * Wraps motion/react's useReducedMotion for consistent API.
 * Must be checked in EVERY animated component.
 */
export function useReducedMotion(): boolean {
  const shouldReduce = motionUseReducedMotion();
  // Data saver (D4) also stops animations.
  const { enabled: dataSaver } = useDataSaver();
  return (shouldReduce ?? false) || dataSaver;
}
