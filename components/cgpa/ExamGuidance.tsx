import { Badge, getGradeBadgeVariant } from '@/components/ui/Badge';
import { cn } from '@/lib/utils/cn';
import { examNeededForGrades } from './examNeeded';
import { useGradingScale } from '@/hooks/useGradingScale';
import { gradeTone } from '@/lib/cgpa/scale';

/**
 * A2: exam score needed out of 70 for each grade, from a known CA on an
 * awaiting-result row. Labelled as guidance; the institution sets grades.
 */
export function ExamGuidance({ courseName, caScore, className }: { courseName: string; caScore: number; className?: string }) {
  const { scale } = useGradingScale();
  const rows = examNeededForGrades(caScore, scale);
  return (
    <div role="region" aria-label={`${courseName}: exam score needed`} className={cn('rounded-2xl border border-[var(--acade-border-subtle)] bg-[var(--acade-void)] px-3.5 py-3 sm:px-4', className)}>
      <p className="text-[0.8125rem] leading-5 text-[var(--acade-text-muted)]">
        <span className="font-semibold text-[var(--acade-text)]">Exam score needed out of 70</span>{' '}
        with CA {caScore}. Guidance only: your institution sets final grades.
      </p>
      <ul className="mt-2.5 flex flex-wrap gap-x-5 gap-y-2" aria-label="Exam score needed for each grade">
        {rows.map((row) => (
          <li key={row.grade} className="flex min-h-7 items-center gap-2 text-sm">
            <Badge variant={getGradeBadgeVariant(gradeTone(row.grade, scale))} className="min-w-7 justify-center px-1.5 py-0.5">{row.grade}</Badge>
            <span className="sr-only">: </span>
            {row.status === 'needed' && (
              <span className="app-num text-[0.9375rem] font-bold text-[var(--acade-text)]">{row.needed}</span>
            )}
            {row.status === 'secured' && <span className="font-semibold text-[var(--acade-success)]">Secured</span>}
            {row.status === 'not-reachable' && <span className="text-[var(--acade-text-muted)]">Not reachable</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
