import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/public/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Carry-over impact calculator';

export default function Image() {
  return renderOgImage({ headline: 'Carry-over impact', meta: 'Free tools · Nigerian university 5-point scale, with PI', line: 'One retake, two rules: 3.10 or 3.25.' });
}
