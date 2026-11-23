'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useAdmissionRecord, useOlevelRecord } from '@/hooks/useRecordData';
import { LinkButton } from '@/components/ui/LinkButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { computeAggregate, ESTIMATE_NOTE, postUtmeNeeded } from '@/lib/records/admissionRules';
import { OLEVEL_GRADES, type OlevelRecord } from '@/lib/records/olevelRules';
import { aggregateInputFrom, defaultAdmissionRecord } from '@/lib/records/store';
import { describeAggregateStep, describePostUtmeNeeded, formatScore, olevelNextAction } from '@/lib/records/summary';
import { getGreeting } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import { gradeTone, OlevelResult } from './OlevelResult';

const PANEL = 'min-w-0 rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-deep)] p-4 sm:p-6';
const EMPTY: OlevelRecord = { sittings: [] };

function Greeting({ sentence }: { sentence: string }) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const firstName = profile?.fullName?.split(' ')[0] || user?.displayName?.split(' ')[0] || 'there';
  return (
    <header className="max-w-2xl py-1">
      <h1 className="app-display text-[clamp(1.75rem,3.4vw,2.5rem)] font-bold leading-tight text-[var(--acade-text)]">
        {getGreeting()}, {firstName}.
      </h1>
      <p className="mt-2 text-[0.9375rem] leading-6 text-[var(--acade-text-muted)] sm:text-base">{sentence}</p>
    </header>
  );
}

/** The grade key: what counts as a credit, in the order on the result slip. */
function GradeKey() {
  return (
    <section aria-labelledby="grade-key-title" className={PANEL}>
      <h2 id="grade-key-title" className="text-[1.0625rem] font-semibold text-[var(--acade-text)]">What each grade means</h2>
      <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-3">
        {OLEVEL_GRADES.map((band) => (
          <li key={band.grade} className="rounded-xl bg-[var(--acade-void)] px-3 py-2">
            <span className={cn('block text-[1rem] font-bold tabular-nums', gradeTone(band.grade))}>{band.grade}</span>
            <span className="block text-[0.8125rem] tabular-nums text-[var(--acade-text-muted)]">{band.minScore}–{band.maxScore}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[0.875rem] text-[var(--acade-text-muted)]">A1 to C6 are credits. D7 and E8 are passes, and they do not count for admission.</p>
    </section>
  );
}

function NextStep({ action }: { action: { label: string; href: string } | null }) {
  if (!action) return null;
  return (
    <LinkButton href={action.href} className="self-start">
      {action.label}
    </LinkButton>
  );
}

export function OlevelDashboard() {
  const { data, loading, error } = useOlevelRecord();
  const record = data ?? EMPTY;
  return (
    <div className="flex w-full min-w-0 flex-col gap-6 pb-10">
      <Greeting sentence="Your WAEC and NECO grades, and whether they meet the usual admission rule." />
      {loading ? <Skeleton className="h-64" /> : error ? (
        <p role="alert" className={PANEL}>Your O-level results could not load. Check your connection and reload this page.</p>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)]">
          <section aria-labelledby="olevel-dashboard-title" className={cn(PANEL, 'flex flex-col gap-5')}>
            <div className="flex items-center justify-between gap-3">
              <h2 id="olevel-dashboard-title" className="text-[0.9375rem] font-semibold text-[var(--acade-text-muted)]">Your O-level result</h2>
              <Link href="/olevel" className="inline-flex min-h-11 items-center gap-1 text-[0.9375rem] font-semibold text-[var(--acade-primary)] hover:underline">
                Open <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
            <OlevelResult record={record} headingLevel={3} />
            <NextStep action={olevelNextAction(record)} />
          </section>
          <GradeKey />
        </div>
      )}
    </div>
  );
}

export function AdmissionDashboard() {
  const admission = useAdmissionRecord();
  const olevel = useOlevelRecord();
  const loading = admission.loading || olevel.loading;
  const record = admission.data ?? defaultAdmissionRecord();
  const olevelRecord = olevel.data ?? EMPTY;
  const input = aggregateInputFrom(record, olevelRecord);
  const result = computeAggregate(input);
  const targetLine = record.target !== undefined ? `Target ${formatScore(record.target)}: ${describePostUtmeNeeded(postUtmeNeeded(input, record.target))}` : null;
  const action = !record.utme
    ? { label: 'Add your UTME score', href: '/admission' }
    : olevelNextAction(olevelRecord) ?? (record.postUtme?.score === undefined ? { label: 'Add your post-UTME score', href: '/admission' } : null);

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 pb-10">
      <Greeting sentence="Your JAMB score, post-UTME and O-level grades in one admission aggregate." />
      {loading ? <Skeleton className="h-64" /> : admission.error ? (
        <p role="alert" className={PANEL}>Your aggregate could not load. Check your connection and reload this page.</p>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <section aria-labelledby="aggregate-dashboard-title" className={cn(PANEL, 'flex flex-col gap-4')}>
            <div className="flex items-center justify-between gap-3">
              <h2 id="aggregate-dashboard-title" className="text-[0.9375rem] font-semibold text-[var(--acade-text-muted)]">Your admission aggregate</h2>
              <Link href="/admission" className="inline-flex min-h-11 items-center gap-1 text-[0.9375rem] font-semibold text-[var(--acade-primary)] hover:underline">
                Open <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
            <p className="flex items-baseline gap-2">
              <span className="font-[family-name:var(--font-bricolage)] text-[3rem] font-bold leading-none tracking-[-0.03em] text-[var(--acade-text)] tabular-nums">
                {result.aggregate !== null ? formatScore(result.aggregate) : result.ok && result.steps.length ? formatScore(result.partial) : '–'}
              </span>
              <span className="text-[1rem] font-medium text-[var(--acade-text-muted)]">{result.aggregate !== null ? 'out of 100' : 'so far, out of 100'}</span>
            </p>
            {result.ok && result.steps.length > 0 ? (
              <ul className="flex flex-col">
                {result.steps.map((step) => {
                  const line = describeAggregateStep(step);
                  return (
                    <li key={step.part} className="flex justify-between gap-3 border-b border-[var(--acade-border-subtle)] py-2 text-[0.9375rem] last:border-0">
                      <span className="text-[var(--acade-text)]">{line.label}</span>
                      <span className="tabular-nums text-[var(--acade-text-muted)]"><span className="font-semibold text-[var(--acade-text)]">{line.value}</span> of {line.outOf}</span>
                    </li>
                  );
                })}
              </ul>
            ) : null}
            {targetLine ? <p className="text-[0.9375rem] font-medium text-[var(--acade-text)]">{targetLine}</p> : null}
            <p className="rounded-lg bg-[var(--acade-gold-dim)] px-3 py-2 text-[0.875rem] font-medium text-[var(--acade-text)]">{ESTIMATE_NOTE}</p>
            <NextStep action={action} />
          </section>
          <section aria-labelledby="olevel-summary-title" className={cn(PANEL, 'flex flex-col gap-4')}>
            <div className="flex items-center justify-between gap-3">
              <h2 id="olevel-summary-title" className="text-[0.9375rem] font-semibold text-[var(--acade-text-muted)]">Your O-level result</h2>
              <Link href="/olevel" className="inline-flex min-h-11 items-center gap-1 text-[0.9375rem] font-semibold text-[var(--acade-primary)] hover:underline">
                Open <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
            <OlevelResult record={olevelRecord} compact headingLevel={3} />
          </section>
        </div>
      )}
    </div>
  );
}
