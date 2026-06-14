'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isAdminChecking, setIsAdminChecking] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/admin/login');
      } else {
        // TODO: Call an API to verify if the user's email is in config/admins
        // For now, allow through, but in Phase 9 we will enforce admin check here
        setIsAdminChecking(false);
      }
    }
  }, [user, loading, router]);

  if (loading || isAdminChecking || !user) {
    return (
      <div className="min-h-screen bg-[#0a0505] flex items-center justify-center">
        <div className="size-10 rounded-full border-2 border-[var(--acade-danger)] border-t-transparent animate-spin" />
      </div>
    );
  }

  // Phase 9 will inject the AdminShell here
  return <>{children}</>;
}
