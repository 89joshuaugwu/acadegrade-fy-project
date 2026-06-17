'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { StudentShell } from '@/components/layout/StudentShell';
import { getDocument } from '@/lib/firebase/firestore';

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [maintenanceCheckLoading, setMaintenanceCheckLoading] = useState(true);

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const doc = await getDocument<any>('config/settings');
        if (doc?.maintenanceMode) {
          router.replace('/maintenance');
          return; // Do not clear loading so it doesn't flash the UI
        }
      } catch (err) {
        console.error('Failed to check maintenance mode', err);
      }
      setMaintenanceCheckLoading(false);
    };
    checkMaintenance();
  }, [router]);

  useEffect(() => {
    if (!loading && !user && !maintenanceCheckLoading) {
      router.replace('/login');
    }
  }, [user, loading, router, maintenanceCheckLoading]);

  // If loading auth or checking maintenance, show skeleton wrapper
  if (loading || !user || maintenanceCheckLoading) {
    return (
      <div className="min-h-screen bg-[var(--acade-void)] flex items-center justify-center">
        <div className="size-10 rounded-full border-2 border-[var(--acade-primary)] border-t-transparent animate-spin" />
      </div>
    );
  }

  return <StudentShell>{children}</StudentShell>;
}
