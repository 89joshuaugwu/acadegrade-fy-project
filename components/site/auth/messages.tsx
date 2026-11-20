'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { readCalculatorHandoff } from '@/lib/handoff/calculator';
import { COOLDOWN_LEAD, START_AGAIN_LABEL, cooldownTail, handoffLine, type AuthNotice } from '@/lib/public/auth-copy';
import { ErrorIcon, InlineLink } from './controls';

export type AuthMessageTone = 'error' | 'neutral' | 'status';

const TONE: Record<AuthMessageTone, string> = {
  error: 'bg-[#C2361F]/[0.07] text-[#9F2B17]',
  neutral: 'bg-ag-haze text-ag-ink',
  status: 'bg-ag-haze text-ag-ink',
};

/**
 * The single message above a form's primary action. Errors carry the icon
 * and role="alert"; neutral and status lines are polite (role="status").
 * Inline links go in children.
 */
export function AuthMessage({ tone, children, id, className = '' }: { tone: AuthMessageTone; children: ReactNode; id?: string; className?: string }) {
  return (
    <p id={id} role={tone === 'error' ? 'alert' : 'status'} data-tone={tone} className={`flex items-start gap-2.5 rounded-xl px-4 py-3 text-[0.9375rem] leading-snug ${TONE[tone]} ${className}`}>
      {tone === 'error' ? <ErrorIcon className="mt-[2px] text-[#C2361F]" /> : null}
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/** Splits `text` around `label` once; null when the label is missing. */
function around(text: string, label: string): [string, string] | null {
  const at = text.indexOf(label);
  return at < 0 ? null : [text.slice(0, at), text.slice(at + label.length)];
}

/**
 * One message sentence from lib/public/auth-copy with its link or action set
 * inside the words ("…or reset your password.").
 */
export function AuthNoticeLine({
  notice,
  onAction,
  className,
}: {
  notice: AuthNotice | null | undefined;
  /** Runs the sentence's in-page action ("Start again"). */
  onAction?: (action: NonNullable<AuthNotice['action']>) => void;
  className?: string;
}) {
  if (!notice) return null;
  let body: ReactNode = notice.text;
  if (notice.link) {
    const parts = around(notice.text, notice.link.label);
    if (parts) {
      body = (
        <>
          {parts[0]}
          <InlineLink href={notice.link.href} tone={notice.tone === 'error' ? 'inherit' : 'violet'}>
            {notice.link.label}
          </InlineLink>
          {parts[1]}
        </>
      );
    }
  } else if (notice.action && onAction) {
    const action = notice.action;
    const parts = around(notice.text, START_AGAIN_LABEL);
    if (parts) {
      body = (
        <>
          {parts[0]}
          <button
            type="button"
            className="ag-focus inline rounded font-semibold underline decoration-current/40 underline-offset-4 hover:decoration-current"
            onClick={() => onAction(action)}
          >
            {START_AGAIN_LABEL}
          </button>
          {parts[1]}
        </>
      );
    }
  }
  return (
    <AuthMessage tone={notice.tone} className={className}>
      {body}
    </AuthMessage>
  );
}

/**
 * "You asked for a code a moment ago. You can ask again in 0:42." The
 * countdown ticks visibly but is hidden from screen readers until it ends,
 * when the line becomes a polite "You can ask for a new code now."
 */
export function CooldownNotice({ seconds }: { seconds: number }) {
  const waiting = seconds > 0;
  return (
    <AuthMessage tone={waiting ? 'error' : 'status'}>
      {COOLDOWN_LEAD} <span aria-hidden={waiting ? true : undefined}>{cooldownTail(seconds)}</span>
    </AuthMessage>
  );
}

/**
 * The form's place while the page checks the sign-in or routes a signed-in
 * student: quiet blocks at field height (no shimmer) and one polite line.
 */
export function AuthPending({ text, bars = true }: { text: string; bars?: boolean }) {
  return (
    <div className="flex flex-col gap-5">
      {bars ? (
        <div className="flex flex-col gap-4" aria-hidden="true">
          <span className="block h-[3.25rem] rounded-xl bg-ag-haze" />
          <span className="block h-[3.25rem] rounded-xl bg-ag-haze" />
          <span className="block h-[3.25rem] rounded-xl bg-ag-ink/[0.06]" />
        </div>
      ) : null}
      <AuthMessage tone="status">{text}</AuthMessage>
    </div>
  );
}

/**
 * Tells a visitor from the calculator that their courses are waiting. The
 * handoff lives in sessionStorage (this tab only, 24 hours), so it is read
 * once after mount; nothing renders without one.
 */
export function HandoffNote({ flow }: { flow: 'login' | 'register' }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // sessionStorage is only readable after mount; read once.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCount(readCalculatorHandoff()?.courses.length ?? 0);
  }, []);

  if (count === 0) return null;
  return (
    <p role="status" className="flex items-start gap-3 rounded-2xl bg-ag-gold/15 px-4 py-3.5 text-[0.9375rem] leading-snug text-ag-ink">
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" className="mt-px shrink-0 text-[#B86E00]">
        <rect x="3" y="2.5" width="14" height="15" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M6.5 7h7M6.5 10h7M6.5 13h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <span>{handoffLine(count, flow)}</span>
    </p>
  );
}
