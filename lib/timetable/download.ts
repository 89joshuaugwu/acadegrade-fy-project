import { buildIcs, type Timetable } from './engine';
import { icsFileName, localNowISO } from './format';

export const ICS_CONTENT_TYPE = 'text/calendar;charset=utf-8';

/** Builds the calendar file and hands it to the browser. Returns the file name used. */
export function downloadTimetableIcs(timetable: Timetable, now: Date = new Date()): string {
  const text = buildIcs(timetable, localNowISO(now));
  const fileName = icsFileName(timetable.title);
  const blob = new Blob([text], { type: ICS_CONTENT_TYPE });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return fileName;
}
