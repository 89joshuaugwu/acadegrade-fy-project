'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { LayoutDashboard, BookOpen, BrainCircuit, FileText, Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useAnalytics } from '@/hooks/useAnalytics';
import { isRouteActive, studentNavigation, type NavigationIcon } from '@/lib/ui/route-meta';

const TAB_ICONS: Record<NavigationIcon, React.ElementType> = {
  dashboard: LayoutDashboard,
  results: BookOpen,
  insights: BrainCircuit,
  transcript: FileText,
  users: LayoutDashboard,
  courses: BookOpen,
  analytics: BrainCircuit,
  activity: BrainCircuit,
  ads: Megaphone,
  settings: LayoutDashboard,
};

export function BottomTabBar() {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const { insightsStale } = useAnalytics();

  return (
    <nav
      aria-label="Student tabs"
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] rounded-[var(--radius-dialog)] border border-[var(--acade-border)] bg-[var(--acade-deep)]/94 shadow-[0_18px_48px_rgba(2,6,23,0.28)] backdrop-blur-xl lg:hidden"
      style={{ zIndex: 'var(--z-sticky)' }}
    >
      <div className="mx-auto grid min-h-[4.5rem] max-w-xl grid-cols-4 items-stretch p-1.5">
        {studentNavigation.map((tab) => {
          const active = isRouteActive(pathname, tab.href);
          const Icon = TAB_ICONS[tab.icon];

          return (
            <Link
              key={tab.href}
              href={tab.href}
              id={`tour-mobile-nav-${tab.label.toLowerCase()}`}
              className="group relative flex min-h-11 w-full flex-col items-center justify-center gap-1 rounded-[var(--radius-control)] tap-highlight-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]"
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
            >
              {active && !shouldReduceMotion && (
                <motion.div
                  layoutId="bottom-tab-pill"
                  className="absolute inset-0 rounded-[var(--radius-control)] border border-[var(--acade-primary)]/20 bg-[var(--acade-primary-dim)]"
                  transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.8 }}
                />
              )}
              {active && shouldReduceMotion && (
                <div className="absolute inset-0 rounded-[var(--radius-control)] border border-[var(--acade-primary)]/20 bg-[var(--acade-primary)]/10" />
              )}
              
              <div className="relative z-10">
                <Icon
                  size={20}
                  className={cn(
                    'transition-colors duration-300',
                    active ? 'fill-[var(--acade-primary)]/15 text-[var(--acade-primary)]' : 'text-[var(--acade-text-muted)] group-hover:text-[var(--acade-text)]'
                  )}
                  strokeWidth={active ? 2.5 : 2}
                />
                {tab.label === 'Insights' && insightsStale && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 z-10">
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full border-2 border-[var(--acade-deep)] bg-[var(--acade-danger)]"></span>
                  </span>
                )}
              </div>
              <span
                className={cn(
                  'relative z-10 text-xs font-semibold font-[family-name:var(--font-dm-sans)] transition-colors duration-150',
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
