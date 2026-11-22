import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/public/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'About AcadeGrade';

export default function Image() {
  return renderOgImage({ headline: 'A private record, made in Enugu.', line: 'Who runs AcadeGrade, how every figure is worked out, and what happens to your data.', meta: 'Built for Nigerian universities' });
}
