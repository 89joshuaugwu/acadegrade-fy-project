'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
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

const KINDS: { value: TimetableKind; label: string; hint: string }[] = [
  { value: 'fixed', label: 'Fixed', hint: 'Lectures, classes and exams you type in.' },
  { value: 'reading', label: 'Reading', hint: 'Your own study sessions.' },
  { value: 'custom', label: 'Custom', hint: 'Anything else you want to keep on a schedule.' },
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
      <header className="flex items-start justify-between gap-3">
        <div>
          <Link href="/timetable" className="inline-flex min-h-12 items-center gap-1 text-sm font-semibold text-[var(--acade-primary)]">
            <ArrowLeft className="size-4" aria-hidden="true" /> Timetables
          </Link>
          <h1 className="font-[family-name:var(--font-bricolage)] text-[length:var(--text-2xl)] font-semibold text-[var(--acade-text)]">New timetable</h1>
        </div>
        <HelpButton entryId="student.timetable" source={studentHelpSource} />
      </header>

      {atLimit && <PageNotice tone="warning">You already have the most timetables you can keep. Delete an archived one first.</PageNotice>}

      <Card>
        <form onSubmit={submit} className="grid gap-5" noValidate>
          <Input label="Title" value={title} maxLength={60} placeholder="Second semester lectures" error={errors.title} onChange={(e) => setTitle(e.target.value)} />

          <fieldset>
            <legend className="text-sm font-medium text-[var(--acade-text-muted)]">Type</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {KINDS.map((k) => (
                <label
                  key={k.value}
                  className={cn(
                    'flex min-h-12 cursor-pointer flex-col rounded-[var(--radius-control)] border p-3',
                    kind === k.value ? 'border-[var(--acade-primary)] bg-[var(--acade-primary-dim)]' : 'border-[var(--acade-border)]',
                  )}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-[var(--acade-text)]">
                    <input type="radio" name="kind" className="size-4" checked={kind === k.value} onChange={() => setKind(k.value)} />
                    {k.label}
                  </span>
                  <span className="mt-1 text-xs leading-5 text-[var(--acade-text-muted)]">{k.hint}</span>
                </label>
              ))}
            </div>
          </fieldset>

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
          <p className="-mt-2 text-xs leading-5 text-[var(--acade-text-faint)]">
            Weekly events repeat until the timetable ends. You can extend it later.
          </p>

          <ReminderOffsetsField label="Default reminders (Android app)" value={offsets} onChange={setOffsets} />

          <div className="flex flex-wrap gap-2">
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
