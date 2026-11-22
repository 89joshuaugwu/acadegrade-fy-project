import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/public/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Free CGPA tools for Nigerian universities';

export default function Image() {
  return renderOgImage({ headline: 'Free CGPA tools', meta: 'Free for Nigerian universities, 5-point scale with PI', line: 'A CGPA calculator and four quick tools. Free, nothing saved.' });
}
