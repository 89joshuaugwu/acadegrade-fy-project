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
    <nav aria-label="Student tabs" className="fixed inset-x-0 bottom-0 border-t border-[var(--acade-border)] bg-[var(--acade-deep)]/96 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden" style={{ zIndex: 'var(--z-sticky)' }}>
      <div className="mx-auto flex h-16 max-w-xl items-center justify-around px-2">
        {studentNavigation.map((tab) => {
          const active = isRouteActive(pathname, tab.href);
          const Icon = TAB_ICONS[tab.icon];

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
                  className="absolute inset-x-2 inset-y-1 rounded-2xl border border-[var(--acade-primary)]/20 bg-[var(--acade-primary-dim)]"
                  transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.8 }}
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
