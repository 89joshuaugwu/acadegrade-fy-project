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
