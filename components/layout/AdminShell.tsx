'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/lib/firebase/auth';
import { removeNotificationToken } from '@/lib/firebase/fcm';
import { cn } from '@/lib/utils/cn';
import { ThemeControl } from '@/components/ui/ThemeControl';
import { RouteAnnouncer } from '@/components/shared/RouteAnnouncer';
import { AcadeGradeMark } from '@/components/public/Logo';
import { ADMIN_NAV_GROUPS, adminRouteTitle, isAdminRouteActive, type AdminNavGroup } from '@/components/admin/navigation';
import { AdminSignOutDialog } from '@/components/admin/AdminSignOutDialog';
import { useAdminNavBadges } from '@/components/admin/useAdminNavBadges';
import { AdminAccountSheet, AdminSectionsSheet, AdminTabBar, AdminTopBar } from '@/components/layout/AdminMobileNav';

type PhoneSheet = 'sections' | 'find' | 'account' | null;

/** Focus an element after a dialog closes, once the shared Modal has run its own focus return. */
function focusLater(element: HTMLElement | null) {
  requestAnimationFrame(() => requestAnimationFrame(() => element?.focus()));
}

/**
 * The admin console frame (brand v2). Desktop: a Night rail with the arc mark and grouped navigation.
 * Phones and tablets: a Night top bar (section name, Find, Account), a bottom bar with the four
 * most-used destinations and More, and dark sheets for every section and for the account
 * (AdminMobileNav). Every sign-out the admin asks for goes through the "Sign out?" confirmation.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const [sheet, setSheet] = useState<PhoneSheet>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const findRef = useRef<HTMLButtonElement>(null);
  const accountRef = useRef<HTMLButtonElement>(null);
  const { user } = useAuth();
  const pathname = usePathname();
  const title = adminRouteTitle(pathname);
  const badges = useAdminNavBadges(user, pathname);

  const askToSignOut = (returnTo: HTMLElement | null) => {
    returnFocus.current = returnTo;
    setSheet(null);
    setConfirmOpen(true);
  };

  const cancelSignOut = () => {
    setConfirmOpen(false);
    focusLater(returnFocus.current);
  };

  const confirmSignOut = async () => {
    setSigningOut(true);
    try {
      if (user?.uid) {
        await removeNotificationToken(user.uid);
      }
      await signOut();
    } catch (error) {
      console.error('Failed to sign out', error);
    } finally {
      setSigningOut(false);
      setConfirmOpen(false);
    }
  };

  const initial = (user?.email ?? 'A').trim().charAt(0).toUpperCase();

  return (
    <div className="ag-admin min-h-screen bg-[var(--acade-void)] flex flex-col lg:flex-row">
      <a href="#admin-main-content" className="sr-only z-[var(--z-tooltip)] rounded-[12px] bg-[var(--acade-primary)] px-4 py-3 text-[var(--acade-on-primary)] focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
      <RouteAnnouncer title={title} />

      <AdminTopBar
        title={title}
        initial={initial}
        onFind={() => setSheet('find')}
        onAccount={() => setSheet('account')}
        accountOpen={sheet === 'account'}
        findRef={findRef}
        accountRef={accountRef}
      />

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
          <AdminRailLinks groups={ADMIN_NAV_GROUPS} pathname={pathname} />
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
              onClick={(event) => askToSignOut(event.currentTarget)}
              className="flex min-h-12 shrink-0 items-center gap-2 rounded-[12px] px-3 text-sm font-medium text-white/80 ring-1 ring-white/15 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ag-gold"
            >
              <LogOut size={18} aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content, with room at the foot for the phone bottom bar */}
      <main id="admin-main-content" className="relative min-h-screen min-w-0 flex-1 pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:ml-[var(--admin-rail-width)] lg:pb-0">
        <div className="mx-auto h-full w-full max-w-[1320px] px-4 py-6 sm:px-6 md:px-8 lg:py-9">
          {children}
        </div>
      </main>

      <AdminTabBar
        pathname={pathname}
        badges={badges}
        moreOpen={sheet === 'sections' || sheet === 'find'}
        onMore={() => setSheet('sections')}
        moreRef={moreRef}
      />

      <AdminSectionsSheet
        open={sheet === 'sections' || sheet === 'find'}
        startWithFind={sheet === 'find'}
        onClose={() => setSheet(null)}
        pathname={pathname}
        badges={badges}
      />

      <AdminAccountSheet
        open={sheet === 'account'}
        onClose={() => setSheet(null)}
        email={user?.email}
        initial={initial}
        onSignOut={() => askToSignOut(accountRef.current)}
      />

      <AdminSignOutDialog open={confirmOpen} busy={signingOut} onCancel={cancelSignOut} onConfirm={() => void confirmSignOut()} />
    </div>
  );
}

function AdminRailLinks({ groups, pathname }: { groups: AdminNavGroup[]; pathname: string }) {
  return (
    <nav aria-label="Admin primary navigation" className="flex flex-col gap-5">
      {groups.map((group) => {
        const links = group.items.map((item) => {
          const active = isAdminRouteActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'ag-admin-rail-link relative flex min-h-11 items-center gap-3 rounded-[12px] px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ag-gold',
                active ? 'bg-white/[0.09] text-white' : 'text-ag-mist-night hover:bg-white/[0.05] hover:text-white',
              )}
            >
              <Icon size={18} aria-hidden="true" className={cn('shrink-0', active && 'text-ag-gold')} />
              {item.label}
            </Link>
          );
        });
        if (!group.label) return <div key="primary" className="space-y-0.5">{links}</div>;
        return (
          <div key={group.label} role="group" aria-label={group.label} className="space-y-0.5">
            <p aria-hidden="true" className="mb-1 px-3 text-[0.8125rem] font-medium text-white/45">{group.label}</p>
            {links}
          </div>
        );
      })}
    </nav>
  );
}
