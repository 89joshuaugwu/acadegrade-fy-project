import { adminRouteTitle } from '@/components/admin/navigation';

export type NavigationIcon =
  | 'dashboard'
  | 'results'
  | 'insights'
  | 'transcript'
  | 'users'
  | 'courses'
  | 'analytics'
  | 'activity'
  | 'ai'
  | 'ads'
  | 'settings';

export interface NavigationItem {
  href: string;
  label: string;
  icon: NavigationIcon;
}

export interface RouteMeta {
  title: string;
  parentHref?: string;
}

export const studentNavigation: NavigationItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/results', label: 'Results', icon: 'results' },
  { href: '/insights', label: 'Insights', icon: 'insights' },
  { href: '/transcript', label: 'Transcript', icon: 'transcript' },
];

function cleanPath(pathname: string) {
  const path = pathname.split(/[?#]/)[0].replace(/\/+$/, '');
  return path || '/';
}

export function isRouteActive(pathname: string, href: string) {
  const current = cleanPath(pathname);
  const target = cleanPath(href);
  if (target === '/dashboard' || target === '/admin/dashboard') return current === target;
  return current === target || current.startsWith(`${target}/`);
}

export function getRouteMeta(pathname: string): RouteMeta {
  const current = cleanPath(pathname);

  if (current === '/results/new') return { title: 'Add semester', parentHref: '/results' };
  if (/^\/results\/[^/]+$/.test(current)) {
    return { title: 'Semester result', parentHref: '/results' };
  }

  const known: Record<string, RouteMeta> = {
    '/': { title: 'AcadeGrade' },
    '/login': { title: 'Sign in' },
    '/register': { title: 'Create account' },
    '/dashboard': { title: 'Dashboard' },
    '/results': { title: 'Results' },
    '/insights': { title: 'AI insights' },
    '/transcript': { title: 'Academic transcript' },
    '/notifications': { title: 'Notifications' },
    '/settings': { title: 'Settings' },
  };
  if (known[current]) return known[current];

  // Admin titles have one source of truth: components/admin/navigation.ts.
  if (current === '/admin' || current.startsWith('/admin/')) return { title: adminRouteTitle(current) };

  const owner = studentNavigation.find((item) => isRouteActive(current, item.href));
  return owner
    ? { title: owner.label, parentHref: owner.href }
    : { title: 'AcadeGrade' };
}
