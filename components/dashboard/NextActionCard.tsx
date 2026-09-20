import Link from 'next/link';
import { AlertTriangle, ArrowRight, CircleCheck, Info } from 'lucide-react';

import type { DashboardNextAction } from '@/lib/dashboard/next-action';
import { cn } from '@/lib/utils/cn';
import { Card } from '@/components/ui/Card';

const TONES = {
  primary: {
    icon: CircleCheck,
    iconClass: 'bg-[var(--acade-primary-dim)] text-[var(--acade-primary)]',
    eyebrowClass: 'text-[var(--acade-primary)]',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'bg-[var(--acade-warning)]/12 text-[var(--acade-warning)]',
    eyebrowClass: 'text-[var(--acade-warning)]',
  },
  info: {
    icon: Info,
    iconClass: 'bg-[var(--acade-info)]/12 text-[var(--acade-info)]',
    eyebrowClass: 'text-[var(--acade-info)]',
  },
} as const;

export function NextActionCard({ action }: { action: DashboardNextAction }) {
  const tone = TONES[action.tone];
  const Icon = tone.icon;

  return (
    <Card
      className={cn(
        'relative h-full overflow-hidden',
        action.tone === 'warning' && 'dashboard-warning-card'
      )}
    >
      <div className="absolute inset-x-0 top-0 h-px" aria-hidden="true"
        style={{
          background: action.tone === 'warning'
            ? 'linear-gradient(90deg, transparent, var(--acade-warning), transparent)'
            : 'linear-gradient(90deg, transparent, color-mix(in srgb, var(--acade-primary) 70%, transparent), transparent)',
        }}
      />
      <div className="flex h-full flex-col">
        <div className={cn('flex size-11 items-center justify-center rounded-[var(--radius-control)]', tone.iconClass)}>
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <p className={cn('mt-5 text-[0.68rem] font-semibold uppercase tracking-[0.16em]', tone.eyebrowClass)}>
          {action.eyebrow}
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-bricolage)] text-[length:var(--text-xl)] font-semibold leading-tight text-[var(--acade-text)]">
          {action.title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--acade-text-muted)]">
          {action.description}
        </p>
        <Link
          href={action.href}
          className="mt-6 inline-flex min-h-12 w-fit items-center gap-2 rounded-[var(--radius-control)] border border-[var(--acade-border)] px-4 text-sm font-semibold text-[var(--acade-text)] transition-colors hover:border-[var(--acade-primary)]/45 hover:bg-[var(--acade-primary-dim)] hover:text-[var(--acade-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)] lg:mt-auto"
        >
          {action.label}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </Card>
  );
}
