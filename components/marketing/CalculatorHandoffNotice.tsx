'use client';

import { useEffect, useState } from 'react';
import { Calculator } from 'lucide-react';
import { readCalculatorHandoff } from '@/lib/handoff/calculator';
import { cn } from '@/lib/utils/cn';

/** Tells a visitor coming from the calculator that their courses are still waiting. */
export function CalculatorHandoffNotice({ className }: { className?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // sessionStorage is only readable after mount; read once.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCount(readCalculatorHandoff()?.courses.length ?? 0);
  }, []);

  if (count === 0) return null;

  return (
    <p
      role="status"
      className={cn(
        'flex gap-3 rounded-[var(--radius-control)] bg-[var(--acade-primary-dim)] px-4 py-3 text-[length:var(--text-sm)] leading-6 text-[var(--acade-text)]',
        className
      )}
    >
      <Calculator className="mt-0.5 size-5 shrink-0 text-[var(--acade-primary)]" aria-hidden="true" />
      <span>
        Your {count} calculator {count === 1 ? 'course is' : 'courses are'} saved on this device. After you sign in, you can add{' '}
        {count === 1 ? 'it' : 'them'} as your first semester from Results.
      </span>
    </p>
  );
}
