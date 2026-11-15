/**
 * AcadeGrade timetable engine: validity, occurrence expansion, reminder
 * times, expiry state, the rule-based study-plan builder and .ics export.
 * No AI is involved; the builder is a deterministic algorithm.
 *
 * This file is byte-identical in acadegrade-web/lib/timetable/engine.ts and
 * acadegrade-mobile/lib/timetable/engine.ts. Both repos run the shared
 * fixture tests/fixtures/timetable-engine.json against it. Keep it pure: no
 * imports, no platform APIs, erasable TypeScript only.
 *
 * Time model: every date and time is a local wall-clock string with no zone
 * ("YYYY-MM-DD", "HH:mm", "YYYY-MM-DDTHH:mm:ss"). All arithmetic is done with
 * UTC maths on those fields, so results never depend on the machine zone.
 */

export type TimetableKind = 'fixed' | 'reading' | 'custom';
export type ValidityUnit = 'hours' | 'days' | 'weeks' | 'months';
export type EventType = 'lecture' | 'class' | 'exam' | 'study' | 'other';
export type ExpiryState = 'ok' | 'ending_soon' | 'expired';

export type EventRecurrence =
  | { kind: 'once'; date: string }
  | { kind: 'weekly'; days: number[] };

export interface TimetableEvent {
  id: string;
  title: string;
  type: EventType;
  courseCode?: string;
  venue?: string;
  notes?: string;
  recurrence: EventRecurrence;
  startTime: string;
  endTime: string;
  reminderOffsetsMin?: number[];
}

export interface Timetable {
  title: string;
  kind: TimetableKind;
  builtWith?: 'academind';
  validity: { startsOn: string; unit: ValidityUnit; amount: number; endsAt: string };
  reminders: { defaultOffsetsMin: number[] };
  status: 'active' | 'expired' | 'archived';
  createdAt?: unknown;
  updatedAt?: unknown;
  events: TimetableEvent[];
}

export interface Occurrence {
  eventId: string;
  start: string;
  end: string;
  title: string;
  type: EventType;
}

export interface StudySubject {
  name: string;
  code?: string;
  priority: 1 | 2 | 3;
  difficulty: 1 | 2 | 3;
  examDate?: string;
}

export interface StudyBlockedTime {
  /** 0 = Sunday. Use either day (every week) or date (one day). */
  day?: number;
  date?: string;
  start: string;
  end: string;
}

export interface StudyPlanInput {
  subjects: StudySubject[];
  availability: {
    days: number[];
    /** One shared window, or one per listed day (same order as days). */
    windows: { start: string; end: string }[];
    sessionMinutes: number;
    breakMinutes: number;
    sessionsPerDay:
      | { mode: 'same'; count: number }
      | { mode: 'perDay'; counts: Record<number, number> };
  };
  blocked: StudyBlockedTime[];
  startsOn: string;
  endsOn: string;
}

export interface StudyPlanResult {
  events: TimetableEvent[];
  warnings: string[];
  unscheduled: string[];
  why: string[];
}

const DAY_MS = 86400000;
const MIN_MS = 60000;
const DEFAULT_OFFSETS = [10];
const MAX_PLAN_DAYS = 366;
const MAX_PLAN_EVENTS = 300;
const ICS_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

// ---------------------------------------------------------------- helpers

function pad(n: number, width = 2): string {
  let s = String(Math.trunc(Math.abs(n)));
  while (s.length < width) s = '0' + s;
  return s;
}

/** Parses "YYYY-MM-DD", "YYYY-MM-DDTHH:mm" or "YYYY-MM-DDTHH:mm:ss" to a naive epoch ms (NaN when invalid). */
function parseLocal(value: string): number {
  if (typeof value !== 'string') return Number.NaN;
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(value);
  if (!m) return Number.NaN;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0, m[6] ? +m[6] : 0);
}

function fmtDate(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function fmtISO(ms: number): string {
  const d = new Date(ms);
  return `${fmtDate(ms)}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

function dayOfWeek(dateMs: number): number {
  return new Date(dateMs).getUTCDay();
}

function dayStart(ms: number): number {
  return Math.floor(ms / DAY_MS) * DAY_MS;
}

/** "HH:mm" to minutes after midnight (NaN when invalid). */
function parseHm(value: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(typeof value === 'string' ? value : '');
  if (!m) return Number.NaN;
  const h = +m[1];
  const min = +m[2];
  if (h > 24 || min > 59) return Number.NaN;
  return h * 60 + min;
}

function fmtHm(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

function addMonthsClamped(dateMs: number, months: number): number {
  const d = new Date(dateMs);
  const total = d.getUTCFullYear() * 12 + d.getUTCMonth() + months;
  const year = Math.floor(total / 12);
  const month = total - year * 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Date.UTC(year, month, Math.min(d.getUTCDate(), lastDay));
}

// --------------------------------------------------------------- validity

/**
 * Local ISO end of a validity period.
 * hours: startsOn 00:00 plus the hours. days / weeks / months: the end of the
 * last valid day (23:59:59); months clamp to the month end (31 Jan + 1 month
 * ends on 27 Feb in a 28-day February). Returns '' for an invalid start.
 */
export function validityEnd(startsOn: string, unit: ValidityUnit, amount: number): string {
  const start = dayStart(parseLocal(startsOn));
  if (!Number.isFinite(start) || !Number.isFinite(amount)) return '';
  const n = Math.trunc(amount);
  if (unit === 'hours') return fmtISO(start + n * 3600000);
  let exclusive: number;
  if (unit === 'days') exclusive = start + n * DAY_MS;
  else if (unit === 'weeks') exclusive = start + n * 7 * DAY_MS;
  else if (unit === 'months') exclusive = addMonthsClamped(start, n);
  else return '';
  return fmtISO(exclusive - 1000);
}

// ------------------------------------------------------------ occurrences

/**
 * Occurrences whose start lies in [fromISO, toISO] (inclusive), sorted by
 * start, end, then event id. Weekly events begin on validity.startsOn and stop
 * at validity.endsAt; once events are listed on their own date. Archived
 * timetables yield nothing.
 */
export function expandOccurrences(timetable: Timetable, fromISO: string, toISO: string): Occurrence[] {
  const out: Occurrence[] = [];
  if (!timetable || timetable.status === 'archived' || !Array.isArray(timetable.events)) return out;
  const from = parseLocal(fromISO);
  const to = parseLocal(toISO);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return out;
  const validStart = dayStart(parseLocal(timetable.validity.startsOn));
  const validEnd = parseLocal(timetable.validity.endsAt);

  for (const event of timetable.events) {
    const startMin = parseHm(event.startTime);
    const endMin = parseHm(event.endTime);
    if (!Number.isFinite(startMin) || !Number.isFinite(endMin)) continue;
    const push = (day: number) => {
      const start = day + startMin * MIN_MS;
      if (start < from || start > to) return;
      out.push({
        eventId: event.id,
        start: fmtISO(start),
        end: fmtISO(day + endMin * MIN_MS),
        title: event.title,
        type: event.type,
      });
    };
    if (event.recurrence.kind === 'once') {
      const day = dayStart(parseLocal(event.recurrence.date));
      if (Number.isFinite(day)) push(day);
    } else {
      const days = event.recurrence.days;
      if (!Array.isArray(days) || !Number.isFinite(validStart) || !Number.isFinite(validEnd)) continue;
      const first = Math.max(dayStart(from), validStart);
      const last = Math.min(dayStart(to), dayStart(validEnd));
      for (let day = first; day <= last; day += DAY_MS) {
        if (!days.includes(dayOfWeek(day))) continue;
        if (day + startMin * MIN_MS > validEnd) continue;
        push(day);
      }
    }
  }
  out.sort((a, b) =>
    a.start < b.start ? -1 : a.start > b.start ? 1 : a.end < b.end ? -1 : a.end > b.end ? 1 : a.eventId < b.eventId ? -1 : a.eventId > b.eventId ? 1 : 0,
  );
  return out;
}

// -------------------------------------------------------------- reminders

/**
 * Local ISO reminder times (occurrence start minus each offset), ascending and
 * de-duplicated. When nowISO is given, times not after it are dropped.
 */
export function reminderTimes(occurrence: { start: string }, offsetsMin: number[], nowISO?: string): string[] {
  const start = parseLocal(occurrence && occurrence.start);
  if (!Number.isFinite(start) || !Array.isArray(offsetsMin)) return [];
  const now = nowISO === undefined ? Number.NEGATIVE_INFINITY : parseLocal(nowISO);
  const seen: Record<number, true> = {};
  const times: number[] = [];
  for (const offset of offsetsMin) {
    if (typeof offset !== 'number' || !Number.isFinite(offset)) continue;
    const at = start - Math.round(offset) * MIN_MS;
    if (at <= now || seen[at]) continue;
    seen[at] = true;
    times.push(at);
  }
  times.sort((a, b) => a - b);
  return times.map(fmtISO);
}

/** 1 to 3 unique whole-minute offsets in 1..1440, largest first. Default [10]. */
export function normaliseOffsets(input: unknown): number[] {
  if (!Array.isArray(input)) return DEFAULT_OFFSETS.slice();
  const seen: Record<number, true> = {};
  const values: number[] = [];
  for (const item of input) {
    if (typeof item !== 'number' || !Number.isFinite(item)) continue;
    const v = Math.round(item);
    if (v < 1 || v > 1440 || seen[v]) continue;
    seen[v] = true;
    values.push(v);
  }
  values.sort((a, b) => b - a);
  return values.length === 0 ? DEFAULT_OFFSETS.slice() : values.slice(0, 3);
}

// ----------------------------------------------------------------- expiry

/** ending_soon is within 1 hour (hours), 1 day (days), 3 days (weeks) or 7 days (months) of validity.endsAt. */
export function expiryState(timetable: Timetable, nowISO: string): ExpiryState {
  const end = parseLocal(timetable.validity.endsAt);
  const now = parseLocal(nowISO);
  if (!Number.isFinite(end) || !Number.isFinite(now)) return 'ok';
  if (now >= end) return 'expired';
  const unit = timetable.validity.unit;
  const window = unit === 'hours' ? 3600000 : unit === 'days' ? DAY_MS : unit === 'weeks' ? 3 * DAY_MS : 7 * DAY_MS;
  return end - now <= window ? 'ending_soon' : 'ok';
}

// ------------------------------------------------------------- study plan

interface Slot {
  date: string;
  day: number;
  startMin: number;
  endMin: number;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function cmpStr(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Rule-based study planner. weight = priority x difficulty x urgency (urgency
 * rises from 1 to 3 as the exam date nears within 60 days; no date means 1).
 * Free slots are shared out in proportion to weight, never overlap blocked
 * times, never exceed the day's session count, never put the same subject
 * back to back, never go on or after a subject's exam day, and the day before
 * an exam has half the sessions. Same input, same output.
 */
export function buildStudyPlan(input: StudyPlanInput): StudyPlanResult {
  const warnings: string[] = [];
  const why: string[] = [];
  const result: StudyPlanResult = { events: [], warnings, unscheduled: [], why };

  const subjects = (Array.isArray(input && input.subjects) ? input.subjects : [])
    .filter((s) => s && typeof s.name === 'string' && s.name.trim().length > 0)
    .map((s) => ({
      name: s.name.trim(),
      code: s.code,
      priority: clampInt(s.priority, 1, 3, 2),
      difficulty: clampInt(s.difficulty, 1, 3, 2),
      examMs: s.examDate ? dayStart(parseLocal(s.examDate)) : Number.NaN,
    }))
    .sort((a, b) => cmpStr(a.name, b.name));
  if (subjects.length === 0) {
    warnings.push('Add at least one subject to build a plan.');
    return result;
  }
  const av = input.availability;
  const startMs = dayStart(parseLocal(input.startsOn));
  const endMs = dayStart(parseLocal(input.endsOn));
  if (!av || !Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) {
    warnings.push('The plan dates are not valid.');
    result.unscheduled = subjects.map((s) => s.name);
    return result;
  }
  const sessionMin = clampInt(av.sessionMinutes, 25, 180, 60);
  const breakMin = clampInt(av.breakMinutes, 0, 60, 10);
  const listedDays = (Array.isArray(av.days) ? av.days : []).filter((d) => d >= 0 && d <= 6);
  const windows = Array.isArray(av.windows) ? av.windows : [];

  const windowFor = (day: number): { start: number; end: number } | null => {
    if (windows.length === 0) return null;
    const idx = windows.length === 1 ? 0 : listedDays.indexOf(day);
    const w = windows[idx >= 0 && idx < windows.length ? idx : windows.length - 1];
    const s = parseHm(w.start);
    const e = parseHm(w.end);
    return Number.isFinite(s) && Number.isFinite(e) && e > s ? { start: s, end: e } : null;
  };
  const requested = (day: number): number => {
    const spd = av.sessionsPerDay;
    if (!spd) return 0;
    if (spd.mode === 'same') return clampInt(spd.count, 1, 8, 1);
    return clampInt(spd.counts && spd.counts[day], 0, 8, 0);
  };

  const examDays: Record<number, true> = {};
  for (const s of subjects) if (Number.isFinite(s.examMs)) examDays[s.examMs] = true;

  // Build the day's free slots.
  const slots: Slot[] = [];
  let totalRequested = 0;
  let lighterDays = 0;
  let studyDays = 0;
  const dayCount = Math.min(MAX_PLAN_DAYS, Math.floor((endMs - startMs) / DAY_MS) + 1);
  if (Math.floor((endMs - startMs) / DAY_MS) + 1 > MAX_PLAN_DAYS) {
    warnings.push(`Plans cover at most ${MAX_PLAN_DAYS} days, so the end of your range was left out.`);
  }
  for (let i = 0; i < dayCount; i++) {
    const dayMs = startMs + i * DAY_MS;
    const dow = dayOfWeek(dayMs);
    if (!listedDays.includes(dow)) continue;
    const win = windowFor(dow);
    let count = requested(dow);
    if (!win || count === 0) continue;
    const date = fmtDate(dayMs);
    if (examDays[dayMs + DAY_MS] && count > 1) {
      count = Math.ceil(count / 2);
      lighterDays++;
    }
    totalRequested += count;
    const blocks: { s: number; e: number }[] = [];
    for (const b of Array.isArray(input.blocked) ? input.blocked : []) {
      if (!b) continue;
      const matches = b.date ? b.date === date : b.day === dow;
      const bs = parseHm(b.start);
      const be = parseHm(b.end);
      if (matches && Number.isFinite(bs) && Number.isFinite(be) && be > bs) blocks.push({ s: bs, e: be });
    }
    blocks.sort((a, b) => a.s - b.s || a.e - b.e);
    let cursor = win.start;
    let placed = 0;
    while (placed < count && cursor + sessionMin <= win.end) {
      const hit = blocks.find((b) => cursor < b.e && cursor + sessionMin > b.s);
      if (hit) {
        cursor = hit.e;
        continue;
      }
      slots.push({ date, day: dow, startMin: cursor, endMin: cursor + sessionMin });
      placed++;
      cursor += sessionMin + breakMin;
    }
    if (placed > 0) studyDays++;
  }

  if (slots.length === 0) {
    warnings.push('No free study time was found in that range. Widen your dates, days or time window.');
    result.unscheduled = subjects.map((s) => s.name);
    return result;
  }
  if (slots.length < totalRequested) {
    warnings.push(`Only ${slots.length} of ${totalRequested} requested sessions fit around your lectures and exams.`);
  }

  // Weights and targets.
  const weights = subjects.map((s) => {
    let urgency = 1;
    if (Number.isFinite(s.examMs)) {
      const daysAway = Math.max(0, Math.round((s.examMs - startMs) / DAY_MS));
      urgency = 1 + 2 * (1 - Math.min(daysAway, 60) / 60);
    }
    return s.priority * s.difficulty * urgency;
  });
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const targets = weights.map((w) => (slots.length * w) / totalWeight);
  const assigned = subjects.map(() => 0);
  const sessionsOf: number[] = subjects.map(() => 0);

  const events: TimetableEvent[] = [];
  let todayDate = '';
  let todayCount = subjects.map(() => 0);
  let prevIdx = -1;
  let prevEndMin = -1;
  let dropped = 0;
  for (const slot of slots) {
    const dayMs = parseLocal(slot.date);
    if (slot.date !== todayDate) {
      todayDate = slot.date;
      todayCount = subjects.map(() => 0);
      prevIdx = -1;
      prevEndMin = -1;
    }
    // Back-to-back means the previous session on the same day directly before this one.
    const adjacent = prevIdx >= 0 && slot.startMin - prevEndMin <= breakMin;
    let best = -1;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < subjects.length; i++) {
      const s = subjects[i];
      if (Number.isFinite(s.examMs) && dayMs >= s.examMs) continue;
      if (adjacent && i === prevIdx) continue;
      const score = targets[i] - assigned[i] - 1.5 * todayCount[i];
      if (score > bestScore + 1e-9) {
        bestScore = score;
        best = i;
      }
    }
    if (best < 0) {
      dropped++;
      continue;
    }
    assigned[best]++;
    todayCount[best]++;
    sessionsOf[best]++;
    prevIdx = best;
    prevEndMin = slot.endMin;
    const s = subjects[best];
    const ev: TimetableEvent = {
      id: `study-${slot.date.replace(/-/g, '')}-${pad(events.length + 1, 3)}`,
      title: `Study: ${s.name}`,
      type: 'study',
      recurrence: { kind: 'once', date: slot.date },
      startTime: fmtHm(slot.startMin),
      endTime: fmtHm(slot.endMin),
    };
    if (s.code) ev.courseCode = s.code;
    events.push(ev);
  }
  if (dropped > 0) {
    warnings.push(`${dropped} session${dropped === 1 ? '' : 's'} left empty because no subject could be studied there without repeating the same one back to back or studying after its exam.`);
  }
  if (events.length > MAX_PLAN_EVENTS) {
    warnings.push(`A timetable holds ${MAX_PLAN_EVENTS} events, so the plan was cut after the first ${MAX_PLAN_EVENTS} sessions.`);
    events.length = MAX_PLAN_EVENTS;
  }

  const unscheduled: string[] = [];
  subjects.forEach((s, i) => {
    if (sessionsOf[i] === 0) {
      unscheduled.push(s.name);
      warnings.push(
        Number.isFinite(s.examMs)
          ? `${s.name} got no sessions: there was no free time before its exam on ${fmtDate(s.examMs)}.`
          : `${s.name} got no sessions: there was not enough free time.`,
      );
    }
  });

  why.push(`${events.length} study session${events.length === 1 ? '' : 's'} of ${sessionMin} minutes were placed over ${studyDays} day${studyDays === 1 ? '' : 's'}, around your lectures and exams.`);
  why.push('Subjects with a higher priority or difficulty get more sessions, and a subject with an exam coming up soon gets extra.');
  subjects.forEach((s, i) => {
    if (sessionsOf[i] === 0) return;
    const note = Number.isFinite(s.examMs) ? `, exam on ${fmtDate(s.examMs)}` : '';
    why.push(`${s.name}: ${sessionsOf[i]} session${sessionsOf[i] === 1 ? '' : 's'} (priority ${s.priority}, difficulty ${s.difficulty}${note}).`);
  });
  if (lighterDays > 0) {
    why.push(`${lighterDays} day${lighterDays === 1 ? ' is' : 's are'} lighter because an exam follows the next day.`);
  }
  why.push('No subject is repeated straight after itself, and no subject is studied on or after its exam day.');

  result.events = events;
  result.unscheduled = unscheduled;
  return result;
}

// -------------------------------------------------------------------- ICS

function icsEscape(text: string): string {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/** Folds a content line at 75 octets (UTF-8), continuation lines start with one space. */
function icsFold(line: string): string[] {
  const encoder = new TextEncoder();
  const lines: string[] = [];
  let current = '';
  let bytes = 0;
  for (const ch of line) {
    const size = encoder.encode(ch).length;
    const limit = lines.length === 0 ? 75 : 74;
    if (bytes + size > limit) {
      lines.push(lines.length === 0 ? current : ' ' + current);
      current = '';
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  lines.push(lines.length === 0 ? current : ' ' + current);
  return lines;
}

function icsDateTime(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getUTCFullYear(), 4)}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
}

/**
 * RFC 5545 calendar text with CRLF line endings, escaped text, 75-octet
 * folding and a VALARM per reminder offset. Times are floating local times.
 * DTSTAMP is nowISO read as UTC. Weekly events become one RRULE (UNTIL the
 * validity end); an event's own offsets override the timetable default.
 */
export function buildIcs(timetable: Timetable, nowISO: string): string {
  const lines: string[] = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AcadeGrade//Timetable//EN', 'CALSCALE:GREGORIAN'];
  lines.push('X-WR-CALNAME:' + icsEscape(timetable.title));
  const stamp = parseLocal(nowISO);
  const dtstamp = Number.isFinite(stamp) ? icsDateTime(stamp) + 'Z' : '19700101T000000Z';
  const validStart = dayStart(parseLocal(timetable.validity.startsOn));
  const validEnd = parseLocal(timetable.validity.endsAt);
  const defaults = normaliseOffsets(timetable.reminders && timetable.reminders.defaultOffsetsMin);

  for (const event of timetable.events) {
    const startMin = parseHm(event.startTime);
    const endMin = parseHm(event.endTime);
    if (!Number.isFinite(startMin) || !Number.isFinite(endMin)) continue;
    let firstDay = Number.NaN;
    let rrule = '';
    if (event.recurrence.kind === 'once') {
      firstDay = dayStart(parseLocal(event.recurrence.date));
    } else {
      const days = (event.recurrence.days || []).filter((d) => d >= 0 && d <= 6);
      if (days.length === 0 || !Number.isFinite(validStart)) continue;
      for (let i = 0; i < 7; i++) {
        if (days.includes(dayOfWeek(validStart + i * DAY_MS))) {
          firstDay = validStart + i * DAY_MS;
          break;
        }
      }
      const byday = days
        .filter((d, i) => days.indexOf(d) === i)
        .sort((a, b) => a - b)
        .map((d) => ICS_DAYS[d])
        .join(',');
      rrule = `RRULE:FREQ=WEEKLY;BYDAY=${byday}` + (Number.isFinite(validEnd) ? `;UNTIL=${icsDateTime(validEnd)}` : '');
    }
    if (!Number.isFinite(firstDay)) continue;
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${icsEscape(event.id)}@acadegrade.app`);
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(`DTSTART:${icsDateTime(firstDay + startMin * MIN_MS)}`);
    lines.push(`DTEND:${icsDateTime(firstDay + endMin * MIN_MS)}`);
    if (rrule) lines.push(rrule);
    lines.push(`SUMMARY:${icsEscape(event.title)}`);
    if (event.venue) lines.push(`LOCATION:${icsEscape(event.venue)}`);
    const description = [event.courseCode, event.notes].filter((x) => x && String(x).length > 0).join(' - ');
    if (description) lines.push(`DESCRIPTION:${icsEscape(description)}`);
    const offsets = Array.isArray(event.reminderOffsetsMin) ? normaliseOffsetsAllowEmpty(event.reminderOffsetsMin) : defaults;
    for (const offset of offsets) {
      lines.push('BEGIN:VALARM');
      lines.push('ACTION:DISPLAY');
      lines.push(`DESCRIPTION:${icsEscape(event.title)}`);
      lines.push(`TRIGGER:-PT${offset}M`);
      lines.push('END:VALARM');
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  const folded: string[] = [];
  for (const line of lines) for (const part of icsFold(line)) folded.push(part);
  return folded.join('\r\n') + '\r\n';
}

/** An event with an explicit empty override means "no reminders". */
function normaliseOffsetsAllowEmpty(input: number[]): number[] {
  return input.length === 0 ? [] : normaliseOffsets(input);
}
