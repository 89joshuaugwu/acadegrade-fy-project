'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { LinkButton, Modal, ThemeControl } from '@/components/ui';

interface PublicMobileMenuProps {
  open: boolean;
  onClose: () => void;
}

const menuLinks = [
  { label: 'Features', href: '/#features' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'About AcadeGrade', href: '/about' },
  { label: 'Calculator', href: '/calculator' },
] as const;

export function PublicMobileMenu({ open, onClose }: PublicMobileMenuProps) {
  const { user, loading } = useAuth();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Navigate AcadeGrade"
      className="public-mobile-menu mt-[5.25rem] max-h-[calc(100dvh-6.25rem)] self-start lg:hidden"
    >
      <nav aria-label="Public mobile menu" className="grid gap-1">
        {menuLinks.map((link) => (
          <Link key={link.href} href={link.href} onClick={onClose} className="public-mobile-menu-link">
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="mt-4 border-t border-[var(--acade-border-subtle)] pt-4">
        <ThemeControl className="grid !w-full max-w-none" />
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {loading ? (
            <LinkButton fullWidth href="/register" onClick={onClose}>Get started</LinkButton>
          ) : user ? (
            <LinkButton fullWidth href="/dashboard" onClick={onClose}>Dashboard</LinkButton>
          ) : (
            <>
              <LinkButton fullWidth variant="outline" href="/login" onClick={onClose}>Sign in</LinkButton>
              <LinkButton fullWidth href="/register" onClick={onClose}>Get started</LinkButton>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
