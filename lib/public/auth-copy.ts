/**
 * Copy and message maps for sign in, create account and reset password
 * (docs/public-redesign/pages/login.md, register.md, forgot-password.md).
 * One source, so the pages and their tests agree. Pure: no React, no
 * Firebase. Every message replaces a toast with one inline sentence.
 */

import { formatAcademicSession, parseAcademicSession } from '@/lib/academic/timeline';

export type AuthNoticeTone = 'error' | 'neutral' | 'status';

export interface AuthNotice {
  tone: AuthNoticeTone;
  text: string;
  /** A link inside the sentence; `label` appears in `text` exactly once. */
  link?: { href: string; label: string };
  /** An in-page action inside the sentence (reset password's "Start again"). */
  action?: 'start-again';
}

export const START_AGAIN_LABEL = 'Start again';

/* ------------------------------------------------------------- shared copy */

export const NO_CONNECTION = 'No connection. Check your data and try again.';
export const CHECKING_SIGN_IN = 'Checking your sign-in…';

export const LOGIN_COPY = {
  title: 'Sign in',
  description: 'Sign in to AcadeGrade to see your GPA, CGPA and degree class.',
  h1: 'Welcome back',
  sentence: 'Sign in to see your record and pick up where you left off.',
  reassurance: 'Signing in never changes your saved results.',
  divider: 'or sign in with email',
  routing: 'Opening your record…',
} as const;

export const REGISTER_COPY = {
  title: 'Create your account',
  description: 'Create a free AcadeGrade record for your GPA, CGPA and degree class.',
  h1: 'Create your free record',
  reassurance: 'Your record stays private. You decide who sees it.',
  draftLine: 'Your answers stay in this tab until you finish. Passwords are never stored.',
  restoredGoogle: 'We kept your answers from earlier in this tab.',
  restoredEmail: 'We kept your answers from earlier in this tab. Enter your password again to get a new code.',
  divider: 'or use your email',
  routing: 'Opening your dashboard…',
} as const;

export const RESET_COPY = {
  title: 'Reset your password',
  description: 'Reset your AcadeGrade password with a code sent to your email.',
  h1: 'Reset your password',
  reassurance: 'Resetting your password never changes your results.',
} as const;

/** Step names: the step line and the screen-reader progress list. */
export const REGISTER_STEPS_WITH_PAST = ['Your account', 'Where you study', 'Your record', 'Past semesters'] as const;
export const REGISTER_STEPS_FRESH = ['Your account', 'Where you study', 'Your record'] as const;
export const RESET_STEPS = ['Your email', 'The code', 'New password'] as const;

/* ------------------------------------------------------------- sign in */

function errorCode(err: unknown): string {
  if (err && typeof err === 'object') {
    const code = (err as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return '';
}

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : typeof err === 'string' ? err : '';
}

/** Email sign-in failures (login.md §4). The "invalid" trigger is today's. */
export function messageForSignInError(err: unknown): AuthNotice {
  const code = errorCode(err);
  const message = errorText(err);
  const has = (value: string) => code === value || message.includes(value);
  if (has('auth/too-many-requests')) {
    return { tone: 'error', text: 'Too many tries. Wait a few minutes, or reset your password.', link: { href: '/forgot-password', label: 'reset your password' } };
  }
  if (has('auth/network-request-failed')) return { tone: 'error', text: NO_CONNECTION };
  if (message.includes('invalid') || has('auth/wrong-password') || has('auth/user-not-found')) {
    return {
      tone: 'error',
      text: "That email and password don't match. Check both, or reset your password.",
      link: { href: '/forgot-password', label: 'reset your password' },
    };
  }
  return { tone: 'error', text: "We couldn't sign you in. Please try again." };
}

/** Google failures. A closed popup is neutral; a blocked one is an error. */
export function messageForGoogleError(err: unknown): AuthNotice {
  const code = errorCode(err);
  const message = errorText(err);
  if (code === 'auth/popup-blocked' || message.includes('auth/popup-blocked')) {
    return { tone: 'error', text: "Google sign-in didn't work. Try again, or use your email." };
  }
  if (message.includes('popup') || code.includes('popup') || code === 'auth/cancelled-popup-request') {
    return { tone: 'neutral', text: 'Google sign-in was closed before it finished.' };
  }
  if (code === 'auth/network-request-failed') return { tone: 'error', text: NO_CONNECTION };
  return { tone: 'error', text: "Google sign-in didn't work. Try again, or use your email." };
}

/** True when Firebase reports the Google popup was closed by the student. */
export function isPopupClosed(err: unknown): boolean {
  return errorCode(err) === 'auth/popup-closed-by-user';
}

/* ------------------------------------------------------------- codes */

export type OtpFlow = 'registration' | 'reset';

export interface OtpSendResult {
  ok?: boolean;
  /** Seconds before another code may be asked for. */
  cooldown?: number;
  /** Show the live "You can ask again in 0:42" line. */
  cooldownNotice?: boolean;
  /** Registration is paused (403): show the paused screen. */
  paused?: boolean;
  notice?: AuthNotice;
}

interface ServerBody {
  error?: unknown;
  cooldownRemaining?: unknown;
  code?: unknown;
}

function bodyError(body: unknown): string {
  const error = (body as ServerBody | null | undefined)?.error;
  return typeof error === 'string' ? error : '';
}

/** POST /api/auth/otp/send answers (register.md §5.2, forgot-password.md §5.1). */
export function messageForOtpSend(status: number, body: unknown, flow: OtpFlow): OtpSendResult {
  if (status >= 200 && status < 300) return { ok: true, cooldown: 60 };
  const error = bodyError(body);
  if (status === 429) {
    const remaining = Number((body as ServerBody | null | undefined)?.cooldownRemaining);
    return { cooldown: Number.isFinite(remaining) && remaining > 0 ? Math.ceil(remaining) : 60, cooldownNotice: true };
  }
  if (status === 403 && flow === 'registration') return { paused: true };
  if (status === 400 && error === 'Email already registered') {
    return {
      notice: {
        tone: 'error',
        text: 'This email already has an AcadeGrade account. Sign in instead.',
        link: { href: '/login', label: 'Sign in' },
      },
    };
  }
  if (status === 400 && error === 'Enter a valid email address') {
    return { notice: { tone: 'error', text: 'Enter a valid email address, like you@example.com' } };
  }
  if (status === 502) return { notice: { tone: 'error', text: "We couldn't send the email just now. Try again in a minute." } };
  return { notice: { tone: 'error', text: "We couldn't send your code. Please try again." } };
}

/** "0:42". Never negative. */
export function formatCountdown(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`; // taste-skill-ignore: a clock, not a list number
}

export const COOLDOWN_LEAD = 'You asked for a code a moment ago.';
export function cooldownTail(seconds: number): string {
  return seconds > 0 ? `You can ask again in ${formatCountdown(seconds)}.` : 'You can ask for a new code now.';
}

/** POST /api/auth/otp/verify failures. */
export function messageForOtpVerifyError(body: unknown, _flow: OtpFlow): AuthNotice {
  const error = bodyError(body);
  if (error === 'Invalid OTP' || error === 'Invalid verification details') {
    return { tone: 'error', text: "That code isn't right. Check the latest email from AcadeGrade." };
  }
  if (error === 'OTP expired') return { tone: 'error', text: 'That code has expired. Send a new one.' };
  if (error === 'OTP already used') return { tone: 'error', text: 'That code was already used. Send a new one.' };
  if (error.startsWith('Too many failed attempts')) return { tone: 'error', text: 'Too many wrong tries. Send a new code.' };
  return { tone: 'error', text: "We couldn't check the code. Please try again." };
}

export const VERIFY_UNSECURED: AuthNotice = { tone: 'error', text: "We couldn't secure the check. Send a new code." };
export const CHECKING_CODE: AuthNotice = { tone: 'status', text: 'Checking your code…' };

/* ------------------------------------------------------------- reset */

/** POST /api/auth/password/reset failures (forgot-password.md §5.3). */
export function messageForResetError(status: number, body: unknown): AuthNotice {
  const error = bodyError(body);
  if (error === 'Reset session expired. Please request a new code.' || error === 'OTP Expired') {
    return { tone: 'error', text: 'This reset took longer than 15 minutes. Start again to get a new code.', action: 'start-again' };
  }
  if (error === 'Invalid OTP code' || error === 'Invalid or expired reset session') {
    return { tone: 'error', text: "This reset can't be finished. Start again to get a new code.", action: 'start-again' };
  }
  if (status === 404) {
    return { tone: 'error', text: "We couldn't find that account any more. Contact Support.", link: { href: '/support', label: 'Contact Support' } };
  }
  if (error === 'Password must be at least 8 characters') return { tone: 'error', text: 'Use at least 8 characters' };
  return { tone: 'error', text: "We couldn't save your password. Please try again." };
}

export const RESET_NO_CONNECTION: AuthNotice = { tone: 'error', text: "No connection. Your new password isn't saved yet; try again." };

/* ------------------------------------------------------------- register */

/** /api/auth/register/finalize failures, inline at the button (register.md §5.10). */
export function messageForFinalizeError(code: string | undefined, serverMessage?: string): AuthNotice {
  switch (code) {
    case 'verification-expired':
      return { tone: 'error', text: 'Your email check timed out while you were filling this in. Get a new code; your other answers are kept.' };
    case 'verification-mismatch':
      return { tone: 'error', text: 'That code was for a different email. Get a new code for this one.' };
    case 'matric-in-use':
      return {
        tone: 'error',
        text: 'That matric number is already linked to another account. Go back to Your account to check it, or contact Support.',
        link: { href: '/support', label: 'contact Support' },
      };
    case 'email-in-use':
      return { tone: 'error', text: 'An account with this email already exists. Sign in instead.', link: { href: '/login', label: 'Sign in instead' } };
    case 'google-session-expired':
    case 'google-provider-required':
    case 'google-email-mismatch':
      return { tone: 'error', text: 'Your Google sign-in timed out. Continue with Google again.' };
    case 'setup-complete':
      return { tone: 'error', text: 'This account is already set up. Open your dashboard.', link: { href: '/dashboard', label: 'Open your dashboard' } };
    case 'invalid-timeline':
      return { tone: 'error', text: "Your past semesters don't line up with the session you started. Check them again." };
    case 'invalid-registration-data':
    case 'account-mismatch':
      if (serverMessage) return { tone: 'error', text: serverMessage };
      break;
    default:
      break;
  }
  return { tone: 'error', text: "We couldn't create your account. Your answers are kept; please try again." };
}

export const REGISTER_REVIEW: AuthNotice = { tone: 'error', text: 'Some details need checking.' };
export const REGISTER_CHECK_ENDED: AuthNotice = { tone: 'error', text: 'Your email check has ended. Get a new code to finish.' };
export const GOOGLE_SESSION_ENDED = 'Your Google sign-in timed out. Continue with Google again.';

/** The calculator handoff stub (login.md §4, register.md §3). */
export function handoffLine(count: number, flow: 'login' | 'register'): string {
  const after = flow === 'login' ? 'After you sign in' : 'After you finish';
  if (count === 1) return `Your calculator course is kept in this browser tab. ${after}, add it as your first semester from Results.`;
  return `Your ${count} calculator courses are kept in this browser tab. ${after}, add them as your first semester from Results.`;
}

/** Years on the programme from the entry level: duration - (entryLevel / 100 - 1), at least 1. */
export function programmeYears(courseDuration: number, entryLevel = 100): number {
  return Math.max(1, (courseDuration || 4) - (entryLevel / 100 - 1));
}

/**
 * "Started 2022/2023 in 100L, now 300L, final year 2025/2026". The final
 * year counts the programme's years from the entry level, so a direct-entry
 * student is not shown one or two years too late (owner decision C13).
 */
export function timelineLine({
  entrySession,
  entryLevel = 100,
  currentLevel,
  courseDuration,
}: {
  entrySession: string;
  entryLevel?: number;
  currentLevel?: number;
  courseDuration: number;
}): string {
  const start = parseAcademicSession(entrySession);
  if (start === null) return '';
  const finalYear = formatAcademicSession(start + programmeYears(courseDuration, entryLevel) - 1);
  const now = currentLevel ? `, now ${currentLevel}L` : '';
  return `Started ${formatAcademicSession(start)} in ${entryLevel}L${now}, final year ${finalYear}`;
}
