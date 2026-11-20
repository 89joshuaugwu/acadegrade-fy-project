'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ListChecks, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button, Card, Input } from '@/components/ui';
import { DateField, TimeField } from '@/components/ui/DateTimeFields';
import { HelpButton } from '@/components/help/HelpDrawer';
import { studentHelpSource } from '@/lib/help/student-help';
import { useTimetables } from '@/hooks/useTimetables';
import { TimetableGate, BuiltWithTag } from '@/components/timetable/TimetableGate';
import { ChoicePills, DayPicker, FieldSelect, PageNotice, ValidityFields, WholeNumberInput } from '@/components/timetable/fields';
import { blockedFromFixedTimetables, LEVELS } from '@/lib/timetable/builder';
import { DAY_LONG, WEEK_ORDER, formatDate, localToday } from '@/lib/timetable/format';
import { canAddTimetable, validateEvent, validateTimetableMeta, TIMETABLE_LIMITS } from '@/lib/timetable/validate';
import {
  buildStudyPlan,
  validityEnd,
  type StudyBlockedTime,
  type StudyPlanResult,
  type StudySubject,
  type TimetableEvent,
  type ValidityUnit,
} from '@/lib/timetable/engine';
import { cn } from '@/lib/utils/cn';

const STEPS = ['Subjects', 'Days and times', 'Sessions', 'Blocked times and dates', 'Preview'] as const;
const MAX_SUBJECTS = 12;

interface SubjectRow {
  key: number;
  name: string;
  code: string;
  priority: 1 | 2 | 3;
  difficulty: 1 | 2 | 3;
  examDate: string;
}
interface BlockedRow extends StudyBlockedTime {
  key: number;
}

const sectionTitle = 'app-display text-[1.25rem] font-semibold text-[var(--acade-text)]';

export default function BuildTimetablePage() {
  return (
    <TimetableGate>
      <Wizard />
    </TimetableGate>
  );
}

function Wizard() {
  const router = useRouter();
  const { timetables, loading, create } = useTimetables();
  const [step, setStep] = useState(0);
  const keyRef = useRef(1);
  const nextKey = () => keyRef.current++;

  const [subjects, setSubjects] = useState<SubjectRow[]>([{ key: 0, name: '', code: '', priority: 2, difficulty: 2, examDate: '' }]);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [windowMode, setWindowMode] = useState<'shared' | 'perDay'>('shared');
  const [shared, setShared] = useState({ start: '16:00', end: '20:00' });
  const [perDay, setPerDay] = useState<Record<number, { start: string; end: string }>>({});
  const [sessionMinutes, setSessionMinutes] = useState(60);
  const [breakMinutes, setBreakMinutes] = useState(10);
  const [spdMode, setSpdMode] = useState<'same' | 'perDay'>('same');
  const [sameCount, setSameCount] = useState(2);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [blocked, setBlocked] = useState<BlockedRow[]>([]);
  const [blockedReady, setBlockedReady] = useState(false);
  const [newBlock, setNewBlock] = useState({ day: '1', start: '08:00', end: '10:00' });
  const [title, setTitle] = useState('Study plan');
  const [startsOn, setStartsOn] = useState(localToday());
  const [unit, setUnit] = useState<ValidityUnit>('weeks');
  const [amount, setAmount] = useState(4);
  const [stepError, setStepError] = useState('');
  const [plan, setPlan] = useState<StudyPlanResult | null>(null);
  const [planEvents, setPlanEvents] = useState<TimetableEvent[]>([]);
  const [saving, setSaving] = useState(false);

  // Pre-fill blocked times from the student's fixed timetables once they have loaded.
  useEffect(() => {
    if (loading || blockedReady) return;
    setBlocked(blockedFromFixedTimetables(timetables).map((b) => ({ ...b, key: nextKey() })));
    setBlockedReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, blockedReady, timetables]);

  const orderedDays = useMemo(() => WEEK_ORDER.filter((d) => days.includes(d)), [days]);
  const atLimit = !loading && !canAddTimetable(timetables.length);
  const windowOf = (d: number) => perDay[d] ?? shared;

  function validateStep(s: number): string {
    if (s === 0) {
      const named = subjects.filter((x) => x.name.trim());
      if (named.length === 0) return 'Add at least one subject with a name.';
    }
    if (s === 1) {
      if (orderedDays.length === 0) return 'Choose at least one day to study.';
      const wins = windowMode === 'shared' ? [shared] : orderedDays.map(windowOf);
      if (wins.some((w) => !w.start || !w.end || w.end <= w.start)) return 'Each study window must end after it starts.';
    }
    if (s === 2) {
      if (!Number.isInteger(sessionMinutes) || sessionMinutes < 25 || sessionMinutes > 180) return 'Session length must be 25 to 180 minutes.';
      if (!Number.isInteger(breakMinutes) || breakMinutes < 0 || breakMinutes > 60) return 'A break must be 0 to 60 minutes.';
      if (spdMode === 'same' && (!Number.isInteger(sameCount) || sameCount < 1 || sameCount > 8)) return 'Sessions per day must be 1 to 8.';
      if (spdMode === 'perDay' && orderedDays.every((d) => !(counts[d] > 0))) return 'Give at least one day a session.';
    }
    if (s === 3) {
      const meta = validateTimetableMeta({ title, kind: 'reading', startsOn, unit, amount, defaultOffsetsMin: [10] });
      if (!meta.ok) return Object.values(meta.errors)[0];
    }
    return '';
  }

  function runPreview() {
    const endsOn = validityEnd(startsOn, unit, amount).slice(0, 10);
    const subjectInput: StudySubject[] = subjects
      .filter((s) => s.name.trim())
      .map((s) => ({
        name: s.name.trim(),
        ...(s.code.trim() ? { code: s.code.trim() } : {}),
        priority: s.priority,
        difficulty: s.difficulty,
        ...(s.examDate ? { examDate: s.examDate } : {}),
      }));
    const result = buildStudyPlan({
      subjects: subjectInput,
      availability: {
        days: orderedDays,
        windows: windowMode === 'shared' ? [shared] : orderedDays.map(windowOf),
        sessionMinutes,
        breakMinutes,
        sessionsPerDay: spdMode === 'same' ? { mode: 'same', count: sameCount } : { mode: 'perDay', counts },
      },
      blocked: blocked.map(({ key: _key, ...b }) => b),
      startsOn,
      endsOn,
    });
    setPlan(result);
    setPlanEvents(result.events);
  }

  function next() {
    const problem = validateStep(step);
    setStepError(problem);
    if (problem) return;
    if (step === 3) runPreview();
    setStep(step + 1);
  }

  function back() {
    setStepError('');
    setStep(Math.max(0, step - 1));
  }

  async function save() {
    const meta = validateTimetableMeta({ title, kind: 'reading', startsOn, unit, amount, defaultOffsetsMin: [10] });
    if (!meta.ok || !meta.value) {
      setStepError(Object.values(meta.errors)[0]);
      return;
    }
    const checked: TimetableEvent[] = [];
    for (const e of planEvents) {
      const r = validateEvent(e);
      if (!r.ok || !r.value) {
        setStepError(`"${e.title}" on ${e.recurrence.kind === 'once' ? e.recurrence.date : ''} needs a valid time range.`);
        return;
      }
      checked.push(r.value);
    }
    if (checked.length === 0) {
      setStepError('The plan has no sessions to save. Go back and widen your days or times.');
      return;
    }
    setSaving(true);
    try {
      const id = await create({ ...meta.value, kind: 'reading', builtWith: 'academind', events: checked });
      router.push(`/timetable/${id}`);
    } catch (e) {
      console.error('Could not save study plan', e);
      toast.error('The plan could not be saved. Check your connection and try again.');
      setSaving(false);
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<string, TimetableEvent[]>();
    for (const e of planEvents) {
      const date = e.recurrence.kind === 'once' ? e.recurrence.date : '';
      map.set(date, [...(map.get(date) ?? []), e]);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [planEvents]);

  const levelOptions = LEVELS.map((l) => ({ value: String(l.value) as '1' | '2' | '3', label: l.label }));

  return (
    <div className="flex w-full min-w-0 max-w-3xl flex-col gap-6 pb-10">
      <header className="flex flex-col gap-1">
        <Link
          href="/timetable"
          className="inline-flex min-h-11 items-center gap-1 self-start rounded-[var(--radius-control)] pr-2 text-sm font-semibold text-[var(--acade-primary)] hover:text-[var(--acade-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]"
        >
          <ChevronLeft className="size-4" aria-hidden="true" /> Timetables
        </Link>
        <div className="flex items-start justify-between gap-3">
          <h1 className="app-display text-[clamp(1.75rem,3.2vw,2.25rem)] font-bold leading-tight text-[var(--acade-text)]">Build with AcadeMind</h1>
          <HelpButton entryId="student.timetable" source={studentHelpSource} className="shrink-0" />
        </div>
        <p className="mt-1 max-w-2xl text-[0.9375rem] leading-7 text-[var(--acade-text-muted)]">
          Tell us your subjects and the time you have. We lay out a reading timetable around your lectures and exams using clear rules, and you can change anything before saving.
        </p>
      </header>

      {atLimit && <PageNotice tone="warning">You already have the most timetables you can keep. Delete an archived one first.</PageNotice>}

      <nav aria-label="Progress" className="min-w-0">
        <p aria-hidden="true" className="mb-2.5 text-sm font-semibold text-[var(--acade-text)] sm:hidden">
          <span className="tabular-nums text-[var(--acade-text-muted)]">Step {step + 1} of {STEPS.length}:</span> {STEPS[step]}
        </p>
        <ol className="grid grid-cols-5 gap-1.5 sm:gap-2">
          {STEPS.map((label, i) => (
            <li key={label} aria-current={i === step ? 'step' : undefined} className="min-w-0">
              <span
                aria-hidden="true"
                className={cn(
                  'block h-1.5 rounded-full transition-colors',
                  i < step ? 'bg-[var(--acade-primary)]' : i === step ? 'bg-ag-gold' : 'bg-[var(--acade-border)]',
                )}
              />
              <span
                className={cn(
                  'sr-only text-[0.8125rem] font-semibold leading-snug sm:not-sr-only sm:mt-2 sm:block',
                  i === step ? 'text-[var(--acade-text)]' : i < step ? 'text-[var(--acade-primary)]' : 'text-[var(--acade-text-faint)]',
                )}
              >
                <span className="tabular-nums">{i + 1}.</span> {label}
              </span>
            </li>
          ))}
        </ol>
      </nav>

      <Card padding="lg">
        {step === 0 && (
          <section aria-label="Subjects" className="grid gap-5">
            <div>
              <h2 className={sectionTitle}>Your subjects</h2>
              <p className="mt-1 text-sm text-[var(--acade-text-muted)]">Higher priority and harder subjects get more sessions.</p>
            </div>
            {subjects.map((s, i) => {
              const set = (patch: Partial<SubjectRow>) => setSubjects(subjects.map((x) => (x.key === s.key ? { ...x, ...patch } : x)));
              return (
                <div key={s.key} role="group" aria-label={`Subject ${i + 1}`} className="grid gap-4 rounded-2xl border border-[var(--acade-border-subtle)] bg-[var(--acade-void)] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[var(--acade-text)]">
                      <span className="mr-2 inline-flex size-6 items-center justify-center rounded-full bg-[var(--acade-primary-dim)] text-[0.8125rem] tabular-nums text-[var(--acade-primary)]">{i + 1}</span>
                      {s.name.trim() || 'New subject'}
                    </p>
                    {subjects.length > 1 && (
                      <Button type="button" size="sm" variant="ghost" aria-label={`Remove subject ${i + 1}`} onClick={() => setSubjects(subjects.filter((x) => x.key !== s.key))}>
                        <Trash2 className="size-4" aria-hidden="true" /> Remove
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
                    <Input label={`Subject ${i + 1} name`} value={s.name} maxLength={70} onChange={(e) => set({ name: e.target.value })} />
                    <Input label={`Subject ${i + 1} code (optional)`} value={s.code} maxLength={12} onChange={(e) => set({ code: e.target.value })} />
                    <ChoicePills
                      legend={`Subject ${i + 1} priority`}
                      value={String(s.priority) as '1' | '2' | '3'}
                      options={levelOptions}
                      stretch
                      onChange={(v) => set({ priority: Number(v) as 1 | 2 | 3 })}
                    />
                    <ChoicePills
                      legend={`Subject ${i + 1} difficulty`}
                      value={String(s.difficulty) as '1' | '2' | '3'}
                      options={levelOptions}
                      stretch
                      onChange={(v) => set({ difficulty: Number(v) as 1 | 2 | 3 })}
                    />
                    <DateField label={`Subject ${i + 1} exam date (optional)`} value={s.examDate} onChange={(v) => set({ examDate: v })} />
                  </div>
                </div>
              );
            })}
            <div>
              <Button
                type="button"
                variant="outline"
                disabled={subjects.length >= MAX_SUBJECTS}
                onClick={() => setSubjects([...subjects, { key: nextKey(), name: '', code: '', priority: 2, difficulty: 2, examDate: '' }])}
              >
                <Plus className="size-4" aria-hidden="true" /> Add subject
              </Button>
            </div>
          </section>
        )}

        {step === 1 && (
          <section aria-label="Days and times" className="grid gap-6">
            <h2 className={sectionTitle}>When can you study?</h2>
            <DayPicker legend="Days of the week" days={days} onChange={setDays} labelStyle="long" />
            <ChoicePills<'shared' | 'perDay'>
              legend="Study window"
              value={windowMode}
              onChange={setWindowMode}
              stretch
              options={[
                { value: 'shared', label: 'The same window every day' },
                { value: 'perDay', label: 'A different window for each day' },
              ]}
            />
            {windowMode === 'shared' ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <TimeField label="Window starts" value={shared.start} onChange={(v) => setShared({ ...shared, start: v })} />
                <TimeField label="Window ends" value={shared.end} onChange={(v) => setShared({ ...shared, end: v })} />
              </div>
            ) : (
              <div className="grid gap-3">
                {orderedDays.map((d) => (
                  <div key={d} className="grid grid-cols-2 gap-3 rounded-2xl bg-[var(--acade-void)] p-3 sm:gap-4">
                    <TimeField label={`${DAY_LONG[d]} starts`} value={windowOf(d).start} onChange={(v) => setPerDay({ ...perDay, [d]: { ...windowOf(d), start: v } })} />
                    <TimeField label={`${DAY_LONG[d]} ends`} value={windowOf(d).end} onChange={(v) => setPerDay({ ...perDay, [d]: { ...windowOf(d), end: v } })} />
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {step === 2 && (
          <section aria-label="Sessions" className="grid gap-6">
            <h2 className={sectionTitle}>How long and how many?</h2>
            <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
              <WholeNumberInput label="Session length (minutes)" value={String(sessionMinutes)} onChange={(v) => setSessionMinutes(Number(v))} />
              <WholeNumberInput label="Break between sessions (minutes)" value={String(breakMinutes)} onChange={(v) => setBreakMinutes(Number(v))} />
            </div>
            <ChoicePills<'same' | 'perDay'>
              legend="Sessions per day"
              value={spdMode}
              onChange={setSpdMode}
              stretch
              options={[
                { value: 'same', label: 'The same number every day' },
                { value: 'perDay', label: 'A different number for each day' },
              ]}
            />
            {spdMode === 'same' ? (
              <div className="sm:max-w-xs">
                <WholeNumberInput label="Sessions each day (1 to 8)" value={String(sameCount)} onChange={(v) => setSameCount(Number(v))} />
              </div>
            ) : (
              <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                {orderedDays.map((d) => (
                  <WholeNumberInput key={d} label={`${DAY_LONG[d]} sessions (0 to 8)`} value={String(counts[d] ?? 0)} onChange={(v) => setCounts({ ...counts, [d]: Number(v) })} />
                ))}
              </div>
            )}
          </section>
        )}

        {step === 3 && (
          <section aria-label="Blocked times and dates" className="grid gap-5">
            <div>
              <h2 className={sectionTitle}>Times to keep free</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--acade-text-muted)]">
                Lectures and exams from your fixed timetables are filled in below. Study sessions never overlap these.
              </p>
            </div>
            {blocked.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[var(--acade-border)] px-4 py-3 text-sm text-[var(--acade-text-muted)]">Nothing is blocked yet.</p>
            ) : (
              <ul className="grid gap-2" aria-label="Blocked times">
                {blocked.map((b) => (
                  <li key={b.key} className="flex items-center justify-between gap-2 rounded-2xl border border-[var(--acade-border-subtle)] bg-[var(--acade-void)] py-1.5 pl-4 pr-1.5 text-sm text-[var(--acade-text)]">
                    <span className="min-w-0 tabular-nums">
                      {b.date ? formatDate(b.date) : `Every ${DAY_LONG[b.day ?? 0]}`}, {b.start} to {b.end}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="w-11 shrink-0 px-0"
                      aria-label={`Remove blocked time ${b.date ?? DAY_LONG[b.day ?? 0]} ${b.start} to ${b.end}`}
                      onClick={() => setBlocked(blocked.filter((x) => x.key !== b.key))}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <div className="grid grid-cols-2 items-end gap-3 rounded-2xl border border-[var(--acade-border-subtle)] p-3 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:p-4">
              <div className="col-span-2 sm:col-span-1">
                <FieldSelect label="Block every" value={newBlock.day} onChange={(v) => setNewBlock({ ...newBlock, day: v })} options={WEEK_ORDER.map((d) => ({ value: String(d), label: DAY_LONG[d] }))} />
              </div>
              <TimeField label="From" value={newBlock.start} onChange={(v) => setNewBlock({ ...newBlock, start: v })} />
              <TimeField label="To" value={newBlock.end} onChange={(v) => setNewBlock({ ...newBlock, end: v })} />
              <div className="col-span-2 sm:col-span-1">
                <Button
                  type="button"
                  variant="outline"
                  fullWidth
                  disabled={!newBlock.start || !newBlock.end || newBlock.end <= newBlock.start}
                  onClick={() => setBlocked([...blocked, { key: nextKey(), day: Number(newBlock.day), start: newBlock.start, end: newBlock.end }])}
                >
                  Add blocked time
                </Button>
              </div>
            </div>

            <div className="mt-3 grid gap-5 border-t border-[var(--acade-border-subtle)] pt-6">
              <h2 className={sectionTitle}>How long should the plan run?</h2>
              <Input label="Timetable title" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} />
              <ValidityFields
                startsOn={startsOn}
                unit={unit}
                amount={amount}
                units={['days', 'weeks', 'months']}
                onChange={(n) => {
                  setStartsOn(n.startsOn);
                  setUnit(n.unit);
                  setAmount(n.amount);
                }}
              />
            </div>
          </section>
        )}

        {step === 4 && plan && (
          <section aria-label="Preview" className="grid gap-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className={sectionTitle}>Your plan</h2>
              <BuiltWithTag />
            </div>
            {plan.warnings.length > 0 && (
              <PageNotice tone="warning">
                <ul className="list-disc pl-5">
                  {plan.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </PageNotice>
            )}
            <div className="rounded-2xl bg-[var(--acade-void)] p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--acade-text)]">
                <ListChecks className="size-4 text-[var(--acade-primary)]" aria-hidden="true" /> Why it looks this way
              </h3>
              <ul className="mt-2 list-disc pl-5 text-sm leading-6 text-[var(--acade-text-muted)] marker:text-[var(--acade-primary)]">
                {plan.why.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--acade-text)]">
                Sessions <span className="tabular-nums text-[var(--acade-text-muted)]">({planEvents.length})</span>
              </h3>
              {planEvents.length === 0 ? (
                <p className="mt-2 text-sm text-[var(--acade-text-muted)]">No sessions were placed. Go back and widen your days or times.</p>
              ) : (
                <div className="mt-3 grid gap-4">
                  {grouped.map(([date, items]) => (
                    <div key={date}>
                      <p className="text-sm font-semibold tabular-nums text-[var(--acade-text-muted)]">{formatDate(date)}</p>
                      <ul className="mt-2 grid gap-2">
                        {items.map((e) => {
                          const edit = (patch: Partial<TimetableEvent>) => setPlanEvents(planEvents.map((x) => (x.id === e.id ? { ...x, ...patch } : x)));
                          return (
                            <li key={e.id} className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--acade-border-subtle)] bg-[var(--acade-surface)] p-2.5 sm:flex-nowrap sm:pl-4">
                              <p className="min-w-0 basis-full truncate text-sm font-semibold text-[var(--acade-text)] sm:flex-1 sm:basis-auto">{e.title}</p>
                              <div className="w-[calc(50%-1.875rem)] sm:w-36">
                                <TimeField hideLabel label={`${e.title} ${date} start`} value={e.startTime} onChange={(v) => edit({ startTime: v })} />
                              </div>
                              <div className="w-[calc(50%-1.875rem)] sm:w-36">
                                <TimeField hideLabel label={`${e.title} ${date} end`} value={e.endTime} onChange={(v) => edit({ endTime: v })} />
                              </div>
                              <Button type="button" variant="ghost" className="w-11 shrink-0 px-0" aria-label={`Remove ${e.title} on ${date}`} onClick={() => setPlanEvents(planEvents.filter((x) => x.id !== e.id))}>
                                <Trash2 className="size-4" aria-hidden="true" />
                              </Button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-3 text-[0.8125rem] text-[var(--acade-text-muted)]">A timetable holds up to {TIMETABLE_LIMITS.maxEvents} events.</p>
            </div>
          </section>
        )}

        {stepError && (
          <p role="alert" className="mt-5 rounded-xl bg-[var(--acade-danger-dim)] px-4 py-3 text-sm font-medium text-[var(--acade-danger)]">
            {stepError}
          </p>
        )}

        <div className="mt-7 flex flex-wrap items-center gap-2 border-t border-[var(--acade-border-subtle)] pt-5">
          {step > 0 && (
            <Button type="button" variant="outline" onClick={back}>
              Back
            </Button>
          )}
          {step < 3 && (
            <Button type="button" onClick={next}>
              Next
            </Button>
          )}
          {step === 3 && (
            <Button type="button" onClick={next}>
              Preview plan
            </Button>
          )}
          {step === 4 && (
            <Button type="button" loading={saving} loadingLabel="Saving" disabled={atLimit} onClick={save}>
              Save timetable
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
