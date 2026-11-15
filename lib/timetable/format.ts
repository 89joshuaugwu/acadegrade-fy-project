import {
  expiryState,
  validityEnd,
  type Timetable,
  type TimetableEvent,
  type ValidityUnit,
} from './engine';

export type TimetableDoc = Timetable & { id: string };
export type DisplayStatus = 'active' | 'ending_soon' | 'expired' | 'archived';

/** Monday first, as students read a week. Values are Date#getDay numbers (0 = Sunday). */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
export const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const UNIT_LABEL: Record<ValidityUnit, string> = {
  hours: 'hours',
  days: 'days',
  weeks: 'weeks',
  months: 'months',
};

const DAY_MS = 86400000;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function parse(value: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(value || '');
  if (!m) return Number.NaN;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0, m[6] ? +m[6] : 0);
}

function fmtDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function fmtISO(ms: number): string {
  const d = new Date(ms);
  return `${fmtDate(ms)}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

/** Device local wall-clock "YYYY-MM-DDTHH:mm:ss". */
export function localNowISO(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

export function localToday(now: Date = new Date()): string {
  return localNowISO(now).slice(0, 10);
}

export function addDays(date: string, days: number): string {
  return fmtDate(parse(date) + days * DAY_MS);
}

export function dayOfWeekOf(date: string): number {
  return new Date(parse(date)).getUTCDay();
}

/** The Monday on or before the date. */
export function weekStart(date: string): string {
  const dow = dayOfWeekOf(date);
  return addDays(date, -((dow + 6) % 7));
}

export function displayStatus(timetable: Timetable, nowISO: string): DisplayStatus {
  if (timetable.status === 'archived') return 'archived';
  const state = expiryState(timetable, nowISO);
  if (state === 'expired') return 'expired';
  if (state === 'ending_soon') return 'ending_soon';
  return 'active';
}

export const STATUS_LABEL: Record<DisplayStatus, string> = {
  active: 'Active',
  ending_soon: 'Ending soon',
  expired: 'Expired',
  archived: 'Archived',
};

/** The new validity when extending by `amount` `unit`s from the later of the old end and now. */
export function extendValidity(
  timetable: Timetable,
  unit: ValidityUnit,
  amount: number,
  nowISO: string,
): Timetable['validity'] {
  const oldEnd = parse(timetable.validity.endsAt);
  const now = parse(nowISO);
  let endsAt: string;
  if (unit === 'hours') {
    endsAt = fmtISO(Math.max(oldEnd, now) + Math.trunc(amount) * 3600000);
  } else {
    const startDate = oldEnd >= now ? addDays(fmtDate(oldEnd), 1) : nowISO.slice(0, 10);
    endsAt = validityEnd(startDate, unit, amount);
  }
  return { startsOn: timetable.validity.startsOn, unit, amount, endsAt };
}

export function formatDate(date: string): string {
  const ms = parse(date);
  if (!Number.isFinite(ms)) return date;
  const d = new Date(ms);
  const month = new Date(ms).toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' });
  return `${DAY_SHORT[d.getUTCDay()]} ${d.getUTCDate()} ${month} ${d.getUTCFullYear()}`;
}

export function formatEndsAt(timetable: Timetable): string {
  const end = timetable.validity.endsAt;
  const time = end.slice(11, 16);
  return time === '23:59' ? formatDate(end.slice(0, 10)) : `${formatDate(end.slice(0, 10))} ${time}`;
}

export function describeValidity(timetable: Timetable): string {
  const { amount, unit } = timetable.validity;
  const label = amount === 1 ? UNIT_LABEL[unit].replace(/s$/, '') : UNIT_LABEL[unit];
  return `Valid for ${amount} ${label}, until ${formatEndsAt(timetable)}`;
}

export function describeRecurrence(event: TimetableEvent): string {
  if (event.recurrence.kind === 'once') return formatDate(event.recurrence.date);
  const days = WEEK_ORDER.filter((d) => event.recurrence.kind === 'weekly' && event.recurrence.days.includes(d));
  return `Every ${days.map((d) => DAY_SHORT[d]).join(', ')}`;
}

export function describeOffsets(offsets: number[]): string {
  if (offsets.length === 0) return 'No reminders';
  return offsets
    .map((m) => (m >= 60 && m % 60 === 0 ? `${m / 60} h` : `${m} min`))
    .join(', ') + ' before';
}

export function icsFileName(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `acadegrade-${slug || 'timetable'}.ics`;
}

export function newId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}${Date.now().toString(36)}${rand}`;
}
