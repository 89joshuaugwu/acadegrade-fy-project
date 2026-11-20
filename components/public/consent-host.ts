'use client';

import { useLayoutEffect, useSyncExternalStore } from 'react';

/**
 * Which consent UI owns the page. The root layout always mounts the old
 * CookieConsentBanner; on public pages the CookieStub claims the page, and
 * the banner steps aside. Same storage and logic underneath
 * (lib/consent/cookies.ts), so the choice is shared.
 */

let claims = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** True while a public CookieStub is mounted. */
export function usePublicConsentHost(): boolean {
  return useSyncExternalStore(subscribe, () => claims > 0, () => false);
}

/** Claims the page for the CookieStub while the calling component is mounted. */
export function useClaimConsentHost(): void {
  useLayoutEffect(() => {
    claims += 1;
    emit();
    return () => {
      claims -= 1;
      emit();
    };
  }, []);
}
