'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/lib/firebase/auth';
import { AdminShell } from '@/components/layout/AdminShell';
import toast from 'react-hot-toast';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;

    // Allow the login page without auth check
    if (pathname === '/admin/login') {
      setIsAdmin(true); // Skip shell for login page
      return;
    }

    if (!user) {
      router.replace('/admin/login');
      return;
    }

    // Verify admin status via API
    const verifyAdmin = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/admin/verify', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (data.isAdmin) {
          setIsAdmin(true);
        } else {
          toast.error('Access denied. You are not authorized as an admin.');
          await signOut();
          router.replace('/admin/login');
        }
      } catch (err) {
        console.error('Admin verification failed:', err);
        toast.error('Failed to verify admin access.');
        await signOut();
        router.replace('/admin/login');
      }
    };

    verifyAdmin();
  }, [user, loading, router, pathname]);

  if (loading || isAdmin === null) {
    return (
      <div className="min-h-screen bg-[#07090F] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="size-10 rounded-full border-2 border-[var(--acade-danger)] border-t-transparent animate-spin" />
          <p className="text-[var(--acade-text-muted)] text-[length:var(--text-sm)] animate-pulse">
            Verifying admin access...
          </p>
        </div>
      </div>
    );
  }

  // Login page renders without the AdminShell wrapper
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  return <AdminShell>{children}</AdminShell>;
}
