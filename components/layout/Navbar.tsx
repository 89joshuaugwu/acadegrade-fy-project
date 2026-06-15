'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils/cn';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Button } from '@/components/ui/Button';

interface NavbarProps {
  className?: string;
}

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How it Works', href: '#how-it-works' },
  { label: 'About', href: '/about' },
  { label: 'Calculator', href: '/calculator' },
];

function Navbar({ className }: NavbarProps) {
    const { user, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { threshold: 0, rootMargin: '-80px 0px 0px 0px' }
    );
    const sentinel = document.getElementById('hero-sentinel');
    if (sentinel) observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // Lock body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <>
      <nav
        className={cn(
          'fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-5 md:px-8 transition-all duration-300',
          scrolled
            ? 'bg-[var(--acade-deep)]/95 backdrop-blur-md border-b border-[var(--acade-border)]'
            : 'bg-transparent border-b border-transparent',
          className
        )}
        style={{ zIndex: 'var(--z-sticky)' } as React.CSSProperties}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <Image src="/logo.png" alt="AcadeGrade" width={32} height={32} className="rounded-lg" />
          <span className="text-[length:var(--text-lg)] font-bold font-[family-name:var(--font-bricolage)] text-[var(--acade-text)]">
            AcadeGrade
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] hover:text-[var(--acade-text)] transition-colors font-[family-name:var(--font-dm-sans)]"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          {loading ? null : user ? (
            <Button variant="primary" size="sm" onClick={() => window.location.href = '/dashboard'}>
              Dashboard
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => window.location.href = '/login'}>
                Sign In
              </Button>
              <Button variant="primary" size="sm" onClick={() => window.location.href = '/register'}>
                Get Started
              </Button>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden size-12 flex items-center justify-center text-[var(--acade-text)]"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile fullscreen overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-[var(--acade-void)]/98 backdrop-blur-lg flex flex-col items-center justify-center gap-6 md:hidden"
            style={{ zIndex: 'calc(var(--z-sticky) - 1)' } as React.CSSProperties}
          >
            {navLinks.map((link, i) => (
              <motion.div
                key={link.label}
                initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <Link
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-[length:var(--text-2xl)] font-semibold text-[var(--acade-text)] font-[family-name:var(--font-dm-sans)]"
                >
                  {link.label}
                </Link>
              </motion.div>
            ))}
            <div className="flex flex-col gap-3 mt-4 w-56">
              {loading ? null : user ? (
                <Button variant="primary" size="md" fullWidth onClick={() => { setMobileOpen(false); window.location.href = '/dashboard'; }}>
                  Dashboard
                </Button>
              ) : (
                <>
                  <Button variant="outline" size="md" fullWidth onClick={() => { setMobileOpen(false); window.location.href = '/login'; }}>
                    Sign In
                  </Button>
                  <Button variant="primary" size="md" fullWidth onClick={() => { setMobileOpen(false); window.location.href = '/register'; }}>
                    Get Started
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export { Navbar };
