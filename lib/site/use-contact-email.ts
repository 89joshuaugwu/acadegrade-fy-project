'use client';

import { useEffect, useState } from 'react';
import { normalizeContactEmail } from './contact-email';

let pending: Promise<string | null> | null = null;

/** One request per page load, shared by every caller. Failures resolve to null (link to /support). */
export function fetchPublicContactEmail(): Promise<string | null> {
  pending ??= fetch('/api/site/contact')
    .then((response) => (response.ok ? response.json() : null))
    .then((body: { email?: unknown } | null) => normalizeContactEmail(body?.email))
    .catch(() => null);
  return pending;
}

/** For tests only. */
export function resetPublicContactEmailCache() {
  pending = null;
}

/**
 * The contact address for client-only components. Pass `initial` when a server
 * component already resolved it; `undefined` means "not known yet, fetch it".
 */
export function useContactEmail(initial?: string | null): string | null {
  const [email, setEmail] = useState<string | null>(initial ?? null);

  useEffect(() => {
    if (initial !== undefined) return;
    let active = true;
    void fetchPublicContactEmail().then((value) => { if (active) setEmail(value); });
    return () => { active = false; };
  }, [initial]);

  return initial !== undefined ? initial : email;
}
