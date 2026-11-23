'use client';

import { CheckCircle2, CircleAlert, Clock3 } from 'lucide-react';
import { combineSittings, isCredit, isPass, OLEVEL_EXAMS, type OlevelRecord } from '@/lib/records/olevelRules';
import { describeOlevel, subjectLabel } from '@/lib/records/summary';
import { cn } from '@/lib/utils/cn';

const EXAM_SHORT = new Map(OLEVEL_EXAMS.map((exam) => [exam.id, exam.short]));

/** Credit, pass, fail or awaiting: one tone each, the same in the grid and the editor. */
export function gradeTone(grade: string): string {
  if (grade === 'AR') return 'text-[var(--acade-text-muted)]';
  if (isCredit(grade)) return 'text-[var(--acade-success)]';
  if (isPass(grade)) return 'text-[var(--acade-warning)]';
  return 'text-[var(--acade-danger)]';
}

/**
 * The answer to "Do I have five credits with English and Maths?": the credit
 * count, the rule in words, what is missing and (full view) the best grade per
 * subject across both sittings.
 */
export function OlevelResult({ record, compact = false, headingLevel = 2 }: { record: OlevelRecord; compact?: boolean; headingLevel?: 2 | 3 }) {
  const status = describeOlevel(record);
  const combined = combineSittings(record.sittings);
  const twoSittings = record.sittings.filter((sitting) => sitting.subjects.length > 0).length > 1;
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const Icon = status.state === 'meets' ? CheckCircle2 : status.state === 'awaiting' ? Clock3 : CircleAlert;

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex items-start gap-4">
        <p className="flex shrink-0 flex-col items-center rounded-2xl bg-[var(--acade-overlay)] px-4 py-3 text-center">
          <span className="font-[family-name:var(--font-bricolage)] text-[2.75rem] font-bold leading-none tracking-[-0.03em] text-[var(--acade-text)] tabular-nums">
            {status.creditCount}
          </span>
          <span className="mt-1 text-[0.8125rem] font-medium text-[var(--acade-text-muted)]">{status.creditCount === 1 ? 'credit' : 'credits'}</span>
        </p>
        <div className="min-w-0">
          <Heading className="flex items-start gap-2 font-[family-name:var(--font-bricolage)] text-[1.25rem] font-bold leading-snug tracking-[-0.02em] text-[var(--acade-text)]">
            <Icon
              size={20}
              aria-hidden="true"
              className={cn('mt-1 shrink-0', status.state === 'meets' ? 'text-[var(--acade-success)]' : status.state === 'empty' ? 'text-[var(--acade-text-faint)]' : 'text-[var(--acade-warning)]')}
            />
            <span>{status.headline}</span>
          </Heading>
          <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-[var(--acade-text-muted)]">{status.detail}</p>
        </div>
      </div>

      {/* When the headline already names the missing subjects, the list would repeat it. */}
      {status.missing.length > 0 && !status.headline.includes('but no credit in') ? (
        <div className="rounded-xl bg-[var(--acade-gold-dim)] px-4 py-3">
          <p className="text-[0.875rem] font-semibold text-[var(--acade-text)]">Still needs a credit (C6 or better)</p>
          <ul className="mt-1.5 flex flex-wrap gap-2">
            {status.missing.map((name) => (
              <li key={name} className="rounded-full bg-[var(--acade-deep)] px-3 py-1 text-[0.875rem] font-medium text-[var(--acade-text)]">{name}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {!compact && combined.length > 0 ? (
        <div className="min-w-0">
          <h3 className="text-[0.9375rem] font-semibold text-[var(--acade-text)]">{twoSittings ? 'Best grade per subject, from both sittings' : 'Your grades'}</h3>
          <table className="mt-2 w-full text-left text-[0.9375rem]">
            <thead className="text-[0.8125rem] text-[var(--acade-text-muted)]">
              <tr className="border-b border-[var(--acade-border-subtle)]">
                <th scope="col" className="py-2 pr-3 font-medium">Subject</th>
                <th scope="col" className="w-16 py-2 pr-3 font-medium">Grade</th>
                {twoSittings ? <th scope="col" className="py-2 text-right font-medium">From</th> : null}
              </tr>
            </thead>
            <tbody>
              {combined.map((subject) => {
                const sitting = record.sittings[subject.sittingIndex];
                return (
                  <tr key={subject.subjectId} className="border-b border-[var(--acade-border-subtle)] last:border-0">
                    <th scope="row" className="py-2.5 pr-3 font-medium text-[var(--acade-text)]">{subjectLabel(subject.subjectId, subject.name)}</th>
                    <td className={cn('py-2.5 pr-3 font-semibold tabular-nums', gradeTone(subject.grade))}>
                      {subject.grade === 'AR' ? 'Awaiting' : subject.grade}
                    </td>
                    {twoSittings ? (
                      <td className="py-2.5 text-right text-[0.875rem] text-[var(--acade-text-muted)]">
                        {sitting ? `${EXAM_SHORT.get(sitting.exam) ?? ''} ${sitting.year}` : ''}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
