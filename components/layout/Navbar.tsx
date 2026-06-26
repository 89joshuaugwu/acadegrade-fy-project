'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui';

interface NavbarProps {
  className?: string;
}

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How it Works', href: '#how-it-works' },
  { label: 'About', href: '/about' },
  { label: 'Calculator', href: '/calculator' },
];

export function Navbar({ className }: NavbarProps) {
  const { user, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const shouldReduceMotion = useReducedMotion();

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

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <>
      <motion.nav
        layout
        className={cn(
          'fixed top-0 left-0 right-0 flex flex-col px-5 md:px-8 transition-colors duration-300 overflow-hidden',
          scrolled || mobileOpen
            ? 'bg-[var(--acade-deep)]/95 backdrop-blur-md border-b border-[var(--acade-border)]'
            : 'bg-transparent border-b border-transparent',
          mobileOpen ? 'rounded-b-3xl shadow-2xl' : '',
          className
        )}
        style={{ zIndex: 'var(--z-sticky)' } as React.CSSProperties}
      >
        {/* Top Header Row */}
        <div className="flex items-center justify-between h-16 shrink-0">
          {/* Original AcadeGrade Logo */}
          <div onClick={() => setMobileOpen(false)}>
             <Logo href="/" size="md" />
          </div>

          {/* Desktop Nav with Hover Pill Effect */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <div
                key={link.label}
                className="relative px-4 py-2"
                onMouseEnter={() => setHoveredPath(link.href)}
                onMouseLeave={() => setHoveredPath(null)}
              >
                {hoveredPath === link.href && !shouldReduceMotion && (
                  <motion.div
                    layoutId="navbar-hover"
                    className="absolute inset-0 bg-[var(--acade-primary)]/15 border border-[var(--acade-primary)]/30 rounded-full"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <Link
                  href={link.href}
                  className="relative z-10 text-[length:var(--text-sm)] text-[var(--acade-text)] transition-colors font-[family-name:var(--font-dm-sans)] font-medium"
                >
                  {link.label}
                </Link>
              </div>
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

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden size-12 flex items-center justify-center text-[var(--acade-text)]"
            aria-label="Toggle menu"
          >
            <motion.div animate={{ rotate: mobileOpen ? 90 : 0 }}>
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </motion.div>
          </button>
        </div>

        {/* Mobile Expanding Panel */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
              className="md:hidden flex flex-col pb-8 pt-4 border-t border-[var(--acade-border-subtle)]"
            >
              <div className="flex flex-col gap-6 px-2">
                {navLinks.map((link, i) => (
                  <div key={link.label} style={{ perspective: 1000 }}>
                    <motion.div
                      initial={shouldReduceMotion ? {} : { opacity: 0, rotateX: -90, y: -20, originY: 0 }}
                      animate={{ opacity: 1, rotateX: 0, y: 0 }}
                      exit={{ opacity: 0, rotateX: 45, y: 20 }}
                      transition={{ 
                        duration: 0.5, 
                        delay: i * 0.1, 
                        type: "spring", 
                        stiffness: 250, 
                        damping: 15 
                      }}
                    >
                      <Link
                        href={link.href}
                        onClick={() => setMobileOpen(false)}
                        className="text-[length:var(--text-3xl)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)] hover:text-[var(--acade-primary)] transition-colors block py-1"
                      >
                        {link.label}
                      </Link>
                    </motion.div>
                  </div>
                ))}

                <motion.div 
                  initial={shouldReduceMotion ? {} : { opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ delay: navLinks.length * 0.1 }}
                  className="flex flex-col gap-3 mt-4"
                >
                  {loading ? null : user ? (
                    <Button variant="primary" size="lg" fullWidth onClick={() => { setMobileOpen(false); window.location.href = '/dashboard'; }}>
                      Dashboard
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" size="lg" fullWidth onClick={() => { setMobileOpen(false); window.location.href = '/login'; }}>
                        Sign In
                      </Button>
                      <Button variant="primary" size="lg" fullWidth onClick={() => { setMobileOpen(false); window.location.href = '/register'; }}>
                        Get Started Free
                      </Button>
                    </>
                  )}
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Screen Dimmer Backdrop */}
      <AnimatePresence>
         {mobileOpen && (
             <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm md:hidden"
                style={{ zIndex: 'calc(var(--z-sticky) - 1)' } as React.CSSProperties}
             />
         )}
      </AnimatePresence>
    </>
  );
}
