'use client';

import { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type ButtonVariant = 'primary' | 'ghost' | 'outline' | 'danger' | 'gold';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingLabel?: string;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    'bg-[var(--acade-primary)] text-[var(--acade-on-primary)]',
    'hover:bg-[var(--acade-primary-hover)]',
    'active:bg-[var(--acade-primary-hover)]',
  ].join(' '),
  ghost: [
    'bg-transparent text-[var(--acade-text-muted)]',
    'hover:bg-[var(--acade-overlay)] hover:text-[var(--acade-text)]',
  ].join(' '),
  outline: [
    'bg-transparent text-[var(--acade-text)]',
    'border border-[var(--acade-border)]',
    'hover:border-[var(--acade-primary)] hover:text-[var(--acade-primary)]',
  ].join(' '),
  danger: [
    'bg-[var(--acade-danger)] text-[var(--acade-on-danger)]',
    'hover:bg-[var(--acade-danger)]/90',
  ].join(' '),
  gold: [
    'bg-[var(--acade-gold)] text-[var(--acade-text-inverse)]',
    'hover:bg-[var(--acade-gold-hover)]',
  ].join(' '),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-12 px-4 text-[length:var(--text-sm)] rounded-lg gap-1.5',
  md: 'h-12 px-6 text-[length:var(--text-base)] rounded-xl gap-2',
  lg: 'h-14 px-8 text-[length:var(--text-lg)] rounded-xl gap-2.5',
};

/**
 * Button component — built from scratch, no external UI library.
 * 
 * Variants: primary | ghost | outline | danger | gold
 * Sizes: sm (40px) | md (48px) | lg (56px) — minimum 48px touch target
 * Features: loading spinner, motion tap/hover, reduced motion support
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      loadingLabel = 'Working…',
      fullWidth = false,
      children,
      className,
      disabled,
      type = 'button',
      'aria-label': ariaLabel,
      ...props
    },
    ref
  ) => {
    return (
      <motion.button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        aria-label={loading ? loadingLabel : ariaLabel}
        className={cn(
          'relative inline-flex items-center justify-center',
          'font-[family-name:var(--font-dm-sans)] font-semibold',
          'cursor-pointer select-none',
          'transition-colors duration-150',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {loading && (
          <Loader2
            className="animate-spin shrink-0"
            size={size === 'sm' ? 14 : size === 'md' ? 16 : 18}
            aria-hidden="true"
          />
        )}
        <span className={cn('inline-flex items-center justify-center gap-[inherit]', loading && 'opacity-80')}>
          {loading ? loadingLabel : children}
        </span>
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
export { Button };
export type { ButtonProps, ButtonVariant, ButtonSize };
