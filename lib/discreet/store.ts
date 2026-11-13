/**
 * Discreet mode: a per-device preference (localStorage) that blurs CGPA, GPA
 * and grades until the student reveals them. A tiny external store so any
 * component can read it without a provider mount.
 */

export const DISCREET_STORAGE_KEY = 'acadegrade:discreet:v1';
const CHANGE_EVENT = 'acadegrade:discreet-change';

// Used only when storage is blocked, so the toggle still works for this page view.
let memoryValue = false;

export function readDiscreetMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(DISCREET_STORAGE_KEY) === '1';
  } catch {
    return memoryValue;
  }
}

export function setDiscreetMode(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  memoryValue = enabled;
  try {
    if (enabled) window.localStorage.setItem(DISCREET_STORAGE_KEY, '1');
    else window.localStorage.removeItem(DISCREET_STORAGE_KEY);
  } catch {
    // Storage blocked (private mode): the preference lasts for this page view only.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeDiscreetMode(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === DISCREET_STORAGE_KEY) onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onStorage);
  };
}
