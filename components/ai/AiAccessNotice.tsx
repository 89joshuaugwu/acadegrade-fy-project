'use client';

import { CircleAlert, Wrench } from 'lucide-react';
import { openRequirements } from '@/components/requirements';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';
import type { AiBlock } from './aiAccess';

const TITLES: Record<AiBlock['kind'], string> = {
  'age-restricted': 'AI features are not available on this account',
  requirements: 'Finish setting up to use AI',
  maintenance: 'AI is paused for maintenance',
  'feature-disabled': 'This AI feature is switched off',
};

/**
 * Explains why AI actions are hidden and what to do next. The maths on the
 * page (Forecast chart, What-if, goal, carry-overs) keeps working beside it.
 */
export function AiAccessNotice({ block, className }: { block: AiBlock; className?: string }) {
  const paused = block.kind === 'maintenance' || block.kind === 'feature-disabled';
  const Icon = paused ? Wrench : CircleAlert;
  return (
    <div
      role="status"
      className={cn(
        'flex flex-col gap-3 rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-surface)] px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5',
        className
      )}
    >
      <Icon className={cn('size-5 shrink-0', paused ? 'text-[var(--acade-warning)]' : 'text-[var(--acade-primary)]')} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--acade-text)]">{TITLES[block.kind]}</p>
        <p className="mt-1 text-sm leading-6 text-[var(--acade-text-muted)] text-pretty">{block.message}</p>
      </div>
      {block.kind === 'requirements' && (
        <Button variant="outline" size="sm" aria-haspopup="dialog" className="shrink-0 self-start sm:self-center" onClick={() => openRequirements('ai')}>
          Finish setting up
        </Button>
      )}
    </div>
  );
}
