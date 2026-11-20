import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * A row of key numbers. Tiles share one bordered surface with hairline dividers, two per row on phones.
 * Numbers are Bricolage with tabular figures, never monospace.
 */
export function StatGrid({ children, className, columns = 4, 'aria-label': ariaLabel }: {
  children: ReactNode;
  className?: string;
  columns?: 2 | 3 | 4;
  'aria-label'?: string;
}) {
  return (
    <dl
      aria-label={ariaLabel}
      className={cn(
        'grid grid-cols-2 gap-px overflow-hidden rounded-[20px] border border-[var(--acade-border-subtle)] bg-[var(--acade-border-subtle)]',
        columns === 4 && 'lg:grid-cols-4',
        columns === 3 && 'md:grid-cols-3',
        className,
      )}
    >
      {children}
    </dl>
  );
}

type StatTone = 'default' | 'good' | 'warn' | 'bad';

const TONE_DOT: Record<StatTone, string> = {
  default: '',
  good: 'bg-[var(--acade-success)]',
  warn: 'bg-[var(--acade-warning)]',
  bad: 'bg-[var(--acade-danger)]',
};

export function StatTile({ label, value, detail, tone = 'default', className }: {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  tone?: StatTone;
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5 bg-[var(--acade-surface)] p-4 sm:p-5', className)}>
      <dt className="flex items-center gap-2 text-sm text-[var(--acade-text-muted)]">
        {tone !== 'default' ? <span className={cn('size-2 shrink-0 rounded-full', TONE_DOT[tone])} aria-hidden="true" /> : null}
        <span className="min-w-0 truncate">{label}</span>
      </dt>
      <dd className="ag-admin-display text-[1.75rem] font-bold leading-none text-[var(--acade-text)] sm:text-[2rem]">{value}</dd>
      {detail ? <dd className="text-[0.8125rem] leading-5 text-[var(--acade-text-muted)]">{detail}</dd> : null}
    </div>
  );
}
