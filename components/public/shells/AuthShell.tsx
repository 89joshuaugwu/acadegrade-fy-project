import type { ReactNode } from 'react';
import Link from 'next/link';
import '@/components/site/site.css';
import { AcadeGradeMark } from '../Logo';
import { AuthAside } from '@/components/site/auth/AuthAside';
import { SkipLink } from '@/components/site/system/SkipLink';
import { photoFor } from '@/lib/public/page-photos';

/**
 * The auth shell (sign in, create account, reset password), brand v2
 * (docs/brand-v2/BUILD_V2.md §5). A full-height split screen: on the left,
 * on white, the logo (linking home) and "Back to site", then the progress
 * (when the flow has steps), the h1, the sentence and the form, and a quiet
 * footer line. On the right, at 1024px and up only, the page's photo slot
 * under a night gradient with one reassurance line and a small app card.
 * Phones get a clean single column and download nothing for the photo.
 * Landmarks: main (labelled by the h1, id="content"), the photo as a figure,
 * and a "Help and site links" nav in the footer.
 */

export const AUTH_TITLE_ID = 'auth-title';

export type AuthPhotoSlot = 'auth.login' | 'auth.register' | 'auth.forgot';

interface AuthShellProps {
  /** The h1 ("Welcome back"). */
  title: ReactNode;
  /** One sentence (or the step lines) under the h1. */
  sentence?: ReactNode;
  /** The page's image slot for the desktop panel. */
  photo?: AuthPhotoSlot;
  /** The one line on the desktop panel. */
  reassurance?: ReactNode;
  /** A StepProgress, shown above the h1 (register, reset password). */
  progress?: ReactNode;
  /** Content under the form, after a rule (Create a free account, app links). */
  below?: ReactNode;
  /** Extra links in the footer line; Support and Privacy notice are always there. */
  footerLinks?: readonly { href: string; label: string }[];
  children: ReactNode;
}

const FOOTER_LINK = 'ag-focus inline-flex min-h-9 items-center rounded text-ag-mist transition-colors hover:text-ag-ink';

export function AuthShell({ title, sentence, photo, reassurance, progress, below, footerLinks = [], children }: AuthShellProps) {
  const picture = photo ? photoFor(photo) : null;
  const year = new Date().getFullYear();
  return (
    <div className="ag-site min-h-[100dvh] bg-white text-ag-ink lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <SkipLink />
      <div data-auth-column className="flex min-h-[100dvh] min-w-0 flex-col">
        <header className="flex h-[72px] items-center justify-between gap-4 px-5 sm:px-10 xl:px-16">
          <Link href="/" className="ag-focus flex items-center gap-2.5 rounded-lg" aria-label="AcadeGrade home">
            <AcadeGradeMark size={30} />
            <span className="ag-display text-[1.1875rem] font-bold tracking-[-0.02em] text-ag-ink">AcadeGrade</span>
          </Link>
          <Link href="/" className="ag-focus -mr-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-[0.9375rem] font-medium text-ag-mist transition-colors hover:text-ag-ink">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M10 3.5 5.5 8l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to site
          </Link>
        </header>

        <main id="content" tabIndex={-1} aria-labelledby={AUTH_TITLE_ID} className="flex-1 px-5 pb-14 pt-8 outline-none sm:px-10 sm:pt-12 lg:pt-[8vh] xl:px-16">
          <div className="mx-auto w-full max-w-[440px]">
            {progress}
            <h1 id={AUTH_TITLE_ID} className="ag-display text-[2.375rem] font-bold leading-[1.04] text-ag-ink sm:text-[2.875rem]">
              {title}
            </h1>
            {sentence ? <div className="mt-3 text-[1rem] leading-relaxed text-ag-mist">{sentence}</div> : null}
            <div className="mt-8">{children}</div>
            {below ? <div className="mt-10 flex flex-col gap-3 border-t border-ag-ink/10 pt-6 text-[0.9375rem] text-ag-ink">{below}</div> : null}
          </div>
        </main>

        {/* The cookie card publishes its height (--pg-stub-h) while open; the page ends clear of it. */}
        <footer className="px-5 pb-[calc(1.5rem+var(--pg-stub-h,0px))] sm:px-10 xl:px-16">
          <div className="mx-auto flex w-full max-w-[440px] flex-wrap items-center justify-between gap-x-6 gap-y-1 text-[0.8125rem] lg:mx-0 lg:max-w-none">
            <nav aria-label="Help and site links">
              <ul className="flex flex-wrap gap-x-5">
                <li>
                  <Link href="/support" className={FOOTER_LINK}>
                    Support
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className={FOOTER_LINK}>
                    Privacy notice
                  </Link>
                </li>
                {footerLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={FOOTER_LINK}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <p className="text-ag-mist">© {year} AcadeGrade</p>
          </div>
        </footer>
      </div>

      <AuthAside photo={picture} reassurance={reassurance} />
    </div>
  );
}
