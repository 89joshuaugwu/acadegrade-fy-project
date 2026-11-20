'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, CalendarDays, CalendarPlus, CalendarRange, LayoutList } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button, Card, LinkButton } from '@/components/ui';
import { HelpButton } from '@/components/help/HelpDrawer';
import { studentHelpSource } from '@/lib/help/student-help';
import { useTimetables } from '@/hooks/useTimetables';
import { TimetableGate, StatusChip, BuiltWithTag } from '@/components/timetable/TimetableGate';
import { ExtendPanel } from '@/components/timetable/ExtendPanel';
import { PageNotice } from '@/components/timetable/fields';
import { DAY_LONG, DAY_SHORT, WEEK_ORDER, describeValidity, displayStatus, localNowISO } from '@/lib/timetable/format';
import { TIMETABLE_LIMITS, canAddTimetable } from '@/lib/timetable/validate';
import type { Timetable, TimetableKind } from '@/lib/timetable/engine';
import { cn } from '@/lib/utils/cn';

const KIND_LABEL = { fixed: 'Fixed', reading: 'Reading', custom: 'Custom' } as const;

const KIND_STYLE: Record<TimetableKind, { Icon: React.ElementType; tile: string }> = {
  fixed: { Icon: CalendarDays, tile: 'bg-[var(--acade-primary-dim)] text-[var(--acade-primary)]' },
  reading: { Icon: BookOpen, tile: 'bg-[var(--acade-gold-dim)] text-[var(--acade-gold)]' },
  custom: { Icon: LayoutList, tile: 'bg-[var(--acade-info-dim)] text-[var(--acade-info)]' },
};

export default function TimetablesPage() {
  return (
    <TimetableGate>
      <TimetablesList />
    </TimetableGate>
  );
}

/** Which weekdays carry a weekly event, Monday first. */
function weeklyDays(t: { events: Array<{ recurrence: { kind: string; days?: number[] } }> }) {
  const set = new Set<number>();
  for (const e of t.events) if (e.recurrence.kind === 'weekly') for (const d of e.recurrence.days ?? []) set.add(d);
  return set;
}

function WeekStrip({ days }: { days: Set<number> }) {
  if (days.size === 0) return null;
  const on = WEEK_ORDER.filter((d) => days.has(d));
  return (
    <div className="mt-3 flex items-center gap-1" aria-label={`Weekly on ${on.map((d) => DAY_LONG[d]).join(', ')}`} role="img">
      {WEEK_ORDER.map((d) => (
        <span
          key={d}
          aria-hidden="true"
          className={cn(
            'flex h-7 w-9 items-center justify-center rounded-lg text-[0.75rem] font-semibold',
            days.has(d) ? 'bg-[var(--acade-primary)] text-[var(--acade-on-primary)]' : 'bg-[var(--acade-overlay)] text-[var(--acade-text-faint)]',
          )}
        >
          {DAY_SHORT[d].slice(0, 2)}
        </span>
      ))}
    </div>
  );
}

function TimetablesList() {
  const { timetables, loading, error, retry, update, remove } = useTimetables();
  const [extendingId, setExtendingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const nowISO = localNowISO();
  const atLimit = !canAddTimetable(timetables.length);

  const rows = useMemo(
    () => timetables.map((t) => ({ t, status: displayStatus(t, nowISO) })),
    [timetables, nowISO],
  );

  async function run(id: string, action: () => Promise<void>, done: string) {
    setBusyId(id);
    try {
      await action();
      toast.success(done);
    } catch (e) {
      console.error('Timetable update failed', e);
      toast.error('That did not save. Check your connection and try again.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex w-full min-w-0 max-w-4xl flex-col gap-6 pb-10">
      <header className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <h1 className="app-display text-[clamp(1.75rem,3.2vw,2.25rem)] font-bold leading-tight text-[var(--acade-text)]">Timetables</h1>
          <HelpButton entryId="student.timetable" source={studentHelpSource} className="shrink-0" />
        </div>
        <p className="mt-2 max-w-2xl text-[0.9375rem] leading-7 text-[var(--acade-text-muted)]">
          Keep your lectures, exams and reading plans in one place.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <LinkButton href="/timetable/new" className={atLimit ? 'pointer-events-none opacity-50' : ''} aria-disabled={atLimit}>
            <CalendarPlus className="size-4" aria-hidden="true" /> New timetable
          </LinkButton>
          <LinkButton href="/timetable/build" variant="outline" className={atLimit ? 'pointer-events-none opacity-50' : ''} aria-disabled={atLimit}>
            <CalendarRange className="size-4" aria-hidden="true" /> Build with AcadeMind
          </LinkButton>
        </div>
      </header>

      <PageNotice>
        Reminders are an Android app feature: the app can alert you before each event. On the website you can download a
        calendar file (.ics) and let your calendar app do the reminding.
      </PageNotice>

      {atLimit && (
        <PageNotice tone="warning">
          You have {TIMETABLE_LIMITS.maxTimetables} timetables, which is the most you can keep. Delete an archived one to make room.
        </PageNotice>
      )}

      {loading ? (
        <div aria-busy="true" aria-label="Loading timetables" className="grid gap-3">
          <div className="skeleton h-36 rounded-[var(--radius-surface)]" />
          <div className="skeleton h-36 rounded-[var(--radius-surface)]" />
        </div>
      ) : error ? (
        <Card role="alert" className="text-center">
          <p className="text-sm text-[var(--acade-text-muted)]">Your timetables could not load. Your saved timetables have not changed.</p>
          <Button className="mt-4" variant="outline" onClick={retry}>
            Try again
          </Button>
        </Card>
      ) : rows.length === 0 ? (
        <Card className="text-center" padding="lg">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[var(--acade-primary-dim)] text-[var(--acade-primary)]">
            <CalendarDays className="size-6" aria-hidden="true" />
          </span>
          <h2 className="app-display mt-4 text-[1.25rem] font-semibold text-[var(--acade-text)]">No timetables yet</h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-[var(--acade-text-muted)]">Create one for your lectures, or build a reading plan around them.</p>
        </Card>
      ) : (
        <ul className="grid gap-3" aria-label="Your timetables">
            {rows.map(({ t, status }) => {
              const { Icon, tile } = KIND_STYLE[t.kind] ?? KIND_STYLE.custom;
              const archived = status === 'archived';
              return (
                <li key={t.id}>
                  <Card padding="none" className={cn('overflow-hidden', archived && 'bg-[var(--acade-void)]')}>
                    <div className="flex gap-4 p-5 sm:p-6">
                      <span className={cn('hidden size-11 shrink-0 items-center justify-center rounded-xl min-[420px]:flex', tile, archived && 'opacity-60')}>
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                          <h2 className="app-display min-w-0 max-w-full truncate text-[1.125rem] font-semibold leading-snug text-[var(--acade-text)] sm:text-[1.25rem]">
                            {t.title}
                          </h2>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {t.builtWith === 'academind' && <BuiltWithTag />}
                            <StatusChip status={status} />
                          </div>
                        </div>
                        <p className="mt-1 text-sm text-[var(--acade-text-muted)]">
                          {KIND_LABEL[t.kind]} timetable, {t.events.length} event{t.events.length === 1 ? '' : 's'}
                        </p>
                        <p className="text-sm tabular-nums text-[var(--acade-text-muted)]">{describeValidity(t)}</p>
                        <WeekStrip days={weeklyDays(t)} />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 border-t border-[var(--acade-border-subtle)] bg-[var(--acade-void)]/60 px-5 py-3 sm:px-6">
                      <LinkButton href={`/timetable/${t.id}`} variant="outline" size="sm" aria-label={`Open ${t.title}`}>
                        Open
                      </LinkButton>
                      {(status === 'ending_soon' || status === 'expired') && (
                        <Button size="sm" aria-label={`Extend ${t.title}`} onClick={() => setExtendingId(t.id)}>
                          Extend
                        </Button>
                      )}
                      {status !== 'archived' ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Archive ${t.title}`}
                          loading={busyId === t.id}
                          onClick={() => run(t.id, () => update(t.id, { status: 'archived' }), 'Timetable archived.')}
                        >
                          Archive
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Restore ${t.title}`}
                            loading={busyId === t.id}
                            onClick={() => run(t.id, () => update(t.id, { status: 'active' }), 'Timetable restored.')}
                          >
                            Restore
                          </Button>
                          <Button size="sm" variant="ghost" aria-label={`Delete ${t.title}`} onClick={() => setDeletingId(t.id)}>
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                    {deletingId === t.id && (
                      <div
                        role="alertdialog"
                        aria-label={`Delete ${t.title}`}
                        className="flex flex-wrap items-center gap-2 border-t border-[var(--acade-danger)]/25 bg-[var(--acade-danger-dim)] px-5 py-3 text-sm font-medium text-[var(--acade-text)] sm:px-6"
                      >
                        <span className="mr-auto">Delete this timetable for good?</span>
                        <Button size="sm" variant="danger" onClick={() => run(t.id, async () => { await remove(t.id); setDeletingId(null); }, 'Timetable deleted.')}>
                          Yes, delete
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setDeletingId(null)}>
                          Keep it
                        </Button>
                      </div>
                    )}
                    {extendingId === t.id && (
                      <div className="border-t border-[var(--acade-border-subtle)] p-3 sm:p-4">
                        <ExtendPanel
                          timetable={t as Timetable}
                          saving={busyId === t.id}
                          onCancel={() => setExtendingId(null)}
                          onConfirm={(validity) =>
                            run(t.id, async () => { await update(t.id, { validity, status: 'active' }); setExtendingId(null); }, 'Timetable extended.')
                          }
                        />
                      </div>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
      )}
      <p className="text-sm text-[var(--acade-text-muted)]">
        <Link href="/dashboard" className="font-medium underline decoration-[var(--acade-border)] underline-offset-4 hover:text-[var(--acade-primary)]">
          Back to dashboard
        </Link>
      </p>
    </div>
  );
}
