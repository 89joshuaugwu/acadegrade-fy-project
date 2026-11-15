'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Download, Pencil, Plus, Trash2 } from 'lucide-react';
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
    return <div aria-busy="true" aria-label="Loading timetable" className="skeleton h-64 w-full max-w-4xl" />;
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
      <Card className="max-w-xl text-center">
        <h1 className="font-[family-name:var(--font-bricolage)] text-xl font-semibold text-[var(--acade-text)]">Timetable not found</h1>
        <p className="mt-2 text-sm text-[var(--acade-text-muted)]">It may have been deleted.</p>
        <Link href="/timetable" className="mt-4 inline-flex min-h-12 items-center text-sm font-semibold text-[var(--acade-primary)]">Back to timetables</Link>
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
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link href="/timetable" className="inline-flex min-h-12 items-center gap-1 text-sm font-semibold text-[var(--acade-primary)]">
            <ArrowLeft className="size-4" aria-hidden="true" /> Timetables
          </Link>
          <h1 className="break-words font-[family-name:var(--font-bricolage)] text-[clamp(1.5rem,3vw,2.1rem)] font-semibold leading-tight text-[var(--acade-text)]">
            {timetable.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusChip status={status} />
            {timetable.builtWith === 'academind' && <BuiltWithTag />}
            <span className="text-sm text-[var(--acade-text-muted)]">{describeValidity(timetable)}</span>
          </div>
          <p className="mt-1 text-sm text-[var(--acade-text-muted)]">Default reminders: {describeOffsets(timetable.reminders.defaultOffsetsMin)}</p>
        </div>
        <HelpButton entryId="student.timetable" source={studentHelpSource} className="self-start" />
      </header>

      <PageNotice>Reminders work in the Android app. Download the calendar file (.ics) to get alerts from your own calendar app.</PageNotice>
      {status === 'archived' && <PageNotice tone="warning">This timetable is archived and does not show in your week. Restore it from the timetable list.</PageNotice>}
      {(status === 'ending_soon' || status === 'expired') && (
        <PageNotice tone="warning">
          {status === 'expired' ? 'This timetable has expired.' : 'This timetable ends soon.'} Extend it to keep your weekly events going.
        </PageNotice>
      )}

      <div className="flex flex-wrap gap-2">
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
            Archive
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

      <section aria-label="All events">
        <h2 className="mb-3 font-[family-name:var(--font-bricolage)] text-lg font-semibold text-[var(--acade-text)]">
          All events ({timetable.events.length})
        </h2>
        {sortedEvents.length === 0 ? (
          <Card className="text-center text-sm text-[var(--acade-text-muted)]">No events yet. Add the first one.</Card>
        ) : (
          <ul className="grid gap-2">
            {sortedEvents.map((e) => (
              <li key={e.id}>
                <Card padding="sm" className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[var(--acade-text)]">{e.title}</p>
                    <p className="text-sm text-[var(--acade-text-muted)]">
                      {describeRecurrence(e)}, {e.startTime} to {e.endTime}
                      {e.venue ? `, ${e.venue}` : ''}
                    </p>
                    <p className="text-xs text-[var(--acade-text-faint)]">
                      {e.type}{e.courseCode ? `, ${e.courseCode}` : ''}
                      {Array.isArray(e.reminderOffsetsMin) ? `, ${describeOffsets(e.reminderOffsetsMin)}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" aria-label={`Edit ${e.title}`} onClick={() => setPanel({ event: e })}>
                      <Pencil className="size-4" aria-hidden="true" />
                    </Button>
                    <Button size="sm" variant="ghost" aria-label={`Delete ${e.title}`} onClick={() => setDeleteId(e.id)}>
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                  {deleteId === e.id && (
                    <div role="alertdialog" aria-label={`Delete ${e.title}`} className="flex w-full flex-wrap items-center gap-2 text-sm text-[var(--acade-text)]">
                      <span>Delete this event?</span>
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
                </Card>
              </li>
            ))}
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
    <Card>
      <form onSubmit={submit} aria-label="Edit timetable details" className="grid gap-4" noValidate>
        <h2 className="font-[family-name:var(--font-bricolage)] text-lg font-semibold text-[var(--acade-text)]">Edit details</h2>
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
