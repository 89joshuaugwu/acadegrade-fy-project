'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, LogOut, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/lib/firebase/auth';
import { removeNotificationToken } from '@/lib/firebase/fcm';
import { cn } from '@/lib/utils/cn';
import { ThemeControl } from '@/components/ui/ThemeControl';
import { Sheet } from '@/components/ui/Sheet';
import { RouteAnnouncer } from '@/components/shared/RouteAnnouncer';
import { ADMIN_NAV_GROUPS, adminRouteTitle, isAdminRouteActive, type AdminNavGroup } from '@/components/admin/navigation';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user } = useAuth();
  const pathname = usePathname();
  const title = adminRouteTitle(pathname);

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
      <a href="#admin-main-content" className="sr-only z-[var(--z-tooltip)] rounded-lg bg-[var(--acade-primary)] px-4 py-3 text-[var(--acade-on-primary)] focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
      <RouteAnnouncer title={title} />
      {/* Mobile and tablet header */}
      <header className="sticky top-0 flex h-[var(--shell-header-height)] shrink-0 items-center justify-between gap-3 border-b border-[var(--acade-border)] bg-[var(--acade-deep)] px-4 lg:hidden" style={{ zIndex: 'var(--z-sticky)' }}>
        <div className="flex min-w-0 items-center gap-2 font-[family-name:var(--font-bricolage)] text-lg font-bold text-[var(--acade-text)]">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--acade-primary-dim)]"><Shield size={20} className="text-[var(--acade-primary)]" /></span>
          <span className="truncate">{title}</span>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          type="button"
          className="flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-[var(--acade-text-muted)] transition-colors hover:bg-[var(--acade-overlay)] hover:text-[var(--acade-text)]"
          aria-label={`Open ${title} navigation`}
          aria-expanded={drawerOpen}
        >
          <Menu size={24} />
        </button>
      </header>

      {/* Desktop sidebar */}
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
          <AdminNavLinks label="Admin primary navigation" groups={ADMIN_NAV_GROUPS} pathname={pathname} />
        </div>

        {/* Footer — email + sign out */}
        <div className="mt-auto flex min-w-0 flex-col gap-2 border-t border-[var(--acade-border)] p-3">
          <div className="min-w-0 break-all rounded-lg bg-[var(--acade-overlay)]/30 px-2 py-2 text-center font-[family-name:var(--font-geist-mono)] text-[length:var(--text-xs)] leading-5 text-[var(--acade-text-muted)]">
            {user?.email}
          </div>
          <ThemeControl compact className="w-full" />
          <button
            type="button"
            onClick={handleSignOut}
            className="flex min-h-12 items-center gap-3 px-4 py-3 rounded-xl text-[var(--acade-danger)] hover:bg-[var(--acade-danger-dim)] transition-colors font-medium text-[length:var(--text-sm)] font-[family-name:var(--font-dm-sans)] text-left w-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]"
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main id="admin-main-content" className="relative min-h-screen min-w-0 flex-1 lg:ml-[var(--admin-rail-width)]">
        <div className="mx-auto h-full w-full max-w-[1440px] p-4 sm:p-6 md:p-8">
          {children}
        </div>
      </main>

      <Sheet
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Admin navigation"
        description="Manage AcadeGrade operations."
        className="h-auto max-h-[calc(100dvh-0.75rem)] lg:hidden"
      >
        <div className="pb-[max(0px,env(safe-area-inset-bottom))]">
          <AdminNavLinks label="Admin mobile navigation" groups={ADMIN_NAV_GROUPS} pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
          <div className="mt-4 border-t border-[var(--acade-border-subtle)] pt-4">
            <ThemeControl className="w-full" />
            {user?.email && <p className="mt-3 truncate text-center text-xs text-[var(--acade-text-muted)]">{user.email}</p>}
            <button
              type="button"
              onClick={() => { setDrawerOpen(false); void handleSignOut(); }}
              className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] font-semibold text-[var(--acade-danger)] transition-colors hover:bg-[var(--acade-danger-dim)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-danger)]"
            >
              <LogOut className="size-5" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}

function AdminNavLinks({ label, groups, pathname, onNavigate }: {
  label: string;
  groups: AdminNavGroup[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label={label} className="flex flex-col gap-5">
      {groups.map((group) => {
        const links = group.items.map((item) => {
          const active = isAdminRouteActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-h-11 items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)] font-[family-name:var(--font-dm-sans)]',
                active
                  ? 'bg-[var(--acade-primary-dim)] text-[var(--acade-primary)]'
                  : 'text-[var(--acade-text-muted)] hover:bg-[var(--acade-overlay)] hover:text-[var(--acade-text)]'
              )}
            >
              <Icon size={18} aria-hidden="true" className="shrink-0" />
              {item.label}
            </Link>
          );
        });
        if (!group.label) return <div key="primary" className="space-y-1">{links}</div>;
        return (
          <div key={group.label} role="group" aria-label={group.label} className="space-y-1">
            <p aria-hidden="true" className="mb-1.5 px-4 text-xs font-medium text-[var(--acade-text-muted)]">{group.label}</p>
            {links}
          </div>
        );
      })}
    </nav>
  );
}
