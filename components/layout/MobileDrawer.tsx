'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, LogOut, Settings } from 'lucide-react';
import { useTimetableEnabled } from '@/hooks/useTimetableEnabled';
import { signOut } from '@/lib/firebase/auth';
import { removeNotificationToken } from '@/lib/firebase/fcm';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils/cn';
import { Sheet, ThemeControl } from '@/components/ui';
import { isRouteActive } from '@/lib/ui/route-meta';
import type { UserWithId } from '@/types/user';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  profile?: UserWithId | null;
  unreadCount?: number;
}

export function MobileDrawer({
  isOpen,
  onClose,
  profile,
}: MobileDrawerProps) {
  const { user } = useAuth();
  const timetableEnabled = useTimetableEnabled();

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
      title="Account and preferences"
      description="Manage your profile, display preferences and session."
      className="h-auto max-h-[calc(100dvh-0.75rem)] lg:hidden"
    >
      <div className="pb-[max(0px,env(safe-area-inset-bottom))]">
        {user && (
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

        <nav aria-label="Account settings" className="grid gap-1">
          {timetableEnabled && (
            <DrawerLink href="/timetable" id="tour-mobile-nav-timetable" icon={CalendarDays} label="Timetable" onClick={onClose} />
          )}
          <DrawerLink href="/settings" id="tour-mobile-nav-settings" icon={Settings} label="Settings" onClick={onClose} />
        </nav>

        <div className="mt-4 border-t border-[var(--acade-border-subtle)] pt-4">
          <ThemeControl className="w-full" />
          <button
            type="button"
            id="tour-mobile-nav-logout"
            onClick={handleSignOut}
            className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] font-semibold text-[var(--acade-danger)] transition-colors hover:bg-[var(--acade-danger-dim)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-danger)]"
          >
            <LogOut className="size-5" aria-hidden="true" />
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
