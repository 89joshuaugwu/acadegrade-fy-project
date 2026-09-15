import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo/site';

export const metadata: Metadata = createPageMetadata({
  title: 'About AcadeGrade',
  description:
    'Learn how AcadeGrade helps students build a clear, private academic record and make better-informed decisions about their progress.',
  path: '/about',
});

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
