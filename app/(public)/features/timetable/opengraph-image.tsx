import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/public/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'AcadeGrade timetables: your week, on time';

export default function Image() {
  return renderOgImage({
    meta: 'Features · Timetable',
    headline: 'Your week, on time.',
    line: 'Lectures, reading and exams in one timetable, with reminders on Android, even offline.',
  });
}
