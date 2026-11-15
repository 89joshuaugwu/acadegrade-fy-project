'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
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
    <Card className="mx-auto max-w-xl text-center" role="status">
      <h1 className="font-[family-name:var(--font-bricolage)] text-[length:var(--text-2xl)] font-semibold text-[var(--acade-text)]">
        Timetables are unavailable right now
      </h1>
      <p className="mt-2 text-sm leading-6 text-[var(--acade-text-muted)]">
        This feature has been paused for maintenance. Your timetables are safe and will be back soon.
      </p>
      <Link
        href="/dashboard"
        className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-[var(--radius-control)] px-4 text-sm font-semibold text-[var(--acade-primary)] hover:bg-[var(--acade-primary-dim)]"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Back to dashboard
      </Link>
    </Card>
  );
}

export function StatusChip({ status, className }: { status: DisplayStatus; className?: string }) {
  return (
    <span
      data-status={status}
      className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold', DISPLAY_STATUS_STYLE[status], className)}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function BuiltWithTag() {
  return (
    <span className="inline-flex items-center rounded-full bg-[var(--acade-gold)]/12 px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-[var(--acade-gold)]">
      Built with AcadeMind
    </span>
  );
}
