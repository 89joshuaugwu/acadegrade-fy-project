'use client';

import { useId, useState } from 'react';
import { AlertTriangle, Check, Info, OctagonAlert } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button, Input } from '@/components/ui';
import { Select } from '@/components/ui/Select';
import { DateField } from '@/components/ui/DateTimeFields';
import { UNITS } from '@/lib/timetable/validate';
import { DAY_LONG, DAY_SHORT, UNIT_LABEL, WEEK_ORDER } from '@/lib/timetable/format';
import { normaliseOffsets, type ValidityUnit } from '@/lib/timetable/engine';

/** Focus ring for a styled label that wraps a visually hidden native input. */
const wrappedFocus =
  'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--acade-primary)]';

/** A labelled dropdown built on the kit Select (no native <select>). */
export function FieldSelect({
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
  return <Select label={label} value={value} onChange={onChange} options={options} className={className} />;
}

/**
 * A small set of exclusive choices shown as a segmented row of styled radios.
 * The real radio inputs stay in the DOM (visually hidden) for keyboard and screen readers.
 */
export function ChoicePills<T extends string>({
  legend,
  value,
  onChange,
  options,
  hideLegend,
  stretch,
  className,
}: {
  legend: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; hint?: string }[];
  hideLegend?: boolean;
  /** Share the row equally between the options. */
  stretch?: boolean;
  className?: string;
}) {
  const name = useId();
  return (
    <fieldset className={cn('min-w-0', className)}>
      <legend className={cn('text-sm font-medium text-[var(--acade-text-muted)]', hideLegend && 'sr-only')}>{legend}</legend>
      <div
        className={cn(
          'mt-2 gap-1.5',
          stretch ? 'grid grid-cols-[repeat(auto-fit,minmax(min(100%,5.25rem),1fr))]' : 'flex flex-wrap',
        )}
      >
        {options.map((o) => {
          const on = value === o.value;
          return (
            <label
              key={o.value}
              className={cn(
                'relative flex min-h-11 min-w-0 cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-control)] border py-2 text-center text-sm font-semibold transition-colors',
                stretch ? 'px-2' : 'px-3.5',
                wrappedFocus,
                on
                  ? 'border-[var(--acade-primary)] bg-[var(--acade-primary-dim)] text-[var(--acade-primary)]'
                  : 'border-[var(--acade-border)] bg-[var(--acade-surface)] text-[var(--acade-text-muted)] hover:border-[var(--acade-control-border)] hover:text-[var(--acade-text)]',
              )}
            >
              <input type="radio" name={name} className="sr-only" checked={on} onChange={() => onChange(o.value)} />
              {on && !stretch && <Check className="size-4 shrink-0" aria-hidden="true" />}
              <span className="min-w-0 break-words">{o.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Monday-first weekday toggles (styled checkboxes). */
export function DayPicker({
  legend,
  days,
  onChange,
  error,
  labelStyle = 'short',
}: {
  legend: string;
  days: number[];
  onChange: (days: number[]) => void;
  error?: string;
  /** Accessible name of each day: 'short' (Mon) or 'long' (Monday). */
  labelStyle?: 'short' | 'long';
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="text-sm font-medium text-[var(--acade-text-muted)]">{legend}</legend>
      <div className="mt-2 grid grid-cols-7 gap-1.5">
        {WEEK_ORDER.map((d) => {
          const on = days.includes(d);
          return (
            <label
              key={d}
              className={cn(
                'flex min-h-11 min-w-0 cursor-pointer items-center justify-center rounded-[var(--radius-control)] border text-[0.8125rem] font-semibold transition-colors sm:text-sm',
                wrappedFocus,
                on
                  ? 'border-[var(--acade-primary)] bg-[var(--acade-primary)] text-[var(--acade-on-primary)]'
                  : 'border-[var(--acade-border)] bg-[var(--acade-surface)] text-[var(--acade-text-muted)] hover:border-[var(--acade-control-border)] hover:text-[var(--acade-text)]',
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={on}
                aria-label={labelStyle === 'long' ? DAY_LONG[d] : DAY_SHORT[d]}
                onChange={() => onChange(on ? days.filter((x) => x !== d) : [...days, d])}
              />
              <span aria-hidden="true">{DAY_SHORT[d]}</span>
            </label>
          );
        })}
      </div>
      {error && <p role="alert" className="mt-1.5 text-[0.8125rem] font-medium text-[var(--acade-danger)]">{error}</p>}
    </fieldset>
  );
}

/** A styled checkbox row: visually hidden native checkbox, custom box, visible label. */
export function CheckRow({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}) {
  return (
    <label className={cn('flex min-h-11 cursor-pointer items-start gap-3 rounded-[var(--radius-control)] py-2', wrappedFocus)}>
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span
        aria-hidden="true"
        className={cn(
          'mt-px flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors',
          checked
            ? 'border-[var(--acade-primary)] bg-[var(--acade-primary)] text-[var(--acade-on-primary)]'
            : 'border-[var(--acade-control-border)] bg-[var(--acade-surface)]',
        )}
      >
        {checked && <Check className="size-3.5" strokeWidth={3} />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-[var(--acade-text)]">{label}</span>
        {hint && <span className="mt-0.5 block text-[0.8125rem] leading-5 text-[var(--acade-text-muted)]">{hint}</span>}
      </span>
    </label>
  );
}

/** Whole-number text field (no browser spinner): keeps digits only. */
export function WholeNumberInput({
  label,
  value,
  onChange,
  error,
  hint,
}: {
  label: string;
  value: string;
  onChange: (digits: string) => void;
  error?: string;
  hint?: string;
}) {
  return (
    <Input
      label={label}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="off"
      value={value}
      error={error}
      hint={hint}
      className="tabular-nums"
      onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
    />
  );
}

const NOTICE_TONE = {
  info: { colour: 'var(--acade-primary)', Icon: Info },
  warning: { colour: 'var(--acade-warning)', Icon: AlertTriangle },
  danger: { colour: 'var(--acade-danger)', Icon: OctagonAlert },
} as const;

export function PageNotice({ tone = 'info', children }: { tone?: 'info' | 'warning' | 'danger'; children: React.ReactNode }) {
  const { colour, Icon } = NOTICE_TONE[tone];
  return (
    <div
      role={tone === 'info' ? 'note' : 'alert'}
      className="flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm leading-6 text-[var(--acade-text)]"
      style={{ borderColor: `color-mix(in srgb, ${colour} 26%, transparent)`, background: `color-mix(in srgb, ${colour} 7%, var(--acade-surface))` }}
    >
      <Icon className="mt-0.5 size-[1.125rem] shrink-0" style={{ color: colour }} aria-hidden="true" />
      <div className="min-w-0">{children}</div>
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
  lockStart = false,
}: {
  startsOn: string;
  unit: ValidityUnit;
  amount: number;
  onChange: (next: { startsOn: string; unit: ValidityUnit; amount: number }) => void;
  errors?: Record<string, string>;
  units?: ValidityUnit[];
  startLabel?: string;
  /** Show the start date without letting it change (extending keeps the original start). */
  lockStart?: boolean;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-3">
      <DateField
        label={startLabel}
        value={startsOn}
        disabled={lockStart}
        error={errors.startsOn}
        onChange={(next) => onChange({ startsOn: next, unit, amount })}
      />
      <WholeNumberInput
        label="Valid for (amount)"
        value={Number.isFinite(amount) ? String(amount) : ''}
        error={errors.amount}
        onChange={(digits) => onChange({ startsOn, unit, amount: digits === '' ? Number.NaN : Number(digits) })}
      />
      <FieldSelect
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
  const full = value.length >= 3;
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
      <div className="mt-2 flex flex-wrap gap-1.5">
        {[...PRESETS, ...extras].map((m) => {
          const on = selected.has(m);
          return (
            <label
              key={m}
              className={cn(
                'inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-[var(--radius-control)] border px-3.5 text-sm font-semibold tabular-nums transition-colors',
                wrappedFocus,
                on
                  ? 'border-[var(--acade-primary)] bg-[var(--acade-primary-dim)] text-[var(--acade-primary)]'
                  : 'border-[var(--acade-border)] bg-[var(--acade-surface)] text-[var(--acade-text-muted)] hover:border-[var(--acade-control-border)] hover:text-[var(--acade-text)]',
                !on && full && 'cursor-not-allowed opacity-60',
              )}
            >
              <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(m)} aria-label={`${m} minutes before`} />
              {on && <Check className="size-4 shrink-0" aria-hidden="true" />}
              {m} min
            </label>
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2 sm:max-w-sm">
        <WholeNumberInput label="Custom (minutes, 1 to 1440)" value={custom} onChange={setCustom} />
        <Button type="button" variant="outline" onClick={addCustom} disabled={full}>
          Add
        </Button>
      </div>
      <p className="mt-2 text-[0.8125rem] leading-5 text-[var(--acade-text-muted)]">Up to three reminders per timetable or event.</p>
    </fieldset>
  );
}
