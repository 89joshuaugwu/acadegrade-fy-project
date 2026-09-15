'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { StudentShell } from '@/components/layout/StudentShell';
import { getDocument } from '@/lib/firebase/firestore';
import { isStudentProfileComplete } from '@/lib/auth/profile';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const {
    profile,
    loading: profileLoading,
    error: profileError,
    retry: retryProfile,
  } = useProfile();
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

  useEffect(() => {
    if (
      !loading &&
      user &&
      !profileLoading &&
      !profileError &&
      !maintenanceCheckLoading &&
      !isStudentProfileComplete(profile)
    ) {
      router.replace('/register');
    }
  }, [user, profile, loading, profileLoading, profileError, router, maintenanceCheckLoading]);

  if (!loading && user && !maintenanceCheckLoading && profileError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--acade-void)] p-4">
        <section
          role="alert"
          aria-labelledby="profile-load-error-title"
          className="w-full max-w-lg rounded-[var(--radius-dialog)] border border-[var(--acade-border)] bg-[var(--acade-deep)] p-6 text-center shadow-[var(--shadow-elevated)] sm:p-8"
        >
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-[var(--acade-warning)]/10 text-[var(--acade-warning)]">
            <AlertTriangle className="size-6" aria-hidden="true" />
          </span>
          <h1
            id="profile-load-error-title"
            className="mt-4 font-[family-name:var(--font-bricolage)] text-[length:var(--text-2xl)] font-semibold text-[var(--acade-text)]"
          >
            Your account could not load
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--acade-text-muted)]">
            Check your connection and try again. Your profile and academic records have not been changed.
          </p>
          <button
            type="button"
            onClick={retryProfile}
            className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--acade-primary)] px-5 text-sm font-semibold text-[var(--acade-on-primary)] hover:bg-[var(--acade-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]"
          >
            <RefreshCw className="size-4" aria-hidden="true" /> Try again
          </button>
        </section>
      </main>
    );
  }

  // If loading auth or checking maintenance, show skeleton wrapper
  if (
    loading ||
    !user ||
    profileLoading ||
    maintenanceCheckLoading ||
    !isStudentProfileComplete(profile)
  ) {
    return (
      <div className="min-h-screen bg-[var(--acade-void)] flex items-center justify-center">
        <div className="size-10 rounded-full border-2 border-[var(--acade-primary)] border-t-transparent animate-spin" />
      </div>
    );
  }

  return <StudentShell>{children}</StudentShell>;
}
