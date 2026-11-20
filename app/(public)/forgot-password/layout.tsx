import type { Metadata } from 'next';
import { NO_INDEX_METADATA } from '@/lib/seo/site';
import { RESET_COPY } from '@/lib/public/auth-copy';

export const metadata: Metadata = {
  ...NO_INDEX_METADATA,
  title: RESET_COPY.title,
  description: RESET_COPY.description,
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
