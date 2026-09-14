'use client';

import { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import { useAuth } from '@/hooks/useAuth';
import { IconButton, LinkButton, Logo, Sheet, ThemeControl } from '@/components/ui';

interface NavbarProps {
  className?: string;
}

const navLinks = [
  { label: 'Features', href: '/#features' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'About', href: '/about' },
  { label: 'Calculator', href: '/calculator' },
];

export function Navbar({ className }: NavbarProps) {
  const { user, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const sentinel = document.getElementById('hero-sentinel');
    if (!sentinel) {
      setScrolled(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { threshold: 0, rootMargin: '-80px 0px 0px 0px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 flex h-[var(--shell-header-height)] items-center border-b px-4 transition-[background-color,border-color,box-shadow] duration-200 sm:px-6 lg:px-8',
          scrolled
            ? 'border-[var(--acade-border)] bg-[var(--acade-deep)]/96 shadow-[var(--shadow-card)] backdrop-blur-md'
            : 'border-transparent bg-transparent',
          className
        )}
        style={{ zIndex: 'var(--z-sticky)' }}
      >
        <nav aria-label="Public navigation" className="mx-auto flex w-full max-w-[1440px] items-center justify-between">
          <Logo href="/" size="md" />

          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex min-h-12 items-center rounded-xl px-4 text-sm font-medium text-[var(--acade-text-muted)] transition-colors hover:bg-[var(--acade-overlay)] hover:text-[var(--acade-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <ThemeControl compact />
            {loading ? <span className="h-12 w-24" aria-hidden="true" /> : user ? (
              <LinkButton variant="primary" size="sm" href="/dashboard">Dashboard</LinkButton>
            ) : (
              <>
                <LinkButton variant="ghost" size="sm" href="/login">Sign in</LinkButton>
                <LinkButton variant="primary" size="sm" href="/register">Get started</LinkButton>
              </>
            )}
          </div>

          <IconButton
            className="md:hidden"
            aria-label="Open navigation menu"
            aria-expanded={mobileOpen}
            aria-controls="public-mobile-navigation"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" aria-hidden="true" />
          </IconButton>
        </nav>
      </header>

      <Sheet
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        title="Navigate AcadeGrade"
        description="Explore the product or continue to your account."
        className="md:hidden"
      >
        <nav id="public-mobile-navigation" aria-label="Mobile navigation" className="grid gap-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="flex min-h-12 items-center rounded-xl border border-transparent px-4 text-base font-semibold text-[var(--acade-text)] transition-colors hover:border-[var(--acade-border)] hover:bg-[var(--acade-overlay)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mt-5 border-t border-[var(--acade-border-subtle)] pt-5">
          <ThemeControl className="w-full" />
          <div className="mt-4 grid gap-3">
            {!loading && (user ? (
              <LinkButton fullWidth href="/dashboard" onClick={() => setMobileOpen(false)}>Dashboard</LinkButton>
            ) : (
              <>
                <LinkButton fullWidth variant="outline" href="/login" onClick={() => setMobileOpen(false)}>Sign in</LinkButton>
                <LinkButton fullWidth href="/register" onClick={() => setMobileOpen(false)}>Get started</LinkButton>
              </>
            ))}
          </div>
        </div>
      </Sheet>
    </>
  );
}
