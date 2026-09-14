'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

export interface IconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  'aria-label': string;
  variant?: 'ghost' | 'outline' | 'danger';
}

const variants = {
  ghost: 'border border-transparent text-[var(--acade-text-muted)] hover:bg-[var(--acade-overlay)] hover:text-[var(--acade-text)]',
  outline: 'border border-[var(--acade-border)] text-[var(--acade-text)] hover:border-[var(--acade-primary)] hover:text-[var(--acade-primary)]',
  danger: 'border border-transparent text-[var(--acade-danger)] hover:bg-[var(--acade-danger-dim)]',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, type = 'button', variant = 'ghost', children, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-control)]',
        'transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);

IconButton.displayName = 'IconButton';
