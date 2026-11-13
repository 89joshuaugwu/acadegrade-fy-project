'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useDiscreetMode } from '@/lib/discreet';
import { cn } from '@/lib/utils/cn';

/** Header shortcut for discreet mode (per device). Settings has the same switch. */
export function DiscreetToggle({ className }: { className?: string }) {
  const { enabled, setEnabled } = useDiscreetMode();
  const Icon = enabled ? EyeOff : Eye;
  return (
    <button
      type="button"
      aria-label="Discreet mode"
      aria-pressed={enabled}
      title={enabled ? 'Discreet mode is on: grades are hidden' : 'Hide grades on this device'}
      onClick={() => setEnabled(!enabled)}
      className={cn(
        'flex size-12 items-center justify-center rounded-[var(--radius-control)] transition-colors hover:bg-[var(--acade-overlay)] hover:text-[var(--acade-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]',
        enabled ? 'text-[var(--acade-primary)]' : 'text-[var(--acade-text-muted)]',
        className
      )}
    >
      <Icon className="size-5" aria-hidden="true" />
    </button>
  );
}
