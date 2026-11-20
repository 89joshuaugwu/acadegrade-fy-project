import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/public/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'AcadeGrade for Android';

export default function Image() {
  return renderOgImage({
    meta: 'Android app · Free',
    headline: 'AcadeGrade for Android.',
    line: 'Everything on the website, plus offline timetable reminders, a camera scanner and App Lock.',
  });
}
