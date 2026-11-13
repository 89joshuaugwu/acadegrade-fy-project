'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

function readWindowTab<T extends string>(tabs: readonly T[]): T | null {
  if (typeof window === 'undefined') return null;
  const value = new URLSearchParams(window.location.search).get('tab');
  return tabs.includes(value as T) ? value as T : null;
}

/**
 * A tab kept in `?tab=` so pages are deep-linkable and Help links can open a
 * tab. Choosing a tab replaces the URL without a navigation; a link that
 * changes `?tab=` (for example from the Help drawer) switches the tab.
 * Pages using this must sit inside a Suspense boundary (Next.js 16).
 */
export function useUrlTab<T extends string>(tabs: readonly T[], fallback: T): [T, (tab: T) => void] {
  const params = useSearchParams();
  const urlValue = params?.get('tab') ?? null;
  const fromUrl = tabs.includes(urlValue as T) ? urlValue as T : null;
  const [initial] = useState<T | null>(() => readWindowTab(tabs));
  const [chosen, setChosen] = useState<T | null>(null);
  const [seenUrl, setSeenUrl] = useState(urlValue);

  // A new address wins over an earlier click (adjusting state while rendering).
  if (seenUrl !== urlValue) {
    setSeenUrl(urlValue);
    setChosen(null);
  }

  const tab = chosen ?? fromUrl ?? initial ?? fallback;
  const choose = (next: T) => {
    setChosen(next);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', next);
    window.history.replaceState(null, '', url);
  };
  return [tab, choose];
}
