'use client';

import { motion } from 'motion/react';
import { cn } from '@/lib/utils/cn';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { resolveDegreeClass } from '@/lib/cgpa/degreeClass';

interface DegreeClassBadgeProps {
  cgpa: number;
  animated?: boolean;
  className?: string;
}

/**
 * DegreeClassBadge — colored pill showing current degree classification.
 *
 * Resolves class from CGPA via degreeClass.ts.
 * Animated: scale 0.4→1.15→1.0 + glow pulse on mount.
 */
function DegreeClassBadge({ cgpa, animated = false, className }: DegreeClassBadgeProps) {
  const shouldReduceMotion = useReducedMotion();
  const degreeClass = resolveDegreeClass(cgpa);

  const colorMap: Record<string, string> = {
    '--class-first': 'var(--class-first)',
    '--class-2upper': 'var(--class-2upper)',
    '--class-2lower': 'var(--class-2lower)',
    '--class-third': 'var(--class-third)',
    '--class-pass': 'var(--class-pass)',
    '--class-fail': 'var(--class-fail)',
  };

  const color = colorMap[degreeClass.colorToken] ?? 'var(--acade-text-faint)';

  const shouldAnimate = animated && !shouldReduceMotion;

  return (
    <motion.div
      initial={
        shouldAnimate
          ? { scale: 0.4, opacity: 0 }
          : { scale: 1, opacity: 1 }
      }
      animate={
        shouldAnimate
          ? {
              scale: [0.4, 1.15, 1.0],
              opacity: 1,
            }
          : { scale: 1, opacity: 1 }
      }
      transition={
        shouldAnimate
          ? {
              scale: {
                times: [0, 0.6, 1],
                duration: 0.6,
                delay: 1.8,
                ease: 'easeOut',
              },
              opacity: { duration: 0.3, delay: 1.8 },
            }
          : { duration: 0 }
      }
      className={cn(
        'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full',
        'text-[length:var(--text-sm)] font-semibold font-[family-name:var(--font-dm-sans)]',
        'border whitespace-nowrap',
        className
      )}
      style={{
        color: color,
        backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
        borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
        boxShadow: shouldAnimate ? `0 0 20px color-mix(in srgb, ${color} 20%, transparent)` : 'none',
      }}
    >
      <span className="text-base leading-none">{degreeClass.icon}</span>
      <span>{degreeClass.label}</span>
    </motion.div>
  );
}

export { DegreeClassBadge };
export type { DegreeClassBadgeProps };
