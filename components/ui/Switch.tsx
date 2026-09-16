'use client';

import { motion } from 'motion/react';
import { cn } from '@/lib/utils/cn';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  pending?: boolean;
  id?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  className?: string;
}

export function Switch({
  checked,
  onCheckedChange,
  disabled = false,
  pending = false,
  id,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  className,
}: SwitchProps) {
  const unavailable = disabled || pending;

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-busy={pending || undefined}
      disabled={unavailable}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-control)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--acade-primary)] focus-visible:ring-offset-2',
        unavailable && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      {!ariaLabel && !ariaLabelledBy && <span className="sr-only">Toggle setting</span>}
      <span className={cn('relative h-6 w-11 rounded-full transition-colors duration-150', checked ? 'bg-[var(--acade-primary)]' : 'bg-[var(--acade-control-border)]')} aria-hidden="true">
        <motion.span
          initial={false}
          animate={{ x: checked ? 20 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="pointer-events-none absolute left-0.5 top-0.5 block size-5 rounded-full bg-[var(--acade-deep)] shadow-sm ring-0"
        />
      </span>
    </button>
  );
}

export type { SwitchProps };
