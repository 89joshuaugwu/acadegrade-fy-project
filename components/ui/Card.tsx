'use client';

import { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'motion/react';
import { cn } from '@/lib/utils/cn';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type CardVariant = 'default' | 'hover' | 'glass';

interface CardProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-5 md:p-6',
  lg: 'p-6 md:p-8',
};

/**
 * Card component — base surface container.
 *
 * Variants:
 * - default: static card with border
 * - hover: lifts on hover with indigo glow shadow
 * - glass: glassmorphism effect with backdrop blur
 */
const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', padding = 'md', children, className, ...props }, ref) => {
    const shouldReduceMotion = useReducedMotion();

    const baseStyles = cn(
      'rounded-2xl border border-[var(--acade-border)]',
      paddingStyles[padding],
      variant === 'glass'
        ? 'bg-[var(--acade-deep)]/60 backdrop-blur-md border-[var(--acade-border-subtle)]'
        : 'bg-[var(--acade-deep)]',
      className
    );

    if (variant === 'hover' && !shouldReduceMotion) {
      return (
        <motion.div
          ref={ref}
          whileHover={{
            y: -4,
            boxShadow: '0 24px 48px rgba(99,102,241,0.18)',
            transition: { duration: 0.2 },
          }}
          className={cn(baseStyles, 'transition-shadow cursor-pointer')}
          {...props}
        >
          {children}
        </motion.div>
      );
    }

    return (
      <motion.div ref={ref} className={baseStyles} {...props}>
        {children}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';
export { Card };
export type { CardProps, CardVariant };
