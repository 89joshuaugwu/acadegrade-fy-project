'use client';

import { usePathname } from 'next/navigation';

const MAX_PATH = 40;

/** The requested path for the 404 meta line: path only, cut to 40 characters. */
export function shortenRequestedPath(path: string | null | undefined): string {
  const clean = (path ?? '').split(/[?#]/)[0];
  if (!clean) return 'this address';
  return clean.length > MAX_PATH ? `${clean.slice(0, MAX_PATH - 1)}…` : clean;
}

export function RequestedPath() {
  return <>{shortenRequestedPath(usePathname())}</>;
}
