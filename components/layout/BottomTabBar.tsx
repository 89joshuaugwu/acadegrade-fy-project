'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { LayoutDashboard, BookOpen, BrainCircuit, FileText } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useAnalytics } from '@/hooks/useAnalytics';

const TABS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/results', label: 'Results', icon: BookOpen },
  { href: '/insights', label: 'Insights', icon: BrainCircuit },
  { href: '/transcript', label: 'Transcript', icon: FileText },
];

export function BottomTabBar() {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const { insightsStale } = useAnalytics();

  // Highlight 'Home' if on dashboard, etc.
  // Using exact matches or startsWith based on the route
  const isActive = (href: string) => {
    if (href === '/dashboard' && pathname === '/dashboard') return true;
    if (href !== '/dashboard' && pathname.startsWith(href)) return true;
    return false;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--acade-deep)]/80 backdrop-blur-xl border-t border-[var(--acade-border)] pb-safe lg:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {TABS.map((tab) => {
          const active = isActive(tab.href);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              id={`tour-mobile-nav-${tab.label.toLowerCase()}`}
              className="relative flex flex-col items-center justify-center w-full h-full gap-1 tap-highlight-transparent group"
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
            >
              {active && !shouldReduceMotion && (
                <motion.div
                  layoutId="bottom-tab-pill"
                  className="absolute inset-y-1 inset-x-2 bg-[var(--acade-primary)]/10 border border-[var(--acade-primary)]/20 rounded-2xl shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              {active && shouldReduceMotion && (
                <div className="absolute inset-y-1 inset-x-2 bg-[var(--acade-primary)]/10 border border-[var(--acade-primary)]/20 rounded-2xl" />
              )}
              
              <div className="relative z-10">
                <Icon
                  size={20}
                  className={cn(
                    'transition-colors duration-300',
                    active ? 'text-[var(--acade-primary)] fill-[var(--acade-primary)]/20 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'text-[var(--acade-text-muted)] group-hover:text-[var(--acade-text)]'
                  )}
                  strokeWidth={active ? 2.5 : 2}
                />
                {tab.label === 'Insights' && insightsStale && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 z-10">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-[var(--acade-deep)]"></span>
                  </span>
                )}
              </div>
              <span
                className={cn(
                  'relative z-10 text-[length:var(--text-[10px])] font-bold font-[family-name:var(--font-dm-sans)] transition-colors duration-300',
                  active ? 'text-[var(--acade-primary)]' : 'text-[var(--acade-text-muted)] group-hover:text-[var(--acade-text)]'
                )}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
