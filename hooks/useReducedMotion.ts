'use client';

import { useReducedMotion as motionUseReducedMotion } from 'motion/react';

/**
 * Check if user prefers reduced motion.
 * Wraps motion/react's useReducedMotion for consistent API.
 * Must be checked in EVERY animated component.
 */
export function useReducedMotion(): boolean {
  const shouldReduce = motionUseReducedMotion();
  return shouldReduce ?? false;
}
