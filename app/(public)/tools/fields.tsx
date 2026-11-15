'use client';

import { useId } from 'react';

const inputClass =
  'mt-1 min-h-12 w-full rounded-[var(--radius-control)] border border-[var(--acade-border)] bg-[var(--acade-deep)] px-3 font-[family-name:var(--font-geist-mono)] text-base tabular-nums text-[var(--acade-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]';

export function NumberField({
  label,
  value,
  onChange,
  hint,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  hint?: string;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold">{label}</label>
      <input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      />
      {hint ? <p id={`${id}-hint`} className="mt-1 text-[0.8125rem] text-[var(--acade-text-muted)]">{hint}</p> : null}
    </div>
  );
}

export function ResultBox({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite" className="mt-6 rounded-[var(--radius-control)] bg-[var(--acade-primary-dim)] p-4 leading-7">
      {children}
    </div>
  );
}

export const selectClass = inputClass.replace('font-[family-name:var(--font-geist-mono)] ', '');
