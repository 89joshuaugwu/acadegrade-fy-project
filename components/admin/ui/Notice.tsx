import type { ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type NoticeTone = 'info' | 'warning' | 'danger' | 'success';

const TONES: Record<NoticeTone, { box: string; icon: string; Icon: typeof Info }> = {
  info: { box: 'bg-[var(--acade-info-dim)] border-[color-mix(in_srgb,var(--acade-info)_25%,transparent)]', icon: 'text-[var(--acade-info)]', Icon: Info },
  warning: { box: 'bg-[var(--acade-gold-dim)] border-[color-mix(in_srgb,var(--acade-warning)_30%,transparent)]', icon: 'text-[var(--acade-warning)]', Icon: TriangleAlert },
  danger: { box: 'bg-[var(--acade-danger-dim)] border-[color-mix(in_srgb,var(--acade-danger)_30%,transparent)]', icon: 'text-[var(--acade-danger)]', Icon: CircleAlert },
  success: { box: 'bg-[var(--acade-success-dim)] border-[color-mix(in_srgb,var(--acade-success)_25%,transparent)]', icon: 'text-[var(--acade-success)]', Icon: CircleCheck },
};

/** An inline callout. The icon and the words carry the meaning, never colour alone. */
export function Notice({ tone = 'info', title, children, action, className, role }: {
  tone?: NoticeTone;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
  role?: 'status' | 'alert';
}) {
  const { box, icon, Icon } = TONES[tone];
  return (
    <div role={role} className={cn('flex min-w-0 items-start gap-3 rounded-[16px] border px-4 py-3 text-sm leading-6 text-[var(--acade-text)]', box, className)}>
      <Icon className={cn('mt-1 size-4 shrink-0', icon)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn(title ? 'text-[var(--acade-text-muted)]' : '')}>{children}</div> : null}
      </div>
      {action ? <div className="shrink-0 self-center">{action}</div> : null}
    </div>
  );
}
