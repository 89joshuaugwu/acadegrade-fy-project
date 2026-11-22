import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/public/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'AcadeMind reads your record';

export default function Image() {
  return renderOgImage({
    meta: 'Guidance from your own results',
    headline: 'AcadeMind reads your record.',
    line: 'A written analysis, a CGPA forecast and what-if answers. Guidance to plan with, never a verdict.',
  });
}
