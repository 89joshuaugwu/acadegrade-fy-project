'use client';

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type NativeProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'>;

export interface ChoiceProps extends NativeProps {
  /** Visible label; it also names the input. */
  label: ReactNode;
  description?: ReactNode;
  /** Classes for the outer <label>. */
  className?: string;
}

const rowClass =
  'group inline-flex min-h-11 max-w-full cursor-pointer items-start gap-3 rounded-[12px] py-2 text-sm text-[var(--acade-text)] has-[:disabled]:cursor-not-allowed';

/**
 * A checkbox that keeps the real <input type="checkbox"> (visually hidden, so forms, labels, tests and
 * screen readers behave exactly as before) and draws its own box. Every native prop passes through.
 */
export const Checkbox = forwardRef<HTMLInputElement, ChoiceProps>(function Checkbox(
  { label, description, className, ...input },
  ref,
) {
  return (
    <label className={cn(rowClass, className)}>
      <input ref={ref} type="checkbox" className="ag-check-input sr-only" {...input} />
      <span className="ag-check-box" aria-hidden="true">
        <Check className="size-3.5" strokeWidth={3} />
      </span>
      <span className="min-w-0 leading-6">
        <span className="block">{label}</span>
        {description ? <span className="block text-[0.8125rem] leading-5 text-[var(--acade-text-muted)]">{description}</span> : null}
      </span>
    </label>
  );
});

/** A radio with the same treatment: real <input type="radio"> hidden, a drawn dot. */
export const Radio = forwardRef<HTMLInputElement, ChoiceProps>(function Radio(
  { label, description, className, ...input },
  ref,
) {
  return (
    <label className={cn(rowClass, className)}>
      <input ref={ref} type="radio" className="ag-check-input sr-only" {...input} />
      <span className="ag-check-box" aria-hidden="true" />
      <span className="min-w-0 leading-6">
        <span className="block">{label}</span>
        {description ? <span className="block text-[0.8125rem] leading-5 text-[var(--acade-text-muted)]">{description}</span> : null}
      </span>
    </label>
  );
});
