'use client';

import { useId, useState, type ButtonHTMLAttributes, type ChangeEvent, type InputHTMLAttributes, type MouseEvent, type ReactNode, type Ref } from 'react';
import { buttonClass } from '@/components/site/ui';

/**
 * Brand v2 form controls for the calculator and the tools (BUILD_V2 §3
 * "Forms"): rounded-xl inputs with a ring, labels above, errors in words with
 * an icon, grade pills built on native radios (one tab stop, arrow keys move
 * the choice), a units stepper and a button that explains itself when it
 * cannot act (aria-disabled, still focusable).
 */

export const ERROR_TEXT = 'text-[#C2361F]';

const INPUT_BASE =
  'block w-full rounded-xl bg-white text-ag-ink ring-1 ring-inset ring-ag-ink/15 placeholder:text-ag-mist/70 transition-shadow focus:outline-none focus:ring-2 focus:ring-ag-violet disabled:opacity-60';
const INPUT_SIZE = { lg: 'ag-display ag-num h-16 px-5 text-[1.75rem] font-bold', md: 'px-4 py-3 text-[1rem]', sm: 'px-3 py-2.5 text-[0.9375rem]' };
const INPUT_ERROR = 'ring-2 ring-[#C2361F] focus:ring-[#C2361F]';
const INPUT_DARK = 'block w-full rounded-xl bg-white/5 px-4 py-3 text-[0.9375rem] text-white ring-1 ring-inset ring-white/15 focus:outline-none focus:ring-2 focus:ring-ag-gold';

export function inputClass({ size = 'md', invalid = false, dark = false }: { size?: 'lg' | 'md' | 'sm'; invalid?: boolean; dark?: boolean } = {}) {
  if (dark) return INPUT_DARK;
  return `${INPUT_BASE} ${INPUT_SIZE[size]} ${invalid ? INPUT_ERROR : ''}`;
}

/** Underlined text button (actions that are not the main one). */
export function textButtonClass(onDark = false) {
  return `ag-focus rounded font-semibold underline underline-offset-4 transition ${
    onDark ? 'text-white decoration-white/35 hover:decoration-ag-gold' : 'text-ag-violet decoration-ag-violet/30 hover:decoration-ag-violet'
  }`;
}

function ErrorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="mt-0.5 shrink-0">
      <circle cx="8" cy="8" r="8" fill="currentColor" />
      <path d="M8 4.2v4.6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="8" cy="11.4" r="1.05" fill="#fff" />
    </svg>
  );
}

/** An error said in words, with an icon (never colour alone). */
export function ErrorLine({ id, children, className = '' }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <p id={id} className={`mt-2 flex items-start gap-2 text-[0.875rem] font-medium leading-snug ${ERROR_TEXT} ${className}`}>
      <ErrorIcon />
      <span>{children}</span>
    </p>
  );
}

export function useFieldId(explicit?: string) {
  const generated = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  return explicit ?? `ag-f-${generated}`;
}

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'size'> & {
  label: ReactNode;
  hideLabel?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  inputClassName?: string;
  size?: 'lg' | 'md' | 'sm';
  dark?: boolean;
  ref?: Ref<HTMLInputElement>;
};

/** Label above, the input, then the error (in words) and the hint, linked with aria-describedby. */
export function TField({ label, hideLabel, hint, error, className = '', inputClassName = '', size = 'md', dark = false, id, ref, ...input }: FieldProps) {
  const fieldId = useFieldId(id);
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [errorId, hintId, input['aria-describedby']].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`min-w-0 ${className}`}>
      <label
        htmlFor={fieldId}
        className={hideLabel ? 'sr-only' : `mb-2 block text-[0.875rem] font-medium ${dark ? 'text-white/85' : 'text-ag-ink'}`}
      >
        {label}
      </label>
      <input
        ref={ref}
        id={fieldId}
        {...input}
        aria-invalid={error ? true : input['aria-invalid']}
        aria-describedby={describedBy}
        className={`${inputClass({ size, invalid: Boolean(error), dark })} ${inputClassName}`}
      />
      {error ? <ErrorLine id={errorId}>{error}</ErrorLine> : null}
      {hint ? (
        <p id={hintId} className={`mt-2 text-[0.8125rem] leading-snug ${dark ? 'text-ag-mist-night' : 'text-ag-mist'}`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------- stepper */

export function clampStep(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/**
 * Minus, the number, plus. No native number input (owner rule: no browser
 * spinners): the field is a text input with role="spinbutton", digits only,
 * and Arrow Up/Down, Page Up/Down, Home and End step it. The two keys are
 * pointer helpers, out of the tab order.
 */
export function TStepper({
  label,
  min,
  max,
  value,
  onChange,
  className = '',
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  className?: string;
}) {
  const fieldId = useFieldId();
  const [draft, setDraft] = useState<string | null>(null);
  const commit = (next: number) => onChange(clampStep(next, min, max));
  const key =
    'grid h-full w-9 shrink-0 place-items-center text-[1.125rem] font-semibold text-ag-ink/70 transition hover:text-ag-violet disabled:cursor-default disabled:text-ag-ink/25';
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={fieldId} className="sr-only">
        {label}
      </label>
      <div className="ag-stepper flex h-11 items-stretch overflow-hidden rounded-xl bg-white ring-1 ring-inset ring-ag-ink/15 focus-within:ring-2 focus-within:ring-ag-violet">
        <button type="button" tabIndex={-1} aria-hidden="true" className={key} disabled={value <= min} onClick={() => commit(value - 1)}>
          −
        </button>
        <input
          id={fieldId}
          type="text"
          role="spinbutton"
          inputMode="numeric"
          autoComplete="off"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          value={draft ?? String(value)}
          onKeyDown={(event) => {
            const steps: Record<string, number> = { ArrowUp: value + 1, ArrowDown: value - 1, PageUp: max, PageDown: min, Home: min, End: max };
            if (event.key in steps) {
              event.preventDefault();
              setDraft(null);
              commit(steps[event.key]);
            }
          }}
          onChange={(event) => {
            const raw = event.target.value.replace(/\D/g, '');
            if (raw === '') {
              setDraft('');
              return;
            }
            setDraft(null);
            // One-digit ranges (units 1 to 6) take the digit just typed, so "3" then "4" reads 4, not 34.
            commit(Number(max < 10 ? raw.slice(-1) : raw));
          }}
          onBlur={() => setDraft(null)}
          className="ag-num w-full min-w-0 bg-transparent text-center text-[1rem] font-semibold text-ag-ink focus:outline-none"
        />
        <button type="button" tabIndex={-1} aria-hidden="true" className={key} disabled={value >= max} onClick={() => commit(value + 1)}>
          +
        </button>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- pills */

export interface PillOption<V extends string = string> {
  value: V;
  label: ReactNode;
  /** Accessible name when the visible text is not enough ("A, 5 points"). */
  accessibleName?: string;
  tone?: 'gold' | 'mark';
}

/** A radiogroup of pills on a light ground (grade keys, retake grade, target class). */
export function PillChoice<V extends string = string>({
  name,
  options,
  value,
  onChange,
  label,
  labelledBy,
  shape = 'round',
  className = '',
  itemClassName = '',
}: {
  name: string;
  options: readonly PillOption<V>[];
  value: V | null;
  onChange: (value: V) => void;
  label?: string;
  labelledBy?: string;
  shape?: 'round' | 'wide';
  className?: string;
  itemClassName?: string;
}) {
  return (
    <div role="radiogroup" aria-label={labelledBy ? undefined : label} aria-labelledby={labelledBy} className={className || 'flex gap-1'}>
      {options.map((option) => (
        <label key={option.value} className={`relative ${itemClassName}`}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            aria-label={option.accessibleName}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              if (event.target.checked) onChange(option.value);
            }}
            className="peer sr-only"
          />
          <span className="ag-pill w-full" data-tone={option.tone} data-shape={shape === 'wide' ? 'wide' : undefined} aria-hidden={option.accessibleName ? true : undefined}>
            {option.label}
          </span>
        </label>
      ))}
    </div>
  );
}

/** The two-part segmented control (calculator mode), on native radios. */
export function Segmented<V extends string = string>({
  name,
  options,
  value,
  onChange,
  labelledBy,
  className = '',
}: {
  name: string;
  options: readonly { value: V; label: string }[];
  value: V;
  onChange: (value: V) => void;
  labelledBy: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className={`inline-flex rounded-xl bg-ag-haze p-1 ring-1 ring-inset ring-ag-ink/[0.06] ${className}`}>
      {options.map((option) => (
        <label key={option.value} className="relative flex-1">
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={(event) => {
              if (event.target.checked) onChange(option.value);
            }}
            className="peer sr-only"
          />
          <span className="ag-seg w-full">{option.label}</span>
        </label>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------- button */

type ButtonVariant = Parameters<typeof buttonClass>[0];

function Spinner() {
  return <span className="ml-1 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" aria-hidden="true" />;
}

/**
 * A real <button>. `disabled` is rendered as aria-disabled so the button stays
 * focusable and its reason can sit beside it; clicks are swallowed while
 * disabled or busy.
 */
export function TButton({
  variant = 'gold',
  size = 'md',
  block = false,
  busy = false,
  disabled,
  className = '',
  children,
  onClick,
  type = 'button',
  ...rest
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  variant?: ButtonVariant;
  size?: 'md' | 'lg';
  block?: boolean;
  busy?: boolean;
  children: ReactNode;
}) {
  const inert = Boolean(disabled) || busy;
  return (
    <button
      type={type}
      className={`${buttonClass(variant, size, block)} ${disabled ? 'cursor-not-allowed opacity-50 shadow-none hover:brightness-100' : ''} ${className}`}
      aria-disabled={inert ? true : undefined}
      aria-busy={busy ? true : undefined}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        if (inert) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
      {...rest}
    >
      {children}
      {busy ? <Spinner /> : null}
    </button>
  );
}
