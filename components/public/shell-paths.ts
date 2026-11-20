/**
 * Which shell a route under app/(public) uses.
 *
 * app/(public)/layout.tsx renders the Public shell (skip link, header,
 * main#content, footer) for every page by default. Pages that need another
 * shell are listed here; for them the layout renders only the page, and the
 * page wraps itself in AuthShell or MinimalShell. Matching is by whole path
 * segment, so /c/ABC is minimal but /calculator is not.
 */

export type PublicShellKind = 'public' | 'auth' | 'minimal';

export const AUTH_SHELL_PREFIXES = ['/login', '/register', '/forgot-password'] as const;
export const MINIMAL_SHELL_PREFIXES = ['/share', '/c'] as const;

function matches(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function shellForPath(pathname: string | null | undefined): PublicShellKind {
  const path = (pathname || '/').split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  if (AUTH_SHELL_PREFIXES.some((prefix) => matches(path, prefix))) return 'auth';
  if (MINIMAL_SHELL_PREFIXES.some((prefix) => matches(path, prefix))) return 'minimal';
  return 'public';
}
