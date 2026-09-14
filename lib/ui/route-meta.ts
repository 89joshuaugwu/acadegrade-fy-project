export type NavigationIcon =
  | 'dashboard'
  | 'results'
  | 'insights'
  | 'transcript'
  | 'users'
  | 'courses'
  | 'analytics'
  | 'activity'
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

export const adminNavigation: NavigationItem[] = [
  { href: '/admin/dashboard', label: 'Overview', icon: 'dashboard' },
  { href: '/admin/users', label: 'Users', icon: 'users' },
  { href: '/admin/courses', label: 'Course catalogue', icon: 'courses' },
  { href: '/admin/analytics', label: 'Analytics', icon: 'analytics' },
  { href: '/admin/api-analytics', label: 'API monitor', icon: 'activity' },
  { href: '/admin/settings', label: 'Settings', icon: 'settings' },
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
    '/admin/dashboard': { title: 'Admin overview' },
    '/admin/users': { title: 'Users' },
    '/admin/courses': { title: 'Course catalogue' },
    '/admin/analytics': { title: 'Analytics' },
    '/admin/api-analytics': { title: 'API monitor' },
    '/admin/settings': { title: 'Admin settings' },
  };
  if (known[current]) return known[current];

  const owner = [...studentNavigation, ...adminNavigation]
    .find((item) => isRouteActive(current, item.href));
  return owner
    ? { title: owner.label, parentHref: owner.href }
    : { title: 'AcadeGrade' };
}
