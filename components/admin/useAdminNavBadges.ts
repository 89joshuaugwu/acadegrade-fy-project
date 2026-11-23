import { useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';

/** A count shown on a navigation item, with the words a screen reader hears after its name. */
export interface AdminNavBadge { text: string; spoken: string }
export type AdminNavBadges = Partial<Record<string, AdminNavBadge>>;

const REFRESH_AFTER_MS = 60_000;
const SUPPORT_PAGE = 25;

async function getJson(url: string, token: string) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (!response.ok) throw new Error(url);
  return response.json() as Promise<Record<string, unknown>>;
}

/**
 * Read-only counts for the phone navigation: open support requests and catalogue suggestions waiting
 * for review. Read once when the shell opens and again on navigation at most once a minute. A count that
 * cannot be read simply has no badge.
 */
export function useAdminNavBadges(user: Pick<User, 'getIdToken'> | null | undefined, pathname: string): AdminNavBadges {
  const [badges, setBadges] = useState<AdminNavBadges>({});
  const lastRead = useRef(0);

  useEffect(() => {
    if (!user || typeof user.getIdToken !== 'function') return;
    if (Date.now() - lastRead.current < REFRESH_AFTER_MS) return;
    lastRead.current = Date.now();
    let cancelled = false;
    let finished = false;

    (async () => {
      const token = await user.getIdToken();
      const [support, suggestions] = await Promise.all([
        getJson(`/api/admin/support?status=open&limit=${SUPPORT_PAGE}`, token).catch(() => null),
        getJson('/api/admin/academic-catalog/suggestions', token).catch(() => null),
      ]);
      if (cancelled) return;
      const next: AdminNavBadges = {};

      const tickets = support?.tickets;
      if (Array.isArray(tickets) && tickets.length > 0) {
        const text = support?.nextCursor ? `${tickets.length}+` : String(tickets.length);
        next['/admin/support'] = { text, spoken: `${text} open` };
      }

      const list = suggestions?.suggestions;
      if (Array.isArray(list)) {
        const pending = list.filter((item) => ((item as { status?: string })?.status ?? 'pending') === 'pending').length;
        if (pending > 0) next['/admin/academic-catalog'] = { text: String(pending), spoken: `${pending} waiting` };
      }
      finished = true;
      setBadges(next);
    })().catch(() => {
      if (!cancelled) lastRead.current = 0;
    });

    return () => {
      cancelled = true;
      // A read cut short (a quick navigation, or React's dev double-run) must not hold off the next one.
      if (!finished) lastRead.current = 0;
    };
  }, [user, pathname]);

  return badges;
}
