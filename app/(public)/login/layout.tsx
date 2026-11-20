import type { Metadata } from 'next';
import { NO_INDEX_METADATA } from '@/lib/seo/site';
import { LOGIN_COPY } from '@/lib/public/auth-copy';

export const metadata: Metadata = {
  ...NO_INDEX_METADATA,
  title: LOGIN_COPY.title,
  description: LOGIN_COPY.description,
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
