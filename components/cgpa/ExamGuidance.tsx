import { Badge, getGradeBadgeVariant } from '@/components/ui/Badge';
import { cn } from '@/lib/utils/cn';
import { examNeededForGrades } from './examNeeded';

/**
 * A2: exam score needed out of 70 for each grade, from a known CA on an
 * awaiting-result row. Labelled as guidance; the institution sets grades.
 */
export function ExamGuidance({ courseName, caScore, className }: { courseName: string; caScore: number; className?: string }) {
  const rows = examNeededForGrades(caScore);
  return (
    <div role="region" aria-label={`${courseName}: exam score needed`} className={cn('rounded-[var(--radius-control)] bg-[var(--acade-deep)] px-3 py-3 sm:px-4', className)}>
      <p className="text-xs leading-5 text-[var(--acade-text-muted)]">
        <span className="font-semibold text-[var(--acade-text)]">Exam score needed out of 70</span>{' '}
        with CA {caScore}. Guidance only: your institution sets final grades.
      </p>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2" aria-label="Exam score needed for each grade">
        {rows.map((row) => (
          <li key={row.grade} className="flex min-h-7 items-center gap-1.5 text-sm">
            <Badge variant={getGradeBadgeVariant(row.grade)} className="min-w-7 justify-center px-1.5 py-0.5">{row.grade}</Badge>
            <span className="sr-only">: </span>
            {row.status === 'needed' && (
              <span className="font-[family-name:var(--font-geist-mono)] font-semibold tabular-nums text-[var(--acade-text)]">{row.needed}</span>
            )}
            {row.status === 'secured' && <span className="font-semibold text-[var(--acade-success)]">Secured</span>}
            {row.status === 'not-reachable' && <span className="text-[var(--acade-text-muted)]">Not reachable</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
