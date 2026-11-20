'use client';

import { useSyncExternalStore } from 'react';
import { buttonClass } from '@/components/site/ui';

const subscribe = () => () => {};

/** "Print or save as PDF". Absent without JavaScript, where the browser's own print still works. */
export function PrintButton() {
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  if (!ready) return null;
  return (
    <button type="button" className={buttonClass('ghostOnLight')} data-print="hide" onClick={() => window.print()}>
      <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true" className="text-ag-violet">
        <path d="M6 8V3h8v5M6 14H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-2M6 12h8v5H6z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
      Print or save as PDF
    </button>
  );
}
