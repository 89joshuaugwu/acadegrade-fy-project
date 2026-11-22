import { getEmailSiteUrl } from '@/lib/email/templates';

/**
 * Where an inbox item (notifications/{uid}/items) links to. The web inbox and
 * the Android app both follow `actionUrl`, so only same-site destinations are
 * stored: a relative path, or an absolute link on this site's origin (stored
 * as its path). Other hosts, protocol-relative links and javascript:/data:
 * URLs are dropped.
 */
const MAX_LENGTH = 2048;

/** Obvious destinations for push events that do not carry their own data.url. */
const EVENT_ROUTES: Record<string, string> = {
  degreeClass: '/insights',
  aiInsights: '/insights',
  semesterSaved: '/results',
};

const SITE_FALLBACK = 'https://acadegrade.vercel.app';

/** This site's origins: the configured site URL plus the production fallback. */
export function siteOrigins(): string[] {
  const origins = new Set<string>([SITE_FALLBACK]);
  try {
    origins.add(new URL(getEmailSiteUrl()).origin);
  } catch {
    // The fallback is enough.
  }
  return [...origins];
}

export function safeInboxActionUrl(value: unknown, origins: readonly string[] = siteOrigins()): string | null {
  if (typeof value !== 'string') return null;
  const candidate = value.trim();
  if (!candidate || candidate.length > MAX_LENGTH) return null;
  // Control characters and backslashes can smuggle a different host past parsers.
  if (/[\u0000-\u001f\u007f\\]/.test(candidate)) return null;

  if (candidate.startsWith('/')) {
    if (candidate.startsWith('//')) return null;
    return candidate;
  }

  if (!/^https:\/\//i.test(candidate)) return null;
  try {
    const parsed = new URL(candidate);
    const allowed = new Set(origins.map((origin) => origin.toLowerCase()));
    if (!allowed.has(parsed.origin.toLowerCase())) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || '/';
  } catch {
    return null;
  }
}

/** A validated data.url wins; otherwise the event's obvious route, if any. */
export function inboxActionUrl(
  input: { url?: unknown; event?: unknown },
  origins: readonly string[] = siteOrigins(),
): string | null {
  const explicit = safeInboxActionUrl(input.url, origins);
  if (explicit) return explicit;
  return typeof input.event === 'string' && Object.hasOwn(EVENT_ROUTES, input.event) ? EVENT_ROUTES[input.event] : null;
}
