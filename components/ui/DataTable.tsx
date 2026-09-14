import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface DataTableColumn<Row> {
  key: string;
  header: string;
  render: (row: Row) => React.ReactNode;
  align?: 'start' | 'center' | 'numeric';
  sortable?: boolean;
  className?: string;
}

export interface DataTableProps<Row> {
  caption: string;
  description?: string;
  columns: DataTableColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row) => React.Key;
  sort?: { key: string; direction: 'ascending' | 'descending' };
  onSort?: (key: string) => void;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<Row>({
  caption,
  description,
  columns,
  rows,
  rowKey,
  sort,
  onSort,
  emptyMessage = 'No records match this view.',
  className,
}: DataTableProps<Row>) {
  return (
    <div
      className={cn(
        'overflow-x-auto rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-surface)]',
        className
      )}
      role="region"
      aria-label={`${caption} table`}
      tabIndex={0}
    >
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <caption className="sr-only">
          {caption}{description ? `. ${description}` : ''}
        </caption>
        <thead className="bg-[var(--acade-overlay)] text-[var(--acade-text-muted)]">
          <tr>
            {columns.map((column) => {
              const activeSort = sort?.key === column.key ? sort.direction : undefined;
              const Icon = activeSort === 'ascending'
                ? ArrowUp
                : activeSort === 'descending'
                  ? ArrowDown
                  : ArrowUpDown;
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={column.sortable ? activeSort ?? 'none' : undefined}
                  className={cn(
                    'h-12 border-b border-[var(--acade-border)] px-4 font-semibold',
                    column.align === 'numeric' && 'text-right tabular-nums',
                    column.align === 'center' && 'text-center',
                    column.className
                  )}
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => onSort?.(column.key)}
                      className={cn(
                        'inline-flex min-h-12 items-center gap-2 rounded-lg text-left transition-colors hover:text-[var(--acade-text)]',
                        column.align === 'numeric' && 'ml-auto'
                      )}
                      aria-label={`Sort by ${column.header}`}
                    >
                      {column.header}
                      <Icon className="size-4" aria-hidden="true" />
                    </button>
                  ) : column.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="h-28 px-4 text-center text-[var(--acade-text-muted)]">
                {emptyMessage}
              </td>
            </tr>
          ) : rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-[var(--acade-border-subtle)] last:border-0 hover:bg-[var(--acade-overlay)]/55">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    'h-14 px-4 text-[var(--acade-text)]',
                    column.align === 'numeric' && 'text-right font-mono tabular-nums',
                    column.align === 'center' && 'text-center',
                    column.className
                  )}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
