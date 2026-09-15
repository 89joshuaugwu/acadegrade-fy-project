# Shared Layouts

## Layout model

AcadeGrade uses Next.js App Router nested layouts. The root owns fonts, global theme/auth/feedback providers, and global metadata. Student and admin route groups add access guards and persistent shells. Public pages currently compose `Navbar`, `PublicHeader`, and `PublicFooter` at page level rather than through one public route-group layout.

The files below are the complete current implementations for shared shell/layout responsibilities. Route-specific metadata-only layouts are mapped in `routes.md` but omitted here unless they participate in a shared shell.

## Root layout

- Path: `app/layout.tsx`
- Description: Loads the three type families, global CSS, theme provider, auth context, toasts, service-worker cleanup, PWA banner, and global metadata.

```tsx
import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, DM_Sans } from 'next/font/google';
import { GeistMono } from 'geist/font/mono';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/components/layout/AuthProvider';
import { ServiceWorkerKill } from '@/components/shared/ServiceWorkerKill';
import { PWABanner } from '@/components/ui/PWABanner';
import {
  getSiteJsonLd,
  resolveSiteUrl,
  serializeJsonLd,
  SITE_DESCRIPTION,
  SITE_NAME,
} from '@/lib/seo/site';
import './globals.css';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  metadataBase: new URL(resolveSiteUrl()),
  title: {
    default: 'AcadeGrade — Understand your academic progress',
    template: '%s | AcadeGrade',
  },
  description: SITE_DESCRIPTION,
  keywords: [
    'CGPA calculator',
    'GPA tracker',
    'university grades',
    'academic performance',
    'AI academic advisor',
    'degree class calculator',
    'student dashboard',
    'Nigeria university grading',
    'academic trajectory',
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: 'Education',
  manifest: '/manifest.json',
  verification: {
    google: 'F3WW92_FNlQviz77sKTnTL-EnbLbWuh0P1snZC5e72o',
  },
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_NG',
    url: '/',
    title: 'AcadeGrade — Understand your academic progress',
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'AcadeGrade academic progress workspace',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AcadeGrade — Understand your academic progress',
    description: SITE_DESCRIPTION,
    images: ['/opengraph-image'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F5F7FC' },
    { media: '(prefers-color-scheme: dark)', color: '#080B16' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bricolage.variable} ${dmSans.variable} ${GeistMono.variable}`}
    >
      <body className="font-body antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(getSiteJsonLd()) }}
        />
        <ServiceWorkerKill />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <Toaster
              position="top-center"
              containerStyle={{ zIndex: 'var(--z-toast)' }}
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'var(--acade-deep)',
                  color: 'var(--acade-text)',
                  border: '1px solid var(--acade-border)',
                  borderRadius: '12px',
                  fontSize: 'var(--text-sm)',
                  fontFamily: 'var(--font-dm-sans)',
                  boxShadow: 'var(--shadow-popover)',
                },
                success: {
                  iconTheme: {
                    primary: 'var(--acade-success)',
                    secondary: 'var(--acade-deep)',
                  },
                },
                error: {
                  iconTheme: {
                    primary: 'var(--acade-danger)',
                    secondary: 'var(--acade-deep)',
                  },
                },
              }}
            />
            <PWABanner />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

## Student route-group guard

- Path: `app/(student)/layout.tsx`
- Description: Checks maintenance, authentication, and profile completeness before placing student routes inside StudentShell.

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { StudentShell } from '@/components/layout/StudentShell';
import { getDocument } from '@/lib/firebase/firestore';
import { isStudentProfileComplete } from '@/lib/auth/profile';

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
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
      !maintenanceCheckLoading &&
      !isStudentProfileComplete(profile)
    ) {
      router.replace('/register');
    }
  }, [user, profile, loading, profileLoading, router, maintenanceCheckLoading]);

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
```

## Admin route-group guard

- Path: `app/(admin)/layout.tsx`
- Description: Verifies administrator access, handles denied/error/loading states, and wraps protected routes in AdminShell while leaving admin login unwrapped.

```tsx
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
```

## Admin section metadata layout

- Path: `app/(admin)/admin/layout.tsx`
- Description: Applies no-index metadata to the protected admin section and passes through its child route.

```tsx
import type { Metadata } from 'next';
import { NO_INDEX_METADATA } from '@/lib/seo/site';

export const metadata: Metadata = NO_INDEX_METADATA;

export default function AdminSectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
```

## Student application shell

- Path: `components/layout/StudentShell.tsx`
- Description: Persistent responsive student navigation, header, notifications, drawer, bottom tabs, route announcements, and content frame.

```tsx
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, LayoutDashboard, BookOpen, BrainCircuit, FileText, Settings, Bell, LogOut, X, AlertTriangle, Megaphone } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { signOut } from '@/lib/firebase/auth';
import { useNotifications } from '@/hooks/useNotifications';
import { useAnalytics } from '@/hooks/useAnalytics';
import { getDocument } from '@/lib/firebase/firestore';
import { onForegroundMessage, removeNotificationToken } from '@/lib/firebase/fcm';
import toast from 'react-hot-toast';
import { CGPAArc } from '@/components/cgpa/CGPAArc';
import { MobileDrawer } from './MobileDrawer';
import { BottomTabBar } from './BottomTabBar';
import { NotificationDropdown } from './NotificationDropdown';
import { StudentTour } from '@/components/onboarding/StudentTour';
import { Logo, ThemeControl } from '@/components/ui';
import { RouteAnnouncer } from '@/components/shared';
import { getRouteMeta, isRouteActive, studentNavigation, type NavigationIcon } from '@/lib/ui/route-meta';
import { cn } from '@/lib/utils/cn';

const STUDENT_ICONS: Record<NavigationIcon, React.ElementType> = {
  dashboard: LayoutDashboard,
  results: BookOpen,
  insights: BrainCircuit,
  transcript: FileText,
  users: LayoutDashboard,
  courses: BookOpen,
  analytics: BrainCircuit,
  activity: BrainCircuit,
  ads: Megaphone,
  settings: Settings,
};

export function StudentShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user } = useAuth();
  const { profile } = useProfile();
  const { unreadCount } = useNotifications();
  const { insightsStale } = useAnalytics();
  const pathname = usePathname();
  const routeMeta = getRouteMeta(pathname);
  const [announcement, setAnnouncement] = useState<string | null>(null);

  useEffect(() => {
    const fetchBanner = async () => {
      try {
        const doc = await getDocument<any>('config/settings');
        if (doc?.announcementBanner) {
          // Check if dismissed in localStorage
          const dismissed = localStorage.getItem('dismissed_banner');
          if (dismissed !== doc.announcementBanner) {
            setAnnouncement(doc.announcementBanner);
          }
        }
      } catch (err) {
        console.error('Failed to load banner', err);
      }
    };
    fetchBanner();
  }, []);

  // Listen for foreground messages. Permission is requested from Settings after an explicit action.
  useEffect(() => {
    if (user?.uid) {
      const unsubscribe = onForegroundMessage((payload) => {
        if (payload?.notification) {
          toast(
            <div className="flex flex-col gap-1">
              <span className="font-bold text-[length:var(--text-sm)] font-[family-name:var(--font-bricolage)]">
                {payload.notification.title}
              </span>
              <span className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)]">
                {payload.notification.body}
              </span>
            </div>,
            { icon: '🔔', duration: 5000 }
          );
        }
      });
      return () => unsubscribe();
    }
  }, [user]);

  const dismissBanner = () => {
    if (announcement) {
      localStorage.setItem('dismissed_banner', announcement);
      setAnnouncement(null);
    }
  };

  const handleSignOut = async () => {
    try {
      if (user?.uid) {
        await removeNotificationToken(user.uid);
      }
      await signOut();
    } catch (error) {
      console.error('Failed to sign out', error);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--acade-void)] flex flex-col lg:flex-row">
      <a href="#main-content" className="sr-only z-[var(--z-tooltip)] rounded-lg bg-[var(--acade-primary)] px-4 py-3 text-[var(--acade-on-primary)] focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <RouteAnnouncer title={routeMeta.title} />
      {/* Mobile & Tablet Header */}
      <header aria-label="Student mobile header" className="sticky top-0 flex h-[var(--shell-header-height)] items-center justify-between border-b border-[var(--acade-border)] bg-[var(--acade-deep)]/96 px-4 backdrop-blur-md sm:px-6 lg:hidden" style={{ zIndex: 'var(--z-sticky)' }}>
        <div className="flex min-w-0 items-center gap-2.5">
          <Logo size="sm" />
          <span className="hidden h-5 w-px shrink-0 bg-[var(--acade-border)] min-[390px]:block" aria-hidden="true" />
          <span className="hidden truncate text-sm font-semibold text-[var(--acade-text-muted)] min-[390px]:block">
            {routeMeta.title}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <NotificationDropdown />
          <button
            id="tour-mobile-hamburger-btn"
            onClick={() => setDrawerOpen(true)}
            type="button"
            className="flex size-12 items-center justify-center rounded-[var(--radius-control)] text-[var(--acade-text-muted)] transition-colors hover:bg-[var(--acade-overlay)] hover:text-[var(--acade-text)]"
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside aria-label="Student navigation" className="fixed inset-y-0 left-0 hidden w-[var(--student-rail-width)] flex-col overflow-y-auto border-r border-[var(--acade-border)] bg-[var(--acade-deep)] lg:flex" style={{ zIndex: 'var(--z-sticky)' }}>
        <div className="flex min-h-[var(--shell-header-height)] items-center border-b border-[var(--acade-border-subtle)] px-5">
          <Logo size="md" />
        </div>

        <div className="px-3 py-5">
          <p className="mb-2 px-3 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--acade-text-faint)]">
            Your workspace
          </p>
          <nav id="tour-sidebar-nav" aria-label="Primary" className="flex flex-col gap-1">
            {studentNavigation.map((tab) => {
              const active = isRouteActive(pathname, tab.href);
              const Icon = STUDENT_ICONS[tab.icon];
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  id={`tour-desktop-nav-${tab.label.toLowerCase()}`}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    "group relative flex min-h-12 items-center gap-3 rounded-[var(--radius-control)] px-3.5 text-sm font-semibold transition-colors",
                    active
                      ? "text-[var(--acade-primary)]"
                      : "border border-transparent text-[var(--acade-text-muted)] hover:bg-[var(--acade-overlay)] hover:text-[var(--acade-text)]"
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="sidebar-pill"
                      className="absolute inset-0 rounded-[var(--radius-control)] border border-[var(--acade-primary)]/20 bg-[var(--acade-primary-dim)]"
                      transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.8 }}
                    />
                  )}
                  <div className="relative z-10">
                    <Icon size={20} className={active ? "text-[var(--acade-primary-glow)]" : ""} />
                    {tab.label === 'Insights' && insightsStale && (
                      <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full border-2 border-[var(--acade-deep)] bg-[var(--acade-danger)]"></span>
                      </span>
                    )}
                  </div>
                  <span className="relative z-10">{tab.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto border-t border-[var(--acade-border-subtle)] p-3">
          <div className="flex flex-col gap-1">
            <Link
              href="/notifications"
              id="tour-desktop-nav-notifications"
              aria-current={isRouteActive(pathname, '/notifications') ? 'page' : undefined}
              className={cn(
                "group relative flex min-h-12 items-center justify-between rounded-[var(--radius-control)] px-3.5 text-sm font-semibold transition-colors",
                isRouteActive(pathname, '/notifications')
                  ? "text-[var(--acade-primary)]"
                  : "text-[var(--acade-text-muted)] hover:text-[var(--acade-text)] hover:bg-[var(--acade-overlay)] border border-transparent"
              )}
            >
              {isRouteActive(pathname, '/notifications') && (
                <motion.div
                  layoutId="sidebar-pill"
                  className="absolute inset-0 bg-[var(--acade-primary)]/10 border border-[var(--acade-primary)]/20 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.05)]"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <div className="relative z-10 flex items-center gap-3">
                <Bell size={20} className={isRouteActive(pathname, '/notifications') ? "text-[var(--acade-primary-glow)]" : ""} />
                Notifications
              </div>
              {unreadCount > 0 && (
                <span className="relative z-10 min-w-5 rounded-full bg-[var(--acade-primary)] px-2 py-0.5 text-center text-xs font-bold text-[var(--acade-on-primary)]">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
            <Link
              href="/settings"
              id="tour-desktop-nav-settings"
              aria-current={isRouteActive(pathname, '/settings') ? 'page' : undefined}
              className={cn(
                "group relative flex min-h-12 items-center gap-3 rounded-[var(--radius-control)] px-3.5 text-sm font-semibold transition-colors",
                isRouteActive(pathname, '/settings')
                  ? "text-[var(--acade-primary)]"
                  : "border border-transparent text-[var(--acade-text-muted)] hover:bg-[var(--acade-overlay)] hover:text-[var(--acade-text)]"
              )}
            >
              {isRouteActive(pathname, '/settings') && (
                <motion.div
                  layoutId="sidebar-pill"
                  className="absolute inset-0 rounded-[var(--radius-control)] border border-[var(--acade-primary)]/20 bg-[var(--acade-primary-dim)]"
                  transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.8 }}
                />
              )}
              <Settings size={20} className={cn("relative z-10", isRouteActive(pathname, '/settings') ? "text-[var(--acade-primary-glow)]" : "")} />
              <span className="relative z-10">Settings</span>
            </Link>
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-surface)] p-2">
            <div className="relative size-10 shrink-0 overflow-hidden rounded-full border border-[var(--acade-border)] bg-[var(--acade-overlay)]">
              <img
                src={profile?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`}
                alt=""
                className="size-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--acade-text)]">
                {profile?.fullName || user?.displayName || 'Student'}
              </p>
              <p className="truncate font-[family-name:var(--font-geist-mono)] text-[0.68rem] text-[var(--acade-text-muted)]">
                {profile?.matric || user?.email || 'Academic profile'}
              </p>
            </div>
            <button
              type="button"
              id="tour-desktop-nav-logout"
              onClick={handleSignOut}
              className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-[var(--acade-text-muted)] transition-colors hover:bg-[var(--acade-danger-dim)] hover:text-[var(--acade-danger)]"
              aria-label="Sign out"
            >
              <LogOut size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main id="main-content" className="relative min-h-screen flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:ml-[var(--student-rail-width)] lg:pb-0">
        <header
          aria-label="Student page context"
          className="sticky top-0 hidden min-h-[var(--shell-header-height)] items-center justify-between gap-4 border-b border-[var(--acade-border-subtle)] bg-[var(--acade-void)]/94 px-8 backdrop-blur-md lg:flex"
          style={{ zIndex: 'var(--z-sticky)' }}
        >
          <div className="min-w-0">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--acade-text-faint)]">
              Student workspace
            </p>
            <p className="truncate font-[family-name:var(--font-bricolage)] text-lg font-semibold text-[var(--acade-text)]">
              {routeMeta.title}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeControl compact />
            <NotificationDropdown />
          </div>
        </header>
        {announcement && (
          <div className="bg-[var(--acade-gold)]/10 border-b border-[var(--acade-gold)]/20 px-4 py-3 flex items-start sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3 text-[var(--acade-gold)]">
              <AlertTriangle size={18} className="shrink-0 mt-0.5 sm:mt-0" />
              <p className="text-[length:var(--text-sm)] font-medium font-[family-name:var(--font-dm-sans)] leading-tight">
                {announcement}
              </p>
            </div>
            <button type="button" aria-label="Dismiss announcement" onClick={dismissBanner} className="flex size-12 shrink-0 items-center justify-center rounded-xl text-[var(--acade-gold)] transition-colors hover:bg-[var(--acade-gold-dim)]">
              <X size={16} />
            </button>
          </div>
        )}
        <div className="mx-auto h-full w-full max-w-[1200px] p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>

      <MobileDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        isAdmin={false}
        profile={profile}
        unreadCount={unreadCount}
      />
      <BottomTabBar />
      <StudentTour />
    </div>
  );
}
```

## Admin application shell

- Path: `components/layout/AdminShell.tsx`
- Description: Dense responsive admin rail/header/drawer shell driven by canonical route metadata.

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, LayoutDashboard, Users, BookOpen, BarChart3, Activity, Settings, LogOut, Shield, Megaphone } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/lib/firebase/auth';
import { removeNotificationToken } from '@/lib/firebase/fcm';
import { MobileDrawer } from './MobileDrawer';
import { cn } from '@/lib/utils/cn';
import { ThemeControl } from '@/components/ui';
import { RouteAnnouncer } from '@/components/shared';
import { adminNavigation, getRouteMeta, isRouteActive, type NavigationIcon } from '@/lib/ui/route-meta';

const ADMIN_ICONS: Record<NavigationIcon, React.ElementType> = {
  dashboard: LayoutDashboard,
  users: Users,
  courses: BookOpen,
  analytics: BarChart3,
  activity: Activity,
  ads: Megaphone,
  settings: Settings,
  results: BookOpen,
  insights: BarChart3,
  transcript: BookOpen,
};

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user } = useAuth();
  const pathname = usePathname();
  const routeMeta = getRouteMeta(pathname);

  const handleSignOut = async () => {
    try {
      if (user?.uid) {
        await removeNotificationToken(user.uid);
      }
      await signOut();
    } catch (error) {
      console.error('Failed to sign out', error);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--acade-void)] flex flex-col md:flex-row">
      <a href="#admin-main-content" className="sr-only z-[var(--z-tooltip)] rounded-lg bg-[var(--acade-primary)] px-4 py-3 text-[var(--acade-on-primary)] focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
      <RouteAnnouncer title={routeMeta.title} />
      {/* Mobile Header — Red-tinted admin strip */}
      <header className="sticky top-0 flex h-[var(--shell-header-height)] items-center justify-between border-b border-[var(--acade-border)] bg-[var(--acade-deep)] px-4 lg:hidden" style={{ zIndex: 'var(--z-sticky)' }}>
        <div className="flex items-center gap-2 font-[family-name:var(--font-bricolage)] text-lg font-bold text-[var(--acade-text)]">
          <span className="flex size-9 items-center justify-center rounded-xl bg-[var(--acade-primary-dim)]"><Shield size={20} className="text-[var(--acade-primary)]" /></span>
          <span>AcadeGrade Admin</span>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          type="button"
          className="flex size-12 items-center justify-center rounded-[var(--radius-control)] text-[var(--acade-text-muted)] transition-colors hover:bg-[var(--acade-overlay)] hover:text-[var(--acade-text)]"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
      </header>

      {/* Desktop Sidebar — Red-tinted admin */}
      <aside aria-label="Admin navigation" className="fixed inset-y-0 left-0 hidden w-[var(--admin-rail-width)] flex-col overflow-y-auto border-r border-[var(--acade-border)] bg-[var(--acade-deep)] lg:flex" style={{ zIndex: 'var(--z-sticky)' }}>
        <div className="p-6">
          {/* Admin Identity Header */}
          <div className="mb-8 flex items-center gap-3 rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-surface)] p-3 shadow-[var(--shadow-card)]">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--acade-primary-dim)]">
              <Shield size={21} className="text-[var(--acade-primary)]" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-base font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)]">
                Operations
              </span>
              <span className="text-[length:var(--text-xs)] text-[var(--acade-text-faint)] truncate">
                AcadeGrade v2
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav aria-label="Primary" className="flex flex-col gap-1.5">
            {adminNavigation.map((tab) => {
              const active = isRouteActive(pathname, tab.href);
              const Icon = ADMIN_ICONS[tab.icon];
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "flex min-h-12 items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-colors font-[family-name:var(--font-dm-sans)]",
                    active
                      ? "border-[var(--acade-primary)]/20 bg-[var(--acade-primary-dim)] text-[var(--acade-primary)]"
                      : "border-transparent text-[var(--acade-text-muted)] hover:bg-[var(--acade-overlay)] hover:text-[var(--acade-text)]"
                  )}
                >
                  <Icon size={20} className={active ? "text-[var(--acade-primary)]" : ""} />
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer — email + sign out */}
        <div className="mt-auto p-6 flex flex-col gap-2">
          <div className="px-3 py-2 rounded-lg bg-[var(--acade-overlay)]/30 text-[length:var(--text-xs)] text-[var(--acade-text-muted)] font-[family-name:var(--font-geist-mono)] truncate text-center">
            {user?.email}
          </div>
          <ThemeControl className="w-full" />
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-[var(--acade-danger)] hover:bg-[var(--acade-danger-dim)] transition-colors font-medium text-[length:var(--text-sm)] font-[family-name:var(--font-dm-sans)] text-left w-full"
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main id="admin-main-content" className="relative min-h-screen flex-1 lg:ml-[var(--admin-rail-width)]">
        <div className="mx-auto h-full w-full max-w-[1440px] p-4 sm:p-6 md:p-8">
          {children}
        </div>
      </main>

      <MobileDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} isAdmin={true} />
    </div>
  );
}
```

## Public header and footer

- Path: `components/layout/PublicShell.tsx`
- Description: Reusable public-site header/footer composition for branded marketing and utility routes.

```tsx
'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from '@/components/ui/Logo';
import { LinkButton, ThemeControl } from '@/components/ui';

export function PublicHeader() {
  const { user, loading } = useAuth();

  return (
    <nav
      aria-label="Public navigation"
      className="fixed inset-x-0 top-0 flex h-[var(--shell-header-height)] items-center justify-between border-b border-[var(--acade-border)] bg-[var(--acade-deep)]/96 px-4 backdrop-blur-md sm:px-6 md:px-8"
      style={{ zIndex: 'var(--z-sticky)' } as React.CSSProperties}
    >
      <Logo href="/" size="md" />
      <div className="flex items-center gap-2 sm:gap-4">
        <Link href="/about" className="hidden min-h-12 items-center text-sm text-[var(--acade-text-muted)] transition-colors hover:text-[var(--acade-text)] sm:inline-flex">About</Link>
        <Link href="/calculator" className="hidden min-h-12 items-center text-sm text-[var(--acade-text-muted)] transition-colors hover:text-[var(--acade-text)] sm:inline-flex">Calculator</Link>
        <ThemeControl compact className="hidden lg:grid" />
        {loading ? <span className="h-12 w-24" aria-hidden="true" /> : user ? (
          <LinkButton variant="primary" size="sm" href="/dashboard">Dashboard</LinkButton>
        ) : (
          <div className="flex items-center gap-2">
            <LinkButton className="hidden sm:inline-flex" variant="ghost" size="sm" href="/login">Sign in</LinkButton>
            <LinkButton variant="primary" size="sm" href="/register">Get started</LinkButton>
          </div>
        )}
      </div>
    </nav>
  );
}

const footerLinks = {
  Product: [
    ['Features', '/#features'],
    ['How it works', '/#how-it-works'],
    ['Calculator', '/calculator'],
    ['About', '/about'],
  ],
  'Your account': [
    ['Sign in', '/login'],
    ['Create account', '/register'],
    ['Open dashboard', '/dashboard'],
  ],
} as const;

export function PublicFooter() {
  return (
    <footer className="border-t border-[var(--acade-border)] bg-[var(--acade-deep)] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="mx-auto max-w-[1200px]">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_0.75fr_0.75fr]">
          <div>
            <Logo href="/" size="sm" />
            <p className="mt-4 max-w-sm text-sm leading-6 text-[var(--acade-text-muted)]">
              A clearer way to record results, understand academic progress, and plan what comes next.
            </p>
            <a href="mailto:support@acadegrade.com" className="mt-5 inline-flex min-h-12 items-center rounded-xl text-sm font-semibold text-[var(--acade-primary)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]">
              support@acadegrade.com
            </a>
          </div>

          {Object.entries(footerLinks).map(([group, links]) => (
            <nav key={group} aria-label={`${group} links`}>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--acade-text-faint)]">{group}</p>
              <div className="mt-4 grid gap-1">
                {links.map(([label, href]) => (
                  <Link key={href} href={href} className="flex min-h-11 items-center text-sm font-medium text-[var(--acade-text-muted)] transition-colors hover:text-[var(--acade-text)]">
                    {label}
                  </Link>
                ))}
              </div>
            </nav>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-[var(--acade-border-subtle)] pt-6 text-xs text-[var(--acade-text-faint)] sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} AcadeGrade. All rights reserved.</p>
          <p>Personal academic planning, not an official university record.</p>
        </div>
      </div>
    </footer>
  );
}
```

## Public navigation bar

- Path: `components/layout/Navbar.tsx`
- Description: Responsive public navigation with authentication-aware actions, theme control, and a mobile sheet menu.

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import { useAuth } from '@/hooks/useAuth';
import { IconButton, LinkButton, Logo, Sheet, ThemeControl } from '@/components/ui';

interface NavbarProps {
  className?: string;
}

const navLinks = [
  { label: 'Features', href: '/#features' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'About', href: '/about' },
  { label: 'Calculator', href: '/calculator' },
];

export function Navbar({ className }: NavbarProps) {
  const { user, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const sentinel = document.getElementById('hero-sentinel');
    if (!sentinel) {
      setScrolled(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { threshold: 0, rootMargin: '-80px 0px 0px 0px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <header
        className={cn(
          'sticky top-0 flex h-[var(--shell-header-height)] items-center border-b px-4 transition-[background-color,border-color,box-shadow] duration-200 sm:px-6 lg:px-8',
          scrolled
            ? 'border-[var(--acade-border)] bg-[var(--acade-deep)]/96 shadow-[var(--shadow-card)] backdrop-blur-md'
            : 'border-transparent bg-transparent',
          className
        )}
        style={{ zIndex: 'var(--z-sticky)' }}
      >
        <nav aria-label="Public navigation" className="mx-auto grid w-full max-w-[1280px] grid-cols-[1fr_auto] items-center gap-4 lg:grid-cols-[1fr_auto_1fr]">
          <Logo href="/" size="md" />

          <div className="hidden items-center justify-center gap-1 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex min-h-12 items-center rounded-xl px-4 text-sm font-medium text-[var(--acade-text-muted)] transition-colors hover:bg-[var(--acade-overlay)] hover:text-[var(--acade-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center justify-end gap-2 lg:flex">
            <ThemeControl compact />
            {loading ? <span className="h-12 w-24" aria-hidden="true" /> : user ? (
              <LinkButton variant="primary" size="sm" href="/dashboard">Dashboard</LinkButton>
            ) : (
              <>
                <LinkButton variant="ghost" size="sm" href="/login">Sign in</LinkButton>
                <LinkButton variant="primary" size="sm" href="/register">Get started</LinkButton>
              </>
            )}
          </div>

          <IconButton
            className="justify-self-end lg:hidden"
            aria-label="Open navigation menu"
            aria-expanded={mobileOpen}
            aria-controls="public-mobile-navigation"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" aria-hidden="true" />
          </IconButton>
        </nav>
      </header>

      <Sheet
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        title="Navigate AcadeGrade"
        className="h-auto max-h-[calc(100dvh-0.75rem)] lg:hidden"
      >
        <div className="pb-[max(0px,env(safe-area-inset-bottom))]">
          <nav id="public-mobile-navigation" aria-label="Mobile navigation" className="grid grid-cols-2 gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="flex min-h-11 items-center rounded-[var(--radius-control)] border border-transparent px-3 text-sm font-semibold text-[var(--acade-text)] transition-[background-color,border-color,color] duration-150 hover:border-[var(--acade-border)] hover:bg-[var(--acade-overlay)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="mt-4 border-t border-[var(--acade-border-subtle)] pt-4">
            <ThemeControl className="w-full" />
            <div className="mt-3 grid grid-cols-2 gap-2">
              {!loading && (user ? (
                <LinkButton className="col-span-2 whitespace-nowrap" fullWidth href="/dashboard" onClick={() => setMobileOpen(false)}>Dashboard</LinkButton>
              ) : (
                <>
                  <LinkButton fullWidth className="whitespace-nowrap px-3" variant="outline" href="/login" onClick={() => setMobileOpen(false)}>Sign in</LinkButton>
                  <LinkButton fullWidth className="whitespace-nowrap px-3" href="/register" onClick={() => setMobileOpen(false)}>Get started</LinkButton>
                </>
              ))}
            </div>
          </div>
        </div>
      </Sheet>
    </>
  );
}
```

## Mobile navigation drawer

- Path: `components/layout/MobileDrawer.tsx`
- Description: Shared student/admin mobile navigation drawer using canonical navigation metadata and Sheet.

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  BrainCircuit,
  Calculator,
  Info,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Settings,
  Shield,
  Users,
} from 'lucide-react';
import { signOut } from '@/lib/firebase/auth';
import { removeNotificationToken } from '@/lib/firebase/fcm';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils/cn';
import { Sheet, ThemeControl } from '@/components/ui';
import { adminNavigation, isRouteActive, studentNavigation, type NavigationIcon } from '@/lib/ui/route-meta';
import type { UserWithId } from '@/types/user';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  profile?: UserWithId | null;
  unreadCount?: number;
}

const ADMIN_ICONS: Record<NavigationIcon, React.ElementType> = {
  dashboard: LayoutDashboard,
  users: Users,
  courses: BookOpen,
  analytics: BarChart3,
  activity: Activity,
  ads: Megaphone,
  settings: Settings,
  results: BookOpen,
  insights: BrainCircuit,
  transcript: BookOpen,
};

export function MobileDrawer({
  isOpen,
  onClose,
  isAdmin = false,
  profile,
  unreadCount = 0,
}: MobileDrawerProps) {
  const { user } = useAuth();

  const handleSignOut = async () => {
    try {
      if (user?.uid) await removeNotificationToken(user.uid);
      await signOut();
      onClose();
    } catch (error) {
      console.error('Failed to sign out', error);
    }
  };

  return (
    <Sheet
      open={isOpen}
      onClose={onClose}
      title={isAdmin ? 'Admin navigation' : 'Student navigation'}
      description={isAdmin ? 'Manage AcadeGrade operations.' : 'Account, preferences and helpful tools.'}
      className="h-auto max-h-[calc(100dvh-0.75rem)] lg:hidden"
    >
      <div className="pb-[max(0px,env(safe-area-inset-bottom))]">
        {!isAdmin && user && (
          <div className="mb-4 flex items-center gap-3 rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-deep)] p-3">
            <div className="size-12 shrink-0 overflow-hidden rounded-full border-2 border-[var(--acade-primary)]/35 bg-[var(--acade-overlay)]">
              <img
                src={profile?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`}
                alt=""
                className="size-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-[var(--acade-text)]">
                {profile?.fullName || user.displayName || 'Student'}
              </p>
              <p className="truncate text-sm text-[var(--acade-text-muted)]">
                {profile?.matric || user.email || 'Academic profile'}
              </p>
            </div>
          </div>
        )}

        {isAdmin ? (
          <nav aria-label="Admin mobile navigation" className="grid gap-1">
            {adminNavigation.map((item) => {
              const Icon = ADMIN_ICONS[item.icon];
              return <DrawerLink key={item.href} href={item.href} icon={Icon} label={item.label} onClick={onClose} />;
            })}
          </nav>
        ) : (
          <>
            <nav aria-label="Student primary navigation" className="grid gap-1">
              {studentNavigation.map((item) => {
                const Icon = ADMIN_ICONS[item.icon];
                return <DrawerLink key={item.href} href={item.href} icon={Icon} label={item.label} onClick={onClose} />;
              })}
            </nav>

            <nav aria-label="Student account navigation" className="mt-4 grid gap-1">
              <DrawerLink href="/settings" id="tour-mobile-nav-settings" icon={Settings} label="Settings" onClick={onClose} />
              <DrawerLink href="/notifications" id="tour-mobile-nav-notifications" icon={Bell} label="Notifications" badge={unreadCount} onClick={onClose} />
            </nav>

            <nav aria-label="Student tools navigation" className="mt-4 grid gap-1">
              <DrawerLink href="/calculator" icon={Calculator} label="Quick calculator" onClick={onClose} />
              <DrawerLink href="/about" icon={Info} label="About AcadeGrade" onClick={onClose} />
            </nav>
          </>
        )}

        <div className="mt-4 border-t border-[var(--acade-border-subtle)] pt-4">
          <ThemeControl className="w-full" />
          {isAdmin && user?.email && (
            <p className="mt-3 truncate text-center text-xs text-[var(--acade-text-muted)]">{user.email}</p>
          )}
          <button
            type="button"
            id="tour-mobile-nav-logout"
            onClick={handleSignOut}
            className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] font-semibold text-[var(--acade-danger)] transition-colors hover:bg-[var(--acade-danger-dim)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-danger)]"
          >
            {isAdmin ? <Shield className="size-5" aria-hidden="true" /> : <LogOut className="size-5" aria-hidden="true" />}
            Sign out
          </button>
        </div>
      </div>
    </Sheet>
  );
}

function DrawerLink({
  href,
  icon: Icon,
  label,
  badge,
  id,
  onClick,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
  id?: string;
  onClick: () => void;
}) {
  const pathname = usePathname();
  const active = isRouteActive(pathname, href);

  return (
    <Link
      href={href}
      id={id}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-h-12 items-center gap-3 rounded-xl border px-4 py-3 font-medium transition-colors',
        active
          ? 'border-[var(--acade-primary)]/20 bg-[var(--acade-primary-dim)] text-[var(--acade-primary)]'
          : 'border-transparent text-[var(--acade-text-muted)] hover:bg-[var(--acade-overlay)] hover:text-[var(--acade-text)]'
      )}
    >
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="min-w-6 rounded-full bg-[var(--acade-primary)] px-2 py-0.5 text-center text-xs font-bold text-[var(--acade-on-primary)]">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  );
}
```

## Student bottom tab bar

- Path: `components/layout/BottomTabBar.tsx`
- Description: Persistent mobile primary navigation for student routes.

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { LayoutDashboard, BookOpen, BrainCircuit, FileText, Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useAnalytics } from '@/hooks/useAnalytics';
import { isRouteActive, studentNavigation, type NavigationIcon } from '@/lib/ui/route-meta';

const TAB_ICONS: Record<NavigationIcon, React.ElementType> = {
  dashboard: LayoutDashboard,
  results: BookOpen,
  insights: BrainCircuit,
  transcript: FileText,
  users: LayoutDashboard,
  courses: BookOpen,
  analytics: BrainCircuit,
  activity: BrainCircuit,
  ads: Megaphone,
  settings: LayoutDashboard,
};

export function BottomTabBar() {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const { insightsStale } = useAnalytics();

  return (
    <nav aria-label="Student tabs" className="fixed inset-x-0 bottom-0 border-t border-[var(--acade-border)] bg-[var(--acade-deep)]/96 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden" style={{ zIndex: 'var(--z-sticky)' }}>
      <div className="mx-auto flex h-16 max-w-xl items-center justify-around px-2">
        {studentNavigation.map((tab) => {
          const active = isRouteActive(pathname, tab.href);
          const Icon = TAB_ICONS[tab.icon];

          return (
            <Link
              key={tab.href}
              href={tab.href}
              id={`tour-mobile-nav-${tab.label.toLowerCase()}`}
              className="relative flex flex-col items-center justify-center w-full h-full gap-1 tap-highlight-transparent group"
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
            >
              {active && !shouldReduceMotion && (
                <motion.div
                  layoutId="bottom-tab-pill"
                  className="absolute inset-x-2 inset-y-1 rounded-2xl border border-[var(--acade-primary)]/20 bg-[var(--acade-primary-dim)]"
                  transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.8 }}
                />
              )}
              {active && shouldReduceMotion && (
                <div className="absolute inset-y-1 inset-x-2 bg-[var(--acade-primary)]/10 border border-[var(--acade-primary)]/20 rounded-2xl" />
              )}
              
              <div className="relative z-10">
                <Icon
                  size={20}
                  className={cn(
                    'transition-colors duration-300',
                    active ? 'fill-[var(--acade-primary)]/15 text-[var(--acade-primary)]' : 'text-[var(--acade-text-muted)] group-hover:text-[var(--acade-text)]'
                  )}
                  strokeWidth={active ? 2.5 : 2}
                />
                {tab.label === 'Insights' && insightsStale && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 z-10">
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full border-2 border-[var(--acade-deep)] bg-[var(--acade-danger)]"></span>
                  </span>
                )}
              </div>
              <span
                className={cn(
                  'relative z-10 text-xs font-semibold font-[family-name:var(--font-dm-sans)] transition-colors duration-150',
                  active ? 'text-[var(--acade-primary)]' : 'text-[var(--acade-text-muted)] group-hover:text-[var(--acade-text)]'
                )}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

## Notification popover

- Path: `components/layout/NotificationDropdown.tsx`
- Description: Compact notification list and actions embedded in the student shell header.

```tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, CheckCircle2, AlertTriangle, Lightbulb, Info, Check } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import { updateDocument } from '@/lib/firebase/firestore';
import { setRTDB } from '@/lib/firebase/rtdb';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils/cn';
import { formatDistanceToNow } from 'date-fns';

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { unreadCount, notifications, loading } = useNotifications();
  const shouldReduceMotion = useReducedMotion();

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    if (!notifications || !user) return;
    try {
      const unread = notifications.filter(n => !n.read);
      if (unread.length === 0) return;
      
      await Promise.all(
        unread.map(n => updateDocument(`notifications/${user.uid}/items/${n.id}`, { read: true }))
      );
      await setRTDB(`notif_counts/${user.uid}/unread`, 0);
    } catch (e) {
      console.error(e);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'achievement': return <CheckCircle2 size={16} className="text-[var(--acade-success)]" />;
      case 'warning': return <AlertTriangle size={16} className="text-[var(--acade-danger)]" />;
      case 'tip': return <Lightbulb size={16} className="text-[var(--acade-gold)]" />;
      case 'system':
      default: return <Info size={16} className="text-[var(--acade-primary)]" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full text-[var(--acade-text-muted)] hover:bg-[var(--acade-overlay)] hover:text-[var(--acade-text)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--acade-primary)]"
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1.5 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--acade-primary)] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--acade-primary)] border-2 border-[var(--acade-surface)]"></span>
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute -right-2 sm:right-0 mt-2 w-[calc(100vw-32px)] max-w-[360px] sm:w-80 bg-[var(--acade-deep)]/95 backdrop-blur-xl border border-[var(--acade-border)] rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.5)] z-50 overflow-hidden origin-top-right"
          >
            <div className="flex items-center justify-between p-4 border-b border-[var(--acade-border)]">
              <h3 className="text-[length:var(--text-base)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)]">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <button 
                  onClick={handleMarkAllRead}
                  className="text-[length:var(--text-xs)] text-[var(--acade-primary)] hover:text-[var(--acade-primary-glow)] font-semibold transition-colors flex items-center gap-1"
                >
                  <Check size={14} /> Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[320px] overflow-y-auto overscroll-contain">
              {loading ? (
                <div className="p-8 flex justify-center">
                  <div className="size-6 rounded-full border-2 border-[var(--acade-primary)] border-t-transparent animate-spin" />
                </div>
              ) : notifications.length > 0 ? (
                <div className="flex flex-col">
                  {notifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      className={cn(
                        "p-4 border-b border-[var(--acade-border-subtle)] hover:bg-[var(--acade-overlay)] transition-colors flex gap-3",
                        !notif.read ? "bg-[var(--acade-primary)]/5" : ""
                      )}
                    >
                      <div className="shrink-0 mt-0.5 bg-[var(--acade-deep)] p-1.5 rounded-full border border-[var(--acade-border)]">
                        {getIcon(notif.type)}
                      </div>
                      <div className="flex flex-col gap-1 flex-1">
                        <div className="flex justify-between items-start gap-2">
                          <span className={cn(
                            "text-[length:var(--text-sm)] font-bold font-[family-name:var(--font-dm-sans)]",
                            !notif.read ? "text-[var(--acade-text)]" : "text-[var(--acade-text-muted)]"
                          )}>
                            {notif.title}
                          </span>
                          {notif.createdAt && (
                            <span className="text-[10px] text-[var(--acade-text-faint)] whitespace-nowrap mt-0.5">
                              {formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                        <p className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)] line-clamp-2 leading-relaxed pr-4">
                          {notif.message}
                        </p>
                      </div>
                      {!notif.read && (
                        <div className="shrink-0 flex items-center self-center ml-1">
                          <div className="w-2 h-2 rounded-full bg-[var(--acade-primary)] shadow-[0_0_6px_var(--acade-primary)]" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center flex flex-col items-center gap-2">
                  <div className="bg-[var(--acade-deep)] p-3 rounded-full mb-2">
                    <Bell size={24} className="text-[var(--acade-text-faint)]" />
                  </div>
                  <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)]">No new notifications</p>
                </div>
              )}
            </div>

            <div className="p-2 border-t border-[var(--acade-border)] bg-[var(--acade-deep)]">
              <Link 
                href="/notifications" 
                onClick={() => setIsOpen(false)}
                className="block w-full text-center py-2 rounded-lg text-[length:var(--text-sm)] font-semibold text-[var(--acade-text-muted)] hover:text-[var(--acade-text)] hover:bg-[var(--acade-overlay)] transition-colors"
              >
                View all notifications →
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

## Authentication provider

- Path: `components/layout/AuthProvider.tsx`
- Description: Bridges the application root to the auth hook context.

```tsx
'use client';

import { type ReactNode } from 'react';
import { AuthContext, useAuthState } from '@/hooks/useAuth';

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider — wraps the app with Firebase Auth context.
 * Uses useAuthState() to subscribe to onAuthStateChanged and provides
 * the auth state to all children via AuthContext.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const authState = useAuthState();

  return (
    <AuthContext value={authState}>
      {children}
    </AuthContext>
  );
}
```

## Authentication shell

- Path: `components/auth/AuthShell.tsx`
- Description: Two-pane branded authentication layout with compact mobile presentation and theme control.

```tsx
import { BookOpenCheck, ChartNoAxesCombined, ShieldCheck } from 'lucide-react';
import { Card, Logo, ThemeControl } from '@/components/ui';
import { cn } from '@/lib/utils/cn';

const defaultProofItems = [
  'Keep every semester in one clear record',
  'Understand CGPA and performance trends together',
  'See what to improve before the next result',
] as const;

export interface AuthShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
  eyebrow?: string;
  support?: React.ReactNode;
  proofTitle?: string;
  proofDescription?: string;
  proofItems?: readonly string[];
  className?: string;
  contentClassName?: string;
}

function DegreeMeridian() {
  return (
    <div
      aria-hidden="true"
      className="relative overflow-hidden rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-deep)] p-5 shadow-[var(--shadow-card)]"
    >
      <div className="absolute inset-0 opacity-45 [background-image:linear-gradient(var(--acade-border-subtle)_1px,transparent_1px),linear-gradient(90deg,var(--acade-border-subtle)_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="relative">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[length:var(--text-xs)] font-semibold uppercase tracking-[0.15em] text-[var(--acade-text-muted)]">
            Degree meridian
          </span>
          <span className="rounded-full bg-[var(--acade-primary-dim)] px-2.5 py-1 text-[length:var(--text-xs)] font-semibold text-[var(--acade-primary)]">
            Clear outlook
          </span>
        </div>

        <svg viewBox="0 0 420 152" className="mt-5 h-auto w-full" focusable="false">
          <path
            d="M10 124 C82 122 92 96 154 98 C224 101 242 56 302 64 C346 69 366 41 410 28"
            fill="none"
            stroke="var(--acade-border)"
            strokeWidth="18"
            strokeLinecap="round"
            opacity="0.32"
          />
          <path
            d="M10 124 C82 122 92 96 154 98 C224 101 242 56 302 64 C346 69 366 41 410 28"
            fill="none"
            stroke="var(--acade-primary)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {[10, 154, 302, 410].map((x, index) => {
            const y = [124, 98, 64, 28][index];
            return (
              <circle
                key={x}
                cx={x}
                cy={y}
                r="7"
                fill="var(--acade-deep)"
                stroke="var(--acade-primary)"
                strokeWidth="4"
              />
            );
          })}
        </svg>

        <div className="mt-1 grid grid-cols-3 gap-2 text-[length:var(--text-xs)] font-medium text-[var(--acade-text-muted)]">
          <span>Results</span>
          <span className="text-center">CGPA + PI</span>
          <span className="text-right">Outlook</span>
        </div>
      </div>
    </div>
  );
}

export function AuthShell({
  title,
  description,
  children,
  eyebrow,
  support,
  proofTitle = 'See your whole degree clearly',
  proofDescription = 'Turn scattered results into a dependable academic record and a practical view of what comes next.',
  proofItems = defaultProofItems,
  className,
  contentClassName,
}: AuthShellProps) {
  const titleId = `auth-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'page'}-title`;

  return (
    <div
      className={cn(
        'min-h-dvh bg-[var(--acade-void)] text-[var(--acade-text)]',
        'lg:grid lg:grid-cols-[minmax(20rem,0.82fr)_minmax(32rem,1.18fr)]',
        className
      )}
    >
      <aside
        aria-labelledby={`${titleId}-proof`}
        className="relative hidden min-h-dvh overflow-hidden border-r border-[var(--acade-border-subtle)] bg-[var(--acade-primary-dim)] p-8 lg:flex lg:flex-col lg:justify-between xl:p-10"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 top-1/3 size-72 rounded-full border border-[var(--acade-primary)] opacity-10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-12 top-1/3 size-72 rounded-full border border-[var(--acade-primary)] opacity-10"
        />

        <div className="relative max-w-xl pt-10 xl:pt-14">
          <p className="text-[length:var(--text-xs)] font-semibold uppercase tracking-[0.18em] text-[var(--acade-primary)]">
            Academic clarity, semester by semester
          </p>
          <h2
            id={`${titleId}-proof`}
            className="mt-4 max-w-lg font-[family-name:var(--font-bricolage)] text-[length:clamp(2rem,3.2vw,3rem)] font-bold leading-[1.04] tracking-[-0.035em]"
          >
            {proofTitle}
          </h2>
          <p className="mt-4 max-w-lg text-[length:var(--text-base)] leading-7 text-[var(--acade-text-muted)]">
            {proofDescription}
          </p>
        </div>

        <div className="relative my-8 max-w-xl xl:my-10">
          <DegreeMeridian />

          <ul className="mt-6 grid gap-3">
            {proofItems.map((item, index) => {
              const Icon = [BookOpenCheck, ChartNoAxesCombined, ShieldCheck][index % 3];
              return (
                <li
                  key={item}
                  className="flex items-start gap-3 text-[length:var(--text-sm)] leading-6 text-[var(--acade-text-muted)]"
                >
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-[var(--acade-border)] bg-[var(--acade-deep)] text-[var(--acade-primary)]">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span>{item}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="relative text-[length:var(--text-xs)] leading-5 text-[var(--acade-text-muted)]">
          Built for the rhythm of Nigerian university life.
        </p>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-col">
        <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8 xl:px-10">
          <Logo href="/" size="sm" />
          <ThemeControl compact />
        </header>

        <main
          aria-labelledby={titleId}
          className="flex flex-1 items-start justify-center px-4 pb-8 pt-3 sm:px-6 sm:pb-10 sm:pt-5 lg:px-8 xl:px-10"
        >
          <div className={cn('w-full max-w-[33rem]', contentClassName)}>
            <Card
              padding="none"
              className="overflow-hidden rounded-[var(--radius-dialog)] border-[var(--acade-border)] p-5 shadow-[var(--shadow-popover)] sm:p-7"
            >
              {eyebrow && (
                <p className="mb-3 text-[length:var(--text-xs)] font-semibold uppercase tracking-[0.16em] text-[var(--acade-primary)]">
                  {eyebrow}
                </p>
              )}
              <h1
                id={titleId}
                className="font-[family-name:var(--font-bricolage)] text-[length:clamp(1.65rem,3.5vw,2.1rem)] font-bold leading-tight tracking-[-0.03em]"
              >
                {title}
              </h1>
              <p className="mt-2 max-w-[46ch] text-[length:var(--text-sm)] leading-6 text-[var(--acade-text-muted)] sm:text-[length:var(--text-base)]">
                {description}
              </p>

              <div className="mt-6">{children}</div>

              {support && (
                <nav
                  aria-label="Authentication support"
                  className="mt-7 border-t border-[var(--acade-border-subtle)] pt-5 text-center text-[length:var(--text-sm)] text-[var(--acade-text-muted)] [&_a]:font-semibold [&_a]:text-[var(--acade-primary)] [&_a]:underline-offset-4 hover:[&_a]:underline focus-within:[&_a]:outline-none focus-within:[&_a]:ring-2 focus-within:[&_a]:ring-[var(--acade-primary)]"
                >
                  {support}
                </nav>
              )}
            </Card>

            <p className="mt-5 text-center text-[length:var(--text-xs)] leading-5 text-[var(--acade-text-muted)]">
              Your academic data stays attached to your account and is never changed by signing in.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
```


