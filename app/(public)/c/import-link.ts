/**
 * Share-code links (H5). Pure helpers shared by the public /c/[code] page and
 * the student results pages. No server or Firebase imports.
 */

export const IMPORT_CODE_PATTERN = /^[A-Z0-9]{6}$/;

const PENDING_KEY = 'acadegrade.pendingImportCode';
const PENDING_TTL_MS = 24 * 60 * 60 * 1000;

/** Uppercased six-character letter-and-digit code, or null. */
export function normaliseImportCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const code = raw.trim().toUpperCase();
  return IMPORT_CODE_PATTERN.test(code) ? code : null;
}

/** Android deep link; handled by the app's import-code route. */
export function androidImportLink(code: string): string {
  return `acadegrade://import-code?code=${encodeURIComponent(code)}`;
}

export interface NavigatorLike {
  userAgent?: string;
  userAgentData?: { platform?: string } | null;
}

/**
 * True on Android phones and tablets (client hints first, then the user agent).
 * The deep link only works there, so the page offers it only on Android.
 */
export function isAndroidDevice(nav: NavigatorLike | null | undefined): boolean {
  if (!nav) return false;
  const platform = nav.userAgentData?.platform;
  if (typeof platform === 'string' && platform.trim().toLowerCase() === 'android') return true;
  return typeof nav.userAgent === 'string' && /Android/i.test(nav.userAgent);
}

/** Web import path. The student area asks for sign-in first. */
export function webImportPath(code: string): string {
  return `/results?importCode=${encodeURIComponent(code)}`;
}

/** Public link to a share code's course list. */
export function shareCodeLinkPath(code: string): string {
  return `/c/${encodeURIComponent(code)}`;
}

/**
 * Keeps a code on this device while the visitor signs in or registers, because
 * the sign-in redirect drops the query string. Storage failures are ignored.
 */
export function rememberPendingImportCode(code: string, now = Date.now()): void {
  const normalised = normaliseImportCode(code);
  if (!normalised) return;
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify({ code: normalised, at: now }));
  } catch {
    // Private mode or blocked storage: the ?importCode= link still works when signed in.
  }
}

/** Returns the pending code once (then forgets it), or null when none or older than a day. */
export function takePendingImportCode(now = Date.now()): string | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    localStorage.removeItem(PENDING_KEY);
    const parsed = JSON.parse(raw) as { code?: unknown; at?: unknown };
    if (typeof parsed.at !== 'number' || now - parsed.at > PENDING_TTL_MS || now < parsed.at) return null;
    return normaliseImportCode(parsed.code);
  } catch {
    return null;
  }
}
