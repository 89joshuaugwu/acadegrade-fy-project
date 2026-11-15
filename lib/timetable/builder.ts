import type { StudyBlockedTime, Timetable } from './engine';

export const LEVELS = [
  { value: 1, label: 'Low' },
  { value: 2, label: 'Medium' },
  { value: 3, label: 'High' },
] as const;

/**
 * Lectures, classes and exams from the student's live fixed timetables, as
 * blocked study times. Weekly events block that weekday; once events block one date.
 */
export function blockedFromFixedTimetables(timetables: Array<Pick<Timetable, 'kind' | 'status' | 'events'>>): StudyBlockedTime[] {
  const out: StudyBlockedTime[] = [];
  const seen = new Set<string>();
  for (const tt of timetables) {
    if (tt.kind !== 'fixed' || tt.status === 'archived') continue;
    for (const e of tt.events ?? []) {
      if (e.type === 'study' || e.type === 'other') continue;
      const days = e.recurrence.kind === 'weekly' ? e.recurrence.days : [];
      const entries: StudyBlockedTime[] =
        e.recurrence.kind === 'once'
          ? [{ date: e.recurrence.date, start: e.startTime, end: e.endTime }]
          : days.map((day) => ({ day, start: e.startTime, end: e.endTime }));
      for (const entry of entries) {
        const key = `${entry.day ?? entry.date}|${entry.start}|${entry.end}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(entry);
      }
    }
  }
  return out;
}
