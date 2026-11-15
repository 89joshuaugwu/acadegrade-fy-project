'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';

/** localStorage key for the student's own Data saver choice ('1' = on). */
export const DATA_SAVER_KEY = 'acadegrade:data-saver:v1';
const CHANGE_EVENT = 'acadegrade:data-saver-change';

export function readUserChoice(): boolean {
  try {
    return localStorage.getItem(DATA_SAVER_KEY) === '1';
  } catch {
    return false;
  }
}

/** The browser's own Save-Data request (Chromium `navigator.connection.saveData`). */
export function readBrowserRequest(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
}

function writeUserChoice(value: boolean) {
  try {
    if (value) localStorage.setItem(DATA_SAVER_KEY, '1');
    else localStorage.removeItem(DATA_SAVER_KEY);
  } catch {
    // Storage can be blocked; the choice then lasts until the page closes.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onChange);
  const connection = (navigator as Navigator & { connection?: EventTarget }).connection;
  connection?.addEventListener?.('change', onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
    connection?.removeEventListener?.('change', onChange);
  };
}

// 0 = off, 1 = browser asked, 2 = student chose, 3 = both. A number keeps getSnapshot referentially stable.
const snapshot = () => (readBrowserRequest() ? 1 : 0) + (readUserChoice() ? 2 : 0);
const serverSnapshot = () => 0;

export interface DataSaverState {
  /** True when either the browser asked for data saving or the student switched it on. */
  enabled: boolean;
  browserRequested: boolean;
  userChoice: boolean;
  setUserChoice: (value: boolean) => void;
}

/**
 * Data saver (D4, web). On when the browser sends Save-Data or the student turns it on in Settings.
 * It sets `data-data-saver="on"` on <html>, which `useReducedMotion` and the landing motion read to
 * stop animations, and `optimisedImageUrl` shrinks Cloudinary images. Never blocks grades.
 */
export function useDataSaver(): DataSaverState {
  const bits = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const enabled = bits !== 0;
  useEffect(() => {
    if (enabled) document.documentElement.dataset.dataSaver = 'on';
    else delete document.documentElement.dataset.dataSaver;
  }, [enabled]);
  const setUserChoice = useCallback((value: boolean) => writeUserChoice(value), []);
  return { enabled, browserRequested: (bits & 1) === 1, userChoice: (bits & 2) === 2, setUserChoice };
}

/** True when Data saver is on, for code outside React (reads the attribute `useDataSaver` keeps). */
export function isDataSaverOn(): boolean {
  return typeof document !== 'undefined' && document.documentElement.dataset.dataSaver === 'on';
}

/** Adds `f_auto,q_auto[,w_N]` to a Cloudinary upload URL (once); any other URL is returned unchanged. */
export function optimisedImageUrl(url: string | null | undefined, width: number): string | null {
  if (!url) return null;
  const marker = '/image/upload/';
  const at = url.indexOf(marker);
  if (!/^https:\/\/res\.cloudinary\.com\//.test(url) || at === -1) return url;
  const rest = url.slice(at + marker.length);
  if (rest.startsWith('f_auto')) return url;
  const options = `f_auto,q_auto${width > 0 ? `,w_${Math.round(width)}` : ''}`;
  return `${url.slice(0, at + marker.length)}${options}/${rest}`;
}
