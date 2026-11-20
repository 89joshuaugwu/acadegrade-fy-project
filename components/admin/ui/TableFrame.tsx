import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

/** Class for an admin <table>: calm header row, hairline rows, tabular numbers (see admin.css). Use `ag-right` on numeric cells. */
export const tableClass = 'ag-table';

/**
 * Bounded horizontal scroll for wide tables, so a 390px screen never scrolls the page sideways.
 * With a `label` it becomes a focusable, named region (keyboard users can scroll it).
 */
export function TableFrame({ children, label, className, minWidth }: {
  children: ReactNode;
  label?: string;
  className?: string;
  /** Minimum table width before it scrolls, e.g. '720px'. */
  minWidth?: string;
}) {
  return (
    <div
      className={cn('ag-table-frame', className)}
      role={label ? 'region' : undefined}
      aria-label={label}
      tabIndex={label ? 0 : undefined}
    >
      <div style={minWidth ? { minWidth } : undefined}>{children}</div>
    </div>
  );
}
