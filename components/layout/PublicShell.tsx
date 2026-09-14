'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from '@/components/ui/Logo';
import { LinkButton, ThemeControl } from '@/components/ui';

/**
 * Lightweight header for public pages (About, Calculator, Share).
 * Always visible — no scroll-based transparency.
 */
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
        <Link
          href="/about"
          className="hidden sm:inline text-[length:var(--text-sm)] text-[var(--acade-text-muted)] hover:text-[var(--acade-text)] transition-colors font-[family-name:var(--font-dm-sans)]"
        >
          About
        </Link>
        <Link
          href="/calculator"
          className="hidden sm:inline text-[length:var(--text-sm)] text-[var(--acade-text-muted)] hover:text-[var(--acade-text)] transition-colors font-[family-name:var(--font-dm-sans)]"
        >
          Calculator
        </Link>

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

/**
 * Compact footer for public pages.
 */
export function PublicFooter() {
  return (
    <footer className="border-t border-[var(--acade-border)] bg-[var(--acade-deep)] px-5 py-10">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] hover:text-[var(--acade-text)] transition-colors"
          >
            Home
          </Link>
          <Link
            href="/about"
            className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] hover:text-[var(--acade-text)] transition-colors"
          >
            About
          </Link>
          <Link
            href="/calculator"
            className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] hover:text-[var(--acade-text)] transition-colors"
          >
            Calculator
          </Link>
          <Link
            href="/login"
            className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] hover:text-[var(--acade-text)] transition-colors"
          >
            Sign In
          </Link>
        </div>
        <p className="text-[length:var(--text-xs)] text-[var(--acade-text-faint)] font-[family-name:var(--font-dm-sans)]">
          © {new Date().getFullYear()} AcadeGrade
        </p>
      </div>
    </footer>
  );
}
