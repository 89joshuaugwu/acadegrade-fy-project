'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Plus, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button, Card, LinkButton } from '@/components/ui';
import { HelpButton } from '@/components/help/HelpDrawer';
import { studentHelpSource } from '@/lib/help/student-help';
import { useTimetables } from '@/hooks/useTimetables';
import { TimetableGate, StatusChip, BuiltWithTag } from '@/components/timetable/TimetableGate';
import { ExtendPanel } from '@/components/timetable/ExtendPanel';
import { PageNotice } from '@/components/timetable/fields';
import { describeValidity, displayStatus, localNowISO } from '@/lib/timetable/format';
import { TIMETABLE_LIMITS, canAddTimetable } from '@/lib/timetable/validate';
import type { Timetable } from '@/lib/timetable/engine';

const KIND_LABEL = { fixed: 'Fixed', reading: 'Reading', custom: 'Custom' } as const;

export default function TimetablesPage() {
  return (
    <TimetableGate>
      <TimetablesList />
    </TimetableGate>
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
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <h1 className="font-[family-name:var(--font-bricolage)] text-[clamp(1.6rem,3.4vw,2.25rem)] font-semibold leading-tight tracking-[-0.03em] text-[var(--acade-text)]">
            Timetables
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--acade-text-muted)]">
            Keep your lectures, exams and reading plans in one place.
          </p>
        </div>
        <HelpButton entryId="student.timetable" source={studentHelpSource} className="self-start" />
      </header>

      <PageNotice>
        Reminders are an Android app feature: the app can alert you before each event. On the website you can download a
        calendar file (.ics) and let your calendar app do the reminding.
      </PageNotice>

      <div className="flex flex-wrap gap-2">
        <LinkButton href="/timetable/new" className={atLimit ? 'pointer-events-none opacity-50' : ''} aria-disabled={atLimit}>
          <Plus className="size-4" aria-hidden="true" /> New timetable
        </LinkButton>
        <LinkButton href="/timetable/build" variant="outline" className={atLimit ? 'pointer-events-none opacity-50' : ''} aria-disabled={atLimit}>
          <Sparkles className="size-4" aria-hidden="true" /> Build with AcadeMind
        </LinkButton>
      </div>
      {atLimit && (
        <PageNotice tone="warning">
          You have {TIMETABLE_LIMITS.maxTimetables} timetables, which is the most you can keep. Delete an archived one to make room.
        </PageNotice>
      )}

      {loading ? (
        <div aria-busy="true" aria-label="Loading timetables" className="grid gap-3">
          <div className="skeleton h-28" />
          <div className="skeleton h-28" />
        </div>
      ) : error ? (
        <Card role="alert" className="text-center">
          <p className="text-sm text-[var(--acade-text-muted)]">Your timetables could not load. Your saved timetables have not changed.</p>
          <Button className="mt-4" variant="outline" onClick={retry}>
            Try again
          </Button>
        </Card>
      ) : rows.length === 0 ? (
        <Card className="text-center">
          <CalendarDays className="mx-auto size-8 text-[var(--acade-primary)]" aria-hidden="true" />
          <h2 className="mt-3 font-[family-name:var(--font-bricolage)] text-lg font-semibold text-[var(--acade-text)]">No timetables yet</h2>
          <p className="mt-1 text-sm text-[var(--acade-text-muted)]">Create one for your lectures, or build a reading plan around them.</p>
        </Card>
      ) : (
        <ul className="grid gap-3" aria-label="Your timetables">
          {rows.map(({ t, status }) => (
            <li key={t.id}>
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-[family-name:var(--font-bricolage)] text-lg font-semibold text-[var(--acade-text)]">{t.title}</h2>
                    <p className="mt-1 text-sm text-[var(--acade-text-muted)]">
                      {KIND_LABEL[t.kind]} timetable, {t.events.length} event{t.events.length === 1 ? '' : 's'}
                    </p>
                    <p className="text-sm text-[var(--acade-text-muted)]">{describeValidity(t)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {t.builtWith === 'academind' && <BuiltWithTag />}
                    <StatusChip status={status} />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
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
                  <div role="alertdialog" aria-label={`Delete ${t.title}`} className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[var(--acade-text)]">
                    <span>Delete this timetable for good?</span>
                    <Button size="sm" variant="danger" onClick={() => run(t.id, async () => { await remove(t.id); setDeletingId(null); }, 'Timetable deleted.')}>
                      Yes, delete
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeletingId(null)}>
                      Keep it
                    </Button>
                  </div>
                )}
                {extendingId === t.id && (
                  <div className="mt-4">
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
          ))}
        </ul>
      )}
      <p className="text-xs text-[var(--acade-text-faint)]">
        <Link href="/dashboard" className="underline">Back to dashboard</Link>
      </p>
    </div>
  );
}
