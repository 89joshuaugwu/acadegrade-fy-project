import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/public/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'JAMB admission aggregate calculator';

export default function Image() {
  return renderOgImage({
    headline: 'Admission aggregate',
    meta: 'Free for JAMB UTME, post-UTME and O-level',
    line: 'UTME 268, five credits and 62 in post-UTME: 68.10 out of 100.',
    figure: { value: 68.1, max: 100, text: '68.10', label: 'out of 100' },
  });
}
