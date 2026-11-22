import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/public/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'AcadeGrade features: from result slip to plan';

export default function Image() {
  return renderOgImage({
    meta: 'Built for Nigerian universities',
    headline: 'From result slip to plan.',
    line: 'GPA, CGPA and PI, the result scanner, AcadeMind and timetables. Free on the web and Android.',
  });
}
