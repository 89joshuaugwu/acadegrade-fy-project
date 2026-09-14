'use client';

import { forwardRef, useId } from 'react';
import { cn } from '@/lib/utils/cn';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ id: propId, label, hint, error, className, required, ...props }, ref) => {
    const generatedId = useId();
    const id = propId ?? generatedId;
    const describedBy = [hint && `${id}-hint`, error && `${id}-error`]
      .filter(Boolean)
      .join(' ') || undefined;

    return (
      <div className="flex w-full flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-[var(--acade-text-muted)]">
            {label}{required && <span aria-hidden="true"> *</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          required={required}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={cn(
            'min-h-[120px] max-h-80 w-full resize-y rounded-[var(--radius-control)] px-4 py-3',
            'border border-[var(--acade-control-border)] bg-[var(--acade-deep)] text-base text-[var(--acade-text)]',
            'placeholder:text-[var(--acade-text-faint)] focus:border-[var(--acade-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--acade-primary)]/20',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-[var(--acade-danger)] focus:border-[var(--acade-danger)]',
            className
          )}
          {...props}
        />
        {hint && <p id={`${id}-hint`} className="text-xs text-[var(--acade-text-faint)]">{hint}</p>}
        {error && <p id={`${id}-error`} role="alert" className="text-xs text-[var(--acade-danger)]">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
