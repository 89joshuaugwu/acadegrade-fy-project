/**
 * The checked `?next=` return path for /maintenance (maintenance.md §5.4,
 * owner decision C15). Pure; safe on the client and the server.
 *
 * Call sites (owned by other lanes): sign in, register and the student layout
 *   router.replace(buildMaintenanceRedirect(pathname + search))
 * and the maintenance page reads `safeNextPath(searchParams.get('next'))`.
 */

export const MAINTENANCE_PATH = '/maintenance';
const MAX_NEXT_LENGTH = 512;

/**
 * A same-site path to return to, or `/`. Accepted only when it starts with a single
 * `/`, is not `//…` or `/\…`, is not the maintenance page itself, holds no
 * backslash, whitespace or control character, and is under 512 characters.
 */
export function safeNextPath(next: unknown): string {
  if (typeof next !== 'string') return '/';
  if (!next || next.length >= MAX_NEXT_LENGTH) return '/';
  if (!next.startsWith('/') || next.startsWith('//')) return '/';
  // Browsers treat `\` as `/`, so `/\evil.example` would leave the site.
  if (next.includes('\\')) return '/';
  // eslint-disable-next-line no-control-regex
  if (/[\s\u0000-\u001f\u007f]/.test(next)) return '/';
  const pathOnly = next.split(/[?#]/)[0].toLowerCase();
  if (pathOnly === MAINTENANCE_PATH || pathOnly.startsWith(`${MAINTENANCE_PATH}/`)) return '/';
  return next;
}

/** `/maintenance?next=<encoded path>`, or plain `/maintenance` when there is nowhere better to return to. */
export function buildMaintenanceRedirect(currentPath: string): string {
  const next = safeNextPath(currentPath);
  return next === '/' ? MAINTENANCE_PATH : `${MAINTENANCE_PATH}?next=${encodeURIComponent(next)}`;
}

const AUTH_PATHS = ['/login', '/register', '/forgot-password'];

/**
 * Where sign in sends a student with a complete profile: the checked `?next=` from
 * `search` (for example "?next=%2Fsettings%23delete-account"), else `fallback`.
 * The auth pages themselves and `/` give the fallback, so a stale link cannot loop.
 */
export function afterSignInPath(search: string, fallback = '/dashboard'): string {
  let raw: string | null = null;
  try {
    raw = new URLSearchParams(search).get('next');
  } catch {
    raw = null;
  }
  const next = safeNextPath(raw);
  const pathOnly = next.split(/[?#]/)[0].toLowerCase();
  if (next === '/' || AUTH_PATHS.includes(pathOnly)) return fallback;
  return next;
}

/** `/login?next=<encoded path>` so sign in returns the student to the page they asked for. */
export function buildSignInRedirect(currentPath: string): string {
  const next = safeNextPath(currentPath);
  return next === '/' ? '/login' : `/login?next=${encodeURIComponent(next)}`;
}
