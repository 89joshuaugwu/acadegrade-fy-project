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
        'relative inline-flex h-12 w-14 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--acade-primary)] focus-visible:ring-offset-2',
        checked ? 'bg-[var(--acade-primary)]' : 'bg-[var(--acade-control-border)]',
        unavailable && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      {!ariaLabel && !ariaLabelledBy && <span className="sr-only">Toggle setting</span>}
      <motion.span
        initial={false}
        animate={{
          x: checked ? 24 : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30
        }}
        className={cn(
          'pointer-events-none ml-1 block h-6 w-6 rounded-full bg-[var(--acade-deep)] shadow-sm ring-0'
        )}
      />
    </button>
  );
}

export type { SwitchProps };
