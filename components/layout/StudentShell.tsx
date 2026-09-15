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
      <header className="sticky top-0 flex h-[var(--shell-header-height)] items-center justify-between border-b border-[var(--acade-border)] bg-[var(--acade-deep)] px-4 lg:hidden" style={{ zIndex: 'var(--z-sticky)' }}>
        <Logo size="sm" />
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
        <div className="p-6">
          <Logo size="md" className="mb-8" />

          {/* Profile snippet */}
          <div className="mb-8 flex flex-col items-center rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-surface)] p-4 shadow-[var(--shadow-card)]">
            <div className="mb-3 rounded-full border-2 border-[var(--acade-primary)]/50 overflow-hidden size-16 shrink-0 relative flex items-center justify-center bg-[var(--acade-deep)]">
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`} alt="Avatar" className="w-full h-full object-cover" />
              )}
            </div>
            <span className="text-[length:var(--text-base)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)] truncate w-full text-center">
              {profile?.fullName || user?.displayName || 'Student'}
            </span>
            <span className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)] font-[family-name:var(--font-geist-mono)] truncate max-w-full">
              {profile?.matric || 'No Matric'}
            </span>
          </div>

          <nav id="tour-sidebar-nav" aria-label="Primary" className="flex flex-col gap-1.5">
            {studentNavigation.map((tab) => {
              const active = isRouteActive(pathname, tab.href);
              const Icon = STUDENT_ICONS[tab.icon];
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  id={`tour-desktop-nav-${tab.label.toLowerCase()}`}
                  className={cn(
                    "relative flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium text-[length:var(--text-sm)] font-[family-name:var(--font-dm-sans)] group",
                    active
                      ? "text-[var(--acade-primary)]"
                      : "border border-transparent text-[var(--acade-text-muted)] hover:bg-[var(--acade-overlay)] hover:text-[var(--acade-text)]"
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="sidebar-pill"
                      className="absolute inset-0 rounded-xl border border-[var(--acade-primary)]/20 bg-[var(--acade-primary-dim)]"
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

        <div className="mt-auto p-6 flex flex-col gap-1.5">
          <div className="mb-2">
            <Link
              href="/notifications"
              id="tour-desktop-nav-notifications"
              className={cn(
                "relative flex items-center justify-between px-4 py-3 rounded-xl transition-colors font-medium text-[length:var(--text-sm)] font-[family-name:var(--font-dm-sans)] group",
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
          </div>
          
          <Link
            href="/settings"
            id="tour-desktop-nav-settings"
            className={cn(
              "relative flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium text-[length:var(--text-sm)] font-[family-name:var(--font-dm-sans)] group",
              isRouteActive(pathname, '/settings')
                ? "text-[var(--acade-primary)]"
                : "text-[var(--acade-text-muted)] hover:text-[var(--acade-text)] hover:bg-[var(--acade-overlay)] border border-transparent"
            )}
          >
            {isRouteActive(pathname, '/settings') && (
              <motion.div
                layoutId="sidebar-pill"
                className="absolute inset-0 bg-[var(--acade-primary)]/10 border border-[var(--acade-primary)]/20 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.05)]"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <Settings size={20} className={cn("relative z-10", isRouteActive(pathname, '/settings') ? "text-[var(--acade-primary-glow)]" : "")} />
            <span className="relative z-10">Settings</span>
          </Link>
          
          <ThemeControl className="mb-2 w-full" />
          <button
            type="button"
            id="tour-desktop-nav-logout"
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-[var(--acade-danger)] hover:bg-[var(--acade-danger-dim)] transition-colors font-medium text-[length:var(--text-sm)] font-[family-name:var(--font-dm-sans)] text-left w-full mt-2"
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main id="main-content" className="relative min-h-screen flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:ml-[var(--student-rail-width)] lg:pb-0">
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
