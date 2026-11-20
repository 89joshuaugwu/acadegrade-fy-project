'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/**
 * Custom date and time fields (owner rule: no native browser pickers). Values use the same strings the
 * native inputs produced, so callers and the data they send do not change:
 * DateField 'YYYY-MM-DD', TimeField 'HH:mm', DateTimeField 'YYYY-MM-DDTHH:mm', or '' when empty.
 * Styled with the app tokens (--acade-*), so they follow the theme.
 */

interface BaseProps {
  label: string;
  onChange: (value: string) => void;
  name?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  hideLabel?: boolean;
  placeholder?: string;
}

export interface DateFieldProps extends BaseProps {
  value: string;
  min?: string;
  max?: string;
}

export interface TimeFieldProps extends BaseProps {
  value: string;
  /** Minutes between choices (default 5). */
  step?: number;
  min?: string;
  max?: string;
}

export interface DateTimeFieldProps extends BaseProps {
  value: string;
  min?: string;
  max?: string;
  step?: number;
}

/* ---------- date helpers (local wall time, no time-zone shifts) ---------- */

const pad = (n: number) => String(n).padStart(2, '0');
export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function parseIsoDate(value: string | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}
function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}
function addMonths(d: Date, n: number): Date {
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return new Date(target.getFullYear(), target.getMonth(), Math.min(d.getDate(), last));
}
const dateLabel = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const fullDateLabel = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const monthLabel = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' });
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function formatTime12(value: string): string {
  const m = /^(\d{2}):(\d{2})$/.exec(value);
  if (!m) return '';
  const h = Number(m[1]);
  const suffix = h < 12 ? 'am' : 'pm';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m[2]} ${suffix}`;
}
const toMinutes = (value: string | undefined) => {
  const m = /^(\d{2}):(\d{2})$/.exec(value ?? '');
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

/* ---------- shared pieces ---------- */

function useDismiss(open: boolean, rootRef: React.RefObject<HTMLDivElement | null>, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open, rootRef, close]);
}

function useDropUp(triggerRef: React.RefObject<HTMLButtonElement | null>, needed: number) {
  const [up, setUp] = useState(false);
  const measure = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect && typeof window !== 'undefined') setUp(window.innerHeight - rect.bottom < needed && rect.top > needed);
  }, [triggerRef, needed]);
  return [up, measure] as const;
}

const triggerClass = (open: boolean, error?: string, disabled?: boolean) =>
  cn(
    'flex h-12 w-full min-w-0 items-center justify-between gap-3 rounded-xl px-4 text-left',
    'bg-[var(--acade-deep)] text-[var(--acade-text)] border border-[var(--acade-control-border)]',
    'text-[length:var(--text-base)] font-[family-name:var(--font-dm-sans)] transition-colors duration-150',
    'focus:outline-none focus-visible:border-[var(--acade-primary)] focus-visible:ring-2 focus-visible:ring-[var(--acade-primary)]/25',
    open && 'border-[var(--acade-primary)] ring-2 ring-[var(--acade-primary)]/20',
    error && 'border-[var(--acade-danger)]',
    disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
  );

const popoverClass = (up: boolean) =>
  cn(
    'absolute left-0 z-[var(--z-dropdown,50)] rounded-2xl border border-[var(--acade-border)] bg-[var(--acade-surface)] p-3 shadow-2xl',
    up ? 'bottom-full mb-2' : 'top-full mt-2',
  );

function FieldFrame({
  id,
  label,
  hideLabel,
  required,
  error,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  hideLabel?: boolean;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('flex w-full min-w-0 flex-col gap-1.5', className)}>
      <span id={`${id}-label`} className={cn('text-[length:var(--text-sm)] font-medium text-[var(--acade-text-muted)] font-[family-name:var(--font-dm-sans)]', hideLabel && 'sr-only')}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </span>
      {children}
      {error ? (
        <p id={`${id}-msg`} role="alert" className="text-[length:var(--text-xs)] font-medium text-[var(--acade-danger)]">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-msg`} className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function useFieldId(idProp?: string) {
  const auto = useId();
  return idProp ?? `f-${auto.replace(/:/g, '')}`;
}

/* ---------- DateField ---------- */

export function DateField({ label, value, onChange, name, required, error, hint, disabled, id: idProp, className, hideLabel, placeholder = 'Choose a date', min, max }: DateFieldProps) {
  const id = useFieldId(idProp);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = parseIsoDate(value);
  const minDate = parseIsoDate(min);
  const maxDate = parseIsoDate(max);
  const [focusDate, setFocusDate] = useState<Date>(() => selected ?? new Date());
  const [up, measure] = useDropUp(triggerRef, 380);

  const close = useCallback((refocus = false) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);
  useDismiss(open, rootRef, close);

  const outOfRange = useCallback((d: Date) => (minDate ? d < minDate : false) || (maxDate ? d > maxDate : false), [minDate, maxDate]);

  const openPicker = () => {
    if (disabled) return;
    measure();
    const start = selected ?? new Date();
    setFocusDate(minDate && start < minDate ? minDate : maxDate && start > maxDate ? maxDate : start);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const key = toIsoDate(focusDate);
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${key}"]`)?.focus();
  }, [open, focusDate]);

  const weeks = useMemo(() => {
    const first = new Date(focusDate.getFullYear(), focusDate.getMonth(), 1);
    const start = addDays(first, -first.getDay());
    return Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
  }, [focusDate]);

  const choose = (d: Date) => {
    if (outOfRange(d)) return;
    onChange(toIsoDate(d));
    close(true);
  };

  const onGridKey = (e: KeyboardEvent) => {
    const moves: Record<string, () => Date> = {
      ArrowLeft: () => addDays(focusDate, -1),
      ArrowRight: () => addDays(focusDate, 1),
      ArrowUp: () => addDays(focusDate, -7),
      ArrowDown: () => addDays(focusDate, 7),
      PageUp: () => addMonths(focusDate, e.shiftKey ? -12 : -1),
      PageDown: () => addMonths(focusDate, e.shiftKey ? 12 : 1),
      Home: () => addDays(focusDate, -focusDate.getDay()),
      End: () => addDays(focusDate, 6 - focusDate.getDay()),
    };
    if (moves[e.key]) {
      e.preventDefault();
      setFocusDate(moves[e.key]());
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close(true);
    }
  };

  const today = new Date();
  const todayKey = toIsoDate(today);
  const describedBy = error || hint ? `${id}-msg` : undefined;

  return (
    <FieldFrame id={id} label={label} hideLabel={hideLabel} required={required} error={error} hint={hint} className={className}>
      <div ref={rootRef} className="relative">
        {name ? <input type="hidden" name={name} value={value} /> : null}
        <button
          ref={triggerRef}
          id={id}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-labelledby={`${id}-label ${id}`}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          aria-required={required || undefined}
          disabled={disabled}
          onClick={() => (open ? close() : openPicker())}
          onKeyDown={(e) => {
            if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
              e.preventDefault();
              openPicker();
            }
          }}
          className={triggerClass(open, error, disabled)}
        >
          <span className={cn('min-w-0 truncate', !selected && 'text-[var(--acade-text-faint)]')}>{selected ? dateLabel.format(selected) : placeholder}</span>
          <CalendarDays aria-hidden="true" size={18} className="shrink-0 text-[var(--acade-text-faint)]" />
        </button>

        {open ? (
          <div role="dialog" aria-modal="false" aria-label={`Choose ${label.toLowerCase()}`} className={cn(popoverClass(up), 'w-[19.5rem] max-w-[calc(100vw-2rem)]')}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <button type="button" aria-label="Previous month" onClick={() => setFocusDate(addMonths(focusDate, -1))} className="grid size-9 place-items-center rounded-lg text-[var(--acade-text)] hover:bg-[var(--acade-overlay)] focus-visible:outline-2 focus-visible:outline-[var(--acade-primary)]">
                <ChevronLeft aria-hidden="true" size={18} />
              </button>
              <p aria-live="polite" className="text-[length:var(--text-sm)] font-semibold text-[var(--acade-text)] font-[family-name:var(--font-dm-sans)]">
                {monthLabel.format(focusDate)}
              </p>
              <button type="button" aria-label="Next month" onClick={() => setFocusDate(addMonths(focusDate, 1))} className="grid size-9 place-items-center rounded-lg text-[var(--acade-text)] hover:bg-[var(--acade-overlay)] focus-visible:outline-2 focus-visible:outline-[var(--acade-primary)]">
                <ChevronRight aria-hidden="true" size={18} />
              </button>
            </div>
            <div ref={gridRef} role="grid" aria-label={monthLabel.format(focusDate)} onKeyDown={onGridKey} className="grid gap-1">
              <div role="row" className="grid grid-cols-7 gap-1">
                {WEEKDAYS.map((d) => (
                  <span key={d} role="columnheader" className="grid h-8 place-items-center text-[length:var(--text-xs)] font-medium text-[var(--acade-text-muted)]">
                    {d}
                  </span>
                ))}
              </div>
              {weeks.map((week) => (
                <div key={toIsoDate(week[0])} role="row" className="grid grid-cols-7 gap-1">
                  {week.map((d) => {
                    const key = toIsoDate(d);
                    const inMonth = d.getMonth() === focusDate.getMonth();
                    const isSelected = value === key;
                    const isFocus = toIsoDate(focusDate) === key;
                    const blocked = outOfRange(d);
                    return (
                      <span key={key} role="gridcell" aria-selected={isSelected}>
                        <button
                          type="button"
                          data-date={key}
                          tabIndex={isFocus ? 0 : -1}
                          aria-label={fullDateLabel.format(d)}
                          aria-current={key === todayKey ? 'date' : undefined}
                          aria-disabled={blocked || undefined}
                          onClick={() => choose(d)}
                          className={cn(
                            'grid h-9 w-full place-items-center rounded-lg text-[length:var(--text-sm)] tabular-nums transition-colors duration-100',
                            'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--acade-primary)]',
                            inMonth ? 'text-[var(--acade-text)]' : 'text-[var(--acade-text-faint)]',
                            !blocked && !isSelected && 'hover:bg-[var(--acade-overlay)]',
                            key === todayKey && !isSelected && 'ring-1 ring-inset ring-[var(--acade-primary)]/50',
                            isSelected && 'bg-[var(--acade-primary)] font-semibold text-[var(--acade-on-primary)]',
                            blocked && 'cursor-not-allowed opacity-35 line-through',
                          )}
                        >
                          {d.getDate()}
                        </button>
                      </span>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 border-t border-[var(--acade-border-subtle)] pt-2">
              <button
                type="button"
                disabled={outOfRange(new Date(today.getFullYear(), today.getMonth(), today.getDate()))}
                onClick={() => choose(new Date(today.getFullYear(), today.getMonth(), today.getDate()))}
                className="min-h-9 rounded-lg px-3 text-[length:var(--text-sm)] font-medium text-[var(--acade-primary)] hover:bg-[var(--acade-overlay)] disabled:opacity-40"
              >
                Today
              </button>
              {!required && value ? (
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    close(true);
                  }}
                  className="min-h-9 rounded-lg px-3 text-[length:var(--text-sm)] font-medium text-[var(--acade-text-muted)] hover:bg-[var(--acade-overlay)]"
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </FieldFrame>
  );
}

/* ---------- TimeField ---------- */

export function TimeField({ label, value, onChange, name, required, error, hint, disabled, id: idProp, className, hideLabel, placeholder = 'Choose a time', step = 5, min, max }: TimeFieldProps) {
  const id = useFieldId(idProp);
  const listId = `${id}-list`;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [up, measure] = useDropUp(triggerRef, 300);

  const options = useMemo(() => {
    const lo = toMinutes(min) ?? 0;
    const hi = toMinutes(max) ?? 24 * 60 - 1;
    const every = Math.max(1, Math.min(240, Math.round(step)));
    const list: string[] = [];
    for (let m = 0; m < 24 * 60; m += every) if (m >= lo && m <= hi) list.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
    if (value && /^\d{2}:\d{2}$/.test(value) && !list.includes(value)) {
      list.push(value);
      list.sort();
    }
    return list;
  }, [min, max, step, value]);

  const close = useCallback((refocus = false) => {
    setOpen(false);
    setActive(-1);
    if (refocus) triggerRef.current?.focus();
  }, []);
  useDismiss(open, rootRef, close);

  const openList = () => {
    if (disabled) return;
    measure();
    const index = options.indexOf(value);
    const nowIndex = options.findIndex((o) => (toMinutes(o) ?? 0) >= 8 * 60);
    setActive(index >= 0 ? index : Math.max(0, nowIndex));
    setOpen(true);
  };

  useEffect(() => {
    if (!open || active < 0) return;
    listRef.current?.querySelectorAll<HTMLElement>('[role="option"]')[active]?.scrollIntoView?.({ block: 'nearest' });
  }, [open, active]);

  const choose = (v: string) => {
    onChange(v);
    close(true);
  };

  const perHour = Math.max(1, Math.round(60 / Math.max(1, step)));
  const onKey = (e: KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    const last = options.length - 1;
    const jump: Record<string, number> = { ArrowDown: 1, ArrowUp: -1, PageDown: perHour, PageUp: -perHour };
    if (e.key in jump) {
      e.preventDefault();
      setActive((i) => Math.min(last, Math.max(0, i + jump[e.key])));
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      setActive(e.key === 'Home' ? 0 : last);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (options[active]) choose(options[active]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close(true);
    } else if (e.key === 'Tab') {
      close();
    } else if (/^\d$/.test(e.key)) {
      // Typing an hour digit jumps to that hour (1 → 1 am, then 1 pm on the next press).
      const h = Number(e.key);
      const matches = options.map((o, i) => [o, i] as const).filter(([o]) => Number(o.slice(0, 2)) % 12 === h % 12 && o.endsWith(':00'));
      const next = matches.find(([, i]) => i > active) ?? matches[0];
      if (next) setActive(next[1]);
    }
  };

  const describedBy = error || hint ? `${id}-msg` : undefined;
  const activeId = open && active >= 0 && options[active] ? `${listId}-${options[active].replace(':', '')}` : undefined;

  return (
    <FieldFrame id={id} label={label} hideLabel={hideLabel} required={required} error={error} hint={hint} className={className}>
      <div ref={rootRef} className="relative" onKeyDown={onKey}>
        {name ? <input type="hidden" name={name} value={value} /> : null}
        <button
          ref={triggerRef}
          id={id}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={activeId}
          aria-labelledby={`${id}-label ${id}`}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          aria-required={required || undefined}
          disabled={disabled}
          onClick={() => (open ? close() : openList())}
          className={triggerClass(open, error, disabled)}
        >
          <span className={cn('min-w-0 truncate tabular-nums', !value && 'text-[var(--acade-text-faint)]')}>{value ? formatTime12(value) : placeholder}</span>
          <Clock aria-hidden="true" size={18} className="shrink-0 text-[var(--acade-text-faint)]" />
        </button>
        {open ? (
          <div className={cn(popoverClass(up), 'w-full min-w-[11rem] p-1.5')}>
            <ul ref={listRef} id={listId} role="listbox" aria-labelledby={`${id}-label`} className="max-h-64 overflow-y-auto overscroll-contain">
              {options.map((o, i) => (
                <li
                  key={o}
                  id={`${listId}-${o.replace(':', '')}`}
                  role="option"
                  aria-selected={o === value}
                  onPointerDown={(e) => e.preventDefault()}
                  onPointerMove={() => setActive(i)}
                  onClick={() => choose(o)}
                  className={cn(
                    'flex min-h-10 cursor-pointer items-center justify-between rounded-lg px-3 text-[length:var(--text-sm)] tabular-nums text-[var(--acade-text)]',
                    i === active && 'bg-[var(--acade-overlay)]',
                    o === value && 'font-semibold text-[var(--acade-primary)]',
                  )}
                >
                  {formatTime12(o)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </FieldFrame>
  );
}

/* ---------- DateTimeField ---------- */

export function DateTimeField({ label, value, onChange, name, required, error, hint, disabled, id: idProp, className, hideLabel, min, max, step = 5 }: DateTimeFieldProps) {
  const id = useFieldId(idProp);
  const [datePart = '', timePart = ''] = (value ?? '').split('T');
  const minDate = min?.split('T')[0];
  const maxDate = max?.split('T')[0];
  const minTime = min && datePart && datePart === minDate ? min.split('T')[1]?.slice(0, 5) : undefined;
  const maxTime = max && datePart && datePart === maxDate ? max.split('T')[1]?.slice(0, 5) : undefined;
  const describedBy = error || hint ? `${id}-msg` : undefined;

  return (
    <fieldset className={cn('flex w-full min-w-0 flex-col gap-1.5', className)} aria-describedby={describedBy} disabled={disabled}>
      <legend className={cn('mb-1.5 text-[length:var(--text-sm)] font-medium text-[var(--acade-text-muted)] font-[family-name:var(--font-dm-sans)]', hideLabel && 'sr-only')}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </legend>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <DateField
          id={`${id}-date`}
          label={`${label}: date`}
          hideLabel
          value={datePart}
          min={minDate}
          max={maxDate}
          required={required}
          disabled={disabled}
          onChange={(d) => onChange(d ? `${d}T${timePart || '09:00'}` : '')}
        />
        <TimeField
          id={`${id}-time`}
          label={`${label}: time`}
          hideLabel
          value={timePart.slice(0, 5)}
          step={step}
          min={minTime}
          max={maxTime}
          required={required}
          disabled={disabled || !datePart}
          placeholder={datePart ? 'Choose a time' : 'Pick a date first'}
          onChange={(t) => onChange(datePart ? `${datePart}T${t}` : '')}
        />
      </div>
      {error ? (
        <p id={`${id}-msg`} role="alert" className="text-[length:var(--text-xs)] font-medium text-[var(--acade-danger)]">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-msg`} className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)]">
          {hint}
        </p>
      ) : null}
    </fieldset>
  );
}
