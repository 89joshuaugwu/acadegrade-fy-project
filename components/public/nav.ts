/**
 * Navigation for the public header, menu sheet and footer
 * (docs/public-redesign/04-site-map-navigation-seo.md §3, 02 §4.3).
 * Four header links plus one action; the footer carries the full set so
 * every public page is reachable within two clicks.
 */

export interface NavLink {
  href: string;
  label: string;
}

export const HEADER_LINKS: readonly NavLink[] = [
  { href: '/features', label: 'Features' },
  { href: '/tools', label: 'Free tools' },
  { href: '/app', label: 'Android app' },
  { href: '/about', label: 'About' },
];

/** Extra links in the phone menu after the four header links. */
export const MENU_EXTRA_LINKS: readonly NavLink[] = [
  { href: '/calculator', label: 'Calculator' },
  { href: '/support', label: 'Support' },
];

export const AUTH_LINKS = {
  signIn: { href: '/login', label: 'Sign in' },
  getStarted: { href: '/register', label: 'Get started' },
  dashboard: { href: '/dashboard', label: 'Open dashboard' },
} as const;

export interface FooterGroup {
  id: string;
  title: string;
  links: readonly NavLink[];
}

/** "Cookie choices" is a link to this hash; CookieStub reopens on it. */
export const COOKIE_CHOICES_HREF = '#cookie-choices';

export const FOOTER_GROUPS: readonly FooterGroup[] = [
  {
    id: 'product',
    title: 'Product',
    links: [
      { href: '/features', label: 'Features' },
      { href: '/features/result-scanner', label: 'Result scanner' },
      { href: '/features/ai-insights', label: 'AcadeMind' },
      { href: '/features/timetable', label: 'Timetable' },
      { href: '/app', label: 'Android app' },
    ],
  },
  {
    id: 'tools',
    title: 'Free tools',
    links: [
      { href: '/calculator', label: 'CGPA calculator' },
      { href: '/tools/degree-class-checker', label: 'Degree class checker' },
      { href: '/tools/required-gpa', label: 'Required GPA' },
      { href: '/tools/carry-over-impact', label: 'Carry-over impact' },
      { href: '/tools/weighted-average', label: 'Weighted average' },
    ],
  },
  {
    id: 'help',
    title: 'Help and legal',
    links: [
      { href: '/support', label: 'Support' },
      { href: '/privacy', label: 'Privacy notice' },
      { href: '/terms', label: 'Terms of use' },
      { href: '/account-deletion', label: 'Delete your account' },
      { href: COOKIE_CHOICES_HREF, label: 'Cookie choices' },
    ],
  },
];

/** True when `href` is the current page or a section of it (Features is current on /features/timetable). */
export function isCurrentPath(pathname: string | null | undefined, href: string): boolean {
  if (!pathname) return false;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export const IMPRINT_LINE = 'Personal academic planning, not an official university record';
