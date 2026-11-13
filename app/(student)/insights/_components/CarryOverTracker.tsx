import { useId } from 'react';
import { CircleCheck } from 'lucide-react';
import { Badge, getGradeBadgeVariant } from '@/components/ui/Badge';
import type { CarryOverReport } from '@/lib/planning/carryOvers';
import { DiscreetValue } from '@/lib/discreet';

const units = (n: number) => `${n} ${n === 1 ? 'unit' : 'units'}`;

/**
 * A4 carry-over tracker. Outstanding carry-overs (an F not yet passed under
 * the same course code) are kept apart from the D/E/F "low grades" list.
 */
export function CarryOverTracker({ report }: { report: CarryOverReport }) {
  const carryId = useId();
  const lowId = useId();
  const { outstanding, outstandingUnits, atRisk } = report;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <section aria-labelledby={carryId} className="rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-surface)]">
        <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 pt-5">
          <h2 id={carryId} className="font-[family-name:var(--font-bricolage)] text-lg font-bold text-[var(--acade-text)]">Carry-overs</h2>
          <p className="text-sm font-semibold tabular-nums text-[var(--acade-text)]">
            <DiscreetValue label="Carry-over count">{outstanding.length === 0 ? 'None outstanding' : `${outstanding.length} outstanding · ${units(outstandingUnits)}`}</DiscreetValue>
          </p>
        </header>
        <p className="px-5 pt-1 text-sm leading-6 text-[var(--acade-text-muted)] text-pretty">
          A course you failed (F) and have not passed since. It clears once you pass the same course code. Courses awaiting results are not counted.
        </p>
        <DiscreetValue label="Carry-over list" block>
        {outstanding.length > 0 ? (
          <ul className="mt-4 divide-y divide-[var(--acade-border-subtle)] border-t border-[var(--acade-border-subtle)]">
            {outstanding.map(item => (
              <li key={item.normalisedCode} className="flex items-start justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <p className="font-[family-name:var(--font-geist-mono)] text-sm font-semibold text-[var(--acade-text)]">{item.code}</p>
                  <p className="truncate text-sm text-[var(--acade-text-muted)]">{item.title || 'Untitled course'}</p>
                  <p className="text-xs text-[var(--acade-text-muted)]">
                    Failed in {item.semesterLabel}{item.attempts > 1 ? ` · ${item.attempts} attempts` : ''}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-[var(--acade-text)]">{units(item.units)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-5 mt-4 flex items-center gap-2 rounded-[var(--radius-control)] bg-[var(--acade-overlay)] px-4 py-3 text-sm text-[var(--acade-text)]">
            <CircleCheck className="size-4 shrink-0 text-[var(--acade-success)]" aria-hidden="true" />
            You have no failed course left to retake.
          </p>
        )}
        </DiscreetValue>
        {outstanding.length > 0 && <div className="h-2" aria-hidden="true" />}
      </section>

      <section aria-labelledby={lowId} className="rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-surface)]">
        <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 pt-5">
          <h2 id={lowId} className="font-[family-name:var(--font-bricolage)] text-lg font-bold text-[var(--acade-text)]">Low grades (D, E or F)</h2>
          <p className="text-sm font-semibold tabular-nums text-[var(--acade-text)]"><DiscreetValue label="Low-grade count">{atRisk.length === 0 ? 'None' : `${atRisk.length} ${atRisk.length === 1 ? 'course' : 'courses'}`}</DiscreetValue></p>
        </header>
        <p className="px-5 pt-1 text-sm leading-6 text-[var(--acade-text-muted)] text-pretty">
          D and E are passes but pull your CGPA down. F is a fail and appears under carry-overs until you pass it.
        </p>
        <DiscreetValue label="Low-grade list" block>
        {atRisk.length > 0 ? (
          <ul className="mt-4 max-h-[28rem] divide-y divide-[var(--acade-border-subtle)] overflow-y-auto border-t border-[var(--acade-border-subtle)]">
            {atRisk.map((item, index) => (
              <li key={`${item.code}-${item.semesterLabel}-${index}`} className="flex items-start justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <p className="font-[family-name:var(--font-geist-mono)] text-sm font-semibold text-[var(--acade-text)]">{item.code}</p>
                  <p className="truncate text-sm text-[var(--acade-text-muted)]">{item.title || 'Untitled course'}</p>
                  <p className="text-xs text-[var(--acade-text-muted)]">{item.semesterLabel} · {units(item.units)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {item.totalScore !== null && <span className="text-sm tabular-nums text-[var(--acade-text-muted)]">{item.totalScore}%</span>}
                  <Badge variant={getGradeBadgeVariant(item.grade)}>{item.grade}</Badge>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-5 mt-4 rounded-[var(--radius-control)] bg-[var(--acade-overlay)] px-4 py-3 text-sm text-[var(--acade-text)]">
            No graded course is below a C.
          </p>
        )}
        </DiscreetValue>
        {atRisk.length > 0 && <div className="h-2" aria-hidden="true" />}
      </section>
    </div>
  );
}
