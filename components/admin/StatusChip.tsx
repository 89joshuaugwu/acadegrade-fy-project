import { CircleAlert, CircleCheck, CircleDashed, CircleDot } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export type StatusChipState = 'off' | 'configured' | 'verified' | 'problem';

const STYLES: Record<StatusChipState, { label: string; className: string; Icon: typeof CircleCheck }> = {
  off: { label: 'Off', className: 'border-[var(--acade-border)] text-[var(--acade-text-muted)]', Icon: CircleDashed },
  configured: { label: 'Configured', className: 'border-[var(--acade-border)] text-[var(--acade-text)]', Icon: CircleDot },
  verified: { label: 'Verified', className: 'border-[var(--acade-success)] text-[var(--acade-success)]', Icon: CircleCheck },
  problem: { label: 'Problem', className: 'border-[var(--acade-danger)] text-[var(--acade-danger)]', Icon: CircleAlert },
};

/** The words a chip shows. Colour never carries the meaning alone. */
export function statusChipText(state: StatusChipState, detail?: string): string {
  const { label } = STYLES[state];
  if (!detail) return label;
  // "Verified 14 Nov 2026", "Problem: Gmail rejected this login.", "Off: no saved account".
  return state === 'verified' ? `${label} ${detail}` : `${label}: ${detail}`;
}

/**
 * One consistent "is this working?" indicator for admin pages (keys, email accounts, ads):
 * off, configured but not checked, verified by a real check, or a problem to fix.
 * "Configured" and "Verified" are different on purpose: saved settings are not proof.
 */
export function StatusChip({ state, detail, className }: Readonly<{ state: StatusChipState; detail?: string; className?: string }>) {
  const { className: tone, Icon } = STYLES[state];
  return (
    <span data-state={state} className={cn('inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium leading-4', tone, className)}>
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 break-words">{statusChipText(state, detail)}</span>
    </span>
  );
}
