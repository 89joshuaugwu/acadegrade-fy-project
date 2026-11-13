'use client';

import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  COOKIE_CHOICES_HASH,
  OPEN_EVENT,
  useCookieConsent,
  writeCookieConsent,
  type CookieChoice,
} from '@/lib/consent/cookies';

const noopSubscribe = () => () => undefined;

/**
 * Side consent panel (GAID Art 7: a centre or side notice, not a bottom bar).
 * Non-modal so the page stays usable, but it never closes without a choice.
 * Both buttons share one style: no dark pattern.
 */
export function CookieConsentBanner() {
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const choice = useCookieConsent();
  const [reopened, setReopened] = useState(false);
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const open = () => setReopened(true);
    const onHash = () => {
      if (window.location.hash === COOKIE_CHOICES_HASH) open();
    };
    onHash();
    window.addEventListener(OPEN_EVENT, open);
    window.addEventListener('hashchange', onHash);
    return () => {
      window.removeEventListener(OPEN_EVENT, open);
      window.removeEventListener('hashchange', onHash);
    };
  }, []);

  const visible = hydrated && (choice === null || reopened);

  useEffect(() => {
    if (visible && reopened) panelRef.current?.focus();
  }, [visible, reopened]);

  if (!visible) return null;

  const choose = (next: CookieChoice) => {
    const withdrawing = choice === 'ads' && next === 'necessary';
    writeCookieConsent(next);
    setReopened(false);
    if (window.location.hash === COOKIE_CHOICES_HASH) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    // AdSense cannot be unloaded from a running page; a reload applies the withdrawal at once.
    if (withdrawing && window.adsbygoogle) window.location.reload();
  };

  const buttonClass =
    'inline-flex min-h-12 flex-1 items-center justify-center rounded-[var(--radius-control)] border border-[var(--acade-control-border)] bg-[var(--acade-deep)] px-4 text-sm font-semibold text-[var(--acade-text)] transition-colors hover:border-[var(--acade-primary)] hover:bg-[var(--acade-overlay)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]';

  return (
    <section
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      tabIndex={-1}
      className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] mx-auto w-auto max-w-md rounded-[var(--radius-dialog)] border border-[var(--acade-border)] bg-[var(--acade-surface)] p-5 shadow-[var(--shadow-popover)] focus:outline-none sm:inset-x-auto sm:right-6 sm:bottom-6 sm:mx-0 sm:w-[24rem] sm:p-6"
      style={{ zIndex: 'var(--z-toast)' }}
    >
      <h2 id={titleId} className="font-[family-name:var(--font-bricolage)] text-lg font-semibold text-[var(--acade-text)]">
        Cookie choices
      </h2>
      <p className="mt-2 text-sm leading-6 text-[var(--acade-text-muted)]">
        AcadeGrade uses necessary storage to keep you signed in and remember your settings. With your
        permission, Google AdSense and our ad partners may also use cookies to show and measure ads.
      </p>
      {choice && (
        <p className="mt-2 text-sm leading-6 text-[var(--acade-text)]">
          You currently {choice === 'ads' ? 'allow ads and analytics cookies' : 'allow necessary storage only'}.
        </p>
      )}
      <p className="mt-2 text-sm leading-6 text-[var(--acade-text-muted)]">
        You can change this at any time from Cookie choices. Read our{' '}
        <Link href="/privacy" className="font-semibold text-[var(--acade-primary)] underline underline-offset-4">
          Privacy Policy
        </Link>
        .
      </p>
      <div className="mt-5 flex flex-col gap-3">
        <button type="button" className={buttonClass} onClick={() => choose('necessary')}>
          Necessary only
        </button>
        <button type="button" className={buttonClass} onClick={() => choose('ads')}>
          Allow ads &amp; analytics
        </button>
      </div>
    </section>
  );
}
