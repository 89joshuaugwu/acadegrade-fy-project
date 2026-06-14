'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  // If loading, show skeleton wrapper
  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[var(--acade-void)] flex items-center justify-center">
        <div className="size-10 rounded-full border-2 border-[var(--acade-primary)] border-t-transparent animate-spin" />
      </div>
    );
  }

  // Phase 5 will inject the StudentShell here
  return <>{children}</>;
}
