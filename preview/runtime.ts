/**
 * UI preview runtime (dev only). See preview/README.md.
 *
 * Nothing here is bundled unless the dev server runs with AG_UI_PREVIEW=1 (next.config.ts swaps the
 * Firebase client packages for preview/mocks/*). Even then, preview is OFF until a browser opts in with
 * `?ag-preview=student` or `?ag-preview=admin` (kept in a cookie; `?ag-preview=off` clears it).
 * While it is on, Firebase and every same-origin /api call are answered from preview/fixtures in memory:
 * nothing reaches the real backend.
 */

export type PreviewRole = 'student' | 'admin';

const COOKIE = 'ag-ui-preview';

function readRole(): PreviewRole | null {
  if (typeof window === 'undefined') return null;
  try {
    const asked = new URLSearchParams(window.location.search).get('ag-preview');
    if (asked === 'off') {
      document.cookie = `${COOKIE}=; path=/; max-age=0`;
      return null;
    }
    if (asked === 'student' || asked === 'admin') {
      document.cookie = `${COOKIE}=${asked}; path=/; max-age=86400; samesite=lax`;
      return asked;
    }
    const match = document.cookie.match(/(?:^|;\s*)ag-ui-preview=(student|admin)/);
    return match ? (match[1] as PreviewRole) : null;
  } catch {
    return null;
  }
}

export const PREVIEW_ROLE: PreviewRole | null = readRole();
export const PREVIEW = PREVIEW_ROLE !== null;
export const PREVIEW_UID = PREVIEW_ROLE === 'admin' ? 'preview-admin' : 'preview-student';

if (PREVIEW && typeof console !== 'undefined') {
  console.info(`[ag-preview] UI preview is ON as ${PREVIEW_ROLE}. Data is fake and nothing is sent to the backend. Visit any page with ?ag-preview=off to leave.`);
}

if (PREVIEW) {
  // Clean screenshots: answer the cookie question with "necessary only" (no ad scripts) unless already answered.
  try {
    const key = 'acadegrade:cookie-consent:v1';
    if (!window.localStorage.getItem(key)) {
      window.localStorage.setItem(key, JSON.stringify({ choice: 'necessary', version: 1, at: new Date().toISOString() }));
    }
  } catch {
    // Storage blocked: the banner simply shows.
  }
}

/** Minimal stand-in for Firestore's Timestamp (enough for toDate/toMillis/seconds and instanceof checks). */
export class PreviewTimestamp {
  constructor(
    public readonly seconds: number,
    public readonly nanoseconds: number,
  ) {}
  static now(): PreviewTimestamp {
    return PreviewTimestamp.fromMillis(Date.now());
  }
  static fromDate(date: Date): PreviewTimestamp {
    return PreviewTimestamp.fromMillis(date.getTime());
  }
  static fromMillis(ms: number): PreviewTimestamp {
    return new PreviewTimestamp(Math.floor(ms / 1000), (ms % 1000) * 1e6);
  }
  toDate(): Date {
    return new Date(this.toMillis());
  }
  toMillis(): number {
    return this.seconds * 1000 + Math.floor(this.nanoseconds / 1e6);
  }
  isEqual(other: PreviewTimestamp): boolean {
    return other instanceof PreviewTimestamp && other.toMillis() === this.toMillis();
  }
  valueOf(): string {
    return String(this.toMillis()).padStart(15, '0');
  }
  toJSON(): { seconds: number; nanoseconds: number } {
    return { seconds: this.seconds, nanoseconds: this.nanoseconds };
  }
}

/** Days ago as a Timestamp, for fixtures. */
export function daysAgo(days: number, hour = 10): PreviewTimestamp {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return PreviewTimestamp.fromDate(d);
}

/** Days ago as an ISO string, for API fixtures. */
export function isoDaysAgo(days: number, hour = 10): string {
  return daysAgo(days, hour).toDate().toISOString();
}

/** Small artificial latency so loading states are visible but brief. */
export function previewDelay(ms = 120): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
