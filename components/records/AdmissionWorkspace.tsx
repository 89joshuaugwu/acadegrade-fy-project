'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { useAdmissionRecord, useOlevelRecord } from '@/hooks/useRecordData';
import { Button } from '@/components/ui/Button';
import { HelpButton } from '@/components/help/HelpDrawer';
import { STUDENT_HELP, studentHelpSource } from '@/lib/help/student-help';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  AGGREGATE_FORMULAS,
  computeAggregate,
  CREDIT_GRADES,
  ESTIMATE_NOTE,
  OLEVEL_AGGREGATE_SUBJECTS,
  OLEVEL_POINT_TABLES,
  POST_UTME_MAX_LIMIT,
  postUtmeNeeded,
  UTME_MAX,
  type AggregateFormulaId,
  type AggregatePart,
  type OlevelPointTableId,
  type OlevelPoints,
} from '@/lib/records/admissionRules';
import { OLEVEL_GRADES, type OlevelEntryGrade } from '@/lib/records/olevelRules';
import { aggregateInputFrom, defaultAdmissionRecord, isValidTarget, pickAggregateGrades, RecordSaveError, saveAdmissionRecord, type AdmissionRecord } from '@/lib/records/store';
import { describeAggregateStep, describePostUtmeNeeded, formatScore, subjectLabel } from '@/lib/records/summary';
import { cn } from '@/lib/utils/cn';
import { gradeTone } from './OlevelResult';
import { SubjectPicker } from './SubjectPicker';

const PANEL = 'min-w-0 rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-deep)] p-4 sm:p-6';
const GRADE_OPTIONS = [...OLEVEL_GRADES.map((band) => ({ value: band.grade, label: band.grade })), { value: 'AR', label: 'Awaiting' }];
const TABLE_OPTIONS = [
  ...OLEVEL_POINT_TABLES.map((table) => ({ value: table.id, label: table.name })),
  { value: 'custom', label: 'My school’s own points' },
];
const MISSING_COPY: Record<AggregatePart, string> = {
  utme: 'Add your UTME score.',
  olevel: 'Add five O-level grades.',
  postUtme: 'Add your post-UTME score when you have it.',
};

type ManualRow = { subjectId: string; name: string; grade: OlevelEntryGrade | '' };

/** Text in a number field: '' is "not entered"; anything else is parsed. */
const toNumber = (text: string): number | null => {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : NaN;
};
const fromNumber = (value: number | undefined | null) => (value === undefined || value === null ? '' : String(value));

interface Fields {
  utme: string;
  post: string;
  postMax: string;
  weights: { utme: string; olevel: string; postUtme: string };
  points: Record<string, string>;
  school: string;
  course: string;
}

function fieldsFrom(record: AdmissionRecord): Fields {
  const custom = record.customPoints ?? OLEVEL_POINT_TABLES[0].points;
  return {
    utme: fromNumber(record.utme?.score),
    post: fromNumber(record.postUtme?.score),
    postMax: fromNumber(record.postUtme?.max ?? 100),
    weights: {
      utme: fromNumber(record.weights?.utme ?? 50),
      olevel: fromNumber(record.weights?.olevel ?? 20),
      postUtme: fromNumber(record.weights?.postUtme ?? 30),
    },
    points: Object.fromEntries(CREDIT_GRADES.map((grade) => [grade, String(custom[grade])])),
    school: record.school ?? '',
    course: record.course ?? '',
  };
}

export function AdmissionWorkspace() {
  const { uid } = useAuth();
  const admission = useAdmissionRecord();
  const olevel = useOlevelRecord();
  const [base, setBase] = useState<AdmissionRecord | null>(null);
  const [fields, setFields] = useState<Fields | null>(null);
  const [manual, setManual] = useState<ManualRow[]>([]);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [target, setTarget] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (admission.loading || admission.error) return;
    if (base && dirty) return;
    const record = admission.data ?? defaultAdmissionRecord();
    setBase(record);
    setFields(fieldsFrom(record));
    setTarget(fromNumber(record.target));
    const rows: ManualRow[] = (record.olevelGrades ?? []).map((row) => ({ subjectId: row.subjectId, name: subjectLabel(row.subjectId), grade: row.grade }));
    while (rows.length < OLEVEL_AGGREGATE_SUBJECTS) rows.push({ subjectId: '', name: '', grade: '' });
    setManual(rows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admission.data, admission.loading, admission.error]);

  /** The record the screen shows and saves, built from the typed fields. */
  const record = useMemo<AdmissionRecord | null>(() => {
    if (!base || !fields) return null;
    const next: AdmissionRecord = { formula: base.formula, olevelSource: base.olevelSource, pointTable: base.pointTable ?? 'four-to-two' };
    const utme = toNumber(fields.utme);
    if (utme !== null) next.utme = { score: utme };
    const post = toNumber(fields.post);
    const postMax = toNumber(fields.postMax);
    if (post !== null) next.postUtme = { score: post, max: postMax ?? 100 };
    // The school's total is kept even before the score is out (100 is the default, so it is not stored).
    else if (postMax !== null && postMax !== 100) next.postUtme = { max: postMax };
    if (base.formula === 'custom') {
      next.weights = { utme: toNumber(fields.weights.utme) ?? 0, olevel: toNumber(fields.weights.olevel) ?? 0, postUtme: toNumber(fields.weights.postUtme) ?? 0 };
    }
    if (next.pointTable === 'custom') {
      next.customPoints = Object.fromEntries(CREDIT_GRADES.map((grade) => [grade, toNumber(fields.points[grade]) ?? 0])) as OlevelPoints;
    }
    if (base.olevelSource === 'manual') {
      const grades = manual.filter((row) => row.subjectId && row.grade).map((row) => ({ subjectId: row.subjectId, grade: row.grade as OlevelEntryGrade }));
      if (grades.length) next.olevelGrades = grades;
    }
    if (fields.school.trim()) next.school = fields.school;
    if (fields.course.trim()) next.course = fields.course;
    const aim = toNumber(target);
    if (aim !== null) next.target = aim;
    return next;
  }, [base, fields, manual, target]);

  const input = useMemo(() => (record ? aggregateInputFrom(record, olevel.data) : null), [record, olevel.data]);
  const result = useMemo(() => (input ? computeAggregate(input) : null), [input]);
  const picked = useMemo(() => pickAggregateGrades(olevel.data), [olevel.data]);
  const targetValue = toNumber(target);
  const targetInvalid = targetValue !== null && !isValidTarget(targetValue);
  const needed = input && targetValue !== null && !targetInvalid ? postUtmeNeeded(input, targetValue) : null;

  if (admission.error) {
    return (
      <section className={PANEL} role="alert">
        <h1 className="font-[family-name:var(--font-bricolage)] text-[1.5rem] font-bold text-[var(--acade-text)]">Your aggregate could not load</h1>
        <p className="mt-2 text-[0.9375rem] text-[var(--acade-text-muted)]">Check your connection and try again. Nothing you saved has changed.</p>
        <Button className="mt-4" variant="outline" onClick={() => window.location.reload()}>
          <RefreshCw size={16} className="mr-2" aria-hidden="true" /> Try again
        </Button>
      </section>
    );
  }

  if (!base || !fields || !record || !result || !input) {
    return (
      <div className="grid gap-6 lg:grid-cols-12" aria-busy="true" aria-label="Loading your aggregate">
        <Skeleton className="h-[30rem] lg:col-span-7" />
        <Skeleton className="h-80 lg:col-span-5" />
      </div>
    );
  }

  const setField = (change: Partial<Fields>) => {
    setFields({ ...fields, ...change });
    setDirty(true);
  };
  const setBaseField = (change: Partial<AdmissionRecord>) => {
    setBase({ ...base, ...change });
    setDirty(true);
  };
  const touch = (name: string) => setTouched((previous) => ({ ...previous, [name]: true }));

  const utmeNumber = toNumber(fields.utme);
  const utmeError = touched.utme && utmeNumber !== null && (!Number.isInteger(utmeNumber) || utmeNumber < 0 || utmeNumber > UTME_MAX)
    ? `Enter a whole number from 0 to ${UTME_MAX}.` : undefined;
  const postMaxNumber = toNumber(fields.postMax);
  const postMaxError = touched.postMax && (postMaxNumber === null || !Number.isInteger(postMaxNumber) || postMaxNumber < 1 || postMaxNumber > POST_UTME_MAX_LIMIT)
    ? `Enter a whole number from 1 to ${POST_UTME_MAX_LIMIT}.` : undefined;
  const postNumber = toNumber(fields.post);
  const postError = touched.post && postNumber !== null && (Number.isNaN(postNumber) || postNumber < 0 || postNumber > (postMaxNumber ?? 100))
    ? `Enter a score from 0 to ${formatScore(postMaxNumber ?? 100)}.` : undefined;
  const formula = AGGREGATE_FORMULAS.find((item) => item.id === base.formula) ?? AGGREGATE_FORMULAS[0];
  const weights = formula.weights ?? {
    utme: toNumber(fields.weights.utme) ?? 0,
    olevel: toNumber(fields.weights.olevel) ?? 0,
    postUtme: toNumber(fields.weights.postUtme) ?? 0,
  };
  const weightSum = weights.utme + weights.olevel + weights.postUtme;
  const usesOlevel = weights.olevel > 0;

  const save = async () => {
    if (!uid) return;
    setTouched({ utme: true, post: true, postMax: true, target: true });
    setSaving(true);
    try {
      await saveAdmissionRecord(uid, record);
      setDirty(false);
      toast.success('Your aggregate details are saved');
    } catch (error) {
      toast.error(error instanceof RecordSaveError ? 'Check the highlighted scores before saving.' : "Couldn't save. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-[family-name:var(--font-bricolage)] text-[1.75rem] font-bold tracking-[-0.03em] text-[var(--acade-text)] sm:text-[2rem]">
            Admission aggregate
          </h1>
          <p className="mt-1 max-w-[60ch] text-[0.9375rem] text-[var(--acade-text-muted)]">
            Your UTME, post-UTME and O-level grades worked into one score out of 100, the way most schools rank applicants.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:shrink-0">
          <HelpButton entryId={STUDENT_HELP.admission} source={studentHelpSource} />
          <Button variant={dirty ? 'primary' : 'outline'} onClick={() => void save()} loading={saving} loadingLabel="Saving…">
            {dirty ? 'Save details' : 'Saved'}
          </Button>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-12">
        {/* The answer first on phones; beside the inputs on wide screens. */}
        <section aria-labelledby="aggregate-title" className={cn(PANEL, 'lg:order-2 lg:col-span-5 lg:sticky lg:top-24')}>
          <h2 id="aggregate-title" className="text-[0.9375rem] font-semibold text-[var(--acade-text-muted)]">Your aggregate</h2>
          <p className="mt-1 flex items-baseline gap-2" aria-live="polite">
            <span className="font-[family-name:var(--font-bricolage)] text-[3rem] font-bold leading-none tracking-[-0.03em] text-[var(--acade-text)] tabular-nums">
              {result.aggregate !== null ? formatScore(result.aggregate) : result.ok ? formatScore(result.partial) : '–'}
            </span>
            <span className="text-[1rem] font-medium text-[var(--acade-text-muted)]">
              {result.aggregate !== null ? 'out of 100' : result.ok && result.steps.length ? 'so far, out of 100' : 'out of 100'}
            </span>
          </p>
          <p className="mt-2 rounded-lg bg-[var(--acade-gold-dim)] px-3 py-2 text-[0.875rem] font-medium text-[var(--acade-text)]">{ESTIMATE_NOTE}</p>

          {result.ok && result.steps.length > 0 ? (
            <>
              <h3 className="mt-5 text-[0.9375rem] font-semibold text-[var(--acade-text)]">How it adds up</h3>
              <ol className="mt-2 flex flex-col">
                {result.steps.map((step) => {
                  const line = describeAggregateStep(step);
                  return (
                    <li key={step.part} className="flex items-start justify-between gap-4 border-b border-[var(--acade-border-subtle)] py-3">
                      <span className="min-w-0">
                        <span className="block text-[0.9375rem] font-medium text-[var(--acade-text)]">{line.label}</span>
                        <span className="block text-[0.875rem] tabular-nums text-[var(--acade-text-muted)]">{line.working}</span>
                        {step.subjects?.length ? (
                          <span className="block text-[0.8125rem] tabular-nums text-[var(--acade-text-muted)]">
                            {step.subjects.map((subject) => `${subject.grade} = ${formatScore(subject.points)}`).join(', ')}
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 text-right tabular-nums">
                        <span className="block text-[1.125rem] font-semibold text-[var(--acade-text)]">{line.value}</span>
                        <span className="block text-[0.8125rem] text-[var(--acade-text-muted)]">of {line.outOf}</span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            </>
          ) : null}

          {result.ok && result.missing.length > 0 ? (
            <ul className="mt-4 flex flex-col gap-1 text-[0.9375rem] text-[var(--acade-text-muted)]">
              {result.missing.map((part) => <li key={part}>{MISSING_COPY[part]}</li>)}
            </ul>
          ) : null}
          {!result.ok ? (
            <p className="mt-4 text-[0.9375rem] text-[var(--acade-danger)]">Some numbers need fixing before the aggregate can be worked out.</p>
          ) : null}

          <div className="mt-5 border-t border-[var(--acade-border-subtle)] pt-5">
            <Input
              label="Target aggregate (optional)"
              hint="The cut-off you are aiming for, out of 100. Saved with your details."
              inputMode="decimal"
              placeholder="e.g. 70"
              value={target}
              error={touched.target && targetInvalid ? 'Enter a target from 0 to 100, with at most two decimals.' : undefined}
              onChange={(event) => {
                setTarget(event.target.value.replace(/[^\d.]/g, '').slice(0, 6));
                setDirty(true);
              }}
              onBlur={() => touch('target')}
            />
            {needed ? (
              <p className="mt-3 text-[0.9375rem] font-medium text-[var(--acade-text)]" aria-live="polite">{describePostUtmeNeeded(needed)}</p>
            ) : null}
          </div>
        </section>

        <div className="flex min-w-0 flex-col gap-6 lg:order-1 lg:col-span-7">
          <section aria-labelledby="scores-title" className={PANEL}>
            <h2 id="scores-title" className="font-[family-name:var(--font-bricolage)] text-[1.25rem] font-bold tracking-[-0.02em] text-[var(--acade-text)]">Your scores</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Input
                label="UTME score"
                hint={`Out of ${UTME_MAX}`}
                inputMode="numeric"
                value={fields.utme}
                error={utmeError}
                onChange={(event) => setField({ utme: event.target.value.replace(/[^\d]/g, '').slice(0, 3) })}
                onBlur={() => touch('utme')}
              />
              <Input
                label="Post-UTME score"
                hint="Leave empty until you have it"
                inputMode="decimal"
                value={fields.post}
                error={postError}
                onChange={(event) => setField({ post: event.target.value.replace(/[^\d.]/g, '').slice(0, 6) })}
                onBlur={() => touch('post')}
              />
              <Input
                label="Post-UTME is out of"
                hint="Often 100; some schools use 50 or 400"
                inputMode="numeric"
                value={fields.postMax}
                error={postMaxError}
                onChange={(event) => setField({ postMax: event.target.value.replace(/[^\d]/g, '').slice(0, 3) })}
                onBlur={() => touch('postMax')}
              />
            </div>
          </section>

          <section aria-labelledby="formula-title" className={PANEL}>
            <h2 id="formula-title" className="font-[family-name:var(--font-bricolage)] text-[1.25rem] font-bold tracking-[-0.02em] text-[var(--acade-text)]">Your school’s formula</h2>
            <p className="mt-1 text-[0.875rem] text-[var(--acade-text-muted)]">Schools work the aggregate out differently. Pick the one your school publishes.</p>
            <div role="radiogroup" aria-labelledby="formula-title" className="mt-4 grid gap-3">
              {AGGREGATE_FORMULAS.map((item) => (
                <label
                  key={item.id}
                  className="flex cursor-pointer gap-3 rounded-xl border border-[var(--acade-border)] p-4 transition-colors hover:border-[var(--acade-control-border)] has-[input:checked]:border-[var(--acade-primary)] has-[input:checked]:bg-[var(--acade-primary-dim)] has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-[var(--acade-primary)]"
                >
                  <input
                    type="radio"
                    name="aggregate-formula"
                    value={item.id}
                    checked={base.formula === item.id}
                    onChange={() => setBaseField({ formula: item.id as AggregateFormulaId })}
                    className="peer sr-only"
                  />
                  <span aria-hidden="true" className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 border-[var(--acade-control-border)] peer-checked:border-[var(--acade-primary)] peer-checked:[&>span]:scale-100">
                    <span className="size-2.5 scale-0 rounded-full bg-[var(--acade-primary)] transition-transform" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[0.9375rem] font-semibold text-[var(--acade-text)]">{item.name}</span>
                    <span className="block text-[0.875rem] text-[var(--acade-text-muted)]">{item.summary}</span>
                  </span>
                </label>
              ))}
            </div>

            {base.formula === 'custom' ? (
              <div className="mt-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  {(['utme', 'olevel', 'postUtme'] as const).map((part) => (
                    <Input
                      key={part}
                      label={part === 'utme' ? 'UTME share' : part === 'olevel' ? 'O-level share' : 'Post-UTME share'}
                      inputMode="decimal"
                      value={fields.weights[part]}
                      onChange={(event) => setField({ weights: { ...fields.weights, [part]: event.target.value.replace(/[^\d.]/g, '').slice(0, 5) } })}
                    />
                  ))}
                </div>
                <p className={cn('mt-2 text-[0.875rem]', Math.abs(weightSum - 100) < 1e-9 ? 'text-[var(--acade-text-muted)]' : 'text-[var(--acade-danger)]')}>
                  The three shares add up to {formatScore(weightSum)}{Math.abs(weightSum - 100) < 1e-9 ? '.' : '. They need to add up to 100.'}
                </p>
              </div>
            ) : null}
          </section>

          {usesOlevel ? (
            <section aria-labelledby="olevel-part-title" className={PANEL}>
              <h2 id="olevel-part-title" className="font-[family-name:var(--font-bricolage)] text-[1.25rem] font-bold tracking-[-0.02em] text-[var(--acade-text)]">O-level grades</h2>
              <p className="mt-1 text-[0.875rem] text-[var(--acade-text-muted)]">Five subjects: English, Maths and three your course needs.</p>
              <SegmentedControl
                aria-label="Where the five grades come from"
                className="mt-4"
                value={base.olevelSource}
                onValueChange={(value) => setBaseField({ olevelSource: value })}
                options={[{ value: 'record', label: 'From my O-level results' }, { value: 'manual', label: 'Type five grades' }]}
              />

              {base.olevelSource === 'record' ? (
                picked.length > 0 ? (
                  <ul className="mt-4 flex flex-col">
                    {picked.map((row) => (
                      <li key={row.subjectId} className="flex items-center justify-between border-b border-[var(--acade-border-subtle)] py-2.5 text-[0.9375rem] last:border-0">
                        <span className="text-[var(--acade-text)]">{subjectLabel(row.subjectId, row.name)}</span>
                        <span className={cn('font-semibold tabular-nums', gradeTone(row.grade))}>{row.grade === 'AR' ? 'Awaiting' : row.grade}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-[0.9375rem] text-[var(--acade-text-muted)]">
                    {olevel.loading ? 'Loading your O-level results…' : 'No O-level results yet.'}{' '}
                    {!olevel.loading ? <Link href="/olevel" className="font-semibold text-[var(--acade-primary)] underline underline-offset-4">Add your WAEC or NECO grades</Link> : null}
                  </p>
                )
              ) : (
                <ul className="mt-4 flex flex-col gap-3">
                  {manual.map((row, index) => (
                    <li key={index} className="grid grid-cols-[minmax(0,1fr)_5.25rem] items-start gap-2 sm:grid-cols-[minmax(0,1fr)_6.5rem] sm:gap-3">
                      <SubjectPicker
                        label={`Subject ${index + 1}`}
                        hideLabel
                        value={row.subjectId ? { subjectId: row.subjectId, name: row.name } : null}
                        excludeIds={manual.map((item) => item.subjectId).filter((id) => id && id !== row.subjectId)}
                        onChange={(next) => {
                          setManual(manual.map((item, i) => (i === index ? { ...item, subjectId: next?.subjectId ?? '', name: next?.name ?? '' } : item)));
                          setDirty(true);
                        }}
                      />
                      <Select
                        placeholder="Grade"
                        options={GRADE_OPTIONS}
                        value={row.grade}
                        onChange={(value) => {
                          setManual(manual.map((item, i) => (i === index ? { ...item, grade: value as OlevelEntryGrade } : item)));
                          setDirty(true);
                        }}
                      />
                    </li>
                  ))}
                </ul>
              )}
              {base.olevelSource === 'record' && picked.length > 0 ? (
                <p className="mt-3 text-[0.875rem] text-[var(--acade-text-muted)]">
                  Best of your sittings, course subjects first. <Link href="/olevel" className="font-semibold text-[var(--acade-primary)] underline underline-offset-4">Edit O-level results</Link>
                </p>
              ) : null}

              <div className="mt-5 border-t border-[var(--acade-border-subtle)] pt-5">
                <Select
                  label="Points for each grade"
                  options={TABLE_OPTIONS}
                  value={base.pointTable ?? 'four-to-two'}
                  onChange={(value) => setBaseField({ pointTable: value as OlevelPointTableId })}
                />
                {base.pointTable === 'custom' ? (
                  <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
                    {CREDIT_GRADES.map((grade) => (
                      <Input
                        key={grade}
                        label={grade}
                        inputMode="decimal"
                        value={fields.points[grade]}
                        onChange={(event) => setField({ points: { ...fields.points, [grade]: event.target.value.replace(/[^\d.]/g, '').slice(0, 5) } })}
                      />
                    ))}
                  </div>
                ) : null}
                <p className="mt-2 text-[0.8125rem] text-[var(--acade-text-muted)]">D7, E8, F9 and awaited results earn no points.</p>
              </div>
            </section>
          ) : null}

          <section aria-labelledby="school-title" className={PANEL}>
            <h2 id="school-title" className="font-[family-name:var(--font-bricolage)] text-[1.25rem] font-bold tracking-[-0.02em] text-[var(--acade-text)]">School and course (optional)</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Input label="School" placeholder="e.g. University of Lagos" maxLength={80} value={fields.school} onChange={(event) => setField({ school: event.target.value })} />
              <Input label="Course" placeholder="e.g. Computer Science" maxLength={80} value={fields.course} onChange={(event) => setField({ course: event.target.value })} />
            </div>
          </section>

          <div className="flex justify-end">
            <Button variant={dirty ? 'primary' : 'outline'} onClick={() => void save()} loading={saving} loadingLabel="Saving…">{dirty ? 'Save details' : 'Saved'}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
