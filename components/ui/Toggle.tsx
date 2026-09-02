'use client';

import { useId } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils/cn';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  leftLabel?: string;
  rightLabel?: string;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

/**
 * Toggle switch — spring-animated thumb via motion layout.
 *
 * Features:
 * - Spring physics on thumb slide
 * - Left/right labels (e.g. "CGPA" / "PI")
 * - 48px min touch target
 * - Reduced motion support
 */
function Toggle({
  checked,
  onChange,
  leftLabel,
  rightLabel,
  disabled = false,
  className,
  'aria-label': ariaLabel,
}: ToggleProps) {
  const id = useId();
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className={cn('inline-flex items-center gap-2.5', className)}>
      {leftLabel && (
        <span
          className={cn(
            'text-[length:var(--text-sm)] font-medium font-[family-name:var(--font-dm-sans)] transition-colors',
            !checked ? 'text-[var(--acade-text)]' : 'text-[var(--acade-text-faint)]'
          )}
        >
          {leftLabel}
        </span>
      )}

      <button
        id={id}
        role="switch"
        type="button"
        aria-checked={checked}
        aria-label={ariaLabel ?? `Toggle ${leftLabel ?? ''} ${rightLabel ?? ''}`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full',
          'transition-colors duration-150',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          checked
            ? 'bg-[var(--acade-primary)]'
            : 'bg-[var(--acade-border)]'
        )}
      >
        <motion.span
          layout
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { type: 'spring', stiffness: 500, damping: 30 }
          }
          className={cn(
            'pointer-events-none block size-5 rounded-full bg-white shadow-md',
            checked ? 'ml-[26px]' : 'ml-[3px]'
          )}
        />
      </button>

      {rightLabel && (
        <span
          className={cn(
            'text-[length:var(--text-sm)] font-medium font-[family-name:var(--font-dm-sans)] transition-colors',
            checked ? 'text-[var(--acade-text)]' : 'text-[var(--acade-text-faint)]'
          )}
        >
          {rightLabel}
        </span>
      )}
    </div>
  );
}

export { Toggle };
export type { ToggleProps };
