import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

/** Label/value rows for drawers and summaries. Two columns from 640px, stacked on phones. */
export function DetailList({ items, className }: {
  items: { label: ReactNode; value: ReactNode; key?: string }[];
  className?: string;
}) {
  return (
    <dl className={cn('divide-y divide-[var(--acade-border-subtle)] rounded-[16px] border border-[var(--acade-border-subtle)] bg-[var(--acade-surface)]', className)}>
      {items.map((item, index) => (
        <div key={item.key ?? index} className="grid gap-0.5 px-4 py-3 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)] sm:gap-4">
          <dt className="text-sm text-[var(--acade-text-muted)]">{item.label}</dt>
          <dd className="min-w-0 break-words text-sm font-medium tabular-nums text-[var(--acade-text)]">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
