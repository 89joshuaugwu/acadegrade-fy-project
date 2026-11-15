'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button, Card, Input } from '@/components/ui';
import { HelpButton } from '@/components/help/HelpDrawer';
import { studentHelpSource } from '@/lib/help/student-help';
import { useTimetables } from '@/hooks/useTimetables';
import { TimetableGate, BuiltWithTag } from '@/components/timetable/TimetableGate';
import { NativeSelect, PageNotice, ValidityFields } from '@/components/timetable/fields';
import { blockedFromFixedTimetables, LEVELS } from '@/lib/timetable/builder';
import { DAY_LONG, DAY_SHORT, WEEK_ORDER, formatDate, localToday } from '@/lib/timetable/format';
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

  const levelOptions = LEVELS.map((l) => ({ value: String(l.value), label: l.label }));

  return (
    <div className="flex w-full min-w-0 max-w-3xl flex-col gap-6 pb-10">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/timetable" className="inline-flex min-h-12 items-center gap-1 text-sm font-semibold text-[var(--acade-primary)]">
            <ArrowLeft className="size-4" aria-hidden="true" /> Timetables
          </Link>
          <h1 className="font-[family-name:var(--font-bricolage)] text-[length:var(--text-2xl)] font-semibold text-[var(--acade-text)]">Build with AcadeMind</h1>
          <p className="mt-1 text-sm leading-6 text-[var(--acade-text-muted)]">
            Tell us your subjects and the time you have. We lay out a reading timetable around your lectures and exams using clear rules, and you can change anything before saving.
          </p>
        </div>
        <HelpButton entryId="student.timetable" source={studentHelpSource} />
      </header>

      {atLimit && <PageNotice tone="warning">You already have the most timetables you can keep. Delete an archived one first.</PageNotice>}

      <nav aria-label="Progress">
        <ol className="flex flex-wrap gap-2">
          {STEPS.map((label, i) => (
            <li
              key={label}
              aria-current={i === step ? 'step' : undefined}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-semibold',
                i === step ? 'border-[var(--acade-primary)] bg-[var(--acade-primary-dim)] text-[var(--acade-primary)]' : 'border-[var(--acade-border)] text-[var(--acade-text-muted)]',
              )}
            >
              {i + 1}. {label}
            </li>
          ))}
        </ol>
      </nav>

      <Card>
        {step === 0 && (
          <section aria-label="Subjects" className="grid gap-5">
            <h2 className="font-[family-name:var(--font-bricolage)] text-lg font-semibold text-[var(--acade-text)]">Your subjects</h2>
            {subjects.map((s, i) => {
              const set = (patch: Partial<SubjectRow>) => setSubjects(subjects.map((x) => (x.key === s.key ? { ...x, ...patch } : x)));
              return (
                <div key={s.key} role="group" aria-label={`Subject ${i + 1}`} className="grid gap-3 rounded-[var(--radius-control)] border border-[var(--acade-border-subtle)] p-3 sm:grid-cols-2">
                  <Input label={`Subject ${i + 1} name`} value={s.name} maxLength={70} onChange={(e) => set({ name: e.target.value })} />
                  <Input label={`Subject ${i + 1} code (optional)`} value={s.code} maxLength={12} onChange={(e) => set({ code: e.target.value })} />
                  <NativeSelect label={`Subject ${i + 1} priority`} value={String(s.priority)} options={levelOptions} onChange={(v) => set({ priority: Number(v) as 1 | 2 | 3 })} />
                  <NativeSelect label={`Subject ${i + 1} difficulty`} value={String(s.difficulty)} options={levelOptions} onChange={(v) => set({ difficulty: Number(v) as 1 | 2 | 3 })} />
                  <Input label={`Subject ${i + 1} exam date (optional)`} type="date" value={s.examDate} onChange={(e) => set({ examDate: e.target.value })} />
                  {subjects.length > 1 && (
                    <div className="flex items-end">
                      <Button type="button" variant="ghost" aria-label={`Remove subject ${i + 1}`} onClick={() => setSubjects(subjects.filter((x) => x.key !== s.key))}>
                        <Trash2 className="size-4" aria-hidden="true" /> Remove
                      </Button>
                    </div>
                  )}
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
          <section aria-label="Days and times" className="grid gap-5">
            <h2 className="font-[family-name:var(--font-bricolage)] text-lg font-semibold text-[var(--acade-text)]">When can you study?</h2>
            <fieldset>
              <legend className="text-sm font-medium text-[var(--acade-text-muted)]">Days of the week</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {WEEK_ORDER.map((d) => {
                  const on = days.includes(d);
                  return (
                    <label
                      key={d}
                      className={cn(
                        'inline-flex min-h-12 min-w-12 cursor-pointer items-center justify-center rounded-[var(--radius-control)] border px-3 text-sm font-semibold',
                        on ? 'border-[var(--acade-primary)] bg-[var(--acade-primary-dim)] text-[var(--acade-primary)]' : 'border-[var(--acade-border)] text-[var(--acade-text-muted)]',
                      )}
                    >
                      <input type="checkbox" className="sr-only" aria-label={DAY_LONG[d]} checked={on} onChange={() => setDays(on ? days.filter((x) => x !== d) : [...days, d])} />
                      {DAY_SHORT[d]}
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <NativeSelect
              label="Study window"
              value={windowMode}
              onChange={(v) => setWindowMode(v as 'shared' | 'perDay')}
              options={[
                { value: 'shared', label: 'The same window every day' },
                { value: 'perDay', label: 'A different window for each day' },
              ]}
            />
            {windowMode === 'shared' ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Window starts" type="time" value={shared.start} onChange={(e) => setShared({ ...shared, start: e.target.value })} />
                <Input label="Window ends" type="time" value={shared.end} onChange={(e) => setShared({ ...shared, end: e.target.value })} />
              </div>
            ) : (
              <div className="grid gap-3">
                {orderedDays.map((d) => (
                  <div key={d} className="grid gap-3 sm:grid-cols-2">
                    <Input label={`${DAY_LONG[d]} starts`} type="time" value={windowOf(d).start} onChange={(e) => setPerDay({ ...perDay, [d]: { ...windowOf(d), start: e.target.value } })} />
                    <Input label={`${DAY_LONG[d]} ends`} type="time" value={windowOf(d).end} onChange={(e) => setPerDay({ ...perDay, [d]: { ...windowOf(d), end: e.target.value } })} />
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {step === 2 && (
          <section aria-label="Sessions" className="grid gap-5">
            <h2 className="font-[family-name:var(--font-bricolage)] text-lg font-semibold text-[var(--acade-text)]">How long and how many?</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Session length (minutes)" type="number" inputMode="numeric" min={25} max={180} value={String(sessionMinutes)} onChange={(e) => setSessionMinutes(Number(e.target.value))} />
              <Input label="Break between sessions (minutes)" type="number" inputMode="numeric" min={0} max={60} value={String(breakMinutes)} onChange={(e) => setBreakMinutes(Number(e.target.value))} />
            </div>
            <NativeSelect
              label="Sessions per day"
              value={spdMode}
              onChange={(v) => setSpdMode(v as 'same' | 'perDay')}
              options={[
                { value: 'same', label: 'The same number every day' },
                { value: 'perDay', label: 'A different number for each day' },
              ]}
            />
            {spdMode === 'same' ? (
              <Input label="Sessions each day (1 to 8)" type="number" inputMode="numeric" min={1} max={8} value={String(sameCount)} onChange={(e) => setSameCount(Number(e.target.value))} />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {orderedDays.map((d) => (
                  <Input key={d} label={`${DAY_LONG[d]} sessions (0 to 8)`} type="number" inputMode="numeric" min={0} max={8} value={String(counts[d] ?? 0)} onChange={(e) => setCounts({ ...counts, [d]: Number(e.target.value) })} />
                ))}
              </div>
            )}
          </section>
        )}

        {step === 3 && (
          <section aria-label="Blocked times and dates" className="grid gap-5">
            <h2 className="font-[family-name:var(--font-bricolage)] text-lg font-semibold text-[var(--acade-text)]">Times to keep free</h2>
            <p className="text-sm leading-6 text-[var(--acade-text-muted)]">
              Lectures and exams from your fixed timetables are filled in below. Study sessions never overlap these.
            </p>
            {blocked.length === 0 ? (
              <p className="text-sm text-[var(--acade-text-faint)]">Nothing is blocked yet.</p>
            ) : (
              <ul className="grid gap-2" aria-label="Blocked times">
                {blocked.map((b) => (
                  <li key={b.key} className="flex items-center justify-between gap-2 rounded-[var(--radius-control)] border border-[var(--acade-border-subtle)] px-3 py-2 text-sm text-[var(--acade-text)]">
                    <span>
                      {b.date ? formatDate(b.date) : `Every ${DAY_LONG[b.day ?? 0]}`}, {b.start} to {b.end}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label={`Remove blocked time ${b.date ?? DAY_LONG[b.day ?? 0]} ${b.start} to ${b.end}`}
                      onClick={() => setBlocked(blocked.filter((x) => x.key !== b.key))}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <div className="grid items-end gap-3 sm:grid-cols-4">
              <NativeSelect label="Block every" value={newBlock.day} onChange={(v) => setNewBlock({ ...newBlock, day: v })} options={WEEK_ORDER.map((d) => ({ value: String(d), label: DAY_LONG[d] }))} />
              <Input label="From" type="time" value={newBlock.start} onChange={(e) => setNewBlock({ ...newBlock, start: e.target.value })} />
              <Input label="To" type="time" value={newBlock.end} onChange={(e) => setNewBlock({ ...newBlock, end: e.target.value })} />
              <Button
                type="button"
                variant="outline"
                disabled={!newBlock.start || !newBlock.end || newBlock.end <= newBlock.start}
                onClick={() => setBlocked([...blocked, { key: nextKey(), day: Number(newBlock.day), start: newBlock.start, end: newBlock.end }])}
              >
                Add blocked time
              </Button>
            </div>

            <h2 className="mt-2 font-[family-name:var(--font-bricolage)] text-lg font-semibold text-[var(--acade-text)]">How long should the plan run?</h2>
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
          </section>
        )}

        {step === 4 && plan && (
          <section aria-label="Preview" className="grid gap-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-[family-name:var(--font-bricolage)] text-lg font-semibold text-[var(--acade-text)]">Your plan</h2>
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
            <div>
              <h3 className="text-sm font-semibold text-[var(--acade-text)]">Why it looks this way</h3>
              <ul className="mt-2 list-disc pl-5 text-sm leading-6 text-[var(--acade-text-muted)]">
                {plan.why.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--acade-text)]">Sessions ({planEvents.length})</h3>
              {planEvents.length === 0 ? (
                <p className="mt-2 text-sm text-[var(--acade-text-muted)]">No sessions were placed. Go back and widen your days or times.</p>
              ) : (
                <div className="mt-2 grid gap-3">
                  {grouped.map(([date, items]) => (
                    <div key={date}>
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--acade-text-muted)]">{formatDate(date)}</p>
                      <ul className="mt-1 grid gap-2">
                        {items.map((e) => {
                          const edit = (patch: Partial<TimetableEvent>) => setPlanEvents(planEvents.map((x) => (x.id === e.id ? { ...x, ...patch } : x)));
                          return (
                            <li key={e.id} className="grid items-end gap-2 rounded-[var(--radius-control)] border border-[var(--acade-border-subtle)] p-2 sm:grid-cols-[1fr_8rem_8rem_auto]">
                              <p className="truncate text-sm font-semibold text-[var(--acade-text)]">{e.title}</p>
                              <Input label={`${e.title} ${date} start`} type="time" value={e.startTime} onChange={(ev) => edit({ startTime: ev.target.value })} />
                              <Input label={`${e.title} ${date} end`} type="time" value={e.endTime} onChange={(ev) => edit({ endTime: ev.target.value })} />
                              <Button type="button" variant="ghost" aria-label={`Remove ${e.title} on ${date}`} onClick={() => setPlanEvents(planEvents.filter((x) => x.id !== e.id))}>
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
              <p className="mt-2 text-xs text-[var(--acade-text-faint)]">A timetable holds up to {TIMETABLE_LIMITS.maxEvents} events.</p>
            </div>
          </section>
        )}

        {stepError && (
          <p role="alert" className="mt-4 text-sm text-[var(--acade-danger)]">
            {stepError}
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
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
