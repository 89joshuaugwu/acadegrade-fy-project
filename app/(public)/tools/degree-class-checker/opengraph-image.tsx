import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/public/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Degree class checker';

export default function Image() {
  return renderOgImage({ headline: 'Degree class checker', meta: 'Free for Nigerian universities, 5-point scale with PI', line: '4.43 is Second Class Upper, 0.07 short of First Class.', figure: { value: 4.43, label: 'Second Class Upper' } });
}
