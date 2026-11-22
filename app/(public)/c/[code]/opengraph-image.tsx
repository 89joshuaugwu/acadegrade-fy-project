import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/public/og';

/** The same generic card for every code: never the code or the courses. */
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'A course list shared by a classmate on AcadeGrade';

export default function Image() {
  return renderOgImage({
    meta: 'Shared by a classmate',
    headline: 'Your classmate shared a course list',
    line: 'Only course codes, titles and units are shared. Scores stay private.',
  });
}
