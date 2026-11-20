import { readCookieConsent } from '@/lib/consent/cookies';

/**
 * Conversion events for the calculator and tools (04 §7): `tool_used` and
 * `save_semester_click`. They fire only after the visitor allowed analytics
 * (the cookie choice "ads"), and only when an analytics tag is on the page;
 * otherwise nothing happens. No analytics script is loaded by these pages.
 */

type Gtag = (command: 'event', name: string, params?: Record<string, unknown>) => void;

export function trackToolEvent(name: 'tool_used' | 'save_semester_click', params: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;
  try {
    if (readCookieConsent() !== 'ads') return;
    const gtag = (window as unknown as { gtag?: Gtag }).gtag;
    if (typeof gtag === 'function') gtag('event', name, params);
  } catch {
    // Analytics never gets in the way of the tool.
  }
}
