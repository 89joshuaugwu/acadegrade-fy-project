'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { CalendarDays } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useTimetableEnabled } from '@/hooks/useTimetableEnabled';
import { useTimetables } from '@/hooks/useTimetables';
import { expandOccurrences } from '@/lib/timetable/engine';
import { addDays, displayStatus, localNowISO } from '@/lib/timetable/format';

/** Dashboard entry point. Hidden when the `timetable` kill switch is off; shows a plain link if data cannot load. */
export function TimetableDashboardCard() {
  const enabled = useTimetableEnabled();
  const { timetables, loading, error } = useTimetables();

  const summary = useMemo(() => {
    const now = localNowISO();
    const live = timetables.filter((t) => {
      const s = displayStatus(t, now);
      return s === 'active' || s === 'ending_soon';
    });
    const upcoming = live
      .flatMap((t) => expandOccurrences(t, now, `${addDays(now.slice(0, 10), 7)}T23:59:59`))
      .sort((a, b) => a.start.localeCompare(b.start))[0];
    const ending = timetables.filter((t) => displayStatus(t, now) === 'ending_soon' || displayStatus(t, now) === 'expired').length;
    return { liveCount: live.length, upcoming, ending };
  }, [timetables]);

  if (!enabled) return null;

  let body = 'Keep your lectures, exams and reading plans in one place.';
  if (!loading && !error) {
    if (summary.upcoming) {
      const u = summary.upcoming;
      body = `Next: ${u.title}, ${u.start.slice(0, 10) === localNowISO().slice(0, 10) ? 'today' : u.start.slice(0, 10)} at ${u.start.slice(11, 16)}.`;
    } else if (summary.liveCount === 0 && timetables.length === 0) {
      body = 'Create a timetable, or build a reading plan around your lectures.';
    } else if (summary.ending > 0) {
      body = 'A timetable has ended or is ending soon. Open it to extend it.';
    } else {
      body = 'Nothing scheduled in the next 7 days.';
    }
  }
  const hasNext = !loading && !error && Boolean(summary.upcoming);

  return (
    <Card aria-label="Timetable" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3.5">
        <span className="relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--acade-primary-dim)] text-[var(--acade-primary)]">
          <CalendarDays className="size-5" aria-hidden="true" />
          {hasNext && <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-[var(--acade-surface)] bg-ag-gold" />}
        </span>
        <div className="min-w-0">
          <h2 className="app-display text-[1.125rem] font-semibold text-[var(--acade-text)]">Timetable</h2>
          <p className="mt-0.5 text-sm leading-6 text-[var(--acade-text-muted)]">{body}</p>
        </div>
      </div>
      <Link
        href="/timetable"
        className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-[var(--acade-border)] px-4 text-sm font-semibold text-[var(--acade-text)] transition-colors hover:border-[var(--acade-primary)] hover:text-[var(--acade-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]"
      >
        Open timetable
      </Link>
    </Card>
  );
}
