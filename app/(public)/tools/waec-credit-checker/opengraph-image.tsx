import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/public/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'WAEC credit checker';

export default function Image() {
  return renderOgImage({
    headline: 'WAEC credit checker',
    meta: 'Free for WAEC, NECO and NABTEB, up to two sittings',
    line: 'Two sittings combined: 6 credits, English and Maths included.',
    figure: { value: 6, max: 9, text: '6', label: 'credits' },
  });
}
