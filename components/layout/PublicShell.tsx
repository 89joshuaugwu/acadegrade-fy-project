'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from '@/components/ui/Logo';
import { LinkButton, ThemeControl } from '@/components/ui';
import { COOKIE_CHOICES_HASH } from '@/lib/consent/cookies';
import { contactHref } from '@/lib/site/contact-email';
import { useContactEmail } from '@/lib/site/use-contact-email';

export function PublicHeader() {
  const { user, loading } = useAuth();

  return (
    <nav
      aria-label="Public navigation"
      className="fixed inset-x-0 top-0 flex h-[var(--shell-header-height)] items-center justify-between border-b border-[var(--acade-border)] bg-[var(--acade-deep)]/96 px-4 backdrop-blur-md sm:px-6 md:px-8"
      style={{ zIndex: 'var(--z-sticky)' } as React.CSSProperties}
    >
      <Logo href="/" size="md" />
      <div className="flex items-center gap-2 sm:gap-4">
        <Link href="/about" className="hidden min-h-12 items-center text-sm text-[var(--acade-text-muted)] transition-colors hover:text-[var(--acade-text)] sm:inline-flex">About</Link>
        <Link href="/calculator" className="hidden min-h-12 items-center text-sm text-[var(--acade-text-muted)] transition-colors hover:text-[var(--acade-text)] sm:inline-flex">Calculator</Link>
        <ThemeControl compact className="hidden lg:grid" />
        {loading ? <span className="h-12 w-24" aria-hidden="true" /> : user ? (
          <LinkButton variant="primary" size="sm" href="/dashboard">Dashboard</LinkButton>
        ) : (
          <div className="flex items-center gap-2">
            <LinkButton className="hidden sm:inline-flex" variant="ghost" size="sm" href="/login">Sign in</LinkButton>
            <LinkButton variant="primary" size="sm" href="/register">Get started</LinkButton>
          </div>
        )}
      </div>
    </nav>
  );
}

const footerLinks = [
  {
    group: 'Product',
    links: [
      ['Features', '/features'],
      ['How it works', '/#how-it-works'],
      ['Result scanner', '/features/result-scanner'],
      ['AcadeMind insights', '/features/ai-insights'],
      ['CGPA calculator', '/calculator'],
    ],
  },
  {
    group: 'AcadeGrade',
    links: [
      ['About', '/about'],
      ['Support', '/support'],
      ['Privacy notice', '/privacy'],
      ['Terms of use', '/terms'],
      ['Delete your account', '/account-deletion'],
    ],
  },
  {
    group: 'Your account',
    links: [
      ['Sign in', '/login'],
      ['Create account', '/register'],
      ['Open dashboard', '/dashboard'],
    ],
  },
] as const;

const footerContactClass =
  'mt-3 inline-flex min-h-12 items-center rounded-xl text-[0.9375rem] font-semibold text-[var(--acade-primary)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]';

/**
 * Server pages pass `contactEmail` (from getContactEmail()); client pages leave
 * it out and the footer reads the cached public endpoint. With no address the
 * footer links to the support page instead of a mailto.
 */
export function PublicFooter({ contactEmail }: { contactEmail?: string | null } = {}) {
  const email = useContactEmail(contactEmail);
  return (
    <footer className="public-footer bg-[var(--acade-deep)] px-4 pt-16 sm:px-6 lg:px-8 lg:pt-24">
      <div className="mx-auto max-w-[1200px]">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-10">
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <Logo href="/" size="sm" />
            <p className="mt-4 max-w-sm text-[0.9375rem] leading-7 text-[var(--acade-text-muted)]">
              A clearer way to record results, understand academic progress, and plan what comes next.
            </p>
            {email ? (
              <a href={contactHref(email)} className={footerContactClass}>{email}</a>
            ) : (
              <Link href="/support" className={footerContactClass}>Contact support</Link>
            )}
          </div>

          {footerLinks.map(({ group, links }) => (
            <nav key={group} aria-label={`${group} links`}>
              <p className="text-[0.9375rem] font-semibold text-[var(--acade-text)]">{group}</p>
              <div className="mt-3 grid">
                {links.map(([label, href]) => (
                  <Link key={href} href={href} className="public-footer-link flex min-h-11 items-center text-[0.9375rem] text-[var(--acade-text-muted)] transition-colors hover:text-[var(--acade-text)]">
                    {label}
                  </Link>
                ))}
                {group === 'AcadeGrade' ? (
                  // A plain hash link reopens the cookie panel (lib/consent/cookies) and works before hydration.
                  <a href={COOKIE_CHOICES_HASH} className="public-footer-link flex min-h-11 items-center text-[0.9375rem] text-[var(--acade-text-muted)] transition-colors hover:text-[var(--acade-text)]">
                    Cookie choices
                  </a>
                ) : null}
              </div>
            </nav>
          ))}
        </div>

        <p aria-hidden="true" className="public-footer-wordmark mt-16 select-none font-[family-name:var(--font-bricolage)] font-extrabold leading-[0.8] tracking-[-0.05em] text-[var(--acade-text)] lg:mt-24">
          Acade<span className="text-[var(--acade-primary)]">Grade</span>
        </p>

        <div className="grid gap-2 py-6 text-[0.8125rem] leading-5 text-[var(--acade-text-muted)] sm:grid-cols-2 sm:gap-4">
          <p>&copy; {new Date().getFullYear()} AcadeGrade. All rights reserved.</p>
          <p className="sm:text-right">Personal academic planning, not an official university record.</p>
        </div>
      </div>
    </footer>
  );
}
