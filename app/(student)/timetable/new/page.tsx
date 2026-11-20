'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, CalendarDays, Check, ChevronLeft, LayoutList } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button, Card, Input } from '@/components/ui';
import { HelpButton } from '@/components/help/HelpDrawer';
import { studentHelpSource } from '@/lib/help/student-help';
import { useTimetables } from '@/hooks/useTimetables';
import { TimetableGate } from '@/components/timetable/TimetableGate';
import { PageNotice, ReminderOffsetsField, ValidityFields } from '@/components/timetable/fields';
import { localToday } from '@/lib/timetable/format';
import { canAddTimetable, validateTimetableMeta } from '@/lib/timetable/validate';
import type { TimetableKind, ValidityUnit } from '@/lib/timetable/engine';
import { cn } from '@/lib/utils/cn';

const KINDS: { value: TimetableKind; label: string; hint: string; Icon: React.ElementType }[] = [
  { value: 'fixed', label: 'Fixed', hint: 'Lectures, classes and exams you type in.', Icon: CalendarDays },
  { value: 'reading', label: 'Reading', hint: 'Your own study sessions.', Icon: BookOpen },
  { value: 'custom', label: 'Custom', hint: 'Anything else you want to keep on a schedule.', Icon: LayoutList },
];

export default function NewTimetablePage() {
  return (
    <TimetableGate>
      <NewTimetable />
    </TimetableGate>
  );
}

function NewTimetable() {
  const router = useRouter();
  const { timetables, loading, create } = useTimetables();
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<TimetableKind>('fixed');
  const [startsOn, setStartsOn] = useState(localToday());
  const [unit, setUnit] = useState<ValidityUnit>('weeks');
  const [amount, setAmount] = useState(12);
  const [offsets, setOffsets] = useState<number[]>([10]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const atLimit = !loading && !canAddTimetable(timetables.length);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const result = validateTimetableMeta({ title, kind, startsOn, unit, amount, defaultOffsetsMin: offsets });
    if (!result.ok || !result.value) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const id = await create({ ...result.value, events: [] });
      router.push(`/timetable/${id}`);
    } catch (error) {
      console.error('Could not create timetable', error);
      toast.error('The timetable could not be saved. Check your connection and try again.');
      setSaving(false);
    }
  }

  return (
    <div className="flex w-full min-w-0 max-w-2xl flex-col gap-6 pb-10">
      <header className="flex flex-col gap-1">
        <Link
          href="/timetable"
          className="inline-flex min-h-11 items-center gap-1 self-start rounded-[var(--radius-control)] pr-2 text-sm font-semibold text-[var(--acade-primary)] hover:text-[var(--acade-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]"
        >
          <ChevronLeft className="size-4" aria-hidden="true" /> Timetables
        </Link>
        <div className="flex items-start justify-between gap-3">
          <h1 className="app-display text-[clamp(1.75rem,3.2vw,2.25rem)] font-bold leading-tight text-[var(--acade-text)]">New timetable</h1>
          <HelpButton entryId="student.timetable" source={studentHelpSource} className="shrink-0" />
        </div>
      </header>

      {atLimit && <PageNotice tone="warning">You already have the most timetables you can keep. Delete an archived one first.</PageNotice>}

      <Card padding="lg">
        <form onSubmit={submit} className="grid gap-7" noValidate>
          <Input label="Title" value={title} maxLength={60} placeholder="Second semester lectures" error={errors.title} onChange={(e) => setTitle(e.target.value)} />

          <fieldset className="min-w-0">
            <legend className="text-sm font-medium text-[var(--acade-text-muted)]">Type</legend>
            <div className="mt-2 grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-3">
              {KINDS.map((k) => {
                const on = kind === k.value;
                return (
                  <label
                    key={k.value}
                    className={cn(
                      'relative flex min-h-12 cursor-pointer gap-3 rounded-2xl border p-3.5 transition-colors sm:flex-col sm:gap-2',
                      'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--acade-primary)]',
                      on
                        ? 'border-[var(--acade-primary)] bg-[var(--acade-primary-dim)]'
                        : 'border-[var(--acade-border)] bg-[var(--acade-surface)] hover:border-[var(--acade-control-border)]',
                    )}
                  >
                    <input type="radio" name="kind" className="sr-only" checked={on} onChange={() => setKind(k.value)} />
                    <span
                      className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-xl',
                        on ? 'bg-[var(--acade-primary)] text-[var(--acade-on-primary)]' : 'bg-[var(--acade-overlay)] text-[var(--acade-text-muted)]',
                      )}
                    >
                      <k.Icon className="size-[1.125rem]" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-[var(--acade-text)]">{k.label}</span>
                      <span className="mt-0.5 block text-[0.8125rem] leading-5 text-[var(--acade-text-muted)]">{k.hint}</span>
                    </span>
                    {on && (
                      <span aria-hidden="true" className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-[var(--acade-primary)] text-[var(--acade-on-primary)]">
                        <Check className="size-3" strokeWidth={3} />
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="grid gap-2">
            <ValidityFields
              startsOn={startsOn}
              unit={unit}
              amount={amount}
              errors={errors}
              onChange={(n) => {
                setStartsOn(n.startsOn);
                setUnit(n.unit);
                setAmount(n.amount);
              }}
            />
            <p className="text-[0.8125rem] leading-5 text-[var(--acade-text-muted)]">
              Weekly events repeat until the timetable ends. You can extend it later.
            </p>
          </div>

          <ReminderOffsetsField label="Default reminders (Android app)" value={offsets} onChange={setOffsets} />

          <div className="flex flex-wrap gap-2 border-t border-[var(--acade-border-subtle)] pt-5">
            <Button type="submit" loading={saving} loadingLabel="Creating" disabled={atLimit}>
              Create timetable
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.push('/timetable')}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
