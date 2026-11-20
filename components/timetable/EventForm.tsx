'use client';

import { useState } from 'react';
import { Button, Card, Input, Textarea } from '@/components/ui';
import { DateField, TimeField } from '@/components/ui/DateTimeFields';
import { CheckRow, ChoicePills, DayPicker, ReminderOffsetsField } from './fields';
import { EVENT_TYPE_LABEL } from './status';
import { validateEvent, EVENT_TYPES } from '@/lib/timetable/validate';
import { localToday, newId } from '@/lib/timetable/format';
import type { EventType, TimetableEvent } from '@/lib/timetable/engine';

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
    <Card className="border-[var(--acade-primary)]/30">
      <form onSubmit={submit} aria-label={event ? 'Edit event' : 'Add event'} className="grid gap-6" noValidate>
        <div>
          <h2 className="app-display text-[1.25rem] font-semibold text-[var(--acade-text)]">{event ? 'Edit event' : 'Add an event'}</h2>
          <p className="mt-1 text-sm text-[var(--acade-text-muted)]">Weekly events repeat until the timetable ends.</p>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
          <Input label="Event title" value={title} maxLength={80} error={errors.title} onChange={(e) => setTitle(e.target.value)} />
          <Input label="Course code (optional)" value={courseCode} maxLength={12} error={errors.courseCode} onChange={(e) => setCourseCode(e.target.value)} />
          <div className="sm:col-span-2">
            <Input label="Venue (optional)" value={venue} maxLength={80} error={errors.venue} onChange={(e) => setVenue(e.target.value)} />
          </div>
        </div>

        <ChoicePills<EventType>
          legend="Event type"
          value={type}
          onChange={setType}
          options={EVENT_TYPES.map((t) => ({ value: t, label: EVENT_TYPE_LABEL[t] }))}
        />

        <div className="grid gap-4 rounded-2xl bg-[var(--acade-void)] p-4 sm:p-5">
          <ChoicePills<'weekly' | 'once'>
            legend="Repeats"
            value={repeat}
            onChange={setRepeat}
            stretch
            options={[
              { value: 'weekly', label: 'Every week on chosen days' },
              { value: 'once', label: 'One date only' },
            ]}
          />
          {repeat === 'weekly' ? (
            <DayPicker legend="Days" days={days} onChange={setDays} error={errors.recurrence} />
          ) : (
            <DateField label="Date" value={date} error={errors.recurrence} onChange={setDate} />
          )}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <TimeField label="Start time" value={startTime} error={errors.startTime} onChange={setStartTime} />
            <TimeField label="End time" value={endTime} error={errors.endTime} onChange={setEndTime} />
          </div>
        </div>

        <Textarea label="Notes (optional)" value={notes} maxLength={200} error={errors.notes} className="min-h-24" onChange={(e) => setNotes(e.target.value)} />

        <div className="grid gap-3 border-t border-[var(--acade-border-subtle)] pt-5">
          <CheckRow label="Use different reminders for this event" checked={ownReminders} onChange={setOwnReminders} />
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
