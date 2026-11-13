'use client';

import { useSyncExternalStore } from 'react';

/**
 * Web cookie / tracking consent (NDPA, GAID Art 19). Strictly necessary
 * storage (sign-in, theme, this choice) needs no consent; AdSense, partner ad
 * links and any analytics load only after "ads". Stored in localStorage and a
 * first-party cookie so a blocked storage still remembers the answer.
 */

export type CookieChoice = 'necessary' | 'ads';

export const CONSENT_STORAGE_KEY = 'acadegrade:cookie-consent:v1';
export const CONSENT_COOKIE = 'ag_cookie_consent';
export const CONSENT_VERSION = 1;
const MAX_AGE_SECONDS = 180 * 24 * 60 * 60;
const CHANGE_EVENT = 'acadegrade:cookie-consent-change';
export const OPEN_EVENT = 'acadegrade:open-cookie-choices';
/** A plain link to this hash (for example in the footer) reopens the choices. */
export const COOKIE_CHOICES_HASH = '#cookie-choices';

const isChoice = (value: unknown): value is CookieChoice => value === 'necessary' || value === 'ads';

function readCookie(): CookieChoice | null {
  try {
    const match = document.cookie.split('; ').find((part) => part.startsWith(`${CONSENT_COOKIE}=`));
    const value = match?.slice(CONSENT_COOKIE.length + 1);
    return isChoice(value) ? value : null;
  } catch {
    return null;
  }
}

export function readCookieConsent(): CookieChoice | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { choice?: unknown; version?: unknown };
      if (parsed.version === CONSENT_VERSION && isChoice(parsed.choice)) return parsed.choice;
    }
  } catch {
    // Fall through to the cookie.
  }
  return readCookie();
}

export function writeCookieConsent(choice: CookieChoice): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ choice, version: CONSENT_VERSION, at: new Date().toISOString() })
    );
  } catch {
    // The cookie below still records the choice.
  }
  try {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${CONSENT_COOKIE}=${choice}; Max-Age=${MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
  } catch {
    // Cookies disabled: nothing else to do.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Reopens the consent panel from anywhere (footer, settings). */
export function openCookieChoices(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(OPEN_EVENT));
}

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === CONSENT_STORAGE_KEY) onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onStorage);
  };
}

/** The stored choice; null when the visitor has not chosen (and during SSR). */
export function useCookieConsent(): CookieChoice | null {
  return useSyncExternalStore(subscribe, readCookieConsent, () => null);
}
