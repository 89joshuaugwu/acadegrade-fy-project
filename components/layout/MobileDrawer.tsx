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
  Settings,
  Shield,
  Users,
} from 'lucide-react';
import { signOut } from '@/lib/firebase/auth';
import { removeNotificationToken } from '@/lib/firebase/fcm';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils/cn';
import { Sheet, ThemeControl } from '@/components/ui';
import { adminNavigation, isRouteActive, type NavigationIcon } from '@/lib/ui/route-meta';
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
      title={isAdmin ? 'Admin navigation' : 'More'}
      description={isAdmin ? 'Manage AcadeGrade operations.' : 'Account, preferences and helpful tools.'}
      className="lg:hidden"
    >
      {!isAdmin && user && (
        <div className="mb-5 flex items-center gap-4 rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-deep)] p-4">
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

      <nav aria-label={isAdmin ? 'Admin mobile navigation' : 'Student secondary navigation'} className="grid gap-1">
        {isAdmin ? (
          adminNavigation.map((item) => {
            const Icon = ADMIN_ICONS[item.icon];
            return <DrawerLink key={item.href} href={item.href} icon={Icon} label={item.label} onClick={onClose} />;
          })
        ) : (
          <>
            <DrawerLink href="/settings" id="tour-mobile-nav-settings" icon={Settings} label="Settings" onClick={onClose} />
            <DrawerLink href="/calculator" icon={Calculator} label="Quick calculator" onClick={onClose} />
            <DrawerLink href="/notifications" id="tour-mobile-nav-notifications" icon={Bell} label="Notifications" badge={unreadCount} onClick={onClose} />
            <DrawerLink href="/about" icon={Info} label="About AcadeGrade" onClick={onClose} />
          </>
        )}
      </nav>

      <div className="mt-5 border-t border-[var(--acade-border-subtle)] pt-5">
        <ThemeControl className="w-full" />
        {isAdmin && user?.email && (
          <p className="mt-4 truncate text-center text-xs text-[var(--acade-text-muted)]">{user.email}</p>
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
