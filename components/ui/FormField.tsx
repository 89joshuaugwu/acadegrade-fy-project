'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils/cn';

export interface FormFieldRenderProps {
  id: string;
  describedBy?: string;
  invalid: boolean;
  required: boolean;
}

export interface FormFieldProps {
  id?: string;
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: (field: FormFieldRenderProps) => React.ReactNode;
}

export function FormField({
  id: propId,
  label,
  description,
  error,
  required = false,
  className,
  children,
}: FormFieldProps) {
  const generatedId = useId();
  const id = propId ?? generatedId;
  const describedBy = [
    description && `${id}-description`,
    error && `${id}-error`,
  ].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex w-full flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-[var(--acade-text-muted)]">
        {label}{required && <span aria-hidden="true"> *</span>}
      </label>
      {children({ id, describedBy, invalid: Boolean(error), required })}
      {description && (
        <p id={`${id}-description`} className="text-xs leading-5 text-[var(--acade-text-faint)]">
          {description}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs leading-5 text-[var(--acade-danger)]">
          {error}
        </p>
      )}
    </div>
  );
}
