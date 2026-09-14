'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ShieldAlert, WifiOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/lib/firebase/auth';
import { canRenderAdminContent, type AdminAccessState } from '@/lib/admin/access-state';
import { AdminShell } from '@/components/layout/AdminShell';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { Skeleton } from '@/components/ui/Skeleton';

const INITIAL_ACCESS: AdminAccessState = { status: 'idle', uid: null };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isLoginRoute = pathname === '/admin/login';
  const [access, setAccess] = useState<AdminAccessState>(INITIAL_ACCESS);
  const [verificationAttempt, setVerificationAttempt] = useState(0);

  useEffect(() => {
    if (loading || isLoginRoute) return;

    if (!user) {
      setAccess(INITIAL_ACCESS);
      router.replace('/admin/login');
      return;
    }

    const controller = new AbortController();
    const currentUser = user;
    const verifiedUid = currentUser.uid;
    setAccess({ status: 'verifying', uid: verifiedUid });

    async function verifyAdmin() {
      try {
        const token = await currentUser.getIdToken();
        const response = await fetch('/api/admin/verify', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const data = await response.json().catch(() => null);

        if (controller.signal.aborted) return;

        if (response.ok && data?.isAdmin === true) {
          setAccess({ status: 'allowed', uid: verifiedUid });
          return;
        }

        if (response.status === 401 || response.status === 403 || data?.isAdmin === false) {
          setAccess({ status: 'denied', uid: verifiedUid });
          toast.error('This account does not have administrator access.');
          return;
        }

        throw new Error(data?.error || 'Admin verification is temporarily unavailable.');
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error('Admin verification failed:', error);
        setAccess({ status: 'error', uid: verifiedUid });
        toast.error('We could not verify admin access. Please try again.');
      }
    }

    void verifyAdmin();
    return () => controller.abort();
  }, [isLoginRoute, loading, router, user, verificationAttempt]);

  if (isLoginRoute) return <>{children}</>;

  if (loading || !user || access.status === 'idle' || access.status === 'verifying') {
    return <AdminVerificationSkeleton />;
  }

  if (access.status === 'denied') {
    return (
      <AdminAccessMessage
        icon={ShieldAlert}
        eyebrow="Restricted workspace"
        title="Administrator access required"
        description="This account is signed in, but it is not listed as an AcadeGrade administrator."
        primaryLabel="Use another account"
        onPrimary={async () => {
          await signOut();
          router.replace('/admin/login');
        }}
      />
    );
  }

  if (access.status === 'error') {
    return (
      <AdminAccessMessage
        icon={WifiOff}
        eyebrow="Verification interrupted"
        title="We could not confirm access"
        description="Your account has not been signed out. Check your connection, then retry the secure admin check."
        primaryLabel="Try again"
        onPrimary={() => setVerificationAttempt((attempt) => attempt + 1)}
        secondaryLabel="Sign out"
        onSecondary={async () => {
          await signOut();
          router.replace('/admin/login');
        }}
      />
    );
  }

  if (!canRenderAdminContent(access, user.uid)) return <AdminVerificationSkeleton />;

  return <AdminShell>{children}</AdminShell>;
}

function AdminVerificationSkeleton() {
  return (
    <main className="min-h-screen bg-[var(--acade-void)] px-5 py-10" aria-busy="true">
      <div className="mx-auto flex min-h-[75vh] max-w-md flex-col items-center justify-center gap-7 text-center">
        <Logo href="/" size="md" />
        <div className="w-full rounded-[2rem] border border-[var(--acade-border)] bg-[var(--acade-surface)] p-7 shadow-[var(--shadow-popover)]">
          <Skeleton shape="circle" width={52} height={52} className="mx-auto mb-6" />
          <Skeleton className="mx-auto mb-3 h-7 w-48 rounded-lg" />
          <Skeleton className="mx-auto h-4 w-64 max-w-full rounded-md" />
        </div>
        <p className="text-sm text-[var(--acade-text-muted)]">Verifying this administrator session…</p>
      </div>
    </main>
  );
}

interface AdminAccessMessageProps {
  icon: typeof ShieldAlert;
  eyebrow: string;
  title: string;
  description: string;
  primaryLabel: string;
  onPrimary: () => void | Promise<void>;
  secondaryLabel?: string;
  onSecondary?: () => void | Promise<void>;
}

function AdminAccessMessage({
  icon: Icon,
  eyebrow,
  title,
  description,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: AdminAccessMessageProps) {
  return (
    <main className="min-h-screen bg-[var(--acade-void)] px-5 py-10">
      <div className="mx-auto flex min-h-[75vh] max-w-lg flex-col items-center justify-center">
        <section className="w-full rounded-[2rem] border border-[var(--acade-border)] bg-[var(--acade-surface)] p-7 text-center shadow-[var(--shadow-popover)] sm:p-10">
          <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl bg-[var(--acade-danger-dim)] text-[var(--acade-danger)]">
            <Icon size={26} aria-hidden="true" />
          </div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--acade-primary)]">{eyebrow}</p>
          <h1 className="font-[family-name:var(--font-bricolage)] text-3xl font-bold text-[var(--acade-text)]">{title}</h1>
          <p className="mx-auto mt-4 max-w-sm leading-7 text-[var(--acade-text-muted)]">{description}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button onClick={onPrimary}>{primaryLabel}</Button>
            {secondaryLabel && onSecondary ? (
              <Button variant="outline" onClick={onSecondary}>{secondaryLabel}</Button>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
