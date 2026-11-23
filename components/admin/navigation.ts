import {
  Activity, BarChart3, BookOpen, BrainCircuit, Coins, FileText, LayoutDashboard, LifeBuoy, Megaphone, Quote, ScrollText,
  Settings, Share2, Smartphone, Users, type LucideIcon,
} from 'lucide-react';

/**
 * Admin navigation, grouped by job (spec 2026-11-13, Part 3.2).
 *
 * This replaces `adminNavigation` in `lib/ui/route-meta.ts` for the admin
 * shell; that list is left untouched for any other reader.
 */
export interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shorter name for the phone bottom bar. */
  shortLabel?: string;
}
export interface AdminNavGroup { label: string | null; items: AdminNavItem[] }

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  { label: null, items: [{ href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard }] },
  {
    label: 'Students',
    items: [
      { href: '/admin/users', label: 'Users', icon: Users },
      { href: '/admin/academic-catalog', label: 'Academic catalogue', shortLabel: 'Catalogue', icon: BookOpen },
      { href: '/admin/support', label: 'Support inbox', shortLabel: 'Support', icon: LifeBuoy },
      { href: '/admin/share-codes', label: 'Share codes', icon: Share2 },
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
      { href: '/admin/legal', label: 'Legal documents', icon: FileText },
      { href: '/admin/testimonials', label: 'Testimonials', icon: Quote },
      { href: '/admin/audit', label: 'Audit log', icon: ScrollText },
    ],
  },
];

const ALL_ITEMS = ADMIN_NAV_GROUPS.flatMap((group) => group.items);

/**
 * The phone bottom bar: the four destinations used most (the daily glance, people, the queue students
 * are waiting on, and catalogue suggestions to review). Everything else sits behind More.
 */
export const ADMIN_TAB_ITEMS: AdminNavItem[] = ['/admin/dashboard', '/admin/users', '/admin/support', '/admin/academic-catalog']
  .map((href) => ALL_ITEMS.find((item) => item.href === href)!)
  .filter(Boolean);

/** True when the open section is not one of the bottom-bar tabs, so More carries the "you are here" mark. */
export function isAdminRouteInMore(pathname: string) {
  return !ADMIN_TAB_ITEMS.some((item) => isAdminRouteActive(pathname, item.href));
}

/** Sections whose name contains every word typed, in navigation order. */
export function filterAdminNav(groups: AdminNavGroup[], query: string): AdminNavGroup[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return groups;
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        const haystack = `${item.label} ${item.shortLabel ?? ''} ${group.label ?? ''}`.toLowerCase();
        return words.every((word) => haystack.includes(word));
      }),
    }))
    .filter((group) => group.items.length > 0);
}

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
  const item = ALL_ITEMS.find((entry) => isAdminRouteActive(current, entry.href));
  return item?.label ?? 'Admin';
}
