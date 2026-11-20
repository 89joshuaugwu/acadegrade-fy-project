'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Archive, ChevronLeft, Download, Pencil, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button, Card, Input } from '@/components/ui';
import { HelpButton } from '@/components/help/HelpDrawer';
import { studentHelpSource } from '@/lib/help/student-help';
import { useTimetables } from '@/hooks/useTimetables';
import { TimetableGate, StatusChip, BuiltWithTag } from '@/components/timetable/TimetableGate';
import { ExtendPanel } from '@/components/timetable/ExtendPanel';
import { EventForm } from '@/components/timetable/EventForm';
import { WeekView } from '@/components/timetable/WeekView';
import { PageNotice, ReminderOffsetsField, ValidityFields } from '@/components/timetable/fields';
import { EVENT_TYPE_COLOUR, EVENT_TYPE_LABEL } from '@/components/timetable/status';
import { downloadTimetableIcs } from '@/lib/timetable/download';
import { describeOffsets, describeRecurrence, describeValidity, displayStatus, localNowISO, localToday } from '@/lib/timetable/format';
import { TIMETABLE_LIMITS, validateTimetable, validateTimetableMeta } from '@/lib/timetable/validate';
import type { Timetable, TimetableEvent, ValidityUnit } from '@/lib/timetable/engine';

export default function TimetableDetailPage() {
  return (
    <TimetableGate>
      <TimetableDetail />
    </TimetableGate>
  );
}

type Panel = null | 'details' | 'extend' | { event: TimetableEvent | 'new' };

const backLink =
  'inline-flex min-h-11 items-center gap-1 rounded-[var(--radius-control)] pr-2 text-sm font-semibold text-[var(--acade-primary)] hover:text-[var(--acade-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]';

function TimetableDetail() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { timetables, loading, error, retry, update } = useTimetables();
  const timetable = timetables.find((t) => t.id === id);
  const [panel, setPanel] = useState<Panel>(null);
  const [weekOf, setWeekOf] = useState(localToday());
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const sortedEvents = useMemo(
    () => [...(timetable?.events ?? [])].sort((a, b) => a.startTime.localeCompare(b.startTime) || a.title.localeCompare(b.title)),
    [timetable?.events],
  );

  if (loading) {
    return (
      <div aria-busy="true" aria-label="Loading timetable" className="grid w-full max-w-5xl gap-4">
        <div className="skeleton h-24 rounded-[var(--radius-surface)]" />
        <div className="skeleton h-64 rounded-[var(--radius-surface)]" />
      </div>
    );
  }
  if (error) {
    return (
      <Card role="alert" className="max-w-xl text-center">
        <p className="text-sm text-[var(--acade-text-muted)]">This timetable could not load. Your saved timetables have not changed.</p>
        <Button className="mt-4" variant="outline" onClick={retry}>Try again</Button>
      </Card>
    );
  }
  if (!timetable) {
    return (
      <Card className="max-w-xl text-center" padding="lg">
        <h1 className="app-display text-[1.5rem] font-bold text-[var(--acade-text)]">Timetable not found</h1>
        <p className="mt-2 text-sm text-[var(--acade-text-muted)]">It may have been deleted.</p>
        <Link href="/timetable" className={`${backLink} mt-4`}>
          <ChevronLeft className="size-4" aria-hidden="true" /> Back to timetables
        </Link>
      </Card>
    );
  }

  const status = displayStatus(timetable, localNowISO());

  async function save(patch: Partial<Timetable>, done: string): Promise<boolean> {
    if (!timetable) return false;
    const next = { ...timetable, ...patch } as Timetable;
    const check = validateTimetable(next);
    if (!check.ok) {
      toast.error(Object.values(check.errors)[0] ?? 'Please check the details.');
      return false;
    }
    setSaving(true);
    try {
      await update(timetable.id, patch);
      toast.success(done);
      return true;
    } catch (e) {
      console.error('Timetable update failed', e);
      toast.error('That did not save. Check your connection and try again.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveEvent(event: TimetableEvent) {
    if (!timetable) return;
    const exists = timetable.events.some((e) => e.id === event.id);
    if (!exists && timetable.events.length >= TIMETABLE_LIMITS.maxEvents) {
      toast.error(`A timetable holds at most ${TIMETABLE_LIMITS.maxEvents} events.`);
      return;
    }
    const events = exists ? timetable.events.map((e) => (e.id === event.id ? event : e)) : [...timetable.events, event];
    if (await save({ events }, exists ? 'Event updated.' : 'Event added.')) setPanel(null);
  }

  function openEvent(eventId: string) {
    const event = timetable?.events.find((e) => e.id === eventId);
    if (event) setPanel({ event });
  }

  return (
    <div className="flex w-full min-w-0 max-w-5xl flex-col gap-6 pb-10">
      <header className="flex flex-col gap-1">
        <Link href="/timetable" className={`${backLink} self-start`}>
          <ChevronLeft className="size-4" aria-hidden="true" /> Timetables
        </Link>
        <div className="flex items-start justify-between gap-3">
          <h1 className="app-display min-w-0 break-words text-[clamp(1.75rem,3.2vw,2.25rem)] font-bold leading-tight text-[var(--acade-text)]">
            {timetable.title}
          </h1>
          <HelpButton entryId="student.timetable" source={studentHelpSource} className="shrink-0" />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusChip status={status} />
          {timetable.builtWith === 'academind' && <BuiltWithTag />}
          <span className="text-sm tabular-nums text-[var(--acade-text-muted)]">{describeValidity(timetable)}</span>
        </div>
        <p className="mt-1 text-sm text-[var(--acade-text-muted)]">Default reminders: {describeOffsets(timetable.reminders.defaultOffsetsMin)}</p>
      </header>

      <PageNotice>Reminders work in the Android app. Download the calendar file (.ics) to get alerts from your own calendar app.</PageNotice>
      {status === 'archived' && <PageNotice tone="warning">This timetable is archived and does not show in your week. Restore it from the timetable list.</PageNotice>}
      {(status === 'ending_soon' || status === 'expired') && (
        <PageNotice tone="warning">
          {status === 'expired' ? 'This timetable has expired.' : 'This timetable ends soon.'} Extend it to keep your weekly events going.
        </PageNotice>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setPanel({ event: 'new' })}>
          <Plus className="size-4" aria-hidden="true" /> Add event
        </Button>
        <Button variant="outline" onClick={() => setPanel('details')}>
          <Pencil className="size-4" aria-hidden="true" /> Edit details
        </Button>
        {(status === 'ending_soon' || status === 'expired') && (
          <Button variant="outline" onClick={() => setPanel('extend')}>Extend</Button>
        )}
        <Button
          variant="outline"
          onClick={() => {
            const name = downloadTimetableIcs(timetable);
            toast.success(`Downloaded ${name}`);
          }}
        >
          <Download className="size-4" aria-hidden="true" /> Download calendar (.ics)
        </Button>
        {status !== 'archived' && (
          <Button variant="ghost" loading={saving} onClick={() => save({ status: 'archived' }, 'Timetable archived.')}>
            <Archive className="size-4" aria-hidden="true" /> Archive
          </Button>
        )}
      </div>

      {panel === 'details' && (
        <DetailsPanel timetable={timetable} saving={saving} onCancel={() => setPanel(null)} onSave={async (patch) => { if (await save(patch, 'Details saved.')) setPanel(null); }} />
      )}
      {panel === 'extend' && (
        <ExtendPanel
          timetable={timetable}
          saving={saving}
          onCancel={() => setPanel(null)}
          onConfirm={async (validity) => { if (await save({ validity, status: 'active' }, 'Timetable extended.')) setPanel(null); }}
        />
      )}
      {panel && typeof panel === 'object' && (
        <EventForm
          key={panel.event === 'new' ? 'new' : panel.event.id}
          event={panel.event === 'new' ? undefined : panel.event}
          defaultOffsets={timetable.reminders.defaultOffsetsMin}
          onSave={saveEvent}
          onCancel={() => setPanel(null)}
        />
      )}

      <WeekView timetable={timetable} weekOf={weekOf} onWeekChange={setWeekOf} onOpenEvent={openEvent} />

      <section aria-label="All events" className="min-w-0">
        <h2 className="app-display mb-3 text-[1.25rem] font-semibold text-[var(--acade-text)]">
          All events <span className="app-num text-[var(--acade-text-faint)]">({timetable.events.length})</span>
        </h2>
        {sortedEvents.length === 0 ? (
          <Card className="text-center text-sm text-[var(--acade-text-muted)]">No events yet. Add the first one.</Card>
        ) : (
          <ul className="grid gap-2">
            {sortedEvents.map((e) => {
              const colour = EVENT_TYPE_COLOUR[e.type] ?? EVENT_TYPE_COLOUR.other;
              return (
                <li key={e.id} className="min-w-0 rounded-2xl border border-[var(--acade-border)] bg-[var(--acade-surface)]">
                  <div className="flex items-start gap-3 p-3 sm:gap-4 sm:p-4">
                    <div className="w-14 shrink-0 border-r border-[var(--acade-border-subtle)] pr-3 sm:w-16">
                      <p className="text-sm font-semibold tabular-nums text-[var(--acade-text)]">{e.startTime}</p>
                      <p className="text-[0.8125rem] tabular-nums text-[var(--acade-text-faint)]">{e.endTime}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-[var(--acade-text)]">{e.title}</p>
                      <p className="mt-0.5 text-sm text-[var(--acade-text-muted)]">
                        {describeRecurrence(e)}, {e.startTime} to {e.endTime}
                        {e.venue ? `, ${e.venue}` : ''}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem] text-[var(--acade-text-muted)]">
                        <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: colour }}>
                          <span aria-hidden="true" className="size-2 rounded-full" style={{ background: colour }} />
                          {EVENT_TYPE_LABEL[e.type] ?? e.type}
                        </span>
                        {e.courseCode ? <span>{e.courseCode}</span> : null}
                        {Array.isArray(e.reminderOffsetsMin) ? <span>{describeOffsets(e.reminderOffsetsMin)}</span> : null}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button size="sm" variant="ghost" className="w-11 px-0" aria-label={`Edit ${e.title}`} onClick={() => setPanel({ event: e })}>
                        <Pencil className="size-4" aria-hidden="true" />
                      </Button>
                      <Button size="sm" variant="ghost" className="w-11 px-0" aria-label={`Delete ${e.title}`} onClick={() => setDeleteId(e.id)}>
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                  {deleteId === e.id && (
                    <div
                      role="alertdialog"
                      aria-label={`Delete ${e.title}`}
                      className="flex flex-wrap items-center gap-2 rounded-b-2xl border-t border-[var(--acade-danger)]/25 bg-[var(--acade-danger-dim)] px-4 py-3 text-sm font-medium text-[var(--acade-text)]"
                    >
                      <span className="mr-auto">Delete this event?</span>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={async () => {
                          if (await save({ events: timetable.events.filter((x) => x.id !== e.id) }, 'Event deleted.')) setDeleteId(null);
                        }}
                      >
                        Yes, delete
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleteId(null)}>Keep it</Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function DetailsPanel({
  timetable,
  saving,
  onSave,
  onCancel,
}: {
  timetable: Timetable;
  saving: boolean;
  onSave: (patch: Partial<Timetable>) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(timetable.title);
  const [startsOn, setStartsOn] = useState(timetable.validity.startsOn);
  const [unit, setUnit] = useState<ValidityUnit>(timetable.validity.unit);
  const [amount, setAmount] = useState(timetable.validity.amount);
  const [offsets, setOffsets] = useState(timetable.reminders.defaultOffsetsMin);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const result = validateTimetableMeta({ title, kind: timetable.kind, startsOn, unit, amount, defaultOffsetsMin: offsets });
    if (!result.ok || !result.value) {
      setErrors(result.errors);
      return;
    }
    // Keep an extended end date unless the student changed the validity fields.
    const unchanged = startsOn === timetable.validity.startsOn && unit === timetable.validity.unit && amount === timetable.validity.amount;
    onSave({
      title: result.value.title,
      validity: unchanged ? timetable.validity : result.value.validity,
      reminders: result.value.reminders,
    });
  }

  return (
    <Card className="border-[var(--acade-primary)]/30">
      <form onSubmit={submit} aria-label="Edit timetable details" className="grid gap-5" noValidate>
        <h2 className="app-display text-[1.25rem] font-semibold text-[var(--acade-text)]">Edit details</h2>
        <Input label="Title" value={title} maxLength={60} error={errors.title} onChange={(e) => setTitle(e.target.value)} />
        <ValidityFields
          startsOn={startsOn}
          unit={unit}
          amount={amount}
          errors={errors}
          onChange={(n) => {
            setStartsOn(n.startsOn);
            setUnit(n.unit);
            setAmount(n.amount);
          }}
        />
        <ReminderOffsetsField label="Default reminders (Android app)" value={offsets} onChange={setOffsets} />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={saving} loadingLabel="Saving">Save details</Button>
          <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
}
