'use client';

import { useState } from 'react';
import { Button, Card, Input, Textarea } from '@/components/ui';
import { NativeSelect, ReminderOffsetsField } from './fields';
import { validateEvent, EVENT_TYPES } from '@/lib/timetable/validate';
import { DAY_SHORT, WEEK_ORDER, localToday, newId } from '@/lib/timetable/format';
import type { EventType, TimetableEvent } from '@/lib/timetable/engine';
import { cn } from '@/lib/utils/cn';

const TYPE_LABEL: Record<EventType, string> = {
  lecture: 'Lecture',
  class: 'Class',
  exam: 'Exam',
  study: 'Study session',
  other: 'Other',
};

/** Add or edit one event. Calls onSave with a validated event. */
export function EventForm({
  event,
  defaultOffsets,
  defaultDate,
  onSave,
  onCancel,
}: {
  event?: TimetableEvent;
  defaultOffsets: number[];
  defaultDate?: string;
  onSave: (event: TimetableEvent) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(event?.title ?? '');
  const [type, setType] = useState<EventType>(event?.type ?? 'lecture');
  const [courseCode, setCourseCode] = useState(event?.courseCode ?? '');
  const [venue, setVenue] = useState(event?.venue ?? '');
  const [notes, setNotes] = useState(event?.notes ?? '');
  const [repeat, setRepeat] = useState<'weekly' | 'once'>(event?.recurrence.kind ?? 'weekly');
  const [days, setDays] = useState<number[]>(event?.recurrence.kind === 'weekly' ? event.recurrence.days : [1]);
  const [date, setDate] = useState(event?.recurrence.kind === 'once' ? event.recurrence.date : defaultDate ?? localToday());
  const [startTime, setStartTime] = useState(event?.startTime ?? '09:00');
  const [endTime, setEndTime] = useState(event?.endTime ?? '10:00');
  const [ownReminders, setOwnReminders] = useState(Array.isArray(event?.reminderOffsetsMin));
  const [offsets, setOffsets] = useState<number[]>(event?.reminderOffsetsMin?.length ? event.reminderOffsetsMin : defaultOffsets);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const candidate: TimetableEvent = {
      id: event?.id ?? newId('ev'),
      title,
      type,
      courseCode,
      venue,
      notes,
      recurrence: repeat === 'once' ? { kind: 'once', date } : { kind: 'weekly', days },
      startTime,
      endTime,
      ...(ownReminders ? { reminderOffsetsMin: offsets } : {}),
    };
    const result = validateEvent(candidate);
    if (!result.ok || !result.value) {
      setErrors(result.errors);
      return;
    }
    onSave(result.value);
  };

  return (
    <Card>
      <form onSubmit={submit} aria-label={event ? 'Edit event' : 'Add event'} className="grid gap-4" noValidate>
        <h2 className="font-[family-name:var(--font-bricolage)] text-lg font-semibold text-[var(--acade-text)]">
          {event ? 'Edit event' : 'Add an event'}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Event title" value={title} maxLength={80} error={errors.title} onChange={(e) => setTitle(e.target.value)} />
          <NativeSelect
            label="Event type"
            value={type}
            onChange={(v) => setType(v as EventType)}
            options={EVENT_TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t] }))}
          />
          <Input label="Course code (optional)" value={courseCode} maxLength={12} error={errors.courseCode} onChange={(e) => setCourseCode(e.target.value)} />
          <Input label="Venue (optional)" value={venue} maxLength={80} error={errors.venue} onChange={(e) => setVenue(e.target.value)} />
        </div>

        <NativeSelect
          label="Repeats"
          value={repeat}
          onChange={(v) => setRepeat(v as 'weekly' | 'once')}
          options={[
            { value: 'weekly', label: 'Every week on chosen days' },
            { value: 'once', label: 'One date only' },
          ]}
        />
        {repeat === 'weekly' ? (
          <fieldset>
            <legend className="text-sm font-medium text-[var(--acade-text-muted)]">Days</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {WEEK_ORDER.map((d) => {
                const on = days.includes(d);
                return (
                  <label
                    key={d}
                    className={cn(
                      'inline-flex min-h-12 min-w-12 cursor-pointer items-center justify-center rounded-[var(--radius-control)] border px-3 text-sm font-semibold',
                      on
                        ? 'border-[var(--acade-primary)] bg-[var(--acade-primary-dim)] text-[var(--acade-primary)]'
                        : 'border-[var(--acade-border)] text-[var(--acade-text-muted)]',
                    )}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={on}
                      aria-label={DAY_SHORT[d]}
                      onChange={() => setDays(on ? days.filter((x) => x !== d) : [...days, d])}
                    />
                    {DAY_SHORT[d]}
                  </label>
                );
              })}
            </div>
            {errors.recurrence && <p role="alert" className="mt-1 text-xs text-[var(--acade-danger)]">{errors.recurrence}</p>}
          </fieldset>
        ) : (
          <Input label="Date" type="date" value={date} error={errors.recurrence} onChange={(e) => setDate(e.target.value)} />
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Start time" type="time" value={startTime} error={errors.startTime} onChange={(e) => setStartTime(e.target.value)} />
          <Input label="End time" type="time" value={endTime} error={errors.endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>

        <Textarea label="Notes (optional)" value={notes} maxLength={200} error={errors.notes} className="min-h-24" onChange={(e) => setNotes(e.target.value)} />

        <div className="grid gap-3">
          <label className="inline-flex min-h-12 items-center gap-3 text-sm font-medium text-[var(--acade-text)]">
            <input type="checkbox" className="size-5" checked={ownReminders} onChange={(e) => setOwnReminders(e.target.checked)} />
            Use different reminders for this event
          </label>
          {ownReminders && <ReminderOffsetsField label="Reminders for this event" value={offsets} onChange={setOffsets} />}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit">Save event</Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
