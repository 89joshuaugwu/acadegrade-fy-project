'use client';

import { AlertTriangle, BookOpen, CircleGauge, GraduationCap } from 'lucide-react';

import { CGPAArc } from '@/components/cgpa/CGPAArc';
import { Card } from '@/components/ui/Card';
import { Toggle } from '@/components/ui/Toggle';
import { cn } from '@/lib/utils/cn';

interface StandingOverviewProps {
  hasAcademicData: boolean;
  isPIMode: boolean;
  onModeChange: (checked: boolean) => void;
  cgpa: number;
  pi: number;
  degreeClassLabel: string;
  latestSemesterLabel: string | null;
  currentSemesterMetric: number;
  totalCredits: number;
  coursesDone: number;
  atRiskCount: number;
  unknownCount: number;
}

export function StandingOverview({
  hasAcademicData,
  isPIMode,
  onModeChange,
  cgpa,
  pi,
  degreeClassLabel,
  latestSemesterLabel,
  currentSemesterMetric,
  totalCredits,
  coursesDone,
  atRiskCount,
  unknownCount,
}: StandingOverviewProps) {
  const stats = [
    { label: 'Credits', value: hasAcademicData ? String(totalCredits) : '—', icon: GraduationCap },
    { label: 'Courses', value: hasAcademicData ? String(coursesDone) : '—', icon: BookOpen },
    { label: 'Current semester', value: hasAcademicData ? currentSemesterMetric.toFixed(2) : '—', icon: CircleGauge },
    { label: 'Needs attention', value: hasAcademicData ? String(atRiskCount) : '—', icon: AlertTriangle, warning: atRiskCount > 0 },
  ];

  return (
    <Card padding="none" className="relative h-full overflow-hidden">
      <div
        className="absolute inset-x-0 top-0 h-px"
        aria-hidden="true"
        style={{
          background:
            'linear-gradient(90deg, var(--acade-primary), var(--acade-gold), var(--acade-primary), transparent)',
          backgroundSize: '200% auto',
          animation: 'dashboard-standing-shimmer 10s linear infinite',
        }}
      />

      <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="min-w-0">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--acade-primary)]">
            Current standing
          </p>
          <h2 className="mt-1 truncate font-[family-name:var(--font-bricolage)] text-[length:var(--text-xl)] font-semibold text-[var(--acade-text)]">
            {latestSemesterLabel || 'Academic record'}
          </h2>
        </div>
        <div id="tour-metrics-toggle" className="shrink-0">
          <Toggle
            checked={isPIMode}
            onChange={onModeChange}
            leftLabel="CGPA"
            rightLabel="PI"
            aria-label="Choose the primary academic metric"
          />
        </div>
      </div>

      <div className="grid items-center gap-5 px-5 py-6 sm:grid-cols-[minmax(0,1fr)_190px] sm:px-6">
        <div className="order-2 sm:order-1">
          {hasAcademicData ? (
            <>
              <p className="text-sm font-medium text-[var(--acade-text-muted)]">
                {isPIMode ? 'Performance Index' : 'Cumulative GPA'}
              </p>
              <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-[clamp(2.5rem,8vw,4.75rem)] font-semibold leading-none tracking-[-0.055em] text-[var(--acade-text)] tabular-nums">
                {(isPIMode ? pi : cgpa).toFixed(2)}
              </p>
              <p className="mt-3 text-sm text-[var(--acade-text-muted)]">
                {degreeClassLabel} <span className="px-1.5 text-[var(--acade-text-faint)]">·</span> Degree class follows CGPA
              </p>
              {unknownCount > 0 && (
                <p className="mt-4 inline-flex rounded-full bg-[var(--acade-info)]/10 px-3 py-1 text-xs font-medium text-[var(--acade-info)]">
                  {unknownCount} incomplete {unknownCount === 1 ? 'record' : 'records'} excluded from risk
                </p>
              )}
            </>
          ) : (
            <>
              <p className="font-[family-name:var(--font-bricolage)] text-[length:var(--text-2xl)] font-semibold text-[var(--acade-text)]">
                No result yet
              </p>
              <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--acade-text-muted)]">
                Add a semester to calculate your standing.
              </p>
            </>
          )}
        </div>

        <div id="tour-cgpa-arc" className="order-1 flex justify-center sm:order-2">
          {hasAcademicData ? (
            <CGPAArc cgpa={cgpa} pi={pi} size="md" animateOnMount showParticles={false} primaryMetric={isPIMode ? 'pi' : 'cgpa'} />
          ) : (
            <div className="flex size-[180px] items-center justify-center rounded-full border border-dashed border-[var(--acade-border)] bg-[var(--acade-surface)] text-center">
              <span className="font-[family-name:var(--font-geist-mono)] text-4xl text-[var(--acade-text-faint)]">—</span>
            </div>
          )}
        </div>
      </div>

      <dl id="tour-quick-stats" className="grid grid-cols-2 border-t border-[var(--acade-border-subtle)] sm:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={cn(
                'min-w-0 px-4 py-4',
                index % 2 !== 0 && 'border-l border-[var(--acade-border-subtle)]',
                index >= 2 && 'border-t border-[var(--acade-border-subtle)] sm:border-t-0',
                index > 0 && 'sm:border-l sm:border-[var(--acade-border-subtle)]'
              )}
            >
              <dt className="flex items-center gap-1.5 truncate text-xs text-[var(--acade-text-muted)]">
                <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                {stat.label}
              </dt>
              <dd className={cn('mt-2 font-[family-name:var(--font-geist-mono)] text-xl font-semibold tabular-nums', stat.warning ? 'text-[var(--acade-warning)]' : 'text-[var(--acade-text)]')}>
                {stat.value}
              </dd>
            </div>
          );
        })}
      </dl>
    </Card>
  );
}
