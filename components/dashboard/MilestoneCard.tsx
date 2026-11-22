'use client';

import { Award, X } from 'lucide-react';

import { Card } from '@/components/ui/Card';
import { DiscreetValue } from '@/lib/discreet';
import { describeMilestone } from '@/lib/planning/milestones';
import { useGradingScale } from '@/hooks/useGradingScale';

/** C1: dismissible "New milestone" card. Renders nothing when there is nothing to celebrate. */
export function MilestoneCard({ ids, onDismiss }: { ids: readonly string[]; onDismiss: (id: string) => void }) {
  const { scale } = useGradingScale();
  if (ids.length === 0) return null;
  return (
    <section aria-label="New milestone" className="flex flex-col gap-3">
      {ids.map((id) => {
        const copy = describeMilestone(id, scale);
        return (
          <Card key={id} padding="sm" className="flex items-start gap-3 border-[var(--acade-gold)]/35">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-[var(--acade-gold)]/12 text-[var(--acade-gold)]">
              <Award className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--acade-gold)]">New milestone</p>
              <h2 className="mt-0.5 font-[family-name:var(--font-bricolage)] text-base font-semibold text-[var(--acade-text)]">{copy.title}</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--acade-text-muted)]">
                {copy.body}
                {copy.className && <> <DiscreetValue label="Degree class">{copy.className}</DiscreetValue>.</>}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(id)}
              aria-label={`Dismiss milestone: ${copy.title}`}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-[var(--acade-text-muted)] hover:bg-[var(--acade-overlay)] hover:text-[var(--acade-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </Card>
        );
      })}
    </section>
  );
}
