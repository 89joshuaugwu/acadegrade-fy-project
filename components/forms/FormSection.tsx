'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils/cn';

export interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({ title, description, children, className }: FormSectionProps) {
  const id = useId();
  return (
    <section
      role="group"
      aria-labelledby={`${id}-title`}
      aria-describedby={description ? `${id}-description` : undefined}
      className={cn(
        'rounded-[var(--radius-surface)] border border-[var(--acade-border)]',
        'bg-[var(--acade-surface)] p-5 shadow-[var(--shadow-card)] md:p-6',
        className
      )}
    >
      <div className="mb-5 border-b border-[var(--acade-border-subtle)] pb-4">
        <h2 id={`${id}-title`} className="text-lg font-semibold text-[var(--acade-text)]">
          {title}
        </h2>
        {description && (
          <p id={`${id}-description`} className="mt-1 text-sm leading-6 text-[var(--acade-text-muted)]">
            {description}
          </p>
        )}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}
