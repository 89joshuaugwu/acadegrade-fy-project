import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';

import type { DashboardCourseRecord } from '@/lib/dashboard/summary';
import { Badge, getGradeBadgeVariant } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

export function RecentResults({ courses }: { courses: DashboardCourseRecord[] }) {
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex items-end justify-between gap-4 border-b border-[var(--acade-border-subtle)] px-4 py-4 sm:px-5">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--acade-primary)]">
            Latest updates
          </p>
          <h2 className="mt-1 font-[family-name:var(--font-bricolage)] text-[length:var(--text-xl)] font-semibold text-[var(--acade-text)]">
            Recent results
          </h2>
        </div>
        <Link
          href="/results"
          className="flex min-h-12 shrink-0 items-center gap-1 rounded-[var(--radius-control)] px-3 text-sm font-semibold text-[var(--acade-primary)] transition-colors hover:bg-[var(--acade-primary-dim)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]"
        >
          View all
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      {courses.length === 0 ? (
        <div className="flex min-h-48 flex-col items-center justify-center px-5 py-10 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-[var(--acade-primary-dim)] text-[var(--acade-primary)]">
            <BookOpen className="size-5" aria-hidden="true" />
          </span>
          <h3 className="mt-4 font-[family-name:var(--font-bricolage)] text-base font-semibold text-[var(--acade-text)]">
            Your academic record starts here
          </h3>
          <p className="mt-1 max-w-sm text-sm leading-6 text-[var(--acade-text-muted)]">
            Add a semester to calculate your standing and unlock meaningful insights.
          </p>
          <Link
            href="/results/new"
            className="mt-5 inline-flex min-h-12 items-center rounded-[var(--radius-control)] bg-[var(--acade-primary)] px-5 text-sm font-semibold text-[var(--acade-on-primary)] transition-colors hover:bg-[var(--acade-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]"
          >
            Add your first semester
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--acade-border-subtle)]" aria-label="Recent course results">
          {courses.map((course) => {
            const scoreLabel = typeof course.totalScore === 'number'
              ? `${course.totalScore}/100`
              : course.grade
                ? 'Grade only'
                : 'Awaiting score';

            return (
              <li key={`${course.semesterId}-${course.id}`}>
                <Link
                  href={`/results/${encodeURIComponent(course.semesterId)}?course=${encodeURIComponent(course.id)}`}
                  className="group grid min-h-20 grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--acade-overlay)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--acade-primary)] sm:px-5"
                >
                  <span className="flex size-11 items-center justify-center">
                    {course.grade ? (
                      <Badge variant={getGradeBadgeVariant(course.grade)} className="min-w-10 justify-center px-2 py-1.5">
                        {course.grade}
                      </Badge>
                    ) : (
                      <span className="flex size-10 items-center justify-center rounded-[var(--radius-control)] bg-[var(--acade-overlay)] text-[var(--acade-text-muted)]">
                        <BookOpen className="size-4" aria-hidden="true" />
                      </span>
                    )}
                  </span>

                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-[var(--acade-text)]">
                      {course.code} <span className="font-medium text-[var(--acade-text-muted)]">{course.title}</span>
                    </span>
                    <span className="mt-1 block truncate text-xs text-[var(--acade-text-faint)]">
                      {course.semesterLabel}{course.units ? ` · ${course.units} credit${course.units === 1 ? '' : 's'}` : ''}
                    </span>
                  </span>

                  <span className="min-w-[4.75rem] text-right">
                    <span className="block font-[family-name:var(--font-geist-mono)] text-sm font-semibold text-[var(--acade-text)]">
                      {scoreLabel}
                    </span>
                    <span className="mt-1 block text-[0.68rem] text-[var(--acade-text-faint)] transition-colors group-hover:text-[var(--acade-primary)]">
                      Open result
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
