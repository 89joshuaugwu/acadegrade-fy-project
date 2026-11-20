'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode, type Ref } from 'react';
import { SelectV2, type SelectOptionV2 } from '@/components/site/Select';
import { buttonClass } from '@/components/site/ui';
import { useAuth } from '@/hooks/useAuth';
import { SETTINGS_HELP_HREF, SUPPORT_SUBJECT } from '@/lib/public/support';
import { contactHref } from '@/lib/site/contact-email';
import {
  PUBLIC_SUPPORT_CATEGORIES,
  PUBLIC_SUPPORT_EMAIL_MAX,
  PUBLIC_SUPPORT_HONEYPOT_FIELD,
  PUBLIC_SUPPORT_NAME_MAX,
  type PublicSupportCategory,
} from '@/lib/support/public-request';
import { SUPPORT_CATEGORY_LABELS, SUPPORT_MESSAGE_MAX, SUPPORT_MESSAGE_MIN } from '@/lib/support/tickets';

/**
 * The support request panel (docs/public-redesign/pages/support.md §5.1), brand v2.
 * Anyone can write without signing in (POST /api/support/public), so a student who is
 * locked out always has a way in, with or without a published email. Signed-in students
 * are pointed to Settings > Help and support, where their replies arrive.
 */

export const SUPPORT_ENDPOINT = '/api/support/public';

type FieldName = 'email' | 'category' | 'message';
type Errors = Partial<Record<FieldName, string>>;

export type CouponState =
  | { kind: 'form' }
  | { kind: 'sending' }
  | { kind: 'sent'; email: string }
  | { kind: 'paused' };

interface SupportCouponProps {
  /** The published contact address, or null. */
  email: string | null;
  /** False when support is switched off in Admin (the API is the real gate). */
  supportOpen: boolean;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The public form's categories, with the shared labels (never retyped). */
const CATEGORY_OPTIONS: readonly SelectOptionV2[] = PUBLIC_SUPPORT_CATEGORIES.map((category) => ({
  value: category,
  label: SUPPORT_CATEGORY_LABELS[category],
}));

export const COUPON_COPY = {
  heading: 'Send us a request',
  intro: 'No sign-in needed. We reply by email, usually to the address you give here.',
  hint: `At least ${SUPPORT_MESSAGE_MIN} characters. Do not include your password or any code we sent you.`,
  sent: (address: string) => `Sent. We will reply to ${address}.`,
  paused: 'Requests are paused for a short while.',
  busy: 'You have sent several requests already. Please wait before sending another.',
  failed: 'Your request could not be sent. Please try again.',
  offline: 'We could not reach AcadeGrade. Check your connection and try again.',
  signedIn: 'You are signed in. Send your request from Help and support in Settings, where you can also read our replies.',
} as const;

export function validateCoupon(values: { email: string; category: string; message: string }): Errors {
  const errors: Errors = {};
  const email = values.email.trim();
  if (!email || email.length > PUBLIC_SUPPORT_EMAIL_MAX || !EMAIL.test(email)) errors.email = 'Enter the email address we should reply to';
  if (!PUBLIC_SUPPORT_CATEGORIES.includes(values.category as PublicSupportCategory)) errors.category = 'Choose what it is about';
  const length = values.message.trim().length;
  if (length < SUPPORT_MESSAGE_MIN) errors.message = `Write at least ${SUPPORT_MESSAGE_MIN} characters`;
  else if (length > SUPPORT_MESSAGE_MAX) errors.message = `Keep it under ${SUPPORT_MESSAGE_MAX} characters`;
  return errors;
}

/** Which field an API error names, so focus can move there. */
function fieldFor(message: string): FieldName | null {
  const text = message.toLowerCase();
  if (text.includes('email')) return 'email';
  if (text.includes('choose') || text.includes('about')) return 'category';
  if (text.includes('describe') || text.includes('characters')) return 'message';
  return null;
}

function minutesText(seconds: number): string {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  if (minutes >= 90) return `about ${Math.round(minutes / 60)} hours`;
  return minutes === 1 ? 'about a minute' : `about ${minutes} minutes`;
}

// ------------------------------------------------------------------ Field chrome (brand v2 form styling)

const CONTROL =
  'block w-full rounded-xl bg-white px-4 py-3 text-[1rem] text-ag-ink ring-1 transition placeholder:text-ag-mist/70 focus:outline-none focus:ring-2 focus:ring-ag-violet read-only:bg-ag-haze/60 disabled:bg-ag-haze/60';

function controlClass(error?: string) {
  return `${CONTROL} ${error ? 'ring-2 ring-[#C2361F]' : 'ring-ag-ink/15'}`;
}

function ErrorLine({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-2 flex items-start gap-2 text-[0.875rem] font-medium text-[#C2361F]">
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="mt-0.5 shrink-0">
        <circle cx="8" cy="8" r="8" fill="currentColor" />
        <path d="M8 4v5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="8" cy="11.6" r="1" fill="#fff" />
      </svg>
      <span>{children}</span>
    </p>
  );
}

function FieldShell({
  label,
  htmlFor,
  error,
  errorId,
  hint,
  hintId,
  children,
  className = '',
}: {
  label: string;
  htmlFor: string;
  error?: string;
  errorId: string;
  hint?: ReactNode;
  hintId?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={htmlFor} className="mb-2 block text-[0.875rem] font-medium text-ag-ink">
        {label}
      </label>
      {children}
      {error ? <ErrorLine id={errorId}>{error}</ErrorLine> : null}
      {hint ? (
        <p id={hintId} className="mt-2 text-[0.875rem] leading-relaxed text-ag-mist">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(...ids: (string | false | undefined)[]) {
  return ids.filter(Boolean).join(' ') || undefined;
}

// ------------------------------------------------------------------ Panel states

function PanelHeading({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="ag-display text-[1.75rem] font-bold leading-tight text-ag-ink sm:text-[2rem]">
      {children}
    </h2>
  );
}

function StatusMark({ tone }: { tone: 'gold' | 'violet' }) {
  return (
    <span className={`grid h-12 w-12 place-items-center rounded-2xl ${tone === 'gold' ? 'bg-ag-gold/25 text-ag-night' : 'bg-ag-violet/10 text-ag-violet'}`} aria-hidden="true">
      {tone === 'gold' ? (
        <svg width="22" height="22" viewBox="0 0 22 22">
          <path d="M5 11.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="22" height="22" viewBox="0 0 22 22">
          <path d="M8 5v12M14 5v12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      )}
    </span>
  );
}

const TEXT_LINK = 'ag-focus rounded font-semibold text-ag-violet underline decoration-ag-violet/30 underline-offset-4 hover:decoration-ag-violet';
const TEXT_BUTTON = 'ag-focus rounded text-[0.9375rem] font-semibold text-ag-violet underline decoration-ag-violet/30 underline-offset-4 hover:decoration-ag-violet';

export function SupportCoupon({ email, supportOpen }: SupportCouponProps) {
  const { user } = useAuth();
  const signedIn = Boolean(user);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const [useForm, setUseForm] = useState(false);
  const [state, setState] = useState<CouponState>(supportOpen ? { kind: 'form' } : { kind: 'paused' });
  const [values, setValues] = useState({ name: '', email: '', category: '', message: '', trap: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [alert, setAlert] = useState<string | null>(null);
  const [waitUntil, setWaitUntil] = useState<number | null>(null);
  const refs = {
    email: useRef<HTMLInputElement>(null),
    message: useRef<HTMLTextAreaElement>(null),
  };
  /** SelectV2 takes no ref; its trigger button carries the id we give it. */
  const focusField = (field: FieldName) => {
    if (field === 'category') document.getElementById(`support-category-${uid}`)?.focus();
    else refs[field].current?.focus();
  };
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.kind === 'sent' || state.kind === 'paused') statusRef.current?.focus();
  }, [state.kind]);

  useEffect(() => {
    if (waitUntil === null) return;
    const timer = window.setTimeout(() => setWaitUntil(null), Math.max(0, waitUntil - Date.now()));
    return () => window.clearTimeout(timer);
  }, [waitUntil]);

  const set = (key: keyof typeof values) => (value: string) => setValues((current) => ({ ...current, [key]: value }));

  const blur = (field: FieldName) => () => {
    const found = validateCoupon(values)[field];
    setErrors((current) => ({ ...current, [field]: found }));
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.kind === 'sending' || waitUntil !== null) return;
    const found = validateCoupon(values);
    setErrors(found);
    setAlert(null);
    const first = (['email', 'category', 'message'] as const).find((field) => found[field]);
    if (first) {
      focusField(first);
      return;
    }

    setState({ kind: 'sending' });
    let response: Response;
    try {
      response = await fetch(SUPPORT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name.trim() || undefined,
          email: values.email.trim(),
          category: values.category,
          message: values.message.trim(),
          route: '/support',
          [PUBLIC_SUPPORT_HONEYPOT_FIELD]: values.trap,
        }),
      });
    } catch {
      setState({ kind: 'form' });
      setAlert(COUPON_COPY.offline);
      return;
    }

    const body = (await response.json().catch(() => ({}))) as { error?: string; code?: string; retryAfterSeconds?: number };
    if (response.status === 201) {
      setState({ kind: 'sent', email: values.email.trim().toLowerCase() });
      return;
    }
    if (response.status === 503 && body.code === 'FEATURE_DISABLED') {
      setState({ kind: 'paused' });
      return;
    }
    setState({ kind: 'form' });
    if (response.status === 400) {
      const message = body.error ?? COUPON_COPY.failed;
      setAlert(message);
      const field = fieldFor(message);
      if (field) {
        setErrors((current) => ({ ...current, [field]: message }));
        focusField(field);
      }
      return;
    }
    if (response.status === 429) {
      const header = Number(response.headers.get('Retry-After'));
      const seconds = Number.isFinite(body.retryAfterSeconds) && body.retryAfterSeconds ? body.retryAfterSeconds : Number.isFinite(header) && header > 0 ? header : 0;
      setAlert(seconds ? `${body.error ?? COUPON_COPY.busy} You can send again in ${minutesText(seconds)}.` : body.error ?? COUPON_COPY.busy);
      if (seconds) setWaitUntil(Date.now() + seconds * 1000);
      return;
    }
    setAlert(body.error ?? COUPON_COPY.failed);
  }

  function reset() {
    setValues({ name: '', email: '', category: '', message: '', trap: '' });
    setErrors({});
    setAlert(null);
    setState({ kind: 'form' });
  }

  if (state.kind === 'paused') {
    return (
      <div className="ag-focus rounded-2xl" data-state="paused" role="status" ref={statusRef} tabIndex={-1}>
        <StatusMark tone="violet" />
        <div className="mt-6">
          <PanelHeading>{COUPON_COPY.heading}</PanelHeading>
        </div>
        <p className="mt-3 text-[1.125rem] font-semibold text-ag-ink">{COUPON_COPY.paused}</p>
        {email ? (
          <>
            <p className="mt-3 text-[1rem] leading-relaxed text-ag-mist">
              You can email{' '}
              <a href={contactHref(email, SUPPORT_SUBJECT)} className={TEXT_LINK}>
                {email}
              </a>{' '}
              instead.
            </p>
            <a href={contactHref(email, SUPPORT_SUBJECT)} className={`${buttonClass('night', 'lg')} mt-8`}>
              Email support
            </a>
          </>
        ) : (
          <p className="mt-3 text-[1rem] leading-relaxed text-ag-mist">The quick fixes below cover the most common problems. Please try again a little later.</p>
        )}
      </div>
    );
  }

  if (state.kind === 'sent') {
    return (
      <div className="ag-focus rounded-2xl" data-state="sent" role="status" ref={statusRef} tabIndex={-1}>
        <StatusMark tone="gold" />
        <div className="mt-6">
          <PanelHeading>{COUPON_COPY.heading}</PanelHeading>
        </div>
        <p className="mt-3 text-[1.125rem] font-semibold text-ag-ink">{COUPON_COPY.sent(state.email)}</p>
        <p className="mt-3 text-[1rem] leading-relaxed text-ag-mist">
          If you have an account, you can also follow your requests in{' '}
          <Link href={SETTINGS_HELP_HREF} className={TEXT_LINK}>
            Settings, Help and support
          </Link>
          .
        </p>
        <button type="button" className={`${TEXT_BUTTON} mt-8`} onClick={reset}>
          Send another request
        </button>
      </div>
    );
  }

  if (signedIn && !useForm) {
    return (
      <div data-state="signed-in">
        <PanelHeading>Send a request from your account</PanelHeading>
        <p className="mt-3 text-[1rem] leading-relaxed text-ag-mist">{COUPON_COPY.signedIn}</p>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
          <Link href={SETTINGS_HELP_HREF} className={buttonClass('night', 'lg')}>
            Open Help and support
          </Link>
          <button type="button" className={TEXT_BUTTON} onClick={() => setUseForm(true)}>
            Write from this page instead
          </button>
        </div>
      </div>
    );
  }

  const sending = state.kind === 'sending';
  const waiting = waitUntil !== null;
  const inert = sending || waiting;
  const count = values.message.trim().length;
  const ids = {
    email: `support-email-${uid}`,
    name: `support-name-${uid}`,
    category: `support-category-${uid}`,
    message: `support-message-${uid}`,
  };

  return (
    <div aria-live="off">
      <PanelHeading>{COUPON_COPY.heading}</PanelHeading>
      <p className="mt-3 text-[1rem] leading-relaxed text-ag-mist">{COUPON_COPY.intro}</p>
      <form noValidate onSubmit={submit} aria-label="Support request" className="mt-8 space-y-6">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 sm:grid-cols-2">
          <FieldShell label="Your email address" htmlFor={ids.email} error={errors.email} errorId={`${ids.email}-error`}>
            <input
              ref={refs.email as Ref<HTMLInputElement>}
              id={ids.email}
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              required
              maxLength={PUBLIC_SUPPORT_EMAIL_MAX}
              value={values.email}
              readOnly={sending}
              onChange={(event) => set('email')(event.target.value)}
              onBlur={blur('email')}
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={describedBy(errors.email && `${ids.email}-error`)}
              className={controlClass(errors.email)}
            />
          </FieldShell>
          <FieldShell label="Your name (optional)" htmlFor={ids.name} errorId={`${ids.name}-error`}>
            <input
              id={ids.name}
              name="name"
              autoComplete="name"
              maxLength={PUBLIC_SUPPORT_NAME_MAX}
              value={values.name}
              readOnly={sending}
              onChange={(event) => set('name')(event.target.value)}
              className={controlClass()}
            />
          </FieldShell>
        </div>

        <SelectV2
          id={ids.category}
          label="What is it about?"
          name="category"
          placeholder="Choose one"
          options={CATEGORY_OPTIONS}
          value={values.category}
          disabled={sending}
          onChange={(value) => {
            set('category')(value);
            setErrors((current) => ({ ...current, category: undefined }));
          }}
          error={errors.category}
        />

        <FieldShell
          label="Describe the problem"
          htmlFor={ids.message}
          error={errors.message}
          errorId={`${ids.message}-error`}
          hint={COUPON_COPY.hint}
          hintId={`${ids.message}-hint`}
        >
          <textarea
            ref={refs.message as Ref<HTMLTextAreaElement>}
            id={ids.message}
            name="message"
            rows={5}
            required
            maxLength={SUPPORT_MESSAGE_MAX}
            value={values.message}
            readOnly={sending}
            onChange={(event) => set('message')(event.target.value)}
            onBlur={blur('message')}
            aria-invalid={errors.message ? true : undefined}
            aria-describedby={describedBy(errors.message && `${ids.message}-error`, `${ids.message}-hint`, `${ids.message}-count`)}
            className={`${controlClass(errors.message)} min-h-[9rem] resize-none leading-relaxed`}
          />
          <p id={`${ids.message}-count`} className="ag-num mt-2 text-right text-[0.8125rem] text-ag-mist" aria-live="off">
            {count} / {SUPPORT_MESSAGE_MAX}
          </p>
        </FieldShell>

        <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
          <label htmlFor={`support-website-${uid}`}>Leave this empty</label>
          <input
            id={`support-website-${uid}`}
            type="text"
            name={PUBLIC_SUPPORT_HONEYPOT_FIELD}
            tabIndex={-1}
            autoComplete="off"
            value={values.trap}
            onChange={(event) => set('trap')(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="submit"
            className={`${buttonClass('violet', 'lg')} w-full sm:w-auto ${inert ? 'cursor-not-allowed opacity-60' : ''}`}
            aria-disabled={inert ? true : undefined}
            aria-busy={sending ? true : undefined}
          >
            {sending ? (
              <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true" className="animate-spin motion-reduce:hidden">
                <circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2.4" />
                <path d="M17.5 10A7.5 7.5 0 0 0 10 2.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            ) : null}
            {sending ? 'Sending…' : 'Send request'}
          </button>
          <p className="text-[0.875rem] text-ag-mist">We never ask for your password.</p>
        </div>

        {alert ? (
          <p className="flex items-start gap-3 rounded-xl bg-[#C2361F]/[0.07] px-4 py-3 text-[0.9375rem] font-medium text-[#A12C18]" role="alert">
            <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true" className="mt-0.5 shrink-0 text-[#C2361F]">
              <circle cx="8" cy="8" r="8" fill="currentColor" />
              <path d="M8 4v5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="8" cy="11.6" r="1" fill="#fff" />
            </svg>
            <span>{alert}</span>
          </p>
        ) : null}
      </form>
      <p className="mt-8 border-t border-ag-ink/10 pt-6 text-[0.9375rem] leading-relaxed text-ag-mist">
        Have an account?{' '}
        <Link href={SETTINGS_HELP_HREF} className={TEXT_LINK}>
          Send it from Settings
        </Link>{' '}
        to read our replies in your AcadeGrade inbox.
      </p>
    </div>
  );
}
