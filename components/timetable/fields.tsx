'use client';

import { useId, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { Button, Input } from '@/components/ui';
import { UNITS } from '@/lib/timetable/validate';
import { UNIT_LABEL } from '@/lib/timetable/format';
import { normaliseOffsets, type ValidityUnit } from '@/lib/timetable/engine';

export const controlClass =
  'h-12 w-full rounded-xl border border-[var(--acade-border)] bg-[var(--acade-deep)] px-3 text-[length:var(--text-base)] text-[var(--acade-text)] focus:border-[var(--acade-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--acade-primary)]/20';

export function NativeSelect({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn('flex w-full flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-[var(--acade-text-muted)]">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={controlClass}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function PageNotice({ tone = 'info', children }: { tone?: 'info' | 'warning' | 'danger'; children: React.ReactNode }) {
  const colour = tone === 'danger' ? 'var(--acade-danger)' : tone === 'warning' ? 'var(--acade-warning)' : 'var(--acade-primary)';
  return (
    <div
      role={tone === 'info' ? 'note' : 'alert'}
      className="rounded-[var(--radius-control)] border px-4 py-3 text-sm leading-6 text-[var(--acade-text)]"
      style={{ borderColor: `color-mix(in srgb, ${colour} 35%, transparent)`, background: `color-mix(in srgb, ${colour} 8%, transparent)` }}
    >
      {children}
    </div>
  );
}

/** "Valid for" amount and unit, plus the start date. */
export function ValidityFields({
  startsOn,
  unit,
  amount,
  onChange,
  errors = {},
  units = UNITS,
  startLabel = 'Starts on',
}: {
  startsOn: string;
  unit: ValidityUnit;
  amount: number;
  onChange: (next: { startsOn: string; unit: ValidityUnit; amount: number }) => void;
  errors?: Record<string, string>;
  units?: ValidityUnit[];
  startLabel?: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Input
        label={startLabel}
        type="date"
        value={startsOn}
        error={errors.startsOn}
        onChange={(e) => onChange({ startsOn: e.target.value, unit, amount })}
      />
      <Input
        label="Valid for (amount)"
        type="number"
        inputMode="numeric"
        min={1}
        max={52}
        value={Number.isFinite(amount) ? String(amount) : ''}
        error={errors.amount}
        onChange={(e) => onChange({ startsOn, unit, amount: e.target.value === '' ? Number.NaN : Number(e.target.value) })}
      />
      <NativeSelect
        label="Valid for (unit)"
        value={unit}
        onChange={(v) => onChange({ startsOn, unit: v as ValidityUnit, amount })}
        options={units.map((u) => ({ value: u, label: UNIT_LABEL[u][0].toUpperCase() + UNIT_LABEL[u].slice(1) }))}
      />
    </div>
  );
}

const PRESETS = [5, 10, 15, 30, 60];

/** Up to three reminder offsets: presets plus a custom value. */
export function ReminderOffsetsField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number[];
  onChange: (next: number[]) => void;
}) {
  const [custom, setCustom] = useState('');
  const selected = new Set(value);
  const toggle = (m: number) => {
    if (selected.has(m)) onChange(value.filter((v) => v !== m));
    else if (value.length < 3) onChange(normaliseOffsets([...value, m]));
  };
  const addCustom = () => {
    const n = Math.round(Number(custom));
    if (!Number.isFinite(n) || n < 1 || n > 1440 || value.length >= 3) return;
    onChange(normaliseOffsets([...value, n]));
    setCustom('');
  };
  const extras = value.filter((v) => !PRESETS.includes(v));
  return (
    <fieldset className="min-w-0">
      <legend className="text-sm font-medium text-[var(--acade-text-muted)]">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {[...PRESETS, ...extras].map((m) => (
          <label
            key={m}
            className={cn(
              'inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border px-4 text-sm font-semibold',
              selected.has(m)
                ? 'border-[var(--acade-primary)] bg-[var(--acade-primary-dim)] text-[var(--acade-primary)]'
                : 'border-[var(--acade-border)] text-[var(--acade-text-muted)]',
            )}
          >
            <input type="checkbox" className="size-4" checked={selected.has(m)} onChange={() => toggle(m)} aria-label={`${m} minutes before`} />
            {m} min
          </label>
        ))}
      </div>
      <div className="mt-3 flex items-end gap-2">
        <Input
          label="Custom (minutes, 1 to 1440)"
          type="number"
          inputMode="numeric"
          min={1}
          max={1440}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
        />
        <Button type="button" variant="outline" onClick={addCustom} disabled={value.length >= 3}>
          Add
        </Button>
      </div>
      <p className="mt-1.5 text-xs leading-5 text-[var(--acade-text-faint)]">Up to three reminders per timetable or event.</p>
    </fieldset>
  );
}
