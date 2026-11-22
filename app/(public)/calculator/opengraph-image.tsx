import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/public/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'CGPA calculator for Nigerian universities';

export default function Image() {
  return renderOgImage({
    headline: 'CGPA calculator',
    meta: 'Free for Nigerian universities, 5-point scale with PI',
    line: 'Your GPA, PI and CGPA from your result slip. Free, no account.',
  });
}
