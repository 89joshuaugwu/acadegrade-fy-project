import { describe, expect, it } from 'vitest';
import {
  TIMETABLE_LIMITS,
  canAddTimetable,
  validateEvent,
  validateTimetable,
  validateTimetableMeta,
} from '@/lib/timetable/validate';
import { validityEnd, type Timetable, type TimetableEvent } from '@/lib/timetable/engine';

const meta = {
  title: 'Semester lectures',
  kind: 'fixed',
  startsOn: '2026-11-16',
  unit: 'weeks',
  amount: 12,
  defaultOffsetsMin: [10],
};

const event: TimetableEvent = {
  id: 'e1',
  title: 'MTH 101',
  type: 'lecture',
  recurrence: { kind: 'weekly', days: [1, 3] },
  startTime: '09:00',
  endTime: '10:00',
};

describe('validateTimetableMeta', () => {
  it('accepts a valid timetable and derives validity and offsets', () => {
    const result = validateTimetableMeta(meta);
    expect(result.ok).toBe(true);
    expect(result.value?.validity).toEqual({
      startsOn: '2026-11-16',
      unit: 'weeks',
      amount: 12,
      endsAt: validityEnd('2026-11-16', 'weeks', 12),
    });
    expect(result.value?.reminders.defaultOffsetsMin).toEqual([10]);
  });

  it('normalises offsets (max 3, descending, 1..1440)', () => {
    const result = validateTimetableMeta({ ...meta, defaultOffsetsMin: [5, 60, 5, 30, 15, 9999] });
    expect(result.value?.reminders.defaultOffsetsMin).toEqual([60, 30, 15]);
  });

  it('rejects empty and over-long titles, bad kind, unit, amount and date', () => {
    expect(validateTimetableMeta({ ...meta, title: '   ' }).errors.title).toBeTruthy();
    expect(validateTimetableMeta({ ...meta, title: 'x'.repeat(TIMETABLE_LIMITS.title + 1) }).errors.title).toBeTruthy();
    expect(validateTimetableMeta({ ...meta, kind: 'nope' }).errors.kind).toBeTruthy();
    expect(validateTimetableMeta({ ...meta, unit: 'years' }).errors.unit).toBeTruthy();
    expect(validateTimetableMeta({ ...meta, amount: 0 }).errors.amount).toBeTruthy();
    expect(validateTimetableMeta({ ...meta, amount: 53 }).errors.amount).toBeTruthy();
    expect(validateTimetableMeta({ ...meta, amount: 1.5 }).errors.amount).toBeTruthy();
    expect(validateTimetableMeta({ ...meta, startsOn: '16/11/2026' }).errors.startsOn).toBeTruthy();
    expect(validateTimetableMeta({ ...meta, startsOn: '2026-02-31' }).errors.startsOn).toBeTruthy();
  });
});

describe('validateEvent', () => {
  it('accepts a weekly event and trims text', () => {
    const result = validateEvent({ ...event, title: '  MTH 101  ', venue: ' Hall A ', courseCode: '' });
    expect(result.ok).toBe(true);
    expect(result.value?.title).toBe('MTH 101');
    expect(result.value?.venue).toBe('Hall A');
    expect('courseCode' in (result.value ?? {})).toBe(false);
  });

  it('accepts a once event', () => {
    const result = validateEvent({ ...event, recurrence: { kind: 'once', date: '2026-12-01' } });
    expect(result.ok).toBe(true);
  });

  it('rejects bad times, end before start, and bad recurrence', () => {
    expect(validateEvent({ ...event, startTime: '9am' }).errors.startTime).toBeTruthy();
    expect(validateEvent({ ...event, endTime: '24:30' }).errors.endTime).toBeTruthy();
    expect(validateEvent({ ...event, startTime: '10:00', endTime: '09:00' }).errors.endTime).toBeTruthy();
    expect(validateEvent({ ...event, recurrence: { kind: 'weekly', days: [] } }).errors.recurrence).toBeTruthy();
    expect(validateEvent({ ...event, recurrence: { kind: 'weekly', days: [7] } }).errors.recurrence).toBeTruthy();
    expect(validateEvent({ ...event, recurrence: { kind: 'once', date: 'soon' } }).errors.recurrence).toBeTruthy();
  });

  it('enforces length limits and the type list', () => {
    expect(validateEvent({ ...event, title: '' }).errors.title).toBeTruthy();
    expect(validateEvent({ ...event, title: 'x'.repeat(81) }).errors.title).toBeTruthy();
    expect(validateEvent({ ...event, courseCode: 'x'.repeat(13) }).errors.courseCode).toBeTruthy();
    expect(validateEvent({ ...event, venue: 'x'.repeat(81) }).errors.venue).toBeTruthy();
    expect(validateEvent({ ...event, notes: 'x'.repeat(201) }).errors.notes).toBeTruthy();
    expect(validateEvent({ ...event, type: 'party' as never }).errors.type).toBeTruthy();
  });

  it('normalises per-event offsets and keeps an explicit empty override', () => {
    expect(validateEvent({ ...event, reminderOffsetsMin: [5, 30, 5] }).value?.reminderOffsetsMin).toEqual([30, 5]);
    expect(validateEvent({ ...event, reminderOffsetsMin: [] }).value?.reminderOffsetsMin).toEqual([]);
  });
});

describe('validateTimetable and limits', () => {
  const timetable: Timetable = {
    title: 'T',
    kind: 'fixed',
    validity: { startsOn: '2026-11-16', unit: 'weeks', amount: 4, endsAt: validityEnd('2026-11-16', 'weeks', 4) },
    reminders: { defaultOffsetsMin: [10] },
    status: 'active',
    events: [event],
  };

  it('accepts a good document', () => {
    expect(validateTimetable(timetable).ok).toBe(true);
  });

  it('rejects more than 300 events and duplicate event ids', () => {
    const many = Array.from({ length: 301 }, (_, i) => ({ ...event, id: `e${i}` }));
    expect(validateTimetable({ ...timetable, events: many }).errors.events).toBeTruthy();
    expect(validateTimetable({ ...timetable, events: [event, event] }).errors.events).toBeTruthy();
  });

  it('reports an invalid event inside the document', () => {
    expect(validateTimetable({ ...timetable, events: [{ ...event, startTime: 'x' }] }).ok).toBe(false);
  });

  it('caps timetables at 10 per user', () => {
    expect(canAddTimetable(9)).toBe(true);
    expect(canAddTimetable(10)).toBe(false);
  });
});
