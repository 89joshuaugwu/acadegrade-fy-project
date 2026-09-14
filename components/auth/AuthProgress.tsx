import { Check } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface AuthProgressProps {
  steps: readonly string[];
  currentStep: number;
  label?: string;
  className?: string;
}

export function AuthProgress({
  steps,
  currentStep,
  label = 'Progress',
  className,
}: AuthProgressProps) {
  const safeStep = Math.min(Math.max(currentStep, 1), Math.max(steps.length, 1));

  return (
    <nav aria-label={label} className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-4">
        <p className="text-[length:var(--text-xs)] font-semibold uppercase tracking-[0.14em] text-[var(--acade-text-muted)]">
          {steps[safeStep - 1] ?? 'Getting started'}
        </p>
        <p className="shrink-0 text-[length:var(--text-xs)] tabular-nums text-[var(--acade-text-muted)]">
          Step {safeStep} of {steps.length}
        </p>
      </div>

      <ol className="grid grid-flow-col auto-cols-fr gap-2">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const complete = stepNumber < safeStep;
          const current = stepNumber === safeStep;

          return (
            <li
              key={step}
              aria-current={current ? 'step' : undefined}
              className="min-w-0"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'flex h-1.5 w-full rounded-full transition-colors duration-200',
                  stepNumber <= safeStep
                    ? 'bg-[var(--acade-primary)]'
                    : 'bg-[var(--acade-border-subtle)]'
                )}
              />
              <span className="sr-only">
                {complete && <Check className="size-3" />}
                {step}
                {complete ? ', complete' : current ? ', current step' : ', upcoming'}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

