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
import { Button } from './Button';
import { notchStyle } from './edges';
import { useClaimConsentHost } from './consent-host';

/**
 * The cookie choice on public pages: a ticket stub in the bottom-right
 * corner (360px, notched left edge) on desktop and a short bottom bar on
 * phones. Same consent storage and logic as the site-wide panel
 * (lib/consent/cookies.ts): nothing for ads loads before "Allow ads &
 * analytics"; both choices have equal weight (NDPA); the footer's
 * "Cookie choices" (#cookie-choices) reopens it. While it is open, <html>
 * carries data-cookie-stub="open" and --pg-stub-h (its height), so a first
 * screen can pad itself and the stub never covers the primary action.
 */

const noopSubscribe = () => () => undefined;

export const COOKIE_STUB_COPY = {
  sentence: 'We use necessary storage to keep you signed in. With your OK, Google AdSense may use cookies to show ads.',
  allow: 'Allow ads & analytics',
  necessary: 'Necessary only',
  choices: 'Choices',
  privacy: 'Privacy notice',
  necessaryDetail: 'Necessary only: sign-in, your settings and this choice. Nothing is stored for ads.',
  allowDetail: 'Allow ads & analytics: Google AdSense and our ad partners may also use cookies to show and measure ads.',
  current: (choice: CookieChoice) =>
    choice === 'ads' ? 'You currently allow ads and analytics cookies.' : 'You currently allow necessary storage only.',
} as const;

export function CookieStub() {
  useClaimConsentHost();
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const choice = useCookieConsent();
  const [reopened, setReopened] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const titleId = useId();
  const detailId = useId();

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
    if (visible && reopened) ref.current?.focus();
  }, [visible, reopened]);

  // Publish the stub's height while it is open, so pages can keep their first action clear of it.
  useEffect(() => {
    const element = ref.current;
    const root = document.documentElement;
    if (!visible || !element) return;
    const publish = () => root.style.setProperty('--pg-stub-h', `${Math.ceil(element.getBoundingClientRect().height)}px`);
    publish();
    root.dataset.cookieStub = 'open';
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(publish);
    observer?.observe(element);
    return () => {
      observer?.disconnect();
      delete root.dataset.cookieStub;
      root.style.removeProperty('--pg-stub-h');
    };
  }, [visible]);

  if (!visible) return null;

  const choose = (next: CookieChoice) => {
    const withdrawing = choice === 'ads' && next === 'necessary';
    writeCookieConsent(next);
    setReopened(false);
    setExpanded(false);
    if (window.location.hash === COOKIE_CHOICES_HASH) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    // AdSense cannot be unloaded from a running page; a reload applies the withdrawal at once.
    if (withdrawing && window.adsbygoogle) window.location.reload();
  };

  return (
    <section
      ref={ref}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      tabIndex={-1}
      className="pg-cookie"
      style={notchStyle('left', 10)}
    >
      <h2 id={titleId} className="pg-sr-only">
        Cookie choices
      </h2>
      <p className="pg-cookie__text">
        {COOKIE_STUB_COPY.sentence}{' '}
        <span className="pg-cookie__links">
          <button type="button" className="pg-textbutton" aria-expanded={expanded} aria-controls={detailId} onClick={() => setExpanded((value) => !value)}>
            {COOKIE_STUB_COPY.choices}
          </button>
          <Link href="/privacy" className="pg-link">
            {COOKIE_STUB_COPY.privacy}
          </Link>
        </span>
      </p>
      {choice ? <p className="pg-cookie__text pg-cookie__current">{COOKIE_STUB_COPY.current(choice)}</p> : null}
      <div id={detailId} className="pg-cookie__detail" hidden={!expanded}>
        <p className="pg-cookie__text">{COOKIE_STUB_COPY.necessaryDetail}</p>
        <p className="pg-cookie__text">{COOKIE_STUB_COPY.allowDetail}</p>
      </div>
      <div className="pg-cookie__actions">
        <Button size="sm" onClick={() => choose('ads')}>
          {COOKIE_STUB_COPY.allow}
        </Button>
        <Button size="sm" onClick={() => choose('necessary')}>
          {COOKIE_STUB_COPY.necessary}
        </Button>
      </div>
    </section>
  );
}
