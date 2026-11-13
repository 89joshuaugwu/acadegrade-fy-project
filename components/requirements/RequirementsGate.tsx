'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { Switch } from '@/components/ui/Switch';
import { cn } from '@/lib/utils/cn';
import {
  AI_CONSENT_QUESTION,
  MINOR_NOTICE,
  RECHECK_MS,
  appItems,
  consentStep,
  fetchRequirements,
  flowSteps,
  isAiSkipActive,
  onOpenRequirements,
  readPrivacyState,
  rememberAiSkip,
  submitRequirementAnswers,
  type RequirementAnswers,
  type RequirementItem,
} from '@/lib/consent/requirements';
import { RequirementsDialog } from './RequirementsDialog';

const MINOR_STEP: RequirementItem = { id: '__minor_notice', blocking: 'ai', title: 'AI features are off for now', description: MINOR_NOTICE };

const stepKey = (item: RequirementItem) => `${item.id}:${item.version ?? ''}`;
/** Steps the gate adds itself; they can be offered again each time the flow is opened on demand. */
const SYNTHETIC_KEYS = [stepKey(MINOR_STEP), stepKey(consentStep())];

const primaryButton = 'inline-flex min-h-12 items-center justify-center rounded-[var(--radius-control)] bg-[var(--acade-primary)] px-5 text-sm font-semibold text-[var(--acade-on-primary)] transition-colors hover:bg-[var(--acade-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]';
const choiceButton = 'inline-flex min-h-12 flex-1 items-center justify-center rounded-[var(--radius-control)] border border-[var(--acade-control-border)] bg-[var(--acade-deep)] px-5 text-sm font-semibold text-[var(--acade-text)] transition-colors hover:border-[var(--acade-primary)] hover:bg-[var(--acade-overlay)] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]';
const quietButton = 'inline-flex min-h-12 items-center justify-center rounded-[var(--radius-control)] px-4 text-sm font-semibold text-[var(--acade-text-muted)] transition-colors hover:bg-[var(--acade-overlay)] hover:text-[var(--acade-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]';

/**
 * "Finish setting up" for existing accounts. Mounted once in the student
 * layout. Fetches `/api/user/requirements` after sign-in and again on focus
 * after 6 hours, and never blocks the student when the endpoint fails.
 */
export function RequirementsGate() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const uid = user?.uid ?? null;
  const privacy = readPrivacyState(profile);

  const [items, setItems] = useState<RequirementItem[] | null>(null);
  const [done, setDone] = useState<Set<string>>(() => new Set());
  const [appDeferred, setAppDeferred] = useState(false);
  const [flowOpen, setFlowOpen] = useState(false);
  const [forced, setForced] = useState(false);
  const [minorNotice, setMinorNotice] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; canContinue: boolean } | null>(null);
  const [answered, setAnswered] = useState(0);
  const lastChecked = useRef(0);
  /** Mirrors flowVisible for callbacks (never read during render). */
  const flowVisibleRef = useRef(false);

  const markDone = useCallback((keys: string[]) => {
    setDone((previous) => new Set([...previous, ...keys]));
  }, []);

  const check = useCallback(async () => {
    if (!user || !uid) return;
    lastChecked.current = Date.now();
    let token: string;
    try { token = await user.getIdToken(); } catch { return; }
    const next = await fetchRequirements(token);
    if (next === null) return; // Fail open.
    setItems(next);
    if (next.some((item) => item.blocking === 'ai') && !isAiSkipActive(uid)) {
      if (!flowVisibleRef.current) setAnswered(0);
      setFlowOpen(true);
    }
  }, [uid, user]);

  useEffect(() => {
    if (uid) void check();
    // Re-run only when the signed-in account changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  useEffect(() => {
    const recheck = () => {
      if (document.visibilityState === 'hidden') return;
      if (Date.now() - lastChecked.current > RECHECK_MS) void check();
    };
    window.addEventListener('focus', recheck);
    document.addEventListener('visibilitychange', recheck);
    return () => {
      window.removeEventListener('focus', recheck);
      document.removeEventListener('visibilitychange', recheck);
    };
  }, [check]);

  useEffect(() => onOpenRequirements(({ focus }) => {
    setForced(focus === 'ai');
    setFlowOpen(true);
    setAnswered(0);
    setError(null);
    setDone((previous) => new Set([...previous].filter((key) => !SYNTHETIC_KEYS.includes(key))));
    void check();
  }), [check]);

  const pendingApp = useMemo(
    () => (appDeferred ? [] : appItems(items ?? []).filter((item) => !done.has(stepKey(item)))),
    [appDeferred, done, items]
  );

  const steps = useMemo(() => {
    const list = flowSteps(items ?? []).filter((item) => !done.has(stepKey(item)));
    if (forced && !list.some((item) => item.id === 'age' || item.id === 'ai_consent')) {
      if (privacy.ageStatus === 'minor') {
        if (!done.has(stepKey(MINOR_STEP))) list.unshift(MINOR_STEP);
      } else if (privacy.aiConsent !== true && !done.has(stepKey(consentStep()))) {
        list.unshift(consentStep());
      }
    }
    if (minorNotice && !list.includes(MINOR_STEP)) list.unshift(MINOR_STEP);
    return list;
  }, [done, forced, items, minorNotice, privacy.aiConsent, privacy.ageStatus]);

  const flowVisible = flowOpen && pendingApp.length === 0 && steps.length > 0;
  useEffect(() => { flowVisibleRef.current = flowVisible; }, [flowVisible]);

  const submit = useCallback(async (answers: RequirementAnswers, answered: RequirementItem[]) => {
    if (!user) return false;
    setBusy(true);
    setError(null);
    try {
      let token: string;
      try { token = await user.getIdToken(); } catch {
        setError({ message: 'Your session could not be confirmed. Try again shortly.', canContinue: true });
        return false;
      }
      const result = await submitRequirementAnswers(token, answers);
      if (!result.ok) {
        if (result.status === 503) {
          // Maintenance or feature switched off: never trap the student.
          setAppDeferred(true);
          setFlowOpen(false);
          return false;
        }
        if (result.code === 'VERSION_MISMATCH') void check();
        setError({ message: result.message, canContinue: result.code !== 'VERSION_MISMATCH' });
        return false;
      }
      markDone(answered.map(stepKey));
      if (result.items) setItems(result.items);
      return true;
    } finally {
      setBusy(false);
    }
  }, [check, markDone, user]);

  const finishStep = (ok: boolean) => {
    if (ok) setAnswered((count) => count + 1);
    return ok;
  };

  const skip = () => {
    if (uid) rememberAiSkip(uid);
    setFlowOpen(false);
    setForced(false);
    setMinorNotice(false);
    setError(null);
  };

  if (!uid) return null;

  if (pendingApp.length > 0) {
    return (
      <UpdatedTermsDialog
        items={pendingApp}
        busy={busy}
        error={error}
        onAgree={async () => {
          const answers: RequirementAnswers = {};
          for (const item of pendingApp) {
            if (item.id === 'terms' && item.version) answers.terms = { version: item.version };
            if (item.id === 'privacy' && item.version) answers.privacy = { version: item.version };
          }
          if (Object.keys(answers).length === 0) {
            markDone(pendingApp.map(stepKey));
            return;
          }
          const ok = await submit(answers, pendingApp);
          if (!ok) return;
          markDone(pendingApp.map(stepKey));
        }}
        onContinue={() => { setAppDeferred(true); setError(null); }}
      />
    );
  }

  if (!flowVisible) return null;

  const step = steps[0];
  const position = answered + 1;
  const count = answered + steps.length;
  const isLast = steps.length === 1;

  return (
    <FinishSetupDialog
      key={stepKey(step)}
      step={step}
      position={position}
      count={count}
      isLast={isLast}
      busy={busy}
      error={error?.message ?? null}
      onSkip={skip}
      onAge={async (status) => {
        if (finishStep(await submit({ age: status }, [step])) && status === 'minor') setMinorNotice(true);
      }}
      onConsent={(granted) => { void submit({ aiConsent: granted }, [step]).then(finishStep); }}
      onMarketing={(granted) => { void submit({ marketingConsent: granted }, [step]).then(finishStep); }}
      onAcknowledge={() => {
        if (step === MINOR_STEP) setMinorNotice(false);
        markDone([stepKey(step)]);
        finishStep(true);
      }}
    />
  );
}

function UpdatedTermsDialog({
  items,
  busy,
  error,
  onAgree,
  onContinue,
}: {
  items: RequirementItem[];
  busy: boolean;
  error: { message: string; canContinue: boolean } | null;
  onAgree: () => void;
  onContinue: () => void;
}) {
  const titleId = useId();
  const others = items.filter((item) => item.id !== 'terms' && item.id !== 'privacy');
  return (
    <RequirementsDialog titleId={titleId}>
      <div className="overflow-y-auto px-5 pb-2 pt-6 sm:px-7 sm:pt-7">
        <h2 id={titleId} className="font-[family-name:var(--font-bricolage)] text-xl font-semibold text-[var(--acade-text)]">
          Updated terms
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--acade-text-muted)]">
          We have updated the documents that cover how you use AcadeGrade and how your academic data is handled.
          Please read them, then agree to keep using your account.
        </p>
        <ul className="mt-5 divide-y divide-[var(--acade-border-subtle)] rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-deep)]">
          {[
            { href: '/terms', label: 'Terms of Use' },
            { href: '/privacy', label: 'Privacy Policy' },
          ].map((doc) => (
            <li key={doc.href}>
              <Link
                href={doc.href}
                target="_blank"
                rel="noopener"
                className="flex min-h-12 items-center justify-between gap-3 px-4 text-sm font-semibold text-[var(--acade-text)] transition-colors hover:bg-[var(--acade-overlay)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--acade-primary)]"
              >
                {doc.label}
                <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--acade-text-muted)]">
                  Opens in a new tab <ExternalLink className="size-3.5" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {others.map((item) => (
          <div key={item.id} className="mt-4">
            <h3 className="text-sm font-semibold text-[var(--acade-text)]">{item.title}</h3>
            <p className="mt-1 text-sm leading-6 text-[var(--acade-text-muted)]">{item.description}</p>
          </div>
        ))}
        {error && (
          <p role="alert" className="mt-4 rounded-[var(--radius-control)] bg-[var(--acade-danger-dim)] px-4 py-3 text-sm leading-6 text-[var(--acade-text)]">
            We could not save your agreement. {error.message}
          </p>
        )}
      </div>
      <div className="flex flex-col-reverse gap-3 px-5 pb-6 pt-4 sm:flex-row sm:justify-end sm:px-7">
        {error?.canContinue && (
          <button type="button" className={quietButton} onClick={onContinue}>Continue for now</button>
        )}
        <button type="button" data-autofocus className={primaryButton} onClick={onAgree} disabled={busy}>
          {busy ? 'Saving…' : 'I agree'}
        </button>
      </div>
    </RequirementsDialog>
  );
}

function FinishSetupDialog({
  step,
  position,
  count,
  isLast,
  busy,
  error,
  onSkip,
  onAge,
  onConsent,
  onMarketing,
  onAcknowledge,
}: {
  step: RequirementItem;
  position: number;
  count: number;
  isLast: boolean;
  busy: boolean;
  error: string | null;
  onSkip: () => void;
  onAge: (status: 'adult' | 'minor') => void;
  onConsent: (granted: boolean) => void;
  onMarketing: (granted: boolean) => void;
  onAcknowledge: () => void;
}) {
  const titleId = useId();
  const stepHeadingId = useId();
  const [age, setAge] = useState<'adult' | 'minor' | null>(null);
  const [marketing, setMarketing] = useState(false);

  let heading = step.title;
  let body: React.ReactNode = <p className="mt-2 text-sm leading-6 text-[var(--acade-text-muted)]">{step.description}</p>;
  let actions: React.ReactNode = (
    <button type="button" className={primaryButton} onClick={onAcknowledge}>{isLast ? 'Done' : 'Continue'}</button>
  );

  if (step.id === 'age') {
    heading = 'How old are you?';
    const option = (value: 'adult' | 'minor', label: string) => (
      <label
        className={cn(
          'flex min-h-14 flex-1 cursor-pointer items-center gap-3 rounded-[var(--radius-control)] border bg-[var(--acade-deep)] px-4 text-sm font-semibold text-[var(--acade-text)] transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--acade-primary)] hover:bg-[var(--acade-overlay)]',
          age === value ? 'border-[var(--acade-primary)]' : 'border-[var(--acade-control-border)]'
        )}
      >
        <input
          type="radio"
          name={`${titleId}-age`}
          value={value}
          checked={age === value}
          onChange={() => setAge(value)}
          className="size-4 accent-[var(--acade-primary)]"
        />
        {label}
      </label>
    );
    body = (
      <>
        <p className="mt-2 text-sm leading-6 text-[var(--acade-text-muted)]">{step.description}</p>
        <div role="radiogroup" aria-labelledby={stepHeadingId} className="mt-5 flex flex-col gap-3 sm:flex-row">
          {option('adult', "I'm 18 or older")}
          {option('minor', "I'm under 18")}
        </div>
      </>
    );
    actions = (
      <button type="button" className={primaryButton} disabled={!age || busy} onClick={() => age && onAge(age)}>
        {busy ? 'Saving…' : 'Continue'}
      </button>
    );
  } else if (step.id === 'ai_consent') {
    heading = 'AI analysis and result scanning';
    body = (
      <>
        <p className="mt-2 text-base leading-7 text-[var(--acade-text)]">{AI_CONSENT_QUESTION}</p>
        {step.description && <p className="mt-3 text-sm leading-6 text-[var(--acade-text-muted)]">{step.description}</p>}
        <p className="mt-3 text-sm leading-6 text-[var(--acade-text-muted)]">
          You can change this at any time in Settings, under Privacy &amp; AI choices.
        </p>
      </>
    );
    actions = (
      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <button type="button" className={choiceButton} disabled={busy} onClick={() => onConsent(false)}>Not now</button>
        <button type="button" className={choiceButton} disabled={busy} onClick={() => onConsent(true)}>Allow</button>
      </div>
    );
  } else if (step.id === 'marketing_consent') {
    heading = 'Product news (optional)';
    body = (
      <>
        <p className="mt-2 text-sm leading-6 text-[var(--acade-text-muted)]">{step.description}</p>
        <div className="mt-5 flex min-h-14 items-center justify-between gap-4 rounded-[var(--radius-control)] border border-[var(--acade-border)] bg-[var(--acade-deep)] pl-4">
          <span id={`${titleId}-news`} className="text-sm font-semibold text-[var(--acade-text)]">Email me occasional product news</span>
          <Switch aria-labelledby={`${titleId}-news`} checked={marketing} onCheckedChange={setMarketing} />
        </div>
      </>
    );
    actions = (
      <button type="button" className={primaryButton} disabled={busy} onClick={() => onMarketing(marketing)}>
        {busy ? 'Saving…' : isLast ? 'Finish' : 'Continue'}
      </button>
    );
  }

  return (
    <RequirementsDialog titleId={titleId} onEscape={onSkip}>
      <div className="overflow-y-auto px-5 pb-2 pt-6 sm:px-7 sm:pt-7">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id={titleId} className="font-[family-name:var(--font-bricolage)] text-xl font-semibold text-[var(--acade-text)]">
            Finish setting up
          </h2>
          {count > 1 && (
            <span className="shrink-0 text-xs font-medium tabular-nums text-[var(--acade-text-muted)]">
              Step {position} of {count}
            </span>
          )}
        </div>
        {count > 1 && (
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-[var(--acade-overlay)]" aria-hidden="true">
            <div className="h-full rounded-full bg-[var(--acade-primary)] transition-[width] duration-300" style={{ width: `${(position / count) * 100}%` }} />
          </div>
        )}
        <h3 id={stepHeadingId} tabIndex={-1} data-autofocus className="mt-6 text-base font-semibold text-[var(--acade-text)] focus:outline-none">
          {heading}
        </h3>
        {body}
        {error && (
          <p role="alert" className="mt-4 rounded-[var(--radius-control)] bg-[var(--acade-danger-dim)] px-4 py-3 text-sm leading-6 text-[var(--acade-text)]">
            {error}
          </p>
        )}
      </div>
      <div className="flex flex-col-reverse gap-3 px-5 pb-6 pt-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <button type="button" className={quietButton} onClick={onSkip}>Skip for now</button>
        {actions}
      </div>
    </RequirementsDialog>
  );
}
