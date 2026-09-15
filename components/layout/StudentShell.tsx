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
