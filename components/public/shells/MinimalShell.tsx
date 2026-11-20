import type { ReactNode } from 'react';
import Link from 'next/link';
import '@/components/site/site.css';
import { AcadeGradeMark } from '../Logo';
import { IMPRINT_LINE } from '../nav';
import { SiteStyles } from '@/components/site/system/SiteStyles';
import { SkipLink } from '@/components/site/system/SkipLink';

/**
 * The minimal shell, brand v2 (docs/brand-v2/BUILD_V2.md §5), for share
 * pages, maintenance, offline, the iPhone page and 404: a slim night bar with
 * the logo (linking home) and "Back to AcadeGrade", the page on haze, and one
 * quiet footer line. No Firestore, no auth and no client logic in the shell
 * itself (SiteStyles is an empty island that only carries the stylesheet to
 * the root 404), so it renders when services are down; the mark is inline
 * SVG, so it needs no image request. It brings its own skip link, main#content
 * and the v2 helpers (site.css), so routes outside app/(public) can use it
 * directly. The bar and the footer never print.
 */

interface MinimalShellProps {
  children: ReactNode;
  /** Replace the default footer line. */
  imprint?: ReactNode;
  /** Label for the main landmark, when the page has no h1 yet (loading states). */
  mainLabel?: string;
  className?: string;
}

export function MinimalShell({ children, imprint, mainLabel, className = '' }: MinimalShellProps) {
  const year = new Date().getFullYear();
  return (
    <div className={`ag-site flex min-h-[100dvh] flex-col bg-ag-haze text-ag-ink ${className}`}>
      <SiteStyles />
      <SkipLink />
      <header className="bg-ag-night text-white print:hidden">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/" className="ag-focus flex items-center gap-2.5 rounded-lg" aria-label="AcadeGrade home">
            <AcadeGradeMark size={28} />
            <span className="ag-display text-[1.125rem] font-bold tracking-[-0.02em] text-white">AcadeGrade</span>
          </Link>
          <Link
            href="/"
            className="ag-focus -mr-1 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1 text-[0.9375rem] font-medium text-ag-mist-night transition-colors hover:text-white"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M10 3.5 5.5 8l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to AcadeGrade
          </Link>
        </div>
      </header>
      <main id="content" tabIndex={-1} aria-label={mainLabel} className="flex flex-1 flex-col outline-none">
        {children}
      </main>
      <footer className="border-t border-ag-ink/[0.07] print:hidden">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-1.5 px-5 pb-[calc(1.5rem+var(--pg-stub-h,0px))] pt-6 text-[0.8125rem] text-ag-mist sm:flex-row sm:items-center sm:justify-between sm:px-8">
          {imprint ?? (
            <>
              <p>
                © {year} AcadeGrade. {IMPRINT_LINE}.
              </p>
              <Link href="/privacy" className="ag-focus self-start rounded underline decoration-ag-mist/40 underline-offset-4 transition hover:text-ag-ink sm:self-auto">
                Privacy notice
              </Link>
            </>
          )}
        </div>
      </footer>
    </div>
  );
}
