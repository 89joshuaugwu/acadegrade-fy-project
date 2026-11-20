'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { shellForPath } from './shell-paths';

interface PublicChromeProps {
  /** Skip link and PublicHeader (server-rendered and passed in as a slot). */
  header: ReactNode;
  /** PublicFooter (server-rendered and passed in as a slot). */
  footer: ReactNode;
  children: ReactNode;
}

/**
 * Chooses the shell for the current route under app/(public).
 * Public routes get header, main#content and footer around the page.
 * Auth and minimal routes (see shell-paths.ts) get the page alone; those
 * pages wrap themselves in AuthShell or MinimalShell, which bring their own
 * skip link and main#content. usePathname works during server rendering,
 * so the right shell is in the first HTML (no flash, no layout shift).
 */
export function PublicChrome({ header, footer, children }: PublicChromeProps) {
  const shell = shellForPath(usePathname());
  if (shell !== 'public') return <>{children}</>;
  return (
    <>
      {header}
      <main id="content" className="pg-main" tabIndex={-1}>
        {children}
      </main>
      {footer}
    </>
  );
}
