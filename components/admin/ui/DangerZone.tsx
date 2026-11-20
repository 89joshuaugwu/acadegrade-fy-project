import type { ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/**
 * Keeps destructive actions apart from everyday ones: its own bordered block at the end of a page or
 * drawer, with a plain warning. Each action inside still asks for confirmation as before.
 */
export function DangerZone({ title = 'Careful: these cannot be undone easily', description, children, className }: {
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('min-w-0 rounded-[20px] border border-[color-mix(in_srgb,var(--acade-danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--acade-danger-dim)_55%,transparent)] p-5 sm:p-6', className)}>
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--acade-danger-dim)] text-[var(--acade-danger)]" aria-hidden="true">
          <ShieldAlert className="size-4" />
        </span>
        <div className="min-w-0">
          <h2 className="ag-admin-h2 text-[1rem]">{title}</h2>
          {description ? <p className="mt-1 text-sm leading-6 text-[var(--acade-text-muted)]">{description}</p> : null}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">{children}</div>
    </section>
  );
}
