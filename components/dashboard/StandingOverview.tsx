'use client';

import { AlertTriangle, BookOpen, CircleGauge, GraduationCap } from 'lucide-react';

import { CGPAArc } from '@/components/cgpa/CGPAArc';
import { Card } from '@/components/ui/Card';
import { Toggle } from '@/components/ui/Toggle';
import { cn } from '@/lib/utils/cn';
import { formatCgpa, type DegreeClassShortLabel } from '@/lib/cgpa/academicRules';
import { cgpaTone } from '@/lib/cgpa/scale';
import { useGradingScale } from '@/hooks/useGradingScale';

/** Class pill: the class's text tone on a tint of its fill (degree class follows CGPA; tone by class rank on the scale). */
const CLASS_TONES: Record<DegreeClassShortLabel, { text: string; fill: string }> = {
  '1st': { text: 'var(--class-first)', fill: 'var(--class-first-fill, #FFB23F)' },
  '2:1': { text: 'var(--class-2upper)', fill: 'var(--class-2upper-fill, #6B4EFF)' },
  '2:2': { text: 'var(--class-2lower)', fill: 'var(--class-2lower-fill, #12A4B0)' },
  '3rd': { text: 'var(--class-third)', fill: 'var(--class-third-fill, #F2762E)' },
  Pass: { text: 'var(--class-pass)', fill: 'var(--class-pass-fill, #E0457B)' },
  Fail: { text: 'var(--class-fail)', fill: 'var(--class-fail-fill, #E5484D)' },
};
import { DiscreetRevealButton, DiscreetScope, DiscreetValue } from '@/lib/discreet';

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
  const { scale } = useGradingScale();
  const classTone = CLASS_TONES[cgpaTone(cgpa, scale)];
  const stats = [
    { label: 'Credits', value: hasAcademicData ? String(totalCredits) : '—', icon: GraduationCap },
    { label: 'Courses', value: hasAcademicData ? String(coursesDone) : '—', icon: BookOpen },
    { label: 'Current semester', value: hasAcademicData ? formatCgpa(currentSemesterMetric) : '—', icon: CircleGauge, discreet: true },
    { label: 'Needs attention', value: hasAcademicData ? String(atRiskCount) : '—', icon: AlertTriangle, warning: atRiskCount > 0 },
  ];

  return (
    <DiscreetScope>
    <Card padding="none" className="app-night relative h-full overflow-hidden rounded-[24px] border-white/[0.06]">
      <div
        className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full bg-[radial-gradient(circle,rgba(255,178,63,0.16),transparent_65%)]"
        aria-hidden="true"
      />

      <div className="relative flex items-start justify-between gap-4 px-5 pt-5 sm:px-7 sm:pt-6">
        <div className="min-w-0">
          <h2 className="truncate font-[family-name:var(--font-bricolage)] text-[1.25rem] font-semibold tracking-[-0.02em] text-white">
            Current standing
          </h2>
          <p className="mt-0.5 truncate text-sm text-[var(--acade-text-muted)]">
            {latestSemesterLabel || 'Academic record'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
        <DiscreetRevealButton label="Standing" />
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
      </div>

      <div className="relative grid items-center gap-5 px-5 py-6 sm:grid-cols-[minmax(0,1fr)_190px] sm:px-7">
        <div className="order-2 sm:order-1">
          {hasAcademicData ? (
            <>
              <p className="text-sm font-medium text-[var(--acade-text-muted)]">
                {isPIMode ? 'Performance Index' : 'Cumulative GPA'}
              </p>
              <p className="app-num mt-1 text-[clamp(3rem,8vw,5rem)] font-bold leading-none text-white">
                <DiscreetValue label={isPIMode ? 'Performance Index' : 'Cumulative GPA'}>{formatCgpa(isPIMode ? pi : cgpa)}</DiscreetValue>
              </p>
              <p className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm text-[var(--acade-text-muted)]">
                <span
                  className="inline-flex items-center rounded-full px-3 py-1 text-[0.8125rem] font-semibold"
                  style={{ color: classTone.text, backgroundColor: `color-mix(in srgb, ${classTone.fill} 18%, transparent)` }}
                >
                  <DiscreetValue label="Degree class">{degreeClassLabel}</DiscreetValue>
                </span>
                <span>Degree class follows CGPA</span>
              </p>
              {unknownCount > 0 && (
                <p className="mt-4 inline-flex rounded-full bg-[var(--acade-info)]/10 px-3 py-1 text-[0.8125rem] font-medium text-[var(--acade-info)]">
                  {unknownCount} incomplete {unknownCount === 1 ? 'record' : 'records'} excluded from risk
                </p>
              )}
            </>
          ) : (
            <>
              <p className="font-[family-name:var(--font-bricolage)] text-[length:var(--text-2xl)] font-semibold text-white">
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
            <DiscreetValue label="CGPA gauge" block>
              <CGPAArc cgpa={cgpa} pi={pi} size="md" animateOnMount showParticles={false} primaryMetric={isPIMode ? 'pi' : 'cgpa'} />
            </DiscreetValue>
          ) : (
            <div className="flex size-[180px] items-center justify-center rounded-full border border-dashed border-[var(--acade-border)] bg-white/[0.03] text-center">
              <span className="app-num text-4xl text-[var(--acade-text-faint)]">—</span>
            </div>
          )}
        </div>
      </div>

      <dl id="tour-quick-stats" className="relative grid grid-cols-2 border-t border-[var(--acade-border-subtle)] bg-white/[0.03] sm:grid-cols-4">
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
              <dt className="flex items-center gap-1.5 truncate text-[0.8125rem] text-[var(--acade-text-muted)]">
                <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                {stat.label}
              </dt>
              <dd className={cn('app-num mt-1.5 text-[1.5rem] font-bold leading-none', stat.warning ? 'text-[var(--acade-warning)]' : 'text-white')}>
                {stat.discreet && hasAcademicData ? <DiscreetValue label={`${stat.label} GPA`}>{stat.value}</DiscreetValue> : stat.value}
              </dd>
            </div>
          );
        })}
      </dl>
    </Card>
    </DiscreetScope>
  );
}
