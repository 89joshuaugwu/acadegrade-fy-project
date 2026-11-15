import {
  normaliseOffsets,
  validityEnd,
  type EventType,
  type Timetable,
  type TimetableEvent,
  type TimetableKind,
  type ValidityUnit,
} from './engine';

export const TIMETABLE_LIMITS = {
  maxTimetables: 10,
  maxEvents: 300,
  title: 60,
  eventTitle: 80,
  courseCode: 12,
  venue: 80,
  notes: 200,
  maxAmount: 52,
} as const;

export const KINDS: TimetableKind[] = ['fixed', 'reading', 'custom'];
export const UNITS: ValidityUnit[] = ['hours', 'days', 'weeks', 'months'];
export const EVENT_TYPES: EventType[] = ['lecture', 'class', 'exam', 'study', 'other'];

export interface ValidationResult<T> {
  ok: boolean;
  errors: Record<string, string>;
  value?: T;
}

export interface TimetableMetaInput {
  title: string;
  kind: string;
  startsOn: string;
  unit: string;
  amount: number;
  defaultOffsetsMin: number[];
}

export interface TimetableMeta {
  title: string;
  kind: TimetableKind;
  validity: Timetable['validity'];
  reminders: Timetable['reminders'];
}

export function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

function hm(value: unknown): number {
  if (typeof value !== 'string') return Number.NaN;
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  return m ? +m[1] * 60 + +m[2] : Number.NaN;
}

export function canAddTimetable(currentCount: number): boolean {
  return currentCount < TIMETABLE_LIMITS.maxTimetables;
}

export function validateTimetableMeta(input: TimetableMetaInput): ValidationResult<TimetableMeta> {
  const errors: Record<string, string> = {};
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (title.length === 0) errors.title = 'Give the timetable a title.';
  else if (title.length > TIMETABLE_LIMITS.title) errors.title = `Keep the title to ${TIMETABLE_LIMITS.title} characters.`;
  if (!KINDS.includes(input.kind as TimetableKind)) errors.kind = 'Choose a timetable type.';
  if (!UNITS.includes(input.unit as ValidityUnit)) errors.unit = 'Choose hours, days, weeks or months.';
  if (!Number.isInteger(input.amount) || input.amount < 1 || input.amount > TIMETABLE_LIMITS.maxAmount) {
    errors.amount = `Enter a whole number from 1 to ${TIMETABLE_LIMITS.maxAmount}.`;
  }
  if (!isValidDate(input.startsOn)) errors.startsOn = 'Choose a valid start date.';
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const unit = input.unit as ValidityUnit;
  return {
    ok: true,
    errors,
    value: {
      title,
      kind: input.kind as TimetableKind,
      validity: {
        startsOn: input.startsOn,
        unit,
        amount: input.amount,
        endsAt: validityEnd(input.startsOn, unit, input.amount),
      },
      reminders: { defaultOffsetsMin: normaliseOffsets(input.defaultOffsetsMin) },
    },
  };
}

export function validateEvent(event: TimetableEvent): ValidationResult<TimetableEvent> {
  const errors: Record<string, string> = {};
  const title = (event.title ?? '').trim();
  if (title.length === 0) errors.title = 'Give the event a title.';
  else if (title.length > TIMETABLE_LIMITS.eventTitle) errors.title = `Keep the title to ${TIMETABLE_LIMITS.eventTitle} characters.`;
  if (!EVENT_TYPES.includes(event.type)) errors.type = 'Choose an event type.';
  const courseCode = (event.courseCode ?? '').trim();
  if (courseCode.length > TIMETABLE_LIMITS.courseCode) errors.courseCode = `Keep the course code to ${TIMETABLE_LIMITS.courseCode} characters.`;
  const venue = (event.venue ?? '').trim();
  if (venue.length > TIMETABLE_LIMITS.venue) errors.venue = `Keep the venue to ${TIMETABLE_LIMITS.venue} characters.`;
  const notes = (event.notes ?? '').trim();
  if (notes.length > TIMETABLE_LIMITS.notes) errors.notes = `Keep notes to ${TIMETABLE_LIMITS.notes} characters.`;

  const start = hm(event.startTime);
  const end = hm(event.endTime);
  if (!Number.isFinite(start)) errors.startTime = 'Enter a start time.';
  if (!Number.isFinite(end)) errors.endTime = 'Enter an end time.';
  else if (Number.isFinite(start) && end <= start) errors.endTime = 'The end time must be after the start time.';

  const rec = event.recurrence;
  if (!rec) errors.recurrence = 'Choose when this repeats.';
  else if (rec.kind === 'once') {
    if (!isValidDate(rec.date)) errors.recurrence = 'Choose a valid date.';
  } else if (rec.kind === 'weekly') {
    const days = Array.isArray(rec.days) ? rec.days : [];
    if (days.length === 0 || days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
      errors.recurrence = 'Choose at least one day of the week.';
    }
  } else errors.recurrence = 'Choose when this repeats.';

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const value: TimetableEvent = {
    id: event.id,
    title,
    type: event.type,
    recurrence:
      rec.kind === 'once'
        ? { kind: 'once', date: rec.date }
        : { kind: 'weekly', days: Array.from(new Set(rec.days)).sort((a, b) => a - b) },
    startTime: event.startTime,
    endTime: event.endTime,
  };
  if (courseCode) value.courseCode = courseCode;
  if (venue) value.venue = venue;
  if (notes) value.notes = notes;
  if (Array.isArray(event.reminderOffsetsMin)) {
    value.reminderOffsetsMin = event.reminderOffsetsMin.length === 0 ? [] : normaliseOffsets(event.reminderOffsetsMin);
  }
  return { ok: true, errors, value };
}

/** Validates a whole timetable document before it is written. */
export function validateTimetable(timetable: Timetable): ValidationResult<Timetable> {
  const errors: Record<string, string> = {};
  const meta = validateTimetableMeta({
    title: timetable.title,
    kind: timetable.kind,
    startsOn: timetable.validity?.startsOn,
    unit: timetable.validity?.unit,
    amount: timetable.validity?.amount,
    defaultOffsetsMin: timetable.reminders?.defaultOffsetsMin ?? [],
  });
  Object.assign(errors, meta.errors);
  const events = Array.isArray(timetable.events) ? timetable.events : [];
  if (events.length > TIMETABLE_LIMITS.maxEvents) {
    errors.events = `A timetable holds at most ${TIMETABLE_LIMITS.maxEvents} events.`;
  } else if (new Set(events.map((e) => e.id)).size !== events.length) {
    errors.events = 'Two events share the same id.';
  } else {
    for (const e of events) {
      if (!validateEvent(e).ok) {
        errors.events = `The event "${e.title || 'Untitled'}" has a problem. Open it and fix it.`;
        break;
      }
    }
  }
  return { ok: Object.keys(errors).length === 0, errors, value: timetable };
}
