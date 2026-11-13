'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Calculator, X } from 'lucide-react';
import { readCalculatorHandoff } from '@/lib/handoff/calculator';

const SHOWN_KEY = 'acadegrade:calculator-handoff:banner-shown:v1';

function alreadyShown(): boolean {
  try {
    return window.sessionStorage.getItem(SHOWN_KEY) === '1';
  } catch {
    return false;
  }
}

function markShown() {
  try {
    window.sessionStorage.setItem(SHOWN_KEY, '1');
  } catch {
    // Storage blocked: the banner may show again on the next visit.
  }
}

/**
 * One-time dashboard pointer to /results when calculator rows are waiting
 * (login and register land here). The offer itself lives on /results.
 */
export function CalculatorHandoffBanner() {
  // Student pages render only on the client, after sign-in.
  const [count, setCount] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const handoff = readCalculatorHandoff();
    return handoff && !alreadyShown() ? handoff.courses.length : 0;
  });
  useEffect(() => {
    if (count) markShown();
  }, [count]);
  if (!count) return null;

  return (
    <div role="status" className="flex items-center gap-3 rounded-[var(--radius-surface)] border border-[var(--acade-primary)]/30 bg-[var(--acade-primary-dim)] py-2 pl-4 pr-2">
      <Calculator className="size-5 shrink-0 text-[var(--acade-primary-glow)]" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-sm leading-6 text-[var(--acade-text)]">
        {count === 1 ? 'Your course from the calculator is ready to add.' : `Your ${count} courses from the calculator are ready to add.`}{' '}
        <Link href="/results" className="inline-flex items-center gap-1 font-semibold text-[var(--acade-primary-glow)] underline underline-offset-4">
          Review them in Results <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </p>
      <button
        type="button"
        aria-label="Hide this message"
        onClick={() => setCount(0)}
        className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-[var(--acade-text-muted)] hover:bg-[var(--acade-overlay)] hover:text-[var(--acade-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
