'use client';

import { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import { useAuth } from '@/hooks/useAuth';
import { IconButton, LinkButton, Logo, ThemeControl } from '@/components/ui';
import { PublicMobileMenu } from './PublicMobileMenu';

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
          'public-nav-shell sticky top-0 flex items-center px-3 py-3 sm:px-6 lg:px-8',
          scrolled && 'public-nav-shell--scrolled',
          className
        )}
        style={{ zIndex: 'var(--z-sticky)' }}
      >
        <nav aria-label="Public navigation" className="public-nav-capsule mx-auto grid w-full max-w-[1280px] grid-cols-[1fr_auto] items-center gap-4 px-3 sm:px-4 lg:grid-cols-[1fr_auto_1fr]">
          <Logo href="/" size="md" />

          <div className="hidden items-center justify-center gap-1 lg:flex">
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

          <div className="hidden items-center justify-end gap-2 lg:flex">
            <ThemeControl compact />
            {loading ? (
              <LinkButton variant="primary" size="sm" href="/register">Get started</LinkButton>
            ) : user ? (
              <LinkButton variant="primary" size="sm" href="/dashboard">Dashboard</LinkButton>
            ) : (
              <>
                <LinkButton variant="ghost" size="sm" href="/login">Sign in</LinkButton>
                <LinkButton variant="primary" size="sm" href="/register">Get started</LinkButton>
              </>
            )}
          </div>

          <IconButton
            className="justify-self-end lg:hidden"
            aria-label="Open navigation menu"
            aria-haspopup="dialog"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" aria-hidden="true" />
          </IconButton>
        </nav>
      </header>
      <PublicMobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}
