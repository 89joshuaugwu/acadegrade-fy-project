'use client';

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui';
import { expandOccurrences, type Timetable } from '@/lib/timetable/engine';
import { DAY_LONG, addDays, dayOfWeekOf, formatDate, localToday, weekStart } from '@/lib/timetable/format';

/** One week of occurrences, Monday first. Clicking an occurrence opens its event. */
export function WeekView({
  timetable,
  weekOf,
  onWeekChange,
  onOpenEvent,
}: {
  timetable: Timetable;
  /** Any date inside the week to show. */
  weekOf: string;
  onWeekChange: (date: string) => void;
  onOpenEvent: (eventId: string) => void;
}) {
  const start = weekStart(weekOf);
  const today = localToday();
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(start, i)), [start]);
  const occurrences = useMemo(
    () => expandOccurrences({ ...timetable, status: timetable.status === 'archived' ? 'active' : timetable.status }, `${start}T00:00:00`, `${addDays(start, 6)}T23:59:59`),
    [timetable, start],
  );
  const byDay = (date: string) => occurrences.filter((o) => o.start.slice(0, 10) === date);

  return (
    <section aria-label="Week view">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-[family-name:var(--font-bricolage)] text-lg font-semibold text-[var(--acade-text)]">
          Week of {formatDate(start)}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" aria-label="Previous week" onClick={() => onWeekChange(addDays(start, -7))}>
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onWeekChange(today)}>
            This week
          </Button>
          <Button variant="outline" size="sm" aria-label="Next week" onClick={() => onWeekChange(addDays(start, 7))}>
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
      <ol className="grid gap-2 md:grid-cols-7">
        {days.map((date) => {
          const items = byDay(date);
          const isToday = date === today;
          return (
            <li
              key={date}
              className={`min-w-0 rounded-[var(--radius-control)] border p-2.5 ${isToday ? 'border-[var(--acade-primary)] bg-[var(--acade-primary-dim)]' : 'border-[var(--acade-border)] bg-[var(--acade-deep)]'}`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--acade-text-muted)]">
                {DAY_LONG[dayOfWeekOf(date)]} <span className="font-normal">{date.slice(8)}</span>
              </p>
              {items.length === 0 ? (
                <p className="mt-2 text-xs text-[var(--acade-text-faint)]">Nothing</p>
              ) : (
                <ul className="mt-2 grid gap-1.5">
                  {items.map((o) => (
                    <li key={`${o.eventId}-${o.start}`}>
                      <button
                        type="button"
                        onClick={() => onOpenEvent(o.eventId)}
                        aria-label={`${o.title}, ${o.start.slice(11, 16)} to ${o.end.slice(11, 16)}. Open to edit`}
                        className="min-h-12 w-full rounded-lg border border-[var(--acade-border-subtle)] bg-[var(--acade-void)] px-2 py-1.5 text-left text-xs hover:border-[var(--acade-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]"
                      >
                        <span className="block font-semibold tabular-nums text-[var(--acade-primary)]">
                          {o.start.slice(11, 16)} - {o.end.slice(11, 16)}
                        </span>
                        <span className="block truncate text-[var(--acade-text)]">{o.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
