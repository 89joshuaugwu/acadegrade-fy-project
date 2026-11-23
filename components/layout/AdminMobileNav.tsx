// Client module without its own 'use client': only AdminShell (a client component) imports it, so its
// function props never cross the server boundary.
import { forwardRef, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LayoutGrid, LogOut, Search } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Modal } from '@/components/ui/Modal';
import { ThemeControl } from '@/components/ui/ThemeControl';
import { AcadeGradeMark } from '@/components/public/Logo';
import {
  ADMIN_NAV_GROUPS, ADMIN_TAB_ITEMS, filterAdminNav, isAdminRouteActive, isAdminRouteInMore,
} from '@/components/admin/navigation';
import type { AdminNavBadges } from '@/components/admin/useAdminNavBadges';

/*
 * Phone and tablet admin navigation (below the lg rail):
 * a Night top bar (section name, Find, Account), a Night bottom bar with the four most-used
 * destinations plus More, and two dark sheets: every section grouped by job, and the account.
 * The sheets are the shared Modal, so they trap focus, close on Escape, lock and release the page
 * scroll, and hand focus back to the button that opened them.
 */

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ag-gold';

/** Square 44px icon button for the top bar, with a tooltip on hover and keyboard focus. */
const TopBarButton = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }>(
  ({ label, children, className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      className={cn('group relative flex size-11 shrink-0 items-center justify-center rounded-[12px] text-white/85 transition-colors hover:bg-white/10 hover:text-white motion-reduce:transition-none', focusRing, className)}
      {...props}
    >
      {children}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-[calc(100%+6px)] whitespace-nowrap rounded-[8px] bg-ag-night-2 px-2.5 py-1.5 text-[0.8125rem] font-medium text-white opacity-0 shadow-[0_6px_16px_rgba(14,11,43,0.35)] ring-1 ring-white/10 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
      >
        {label}
      </span>
    </button>
  ),
);
TopBarButton.displayName = 'TopBarButton';

export function AdminTopBar({ title, initial, onFind, onAccount, accountOpen, findRef, accountRef }: {
  title: string;
  initial: string;
  onFind: () => void;
  onAccount: () => void;
  accountOpen: boolean;
  findRef: React.Ref<HTMLButtonElement>;
  accountRef: React.Ref<HTMLButtonElement>;
}) {
  return (
    <header
      className="ag-admin-rail dark sticky top-0 flex shrink-0 items-center gap-2 border-b border-white/10 pl-4 pr-2 pt-[env(safe-area-inset-top)] lg:hidden"
      style={{ zIndex: 'var(--z-sticky)' }}
    >
      <div className="flex h-[var(--shell-header-height)] min-w-0 flex-1 items-center gap-3">
        <AcadeGradeMark size={28} />
        <span className="min-w-0">
          <span className="block text-[0.8125rem] leading-4 text-ag-mist-night">AcadeGrade admin</span>
          <span className="ag-admin-display block truncate text-[1.0625rem] font-bold leading-6 text-white">{title}</span>
        </span>
      </div>
      <TopBarButton ref={findRef} label="Find a section" onClick={onFind} aria-haspopup="dialog">
        <Search className="size-5" aria-hidden="true" />
      </TopBarButton>
      <TopBarButton ref={accountRef} label="Account" onClick={onAccount} aria-haspopup="dialog" aria-expanded={accountOpen}>
        <span className="ag-admin-display flex size-8 items-center justify-center rounded-full bg-ag-gold text-[0.875rem] font-bold text-ag-ink" aria-hidden="true">{initial}</span>
      </TopBarButton>
    </header>
  );
}

function CountBadge({ text, className }: { text: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-ag-gold px-1.5 text-[0.6875rem] font-bold leading-none tabular-nums text-ag-ink', className)}
    >
      {text}
    </span>
  );
}

export function AdminTabBar({ pathname, badges, moreOpen, onMore, moreRef }: {
  pathname: string;
  badges: AdminNavBadges;
  moreOpen: boolean;
  onMore: () => void;
  moreRef: React.Ref<HTMLButtonElement>;
}) {
  const moreCurrent = isAdminRouteInMore(pathname);
  const tabClass = cn('group flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-[12px] px-1 pb-1.5 pt-2', focusRing);
  const iconWell = (active: boolean) => cn(
    'relative flex h-8 w-14 items-center justify-center rounded-full transition-colors motion-reduce:transition-none',
    active ? 'bg-white/[0.12] text-ag-gold' : 'text-white/70 group-hover:bg-white/[0.06] group-hover:text-white',
  );
  const labelClass = (active: boolean) => cn('max-w-full truncate text-[0.75rem] leading-4', active ? 'font-semibold text-white' : 'font-medium text-ag-mist-night');

  return (
    <nav
      aria-label="Admin quick navigation"
      className="dark fixed inset-x-0 bottom-0 border-t border-white/10 bg-ag-night px-2 pb-[env(safe-area-inset-bottom)] lg:hidden"
      style={{ zIndex: 'var(--z-sticky)' }}
    >
      <div className="mx-auto grid max-w-xl grid-cols-5 gap-1">
        {ADMIN_TAB_ITEMS.map((item) => {
          const active = isAdminRouteActive(pathname, item.href);
          const badge = badges[item.href];
          const name = item.shortLabel ?? item.label;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              aria-label={badge ? `${name}, ${badge.spoken}` : undefined}
              className={tabClass}
            >
              <span className={iconWell(active)}>
                <Icon className="size-5" aria-hidden="true" />
                {badge ? <CountBadge text={badge.text} className="absolute -top-1 left-[calc(50%+4px)] ring-2 ring-ag-night" /> : null}
              </span>
              <span className={labelClass(active)}>{name}</span>
            </Link>
          );
        })}
        <button
          ref={moreRef}
          type="button"
          onClick={onMore}
          aria-label="More sections"
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          data-current={moreCurrent ? 'true' : undefined}
          className={tabClass}
        >
          <span className={iconWell(moreCurrent || moreOpen)}>
            <LayoutGrid className="size-5" aria-hidden="true" />
          </span>
          <span className={labelClass(moreCurrent || moreOpen)} aria-hidden="true">More</span>
        </button>
      </div>
    </nav>
  );
}

const darkSheet = 'dark ag-admin-sheet lg:hidden';

export function AdminSectionsSheet({ open, onClose, pathname, badges, startWithFind }: {
  open: boolean;
  onClose: () => void;
  pathname: string;
  badges: AdminNavBadges;
  startWithFind: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const fieldRef = useRef<HTMLInputElement>(null);
  const firstFocusRef = useRef<HTMLAnchorElement>(null);
  const baseId = useId();
  const groups = filterAdminNav(ADMIN_NAV_GROUPS, query);
  const items = groups.flatMap((group) => group.items);
  const activeHref = items.find((item) => isAdminRouteActive(pathname, item.href))?.href;
  const focusHref = activeHref ?? items[0]?.href;

  const close = () => { setQuery(''); onClose(); };

  const tile = (item: (typeof items)[number], wide = false) => {
    const active = isAdminRouteActive(pathname, item.href);
    const badge = badges[item.href];
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        ref={item.href === focusHref ? firstFocusRef : undefined}
        href={item.href}
        onClick={close}
        aria-current={active ? 'page' : undefined}
        aria-label={badge ? `${item.label}, ${badge.spoken}` : undefined}
        className={cn(
          'flex min-h-14 min-w-0 items-center gap-2.5 rounded-[14px] py-2 pl-3 pr-2.5 text-[0.875rem] leading-[1.125rem] transition-colors motion-reduce:transition-none',
          focusRing,
          wide && 'col-span-2 min-h-12',
          active ? 'bg-white/[0.13] font-semibold text-white' : 'bg-white/[0.05] font-medium text-white/90 hover:bg-white/[0.09]',
        )}
      >
        <Icon className={cn('size-5 shrink-0', active ? 'text-ag-gold' : 'text-ag-mist-night')} aria-hidden="true" />
        <span className="min-w-0 flex-1 text-balance">{item.label}</span>
        {badge ? <CountBadge text={badge.text} className="shrink-0" /> : null}
      </Link>
    );
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="All sections"
      presentation="sheet"
      initialFocusRef={startWithFind ? fieldRef : firstFocusRef}
      className={cn(darkSheet, 'h-[calc(100dvh-2rem)]')}
    >
      <div className="pb-[env(safe-area-inset-bottom)]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[1.125rem] -translate-y-1/2 text-ag-mist-night" aria-hidden="true" />
          <input
            ref={fieldRef}
            type="search"
            aria-label="Find a section"
            placeholder="Find a section"
            value={query}
            enterKeyHint="go"
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' || !items[0]) return;
              event.preventDefault();
              router.push(items[0].href);
              close();
            }}
            className="h-12 w-full rounded-[12px] border border-white/12 bg-white/[0.06] pl-11 pr-4 text-base text-white placeholder:text-ag-mist-night [&::-webkit-search-cancel-button]:appearance-none"
          />
        </div>

        {items.length === 0 ? (
          <p role="status" className="mt-6 text-center text-sm text-ag-mist-night">No section called “{query.trim()}”.</p>
        ) : (
          <nav aria-label="All admin sections" className="mt-4 flex flex-col gap-4">
            {groups.map((group, index) => {
              if (!group.label) {
                return <div key="primary" className="grid grid-cols-2 gap-2">{group.items.map((item) => tile(item, true))}</div>;
              }
              const headingId = `${baseId}-group-${index}`;
              return (
                <div key={group.label} role="group" aria-labelledby={headingId}>
                  <h3 id={headingId} className="mb-2 px-1 text-[0.8125rem] font-medium text-ag-mist-night">{group.label}</h3>
                  <div className="grid grid-cols-2 gap-2">{group.items.map((item) => tile(item))}</div>
                </div>
              );
            })}
          </nav>
        )}
      </div>
    </Modal>
  );
}

export function AdminAccountSheet({ open, onClose, email, initial, onSignOut }: {
  open: boolean;
  onClose: () => void;
  email: string | null | undefined;
  initial: string;
  onSignOut: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Account" presentation="sheet" className={darkSheet}>
      <div className="flex flex-col gap-4 pb-[env(safe-area-inset-bottom)]">
        <div className="flex min-w-0 items-center gap-3 rounded-[14px] bg-white/[0.06] px-3 py-3">
          <span className="ag-admin-display flex size-10 shrink-0 items-center justify-center rounded-full bg-ag-gold text-base font-bold text-ag-ink" aria-hidden="true">{initial}</span>
          <span className="min-w-0">
            <span className="block text-[0.8125rem] leading-4 text-ag-mist-night">Signed in as</span>
            <span className="block truncate text-[0.9375rem] font-medium text-white">{email ?? 'Administrator'}</span>
          </span>
        </div>
        <div>
          <p className="mb-2 px-1 text-[0.8125rem] font-medium text-ag-mist-night">Appearance</p>
          <ThemeControl className="w-full" />
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[12px] font-semibold text-[var(--acade-danger)] ring-1 ring-white/12 transition-colors hover:bg-[var(--acade-danger-dim)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-danger)] motion-reduce:transition-none"
        >
          <LogOut className="size-5" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </Modal>
  );
}
