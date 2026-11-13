import {
  Activity, BarChart3, BookOpen, BrainCircuit, Coins, LayoutDashboard, Megaphone, ScrollText,
  Settings, Smartphone, Users, type LucideIcon,
} from 'lucide-react';

/**
 * Admin navigation, grouped by job (spec 2026-11-13, Part 3.2).
 *
 * This replaces `adminNavigation` in `lib/ui/route-meta.ts` for the admin
 * shell; that list is left untouched for any other reader.
 */
export interface AdminNavItem { href: string; label: string; icon: LucideIcon }
export interface AdminNavGroup { label: string | null; items: AdminNavItem[] }

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  { label: null, items: [{ href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard }] },
  {
    label: 'Students',
    items: [
      { href: '/admin/users', label: 'Users', icon: Users },
      { href: '/admin/academic-catalog', label: 'Academic catalogue', icon: BookOpen },
    ],
  },
  {
    label: 'Monitoring',
    items: [
      { href: '/admin/analytics', label: 'Academic analytics', icon: BarChart3 },
      { href: '/admin/api-analytics', label: 'API health', icon: Activity },
    ],
  },
  {
    label: 'AI, limits & ads',
    items: [
      { href: '/admin/ai', label: 'AI providers', icon: BrainCircuit },
      { href: '/admin/usage', label: 'Free uses & coins', icon: Coins },
      { href: '/admin/ads', label: 'Advertising', icon: Megaphone },
    ],
  },
  {
    label: 'Release & system',
    items: [
      { href: '/admin/mobile-release', label: 'Android release', icon: Smartphone },
      { href: '/admin/settings', label: 'Settings', icon: Settings },
      { href: '/admin/audit', label: 'Audit log', icon: ScrollText },
    ],
  },
];

/** Routes that exist but are not in the navigation. */
const HIDDEN_ROUTE_TITLES: Record<string, string> = {
  '/admin/courses': 'Legacy course list',
};

function cleanPath(pathname: string) {
  return pathname.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
}

export function isAdminRouteActive(pathname: string, href: string) {
  const current = cleanPath(pathname);
  if (href === '/admin/dashboard') return current === href;
  return current === href || current.startsWith(`${href}/`);
}

/** The section name shown in the mobile header and announced on navigation. */
export function adminRouteTitle(pathname: string) {
  const current = cleanPath(pathname);
  if (HIDDEN_ROUTE_TITLES[current]) return HIDDEN_ROUTE_TITLES[current];
  const item = ADMIN_NAV_GROUPS.flatMap((group) => group.items).find((entry) => isAdminRouteActive(current, entry.href));
  return item?.label ?? 'Admin';
}
