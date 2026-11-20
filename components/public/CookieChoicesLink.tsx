'use client';

import type { ReactNode } from 'react';
import { COOKIE_CHOICES_HASH, openCookieChoices } from '@/lib/consent/cookies';

/**
 * "Cookie choices": a link to #cookie-choices that also reopens the stub
 * directly, so a second click works even when the hash has not changed.
 */
export function CookieChoicesLink({ className, children = 'Cookie choices' }: { className?: string; children?: ReactNode }) {
  return (
    <a
      href={COOKIE_CHOICES_HASH}
      className={className}
      onClick={(event) => {
        event.preventDefault();
        openCookieChoices();
      }}
    >
      {children}
    </a>
  );
}
