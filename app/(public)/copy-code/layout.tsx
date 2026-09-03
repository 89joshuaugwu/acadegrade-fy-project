import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Copy verification code',
  robots: { index: false, follow: false },
};

export default function CopyCodeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
