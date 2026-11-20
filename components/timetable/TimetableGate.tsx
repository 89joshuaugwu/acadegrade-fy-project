'use client';

import Link from 'next/link';
import { CalendarOff, ChevronLeft } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useTimetableEnabled } from '@/hooks/useTimetableEnabled';
import { cn } from '@/lib/utils/cn';
import { DISPLAY_STATUS_STYLE } from './status';
import type { DisplayStatus } from '@/lib/timetable/format';
import { STATUS_LABEL } from '@/lib/timetable/format';

/** Shows a plain notice instead of the page when the `timetable` kill switch is off. */
export function TimetableGate({ children }: { children: React.ReactNode }) {
  const enabled = useTimetableEnabled();
  if (enabled) return <>{children}</>;
  return (
    <Card className="mx-auto mt-6 max-w-xl text-center sm:mt-10" padding="lg" role="status">
      <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[var(--acade-overlay)] text-[var(--acade-text-muted)]">
        <CalendarOff className="size-6" aria-hidden="true" />
      </span>
      <h1 className="app-display mt-4 text-[1.5rem] font-bold leading-tight text-[var(--acade-text)]">
        Timetables are unavailable right now
      </h1>
      <p className="mx-auto mt-2 max-w-md text-[0.9375rem] leading-7 text-[var(--acade-text-muted)]">
        This feature has been paused for maintenance. Your timetables are safe and will be back soon.
      </p>
      <Link
        href="/dashboard"
        className="mt-5 inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-control)] px-4 text-sm font-semibold text-[var(--acade-primary)] hover:bg-[var(--acade-primary-dim)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]"
      >
        <ChevronLeft className="size-4" aria-hidden="true" /> Back to dashboard
      </Link>
    </Card>
  );
}

export function StatusChip({ status, className }: { status: DisplayStatus; className?: string }) {
  return (
    <span
      data-status={status}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.8125rem] font-semibold leading-none',
        DISPLAY_STATUS_STYLE[status],
        className,
      )}
    >
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function BuiltWithTag() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--acade-gold)]/30 bg-[var(--acade-gold-dim)] px-2.5 py-1 text-[0.8125rem] font-semibold leading-none text-[var(--acade-gold)]">
      Built with AcadeMind
    </span>
  );
}
