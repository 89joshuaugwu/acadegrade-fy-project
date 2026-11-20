'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/lib/firebase/auth';
import { removeNotificationToken } from '@/lib/firebase/fcm';
import { cn } from '@/lib/utils/cn';
import { ThemeControl } from '@/components/ui/ThemeControl';
import { Sheet } from '@/components/ui/Sheet';
import { RouteAnnouncer } from '@/components/shared/RouteAnnouncer';
import { AcadeGradeMark } from '@/components/public/Logo';
import { ADMIN_NAV_GROUPS, adminRouteTitle, isAdminRouteActive, type AdminNavGroup } from '@/components/admin/navigation';

/**
 * The admin console frame (brand v2): a Night rail with the arc mark on desktop, a Night top bar with
 * the section name on phones and tablets, and the same grouped navigation in a sheet.
 * The rail is a dark island (`dark` class), so kit controls inside it use the dark tokens in both themes.
 */
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

  const initial = (user?.email ?? 'A').trim().charAt(0).toUpperCase();

  return (
    <div className="ag-admin min-h-screen bg-[var(--acade-void)] flex flex-col lg:flex-row">
      <a href="#admin-main-content" className="sr-only z-[var(--z-tooltip)] rounded-[12px] bg-[var(--acade-primary)] px-4 py-3 text-[var(--acade-on-primary)] focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
      <RouteAnnouncer title={title} />
      {/* Phone and tablet top bar */}
      <header className="ag-admin-rail dark sticky top-0 flex h-[var(--shell-header-height)] shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 lg:hidden" style={{ zIndex: 'var(--z-sticky)' }}>
        <div className="flex min-w-0 items-center gap-3">
          <AcadeGradeMark size={28} />
          <span className="min-w-0">
            <span className="block text-[0.8125rem] leading-4 text-ag-mist-night">AcadeGrade admin</span>
            <span className="ag-admin-display block truncate text-[1.0625rem] font-bold leading-6 text-white">{title}</span>
          </span>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          type="button"
          className="flex size-11 shrink-0 items-center justify-center rounded-[12px] text-white/80 ring-1 ring-white/15 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ag-gold"
          aria-label={`Open ${title} navigation`}
          aria-expanded={drawerOpen}
        >
          <Menu size={22} />
        </button>
      </header>

      {/* Desktop rail */}
      <aside aria-label="Admin navigation" className="ag-admin-rail dark fixed inset-y-0 left-0 hidden w-[var(--admin-rail-width)] flex-col border-r border-white/10 lg:flex" style={{ zIndex: 'var(--z-sticky)' }}>
        <div className="flex items-center gap-3 px-6 pb-5 pt-6">
          <AcadeGradeMark size={32} />
          <span className="min-w-0">
            <span className="ag-admin-display block text-[1.1875rem] font-bold leading-6 text-white">AcadeGrade</span>
            <span className="block text-[0.8125rem] leading-4 text-ag-mist-night">Admin console</span>
          </span>
        </div>

        <div className="ag-admin-rail-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          <AdminNavLinks label="Admin primary navigation" groups={ADMIN_NAV_GROUPS} pathname={pathname} />
        </div>

        <div className="flex min-w-0 flex-col gap-3 border-t border-white/10 p-4">
          <div className="flex min-w-0 items-center gap-3 rounded-[14px] bg-white/[0.06] px-3 py-2.5">
            <span className="ag-admin-display flex size-9 shrink-0 items-center justify-center rounded-full bg-ag-gold text-[0.9375rem] font-bold text-ag-ink" aria-hidden="true">{initial}</span>
            <span className="min-w-0">
              <span className="block text-[0.8125rem] leading-4 text-ag-mist-night">Signed in as</span>
              <span className="block truncate text-sm font-medium text-white" title={user?.email ?? undefined}>{user?.email}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeControl compact className="min-w-0 flex-1" />
            <button
              type="button"
              onClick={handleSignOut}
              className="flex min-h-12 shrink-0 items-center gap-2 rounded-[12px] px-3 text-sm font-medium text-white/80 ring-1 ring-white/15 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ag-gold"
            >
              <LogOut size={18} aria-hidden="true" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main id="admin-main-content" className="relative min-h-screen min-w-0 flex-1 lg:ml-[var(--admin-rail-width)]">
        <div className="mx-auto h-full w-full max-w-[1320px] px-4 py-6 sm:px-6 md:px-8 lg:py-9">
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
          <AdminNavLinks label="Admin mobile navigation" groups={ADMIN_NAV_GROUPS} pathname={pathname} onNavigate={() => setDrawerOpen(false)} tone="sheet" />
          <div className="mt-4 border-t border-[var(--acade-border-subtle)] pt-4">
            <ThemeControl className="w-full" />
            {user?.email && <p className="mt-3 truncate text-center text-sm text-[var(--acade-text-muted)]">{user.email}</p>}
            <button
              type="button"
              onClick={() => { setDrawerOpen(false); void handleSignOut(); }}
              className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-[12px] font-semibold text-[var(--acade-danger)] ring-1 ring-[var(--acade-border-subtle)] transition-colors hover:bg-[var(--acade-danger-dim)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-danger)]"
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

function AdminNavLinks({ label, groups, pathname, onNavigate, tone = 'rail' }: {
  label: string;
  groups: AdminNavGroup[];
  pathname: string;
  onNavigate?: () => void;
  tone?: 'rail' | 'sheet';
}) {
  const rail = tone === 'rail';
  return (
    <nav aria-label={label} className={cn('flex flex-col', rail ? 'gap-5' : 'gap-4')}>
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
                'relative flex min-h-11 items-center gap-3 rounded-[12px] px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2',
                rail
                  ? cn(
                    'ag-admin-rail-link focus-visible:outline-ag-gold',
                    active ? 'bg-white/[0.09] text-white' : 'text-ag-mist-night hover:bg-white/[0.05] hover:text-white',
                  )
                  : cn(
                    'focus-visible:outline-[var(--acade-primary)]',
                    active ? 'bg-[var(--acade-primary-dim)] text-[var(--acade-primary)]' : 'text-[var(--acade-text)] hover:bg-[var(--acade-overlay)]',
                  ),
              )}
            >
              <Icon size={18} aria-hidden="true" className={cn('shrink-0', rail && active && 'text-ag-gold')} />
              {item.label}
            </Link>
          );
        });
        if (!group.label) return <div key="primary" className="space-y-0.5">{links}</div>;
        return (
          <div key={group.label} role="group" aria-label={group.label} className="space-y-0.5">
            <p aria-hidden="true" className={cn('mb-1 px-3 text-[0.8125rem] font-medium', rail ? 'text-white/45' : 'text-[var(--acade-text-muted)]')}>{group.label}</p>
            {links}
          </div>
        );
      })}
    </nav>
  );
}
