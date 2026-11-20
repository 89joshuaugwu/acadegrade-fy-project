'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import type { AgendaDay } from '@/lib/public/features-timetable';

/**
 * The example week (brand v2): six day tabs and the chosen day's events,
 * each with its reminder time. Data comes from the real engine on the
 * server (expandOccurrences, reminderTimes). Arrow keys, Home and End move
 * between days. Without JavaScript every day is listed under a heading.
 */
export function WeekAgenda({ days }: { days: AgendaDay[] }) {
  const [hydrated, setHydrated] = useState(false);
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const base = useId();

  useEffect(() => setHydrated(true), []);

  const onKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    let next: number | null = null;
    if (event.key in keys) next = (index + keys[event.key] + days.length) % days.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = days.length - 1;
    if (next === null) return;
    event.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  };

  return (
    <div className="rounded-[32px] bg-ag-haze p-3 sm:p-5">
      <div role="tablist" aria-label="Days of the example week" className="grid grid-cols-6 gap-1.5 sm:gap-2" hidden={!hydrated}>
        {days.map((day, index) => {
          const selected = active === index;
          return (
            <button
              key={day.id}
              ref={(node) => {
                tabs.current[index] = node;
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${index}`}
              aria-selected={selected}
              aria-controls={`${base}-panel-${index}`}
              tabIndex={selected ? 0 : -1}
              className={`ag-focus flex min-h-14 flex-col items-center justify-center rounded-2xl px-1 py-2 transition ${
                selected ? 'bg-ag-night text-white' : 'bg-white text-ag-ink hover:bg-white/70'
              }`}
              onClick={() => setActive(index)}
              onKeyDown={(event) => onKey(event, index)}
            >
              <span className="text-[0.9375rem] font-semibold">{day.weekday}</span>
              <span className={`text-[0.8125rem] ${selected ? 'text-ag-mist-night' : 'text-ag-mist'} max-sm:sr-only`}>{day.dayLabel}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 sm:mt-4">
        {days.map((day, index) => (
          <div
            key={day.id}
            id={`${base}-panel-${index}`}
            role={hydrated ? 'tabpanel' : undefined}
            aria-labelledby={hydrated ? `${base}-tab-${index}` : undefined}
            hidden={hydrated && active !== index}
            className="rounded-[24px] bg-white p-3 sm:p-5"
          >
            <h3 className={hydrated ? 'sr-only' : 'px-2 pb-2 text-[1rem] font-semibold text-ag-ink'}>{day.long}</h3>
            <ul className="space-y-2">
              {day.bands.map((band) => {
                const reading = band.timetable === 'Exam reading plan';
                return (
                  <li
                    key={band.id}
                    className={`grid grid-cols-[4.25rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 rounded-2xl px-3 py-3 sm:grid-cols-[6.5rem_minmax(0,1fr)_auto] sm:px-4 ${
                      reading ? 'bg-ag-gold/15' : 'bg-ag-violet/[0.07]'
                    }`}
                  >
                    <span className="sr-only">{band.spoken}</span>
                    <span className="ag-num text-[0.9375rem] font-semibold text-ag-ink" aria-hidden="true">
                      <time dateTime={`${day.date}T${band.start}`}>{band.start}</time>
                      <span className="block text-[0.8125rem] font-normal text-ag-mist sm:inline">
                        <span className="hidden sm:inline">{' to '}</span>
                        <time dateTime={`${day.date}T${band.end}`}>{band.end}</time>
                      </span>
                    </span>
                    <span className="min-w-0" aria-hidden="true">
                      <span className="block truncate text-[0.9375rem] font-semibold text-ag-ink">{band.title}</span>
                      <span className="block truncate text-[0.8125rem] text-ag-mist">{band.note.split(' · ').join(', ')}</span>
                    </span>
                    <span className="col-start-2 flex flex-wrap items-center gap-2 sm:col-start-auto sm:justify-end" aria-hidden="true">
                      <span className="ag-num inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[0.8125rem] font-semibold text-ag-ink ring-1 ring-ag-ink/10">
                        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="text-ag-violet">
                          <path d="M6 1.5a3.5 3.5 0 00-3.5 3.5v2L1.5 8.5h9L9.5 7V5A3.5 3.5 0 006 1.5zM4.8 10a1.2 1.2 0 002.4 0" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {band.reminder}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-[0.8125rem] font-semibold ${reading ? 'bg-ag-gold/30 text-ag-ink' : 'bg-ag-violet/10 text-ag-violet'}`}>
                        {reading ? 'Reading plan' : 'Lectures'}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
