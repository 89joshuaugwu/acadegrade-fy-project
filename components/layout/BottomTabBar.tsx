'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { LayoutDashboard, BookOpen, BrainCircuit, FileText } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const TABS = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/results', label: 'Results', icon: BookOpen },
  { href: '/insights', label: 'Insights', icon: BrainCircuit },
  { href: '/transcript', label: 'Transcript', icon: FileText },
];

export function BottomTabBar() {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();

  // Highlight 'Home' if on dashboard, etc.
  // Using exact matches or startsWith based on the route
  const isActive = (href: string) => {
    if (href === '/dashboard' && pathname === '/dashboard') return true;
    if (href !== '/dashboard' && pathname.startsWith(href)) return true;
    return false;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--acade-deep)] border-t border-[var(--acade-border)] pb-safe md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {TABS.map((tab) => {
          const active = isActive(tab.href);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="relative flex flex-col items-center justify-center w-full h-full gap-1 tap-highlight-transparent"
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
            >
              {active && !shouldReduceMotion && (
                <motion.div
                  layoutId="bottom-tab-indicator"
                  className="absolute top-0 w-8 h-0.5 bg-[var(--acade-primary)] rounded-b-full shadow-[0_2px_8px_rgba(99,102,241,0.5)]"
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                />
              )}
              {active && shouldReduceMotion && (
                <div className="absolute top-0 w-8 h-0.5 bg-[var(--acade-primary)] rounded-b-full" />
              )}
              
              <Icon
                size={20}
                className={cn(
                  'transition-colors duration-200',
                  active ? 'text-[var(--acade-primary)] fill-[var(--acade-primary)]/20' : 'text-[var(--acade-text-muted)]'
                )}
                strokeWidth={active ? 2.5 : 2}
              />
              <span
                className={cn(
                  'text-[length:var(--text-xs)] font-medium font-[family-name:var(--font-dm-sans)] transition-colors duration-200',
                  active ? 'text-[var(--acade-primary)]' : 'text-[var(--acade-text-muted)]'
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
