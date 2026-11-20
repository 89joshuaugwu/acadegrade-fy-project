'use client';

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { expandOccurrences, type Occurrence, type Timetable } from '@/lib/timetable/engine';
import { DAY_LONG, DAY_SHORT, addDays, dayOfWeekOf, formatDate, localToday, weekStart } from '@/lib/timetable/format';
import { cn } from '@/lib/utils/cn';
import { EVENT_TYPE_COLOUR } from './status';

const navButton =
  'inline-flex h-11 min-w-11 items-center justify-center rounded-[var(--radius-control)] px-3 text-sm font-semibold text-[var(--acade-text)] transition-colors hover:bg-[var(--acade-overlay)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]';

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
  const isThisWeek = start === weekStart(today);

  return (
    <section aria-label="Week view" className="min-w-0 rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-surface)] p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="app-display text-[1.25rem] font-semibold text-[var(--acade-text)]">Week of {formatDate(start)}</h2>
          <p className="mt-0.5 text-[0.8125rem] text-[var(--acade-text-muted)]">
            {occurrences.length === 0 ? 'Nothing scheduled this week' : `${occurrences.length} event${occurrences.length === 1 ? '' : 's'} this week`}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-[calc(var(--radius-control)+4px)] border border-[var(--acade-border)] bg-[var(--acade-void)] p-1">
          <button type="button" className={navButton} aria-label="Previous week" onClick={() => onWeekChange(addDays(start, -7))}>
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            className={cn(navButton, isThisWeek && 'bg-[var(--acade-surface)] text-[var(--acade-primary)] shadow-[var(--shadow-card)]')}
            onClick={() => onWeekChange(today)}
          >
            This week
          </button>
          <button type="button" className={navButton} aria-label="Next week" onClick={() => onWeekChange(addDays(start, 7))}>
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <ol className="grid grid-cols-[minmax(0,1fr)] gap-2 xl:grid-cols-[repeat(7,minmax(0,1fr))] xl:gap-2">
        {days.map((date) => {
          const items = byDay(date);
          const isToday = date === today;
          const dow = dayOfWeekOf(date);
          return (
            <li
              key={date}
              aria-label={`${DAY_LONG[dow]} ${formatDate(date)}${isToday ? ', today' : ''}`}
              className={cn(
                'flex min-w-0 gap-3 rounded-2xl border p-2.5 xl:min-h-44 xl:flex-col xl:gap-2',
                isToday
                  ? 'border-[var(--acade-primary)]/45 bg-[var(--acade-primary-dim)]'
                  : 'border-[var(--acade-border-subtle)] bg-[var(--acade-void)]',
              )}
            >
              <div className="flex w-11 shrink-0 flex-col items-center pt-0.5 xl:w-auto xl:flex-row xl:items-baseline xl:gap-1.5 xl:px-1 xl:pt-0">
                <span className={cn('text-[0.8125rem] font-semibold', isToday ? 'text-[var(--acade-primary)]' : 'text-[var(--acade-text-muted)]')}>
                  {DAY_SHORT[dow]}
                </span>
                <span className={cn('app-num text-[1.25rem] font-bold leading-tight', isToday ? 'text-[var(--acade-primary)]' : 'text-[var(--acade-text)]')}>
                  {Number(date.slice(8))}
                </span>
                {isToday && <span aria-hidden="true" className="mt-1 size-1.5 rounded-full bg-ag-gold xl:mt-0 xl:ml-auto xl:self-center" />}
              </div>
              {items.length === 0 ? (
                <p className="flex min-h-11 flex-1 items-center text-[0.8125rem] text-[var(--acade-text-faint)] xl:min-h-0 xl:flex-none xl:px-1">Nothing</p>
              ) : (
                <ul className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)] content-start gap-1.5">
                  {items.map((o) => (
                    <li key={`${o.eventId}-${o.start}`} className="min-w-0">
                      <OccurrenceButton occurrence={o} onOpen={onOpenEvent} />
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

function OccurrenceButton({ occurrence: o, onOpen }: { occurrence: Occurrence; onOpen: (eventId: string) => void }) {
  const colour = EVENT_TYPE_COLOUR[o.type] ?? EVENT_TYPE_COLOUR.other;
  return (
    <button
      type="button"
      onClick={() => onOpen(o.eventId)}
      aria-label={`${o.title}, ${o.start.slice(11, 16)} to ${o.end.slice(11, 16)}. Open to edit`}
      className="relative flex min-h-11 w-full min-w-0 flex-col justify-center overflow-hidden rounded-xl border border-[var(--acade-border-subtle)] bg-[var(--acade-surface)] py-1.5 pl-3.5 pr-2.5 text-left transition-colors hover:border-[var(--acade-primary)]/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]"
    >
      <span aria-hidden="true" className="absolute inset-y-1.5 left-1.5 w-[3px] rounded-full" style={{ background: colour }} />
      <span className="block text-[0.8125rem] font-semibold tabular-nums text-[var(--acade-text-muted)]">
        {o.start.slice(11, 16)}–{o.end.slice(11, 16)}
      </span>
      <span className="line-clamp-2 break-words text-sm font-medium leading-snug text-[var(--acade-text)]">{o.title}</span>
    </button>
  );
}
