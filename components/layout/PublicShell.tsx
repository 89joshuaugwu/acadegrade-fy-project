'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from '@/components/ui/Logo';
import { LinkButton, ThemeControl } from '@/components/ui';

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

const footerLinks = {
  Product: [
    ['Features', '/#features'],
    ['How it works', '/#how-it-works'],
    ['Calculator', '/calculator'],
    ['About', '/about'],
  ],
  'Your account': [
    ['Sign in', '/login'],
    ['Create account', '/register'],
    ['Open dashboard', '/dashboard'],
  ],
} as const;

export function PublicFooter() {
  return (
    <footer className="border-t border-[var(--acade-border)] bg-[var(--acade-deep)] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="mx-auto max-w-[1200px]">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_0.75fr_0.75fr]">
          <div>
            <Logo href="/" size="sm" />
            <p className="mt-4 max-w-sm text-sm leading-6 text-[var(--acade-text-muted)]">
              A clearer way to record results, understand academic progress, and plan what comes next.
            </p>
            <a href="mailto:support@acadegrade.com" className="mt-5 inline-flex min-h-12 items-center rounded-xl text-sm font-semibold text-[var(--acade-primary)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]">
              support@acadegrade.com
            </a>
          </div>

          {Object.entries(footerLinks).map(([group, links]) => (
            <nav key={group} aria-label={`${group} links`}>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--acade-text-faint)]">{group}</p>
              <div className="mt-4 grid gap-1">
                {links.map(([label, href]) => (
                  <Link key={href} href={href} className="flex min-h-11 items-center text-sm font-medium text-[var(--acade-text-muted)] transition-colors hover:text-[var(--acade-text)]">
                    {label}
                  </Link>
                ))}
              </div>
            </nav>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-[var(--acade-border-subtle)] pt-6 text-xs text-[var(--acade-text-faint)] sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} AcadeGrade. All rights reserved.</p>
          <p>Personal academic planning—not an official university record.</p>
        </div>
      </div>
    </footer>
  );
}
