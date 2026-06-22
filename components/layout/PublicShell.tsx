'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';

/**
 * Lightweight header for public pages (About, Calculator, Share).
 * Always visible — no scroll-based transparency.
 */
export function PublicHeader() {
  const { user, loading } = useAuth();

  return (
    <nav
      className="fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-5 md:px-8 bg-[var(--acade-deep)]/95 backdrop-blur-md border-b border-[var(--acade-border)]"
      style={{ zIndex: 'var(--z-sticky)' } as React.CSSProperties}
    >
      <Logo href="/" size="md" />

      <div className="flex items-center gap-4">
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

        {loading ? null : user ? (
          <Button variant="primary" size="sm" onClick={() => (window.location.href = '/dashboard')}>
            Dashboard
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => (window.location.href = '/login')}>
              Sign In
            </Button>
            <Button variant="primary" size="sm" onClick={() => (window.location.href = '/register')}>
              Get Started
            </Button>
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
    <footer className="border-t border-[var(--acade-border)] py-10 px-5">
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
          © 2026 AcadeGrade · Built by Joshuazaza · CSC 499 · ESUT, Agbani
        </p>
      </div>
    </footer>
  );
}
