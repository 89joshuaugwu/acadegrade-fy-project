import type { Metadata } from 'next';
import { NO_INDEX_METADATA } from '@/lib/seo/site';
import { REGISTER_COPY } from '@/lib/public/auth-copy';

export const metadata: Metadata = {
  ...NO_INDEX_METADATA,
  title: REGISTER_COPY.title,
  description: REGISTER_COPY.description,
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
