import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/public/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Weighted average score calculator';

export default function Image() {
  return renderOgImage({ headline: 'Weighted average score', meta: 'Free tools · Nigerian university 5-point scale, with PI', line: '65.9 out of 100, with GPA 4.15 and PI 3.30.' });
}
