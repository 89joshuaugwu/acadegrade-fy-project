/**
 * Share-link helpers for the student's transcript page: reading a pasted link
 * or id, and the short labels on each shared link. Pure; safe anywhere.
 */

export type ParsedShareInput =
  | { ok: true; id: string }
  | { ok: false; reason: 'empty' | 'not-a-share-link' | 'other-site' };

export interface ParseShareInputOptions {
  /** Hosts (with port when not default) that serve this site, e.g. "acadegrade.vercel.app". */
  allowedHosts: readonly string[];
}

/** Current ids are 12 hex characters; older ones may be Firestore auto ids. */
const SHARE_ID = /^[A-Za-z0-9_-]{6,64}$/;
const SHARE_PATH = /^\/share\/([^/]+)\/?$/;
/** Wrapping a pasted message often adds: quotes, brackets, angle brackets, sentence punctuation. */
const WRAPPING = /^[\s"'`<(\[{]+|[\s"'`>)\]}.,;:!?]+$/g;

const normaliseHost = (host: string) => host.trim().toLowerCase().replace(/^www\./, '');

function readId(raw: string): ParsedShareInput {
  let id = raw;
  try {
    id = decodeURIComponent(raw);
  } catch {
    return { ok: false, reason: 'not-a-share-link' };
  }
  return SHARE_ID.test(id) ? { ok: true, id } : { ok: false, reason: 'not-a-share-link' };
}

/**
 * Reads what a student pasted: a full share link on this site (with or without
 * the scheme), the "/share/{id}" path, or a bare id. Links on any other host are refused.
 */
export function parseShareInput(input: string, { allowedHosts }: ParseShareInputOptions): ParsedShareInput {
  const value = String(input ?? '').replace(WRAPPING, '');
  if (!value) return { ok: false, reason: 'empty' };

  if (SHARE_ID.test(value)) return { ok: true, id: value };

  const pathOnly = value.match(SHARE_PATH);
  if (pathOnly) return readId(pathOnly[1]);

  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(value);
  if (hasScheme && !/^https?:\/\//i.test(value)) return { ok: false, reason: 'not-a-share-link' };
  // Without a scheme it must at least look like "host/…".
  if (!hasScheme && !/^[a-z0-9-]+(\.[a-z0-9-]+)*(:\d+)?\//i.test(value)) return { ok: false, reason: 'not-a-share-link' };

  let url: URL;
  try {
    url = new URL(hasScheme ? value : `https://${value}`);
  } catch {
    return { ok: false, reason: 'not-a-share-link' };
  }

  const allowed = new Set(allowedHosts.map(normaliseHost));
  if (!allowed.has(normaliseHost(url.host))) return { ok: false, reason: 'other-site' };

  const match = url.pathname.match(SHARE_PATH);
  return match ? readId(match[1]) : { ok: false, reason: 'not-a-share-link' };
}

/** "acadegrade.vercel.app/share/0a1b2c3d4e5f": no scheme, no www, so it fits on one line. */
export function shortShareLink(url: string): string {
  try {
    const parsed = new URL(url);
    return `${normaliseHost(parsed.host)}${parsed.pathname.replace(/\/$/, '')}`;
  } catch {
    return url;
  }
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function toTime(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const withToDate = value as { toDate?: () => Date };
  const date = typeof withToDate.toDate === 'function' ? withToDate.toDate() : new Date(value as string | number | Date);
  const time = date.getTime();
  return Number.isFinite(time) ? time : null;
}

/** "Expires in 7 days", "Expires in 6 hours", "Expired"; null for an unreadable date. */
export function expiryChipLabel(expiresAt: unknown, now: number = Date.now()): string | null {
  const time = toTime(expiresAt);
  if (time === null) return null;
  const left = time - now;
  if (left <= 0) return 'Expired';
  if (left < HOUR) return 'Expires in under an hour';
  if (left < DAY) {
    const hours = Math.ceil(left / HOUR);
    return `Expires in ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }
  const days = Math.ceil(left / DAY);
  return `Expires in ${days} ${days === 1 ? 'day' : 'days'}`;
}

/** The expiry as a full date for the tooltip and screen readers. */
export function expiryDateText(expiresAt: unknown): string | null {
  const time = toTime(expiresAt);
  if (time === null) return null;
  return new Date(time).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function viewsLabel(count: unknown): string | null {
  if (typeof count !== 'number' || !Number.isFinite(count) || count < 0) return null;
  if (count === 0) return 'No views yet';
  return count === 1 ? '1 view' : `${count} views`;
}
