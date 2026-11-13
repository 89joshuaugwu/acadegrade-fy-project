'use client';

import { openCookieChoices } from '@/lib/consent/cookies';
import { cn } from '@/lib/utils/cn';

/** Reopens the cookie consent panel. For footers and Settings. */
export function CookieChoicesButton({ className, children = 'Cookie choices' }: { className?: string; children?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={openCookieChoices}
      className={cn(
        'inline-flex min-h-11 items-center text-sm font-semibold text-[var(--acade-primary)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]',
        className
      )}
    >
      {children}
    </button>
  );
}
