import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/public/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Required GPA calculator';

export default function Image() {
  return renderOgImage({ headline: 'What GPA do I need?', meta: 'Free tools · Nigerian university 5-point scale, with PI', line: 'From 3.38 after 90 units, a 3.50 finish needs 3.68.' });
}
