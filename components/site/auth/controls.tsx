'use client';

import Link from 'next/link';
import {
  useId,
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type ChangeEvent,
  type InputHTMLAttributes,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { buttonClass } from '@/components/site/ui';
import './auth.css';

/**
 * Brand v2 form controls for sign in, create account, reset password and the
 * system pages (docs/brand-v2/BUILD_V2.md §3 Forms): rounded-xl inputs on
 * white, labels above, hints and errors below and linked with
 * aria-describedby, errors in words with an icon, never colour alone.
 * React 19 passes `ref` as a prop, so react-hook-form's register() works.
 */

export const ERROR_TEXT = 'text-[#C2361F]';

function useFieldId(explicit?: string, prefix = 'ag-field') {
  const generated = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  return explicit ?? `${prefix}-${generated}`;
}

/* ------------------------------------------------------------- buttons */

type ButtonVariant = 'night' | 'gold' | 'violet' | 'ghostOnLight' | 'ghostOnDark';

export function Spinner() {
  return <span aria-hidden="true" className="inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" />;
}

type AuthButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  variant?: ButtonVariant;
  size?: 'md' | 'lg';
  block?: boolean;
  /** Shows a spinner; the label stays. Clicks are swallowed while busy. */
  busy?: boolean;
  children: ReactNode;
};

/**
 * A real <button>. `disabled` is rendered as aria-disabled so the button stays
 * focusable and explains itself; clicks (and Enter in a form) are swallowed
 * while disabled or busy.
 */
export function AuthButton({ variant = 'night', size = 'lg', block = false, busy = false, disabled, className = '', children, onClick, type = 'button', ...rest }: AuthButtonProps) {
  const inert = Boolean(disabled) || busy;
  return (
    <button
      type={type}
      className={`${buttonClass(variant, size, block)} ${size === 'lg' ? 'min-h-[3.25rem]' : 'min-h-11'} disabled:cursor-not-allowed [&[aria-disabled=true]]:cursor-not-allowed [&[aria-disabled=true]:not([aria-busy=true])]:opacity-45 ${className}`}
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
      <span>{children}</span>
      {busy ? <Spinner /> : null}
    </button>
  );
}

type AuthLinkButtonProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'children'> & {
  href: string;
  variant?: ButtonVariant;
  size?: 'md' | 'lg';
  block?: boolean;
  /** A plain <a> (deep links, route handlers, a fresh server fetch). */
  external?: boolean;
  children: ReactNode;
};

/** A link that looks like a button. */
export function AuthLinkButton({ href, variant = 'night', size = 'lg', block = false, external = false, className = '', children, ...rest }: AuthLinkButtonProps) {
  const cls = `${buttonClass(variant, size, block)} ${size === 'lg' ? 'min-h-[3.25rem]' : 'min-h-11'} ${className}`;
  if (external) {
    return (
      <a href={href} className={cls} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls} {...rest}>
      {children}
    </Link>
  );
}

/** A quiet text action (Use a different email, Send a new code, Print). */
export function TextButton({ className = '', children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`ag-focus inline-flex min-h-11 items-center rounded-lg text-[0.9375rem] font-semibold text-ag-violet underline decoration-ag-violet/30 underline-offset-4 transition hover:decoration-ag-violet disabled:cursor-not-allowed disabled:text-ag-mist disabled:no-underline ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/** An underlined link in the v2 style; plain <a> for mailto and external addresses. */
export function InlineLink({
  href,
  children,
  className = '',
  tone = 'violet',
  ...rest
}: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { href: string; children: ReactNode; tone?: 'violet' | 'inherit' | 'onDark' }) {
  const colour =
    tone === 'inherit'
      ? 'text-current decoration-current/40 hover:decoration-current'
      : tone === 'onDark'
        ? 'text-white decoration-white/35 hover:decoration-ag-gold'
        : 'text-ag-violet decoration-ag-violet/35 hover:decoration-ag-violet';
  const cls = `ag-focus rounded font-semibold underline underline-offset-4 transition ${colour} ${className}`;
  if (/^(mailto:|tel:|https?:|acadegrade:)/.test(href)) {
    return (
      <a href={href} className={cls} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls} {...rest}>
      {children}
    </Link>
  );
}

/* ------------------------------------------------------------- field chrome */

export function ErrorIcon({ className = '' }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className={`shrink-0 ${className}`}>
      <circle cx="8" cy="8" r="7.25" fill="currentColor" />
      <path d="M8 4.4v4.3" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="8" cy="11.3" r="1" fill="#fff" />
    </svg>
  );
}

/** A field's error line: the icon and the words, linked from the field by id. */
export function FieldError({ id, children, alert = false }: { id?: string; children: ReactNode; alert?: boolean }) {
  return (
    <p id={id} role={alert ? 'alert' : undefined} className={`flex items-start gap-2 text-[0.875rem] font-medium leading-snug ${ERROR_TEXT}`}>
      <ErrorIcon className="mt-[2px]" />
      <span>{children}</span>
    </p>
  );
}

export function FieldHint({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className="text-[0.8125rem] leading-snug text-ag-mist">
      {children}
    </p>
  );
}

export const LABEL = 'text-[0.875rem] font-medium text-ag-ink';

export function inputClass(invalid: boolean, extra = '') {
  return [
    'ag-input block w-full min-w-0 rounded-xl bg-white px-4 py-3 text-[1rem] leading-6 text-ag-ink outline-none ring-1 transition',
    'placeholder:text-ag-mist/60 focus:ring-2 read-only:bg-ag-haze/70 disabled:cursor-not-allowed disabled:bg-ag-haze disabled:text-ag-mist',
    invalid ? 'ring-[#C2361F]/70 focus:ring-[#C2361F]' : 'ring-ag-ink/15 hover:ring-ag-ink/30 focus:ring-ag-violet',
    extra,
  ].join(' ');
}

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> & {
  label: ReactNode;
  /** Hide the label visually (it stays the accessible name). */
  hideLabel?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  /** Content at the right end inside the field (the Show toggle). */
  suffix?: ReactNode;
  className?: string;
  inputClassName?: string;
  ref?: Ref<HTMLInputElement>;
};

/** A labelled text, email, number or password input. */
export function TextField({ label, hideLabel, hint, error, suffix, className = '', inputClassName = '', id, ref, ...input }: TextFieldProps) {
  const fieldId = useFieldId(id);
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [errorId, hintId, input['aria-describedby']].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`flex min-w-0 flex-col gap-2 ${className}`}>
      <label htmlFor={fieldId} className={hideLabel ? 'sr-only' : LABEL}>
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={fieldId}
          {...input}
          className={inputClass(Boolean(error), `${suffix ? 'pr-[5.5rem]' : ''} ${inputClassName}`)}
          aria-invalid={error ? true : input['aria-invalid']}
          aria-describedby={describedBy}
        />
        {suffix ? <div className="absolute inset-y-0 right-1.5 flex items-center">{suffix}</div> : null}
      </div>
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
      {hint ? <FieldHint id={hintId}>{hint}</FieldHint> : null}
    </div>
  );
}

type PasswordFieldProps = Omit<TextFieldProps, 'type' | 'suffix'>;

/**
 * TextField plus a Show / Hide toggle inside its right end. The toggle is a
 * real button (type="button", never submits) with aria-pressed and the name
 * "Show password" / "Hide password".
 */
export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      suffix={
        <button
          type="button"
          className="ag-focus min-h-10 rounded-lg px-3 text-[0.875rem] font-semibold text-ag-violet transition hover:bg-ag-haze"
          aria-pressed={visible}
          aria-label={visible ? 'Hide password' : 'Show password'}
          onClick={() => setVisible((value) => !value)}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      }
    />
  );
}

/* ------------------------------------------------------------- the 6-digit code */

export const CODE_LENGTH = 6;

/**
 * Digits from whatever was typed or pasted, first six only: a pasted line
 * like "Your code is 482 913" becomes "482913".
 */
export function normaliseCode(text: string, length = CODE_LENGTH): string {
  return (text.match(/\d/g) ?? []).join('').slice(0, length);
}

interface CodeFieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  value?: string;
  onChange?: (code: string) => void;
  /** Called once each time the sixth digit arrives (auto-check). */
  onComplete?: (code: string) => void;
  disabled?: boolean;
  id?: string;
  name?: string;
  ref?: Ref<HTMLInputElement>;
}

/**
 * The 6-digit verification code: six cells over one real input (inputMode
 * numeric, autocomplete one-time-code). To assistive tech it is one labelled
 * field; the cells are decorative. A pasted line keeps its first six digits;
 * the sixth digit triggers onComplete once (never resent after a failure).
 */
export function CodeField({
  label = 'Verification code',
  hint = 'Enter the 6 digits from the email. You can paste the whole line.',
  error,
  value,
  onChange,
  onComplete,
  disabled,
  id,
  name = 'code',
  ref,
}: CodeFieldProps) {
  const inputId = useFieldId(id, 'ag-code');
  const [inner, setInner] = useState('');
  const [focused, setFocused] = useState(false);
  const code = value ?? inner;
  const lastCompleted = useRef<string | null>(null);
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  const update = (raw: string) => {
    const next = normaliseCode(raw);
    if (value === undefined) setInner(next);
    onChange?.(next);
    if (next.length === CODE_LENGTH) {
      if (lastCompleted.current !== next) {
        lastCompleted.current = next;
        onComplete?.(next);
      }
    } else {
      lastCompleted.current = null;
    }
  };

  const active = Math.min(code.length, CODE_LENGTH - 1);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className={LABEL}>
        {label}
      </label>
      <div className="ag-code relative flex max-w-[26rem] gap-2 rounded-xl">
        {Array.from({ length: CODE_LENGTH }, (_, index) => {
          const isActive = focused && index === active;
          return (
            <span
              key={index}
              aria-hidden="true"
              data-active={isActive ? 'true' : undefined}
              className={`ag-display ag-num grid h-14 min-w-0 flex-1 place-items-center rounded-xl bg-white text-[1.5rem] font-bold text-ag-ink transition ${
                isActive ? 'ring-2 ring-ag-violet' : error ? 'ring-1 ring-[#C2361F]/70' : code[index] ? 'ring-1 ring-ag-ink/30' : 'ring-1 ring-ag-ink/15'
              }`}
            >
              {code[index] ?? ''}
            </span>
          );
        })}
        <input
          ref={ref}
          id={inputId}
          name={name}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={CODE_LENGTH}
          value={code}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(event) => update(event.target.value)}
          onPaste={(event) => {
            event.preventDefault();
            update(event.clipboardData.getData('text'));
          }}
          className="absolute inset-0 h-full w-full cursor-text border-0 bg-transparent text-[16px] text-transparent caret-transparent outline-none"
        />
      </div>
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
      {hint ? <FieldHint id={hintId}>{hint}</FieldHint> : null}
    </div>
  );
}

/* ------------------------------------------------------------- choices */

export interface ChoiceOption<V extends string = string> {
  value: V;
  label: string;
  /** Accessible name when the visible text is not enough ("No extra semesters"). */
  accessibleName?: string;
}

interface ChoicePillsProps<V extends string = string> {
  name: string;
  options: readonly ChoiceOption<V>[];
  value?: V | null;
  onChange?: (value: V) => void;
  label?: string;
  labelledBy?: string;
  describedBy?: string;
}

/**
 * Segmented single choice on native radios: one tab stop, arrow keys move
 * the choice. The chosen key fills night.
 */
export function ChoicePills<V extends string = string>({ name, options, value, onChange, label, labelledBy, describedBy }: ChoicePillsProps<V>) {
  return (
    <div role="radiogroup" aria-label={labelledBy ? undefined : label} aria-labelledby={labelledBy} aria-describedby={describedBy} className="flex flex-wrap gap-2">
      {options.map((option) => (
        <label key={option.value} className="relative cursor-pointer">
          <input
            type="radio"
            name={name}
            value={option.value}
            aria-label={option.accessibleName}
            checked={value === option.value}
            onChange={(event: ChangeEvent<HTMLInputElement>) => event.target.checked && onChange?.(option.value)}
            className="peer sr-only"
          />
          <span
            aria-hidden={option.accessibleName ? true : undefined}
            className="ag-num flex h-11 min-w-[3.25rem] items-center justify-center rounded-xl bg-white px-4 text-[0.9375rem] font-semibold text-ag-ink ring-1 ring-ag-ink/15 transition hover:ring-ag-ink/35 peer-checked:bg-ag-night peer-checked:text-white peer-checked:ring-ag-night peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ag-violet"
          >
            {option.label}
          </span>
        </label>
      ))}
    </div>
  );
}

export interface ChoiceCardOption<V extends string = string> {
  value: V;
  title: string;
  line?: ReactNode;
}

/** Full-width choice cards with a title and one line (register's record setup). */
export function ChoiceCards<V extends string = string>({
  name,
  options,
  value,
  onChange,
  label,
}: {
  name: string;
  options: readonly ChoiceCardOption<V>[];
  value?: V | null;
  onChange?: (value: V) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-3">
      {options.map((option) => (
        <label
          key={option.value}
          className="group relative flex cursor-pointer gap-4 rounded-2xl bg-white p-4 ring-1 ring-ag-ink/15 transition hover:ring-ag-ink/30 has-[input:checked]:bg-ag-haze has-[input:checked]:ring-2 has-[input:checked]:ring-ag-violet has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-ag-violet sm:p-5"
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange?.(option.value)}
            className="peer sr-only"
          />
          <span aria-hidden="true" className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ring-2 ring-ag-ink/25 transition peer-checked:ring-ag-violet">
            <span className="size-2.5 scale-0 rounded-full bg-ag-violet transition group-has-[input:checked]:scale-100" />
          </span>
          <span className="flex min-w-0 flex-col gap-1">
            <span className="text-[1rem] font-semibold text-ag-ink">{option.title}</span>
            {option.line ? <span className="text-[0.875rem] leading-snug text-ag-mist">{option.line}</span> : null}
          </span>
        </label>
      ))}
    </div>
  );
}

/** A checkbox with its sentence; links may sit inside the label. */
export function CheckField({
  children,
  hint,
  hintId,
  className = '',
  ref,
  ...input
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'> & { children: ReactNode; hint?: ReactNode; hintId?: string; ref?: Ref<HTMLInputElement> }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="flex min-h-11 cursor-pointer items-start gap-3 text-[0.9375rem] leading-relaxed text-ag-ink">
        <input ref={ref} type="checkbox" {...input} className="peer sr-only" />
        <span
          aria-hidden="true"
          className="mt-[3px] grid size-5 shrink-0 place-items-center rounded-md bg-white text-white ring-[1.5px] ring-ag-ink/30 transition peer-checked:bg-ag-violet peer-checked:ring-ag-violet peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ag-violet peer-aria-[invalid=true]:ring-[#C2361F] peer-checked:[&>svg]:opacity-100"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" className="opacity-0 transition-opacity">
            <path d="M2.5 6.3l2.2 2.2 4.8-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span>{children}</span>
      </label>
      {hint ? (
        <p id={hintId} className="pl-8 text-[0.8125rem] leading-snug text-ag-mist">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------- whole-number stepper */

/** Clamp to [min, max] and to a whole number; NaN falls back to min. */
export function clampWhole(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

interface NumberStepperProps {
  label: ReactNode;
  unit?: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  hint?: ReactNode;
  error?: ReactNode;
  id?: string;
}

/**
 * Minus / value / plus for whole numbers (programme length, semesters
 * finished). The number field is the keyboard path (arrow keys step it); the
 * two keys are pointer helpers, so they are out of the tab order and hidden
 * from assistive tech.
 */
export function NumberStepper({ label, unit, min, max, value, onChange, hint, error, id }: NumberStepperProps) {
  const inputId = useFieldId(id, 'ag-stepper');
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const [draft, setDraft] = useState<string | null>(null);
  const commit = (next: number) => onChange(clampWhole(next, min, max));
  const key =
    'grid size-12 shrink-0 place-items-center rounded-xl bg-white text-[1.25rem] font-semibold text-ag-ink ring-1 ring-ag-ink/15 transition hover:ring-ag-ink/35 disabled:opacity-40';

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className={LABEL}>
        {label}
      </label>
      <div className="flex items-center gap-2">
        <button type="button" tabIndex={-1} aria-hidden="true" className={key} disabled={value <= min} onClick={() => commit(value - 1)}>
          −
        </button>
        <div className="w-24 shrink-0">
          <input
            id={inputId}
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            step={1}
            value={draft ?? String(value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
            onChange={(event) => {
              const raw = event.target.value;
              if (raw === '') {
                setDraft('');
                return;
              }
              setDraft(null);
              commit(Number(raw));
            }}
            onBlur={() => setDraft(null)}
            className={inputClass(Boolean(error), 'ag-num text-center font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none')}
          />
        </div>
        <button type="button" tabIndex={-1} aria-hidden="true" className={key} disabled={value >= max} onClick={() => commit(value + 1)}>
          +
        </button>
        {unit ? <span className="pl-1 text-[0.9375rem] text-ag-mist">{unit}</span> : null}
      </div>
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
      {hint ? <FieldHint id={hintId}>{hint}</FieldHint> : null}
    </div>
  );
}

/* ------------------------------------------------------------- Google */

/** Google's full-colour G, which its branding rules require inside the button. */
export function GoogleG({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false" className="shrink-0">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

type GoogleButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  busy?: boolean;
  /** "Continue with Google" by default (one of Google's allowed labels). */
  label?: string;
  busyLabel?: string;
};

/**
 * Google's own button, per its branding guidelines: white fill, a #747775
 * 1px outline, #1F1F1F label in a medium weight and the full-colour G at the
 * start. It sits beside the night primary as the one alternative identity.
 */
export function GoogleButton({ busy = false, label = 'Continue with Google', busyLabel = 'Opening Google…', disabled, className = '', onClick, ...rest }: GoogleButtonProps) {
  const inert = Boolean(disabled) || busy;
  return (
    <button
      type="button"
      className={`ag-focus flex min-h-[3.25rem] w-full items-center justify-center gap-3 rounded-xl border border-[#747775] bg-white px-5 text-[0.9375rem] font-medium text-[#1F1F1F] transition hover:bg-[#F8F7FC] [&[aria-disabled=true]:not([aria-busy=true])]:opacity-45 ${className}`}
      aria-disabled={inert ? true : undefined}
      aria-busy={busy ? true : undefined}
      onClick={(event) => {
        if (inert) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
      {...rest}
    >
      <GoogleG />
      <span>{busy ? busyLabel : label}</span>
      {busy ? <Spinner /> : null}
    </button>
  );
}

/** A thin rule with a label in the middle ("or sign in with email"); a separator named by its label. */
export function OrDivider({ label }: { label: string }) {
  return (
    <div role="separator" aria-label={label} className="flex items-center gap-4 text-[0.8125rem] text-ag-mist">
      <span className="h-px flex-1 bg-ag-ink/10" />
      <span aria-hidden="true">{label}</span>
      <span className="h-px flex-1 bg-ag-ink/10" />
    </div>
  );
}
