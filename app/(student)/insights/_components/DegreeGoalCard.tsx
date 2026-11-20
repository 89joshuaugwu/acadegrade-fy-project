'use client';

import { useId } from 'react';
import { Calculator } from 'lucide-react';
import { formatCgpa } from '@/lib/cgpa/academicRules';
import { bandFor, planDegreeGoal, TARGET_CLASS_OPTIONS, type ClassRequirement, type TargetClass } from '@/lib/planning/degreeGoal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { cn } from '@/lib/utils/cn';
import { DiscreetValue } from '@/lib/discreet';

export interface DegreeGoalCardProps {
  currentCgpa: number;
  gradedCredits: number;
  remainingSemesters: number;
  unitsPerSemester: number;
  /** Graded units already inside the CGPA that belong to unfinished semesters (not counted as remaining). */
  gradedInProgressUnits?: number;
  targetClass: TargetClass | null;
  onTargetChange: (target: TargetClass) => void;
  saving?: boolean;
}

function requirementValue(req: ClassRequirement): { text: string; tone: 'ink' | 'good' | 'bad' } {
  if (req.state === 'secured') return { text: 'Secured', tone: 'good' };
  if (req.state === 'unreachable') return { text: 'Out of reach', tone: 'bad' };
  return { text: formatCgpa(req.requiredGpa), tone: 'ink' };
}

const toneClass = { ink: 'text-[var(--acade-text)]', good: 'text-[var(--acade-success)]', bad: 'text-[var(--acade-danger)]' } as const;

/** A6: a saved degree-class goal with the GPA it needs. Pure maths, no AI call. */
export function DegreeGoalCard({ currentCgpa, gradedCredits, remainingSemesters, unitsPerSemester, gradedInProgressUnits = 0, targetClass, onTargetChange, saving = false }: DegreeGoalCardProps) {
  const headingId = useId();
  const plan = planDegreeGoal({ currentCgpa, completedUnits: gradedCredits, remainingSemesters, unitsPerSemester, gradedInProgressUnits, targetClass: targetClass ?? '2:1' });
  const target = targetClass && plan.kind === 'plan' ? plan.target : null;
  const semesters = `${remainingSemesters} remaining ${remainingSemesters === 1 ? 'semester' : 'semesters'}`;

  let message: React.ReactNode;
  if (plan.kind === 'final') {
    message = <>No semesters remain in your timeline, so there is nothing left to plan. On your current results you are on a <strong>{plan.current.label}</strong>.</>;
  } else if (!target) {
    message = <>Choose the class you are aiming for to see the GPA it needs.</>;
  } else if (target.state === 'secured') {
    message = <>Your current results already keep you at <strong>{target.band.label}</strong> or above, whatever your remaining grades.</>;
  } else if (target.state === 'reachable') {
    message = <>To finish with a <strong>{target.band.label}</strong>, average a GPA of <strong className="tabular-nums">{formatCgpa(target.requiredGpa)}</strong> in each of your {semesters}.</>;
  } else {
    message = plan.suggestion
      ? <>A {target.band.label} is out of reach in the {semesters}, even with straight As. A <strong>{plan.suggestion.label}</strong> is still within reach, and every semester still counts towards it.</>
      : <>A {target.band.label} is out of reach in the {semesters}. Focus on passing each course: every grade point you earn still raises your CGPA.</>;
  }

  const figures = plan.kind === 'plan' ? [
    {
      key: 'GPA needed for your goal',
      label: target ? `Needed each semester for ${target.band.shortLabel}` : 'Needed each semester for your goal',
      value: target ? requirementValue(target) : { text: '—', tone: 'ink' as const },
    },
    {
      key: 'Highest CGPA still possible',
      label: 'Highest CGPA still possible',
      value: { text: formatCgpa(plan.maxReachable), tone: 'ink' as const },
    },
    {
      key: 'GPA needed to keep your class',
      label: <>To keep your <DiscreetValue label="Current class">{plan.keepCurrent.band.shortLabel}</DiscreetValue></>,
      value: requirementValue(plan.keepCurrent),
    },
  ] : [];

  return (
    <section aria-labelledby={headingId} className="rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-surface)] p-5 sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 id={headingId} className="app-display text-[1.25rem] font-semibold text-[var(--acade-text)]">Degree-class goal</h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-[var(--acade-text-muted)]">
            <Calculator className="size-4 shrink-0" aria-hidden="true" />
            Worked out from your results. No AI involved.
          </p>
        </div>
        {plan.kind === 'plan' && (
          <div className="w-full sm:w-72" aria-busy={saving || undefined}>
            <Select
              label="Aim for"
              placeholder="Choose a class"
              value={targetClass ?? ''}
              disabled={saving}
              options={TARGET_CLASS_OPTIONS.map(option => ({ value: option.value, label: option.label }))}
              onChange={value => { if (value) onTargetChange(value as TargetClass); }}
            />
          </div>
        )}
      </div>

      {figures.length > 0 && (
        <dl className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {figures.map((figure, index) => (
            <div
              key={figure.key}
              className={cn(
                'flex min-w-0 items-baseline justify-between gap-4 rounded-2xl px-4 py-4 sm:block sm:px-5',
                index === 0 ? 'bg-[var(--acade-primary-dim)]' : 'bg-[var(--acade-overlay)]'
              )}
            >
              <dt className="text-sm leading-5 text-[var(--acade-text-muted)]">{figure.label}</dt>
              <dd className={cn('app-num shrink-0 text-2xl font-bold sm:mt-2 sm:text-[2rem] sm:leading-none', toneClass[figure.value.tone])}>
                <DiscreetValue label={figure.key}>{figure.value.text}</DiscreetValue>
              </dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-5 text-pretty text-[0.9375rem] leading-7 text-[var(--acade-text)]" aria-live="polite">
        <DiscreetValue label="Goal summary" block><p>{message}</p></DiscreetValue>
      </div>
      {plan.kind === 'plan' && target?.state === 'unreachable' && plan.suggestion && plan.suggestion.shortLabel !== 'Fail' && (
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          disabled={saving}
          onClick={() => onTargetChange(plan.suggestion!.shortLabel as TargetClass)}
        >
          Aim for <DiscreetValue label="Suggested class">{plan.suggestion.label}</DiscreetValue>
        </Button>
      )}
      {plan.kind === 'plan' && (
        <p className="mt-5 border-t border-[var(--acade-border-subtle)] pt-4 text-sm leading-6 text-[var(--acade-text-muted)]">
          Assumes {semesters} of {unitsPerSemester} units at the same GPA, less units already graded in your current semester. Uses every graded course so far; courses awaiting results are left out. Each class starts at its lowest CGPA ({formatCgpa(bandFor(targetClass ?? '2:1').minCGPA)} for {targetClass ?? '2:1'}).
        </p>
      )}
    </section>
  );
}
