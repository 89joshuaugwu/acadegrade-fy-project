import { describe, expect, it } from 'vitest';
import {
  formatCountdown,
  handoffLine,
  messageForFinalizeError,
  messageForGoogleError,
  messageForOtpSend,
  messageForOtpVerifyError,
  messageForResetError,
  messageForSignInError,
  programmeYears,
  timelineLine,
} from '@/lib/public/auth-copy';

function firebaseError(code: string) {
  return Object.assign(new Error(`Firebase: Error (${code}).`), { code });
}

describe('sign-in messages', () => {
  it('says the email and password do not match for invalid credentials, with a reset link', () => {
    const notice = messageForSignInError(firebaseError('auth/invalid-credential'));
    expect(notice).toMatchObject({ tone: 'error', text: "That email and password don't match. Check both, or reset your password." });
    expect(notice.link).toEqual({ href: '/forgot-password', label: 'reset your password' });
    expect(notice.text).toContain(notice.link!.label);
  });

  it('gives specific lines for too many tries and no connection', () => {
    expect(messageForSignInError(firebaseError('auth/too-many-requests')).text).toBe('Too many tries. Wait a few minutes, or reset your password.');
    expect(messageForSignInError(firebaseError('auth/network-request-failed')).text).toBe('No connection. Check your data and try again.');
    expect(messageForSignInError(new Error('boom')).text).toBe("We couldn't sign you in. Please try again.");
  });

  it('treats a closed Google popup as neutral and other Google failures as errors', () => {
    expect(messageForGoogleError(firebaseError('auth/popup-closed-by-user'))).toEqual({ tone: 'neutral', text: 'Google sign-in was closed before it finished.' });
    expect(messageForGoogleError(firebaseError('auth/popup-blocked')).tone).toBe('error');
    expect(messageForGoogleError(new Error('x')).text).toBe("Google sign-in didn't work. Try again, or use your email.");
  });
});

describe('code send messages', () => {
  it('moves on after a 200 with a 60-second cooldown', () => {
    expect(messageForOtpSend(200, {}, 'reset')).toEqual({ ok: true, cooldown: 60 });
  });

  it('points an existing registration email to sign in', () => {
    const result = messageForOtpSend(400, { error: 'Email already registered' }, 'registration');
    expect(result.notice?.text).toBe('This email already has an AcadeGrade account. Sign in instead.');
    expect(result.notice?.link).toEqual({ href: '/login', label: 'Sign in' });
  });

  it('switches to the paused screen on 403 and starts the countdown on 429', () => {
    expect(messageForOtpSend(403, { error: 'paused' }, 'registration')).toMatchObject({ paused: true });
    expect(messageForOtpSend(429, { cooldownRemaining: 42 }, 'reset')).toMatchObject({ cooldown: 42, cooldownNotice: true });
    expect(messageForOtpSend(429, {}, 'reset')).toMatchObject({ cooldown: 60 });
  });

  it('explains delivery and other failures', () => {
    expect(messageForOtpSend(502, {}, 'reset').notice?.text).toBe("We couldn't send the email just now. Try again in a minute.");
    expect(messageForOtpSend(500, {}, 'registration').notice?.text).toBe("We couldn't send your code. Please try again.");
    expect(messageForOtpSend(400, { error: 'Enter a valid email address' }, 'reset').notice?.text).toBe('Enter a valid email address, like you@example.com');
  });

  it('formats the countdown as minutes and seconds', () => {
    expect(formatCountdown(42)).toBe('0:42');
    expect(formatCountdown(60)).toBe('1:00');
    expect(formatCountdown(5)).toBe('0:05');
    expect(formatCountdown(-3)).toBe('0:00');
  });
});

describe('code check messages', () => {
  it('maps each server answer to a plain sentence', () => {
    expect(messageForOtpVerifyError({ error: 'Invalid OTP' }, 'reset').text).toBe("That code isn't right. Check the latest email from AcadeGrade.");
    expect(messageForOtpVerifyError({ error: 'OTP expired' }, 'reset').text).toBe('That code has expired. Send a new one.');
    expect(messageForOtpVerifyError({ error: 'OTP already used' }, 'registration').text).toBe('That code was already used. Send a new one.');
    expect(messageForOtpVerifyError({ error: 'Too many failed attempts. Please request a new OTP.' }, 'reset').text).toBe('Too many wrong tries. Send a new code.');
    expect(messageForOtpVerifyError({}, 'reset').text).toBe("We couldn't check the code. Please try again.");
  });
});

describe('password reset messages', () => {
  it('offers Start again when the reset session has ended', () => {
    const expired = messageForResetError(400, { error: 'Reset session expired. Please request a new code.' });
    expect(expired.text).toBe('This reset took longer than 15 minutes. Start again to get a new code.');
    expect(expired.action).toBe('start-again');
    expect(messageForResetError(400, { error: 'OTP Expired' }).action).toBe('start-again');
    const invalid = messageForResetError(400, { error: 'Invalid OTP code' });
    expect(invalid.text).toBe("This reset can't be finished. Start again to get a new code.");
    expect(invalid.action).toBe('start-again');
  });

  it('sends a vanished account to Support and keeps other failures generic', () => {
    expect(messageForResetError(404, { error: 'User not found' }).link).toEqual({ href: '/support', label: 'Contact Support' });
    expect(messageForResetError(500, {}).text).toBe("We couldn't save your password. Please try again.");
  });
});

describe('finalize messages', () => {
  it('maps every finalize code from the plan', () => {
    expect(messageForFinalizeError('verification-expired').text).toMatch(/^Your email check timed out/);
    expect(messageForFinalizeError('verification-mismatch').text).toBe('That code was for a different email. Get a new code for this one.');
    expect(messageForFinalizeError('matric-in-use').link).toEqual({ href: '/support', label: 'contact Support' });
    expect(messageForFinalizeError('email-in-use').link).toEqual({ href: '/login', label: 'Sign in instead' });
    for (const code of ['google-session-expired', 'google-provider-required', 'google-email-mismatch']) {
      expect(messageForFinalizeError(code).text).toBe('Your Google sign-in timed out. Continue with Google again.');
    }
    expect(messageForFinalizeError('setup-complete').link?.href).toBe('/dashboard');
    expect(messageForFinalizeError('invalid-timeline').text).toBe("Your past semesters don't line up with the session you started. Check them again.");
    expect(messageForFinalizeError('invalid-registration-data', 'Matric number is too long').text).toBe('Matric number is too long');
    expect(messageForFinalizeError(undefined).text).toBe("We couldn't create your account. Your answers are kept; please try again.");
  });
});

describe('calculator handoff line', () => {
  it('counts the courses and says they live in this tab', () => {
    expect(handoffLine(5, 'login')).toBe('Your 5 calculator courses are kept in this browser tab. After you sign in, add them as your first semester from Results.');
    expect(handoffLine(1, 'login')).toBe('Your calculator course is kept in this browser tab. After you sign in, add it as your first semester from Results.');
    expect(handoffLine(3, 'register')).toBe('Your 3 calculator courses are kept in this browser tab. After you finish, add them as your first semester from Results.');
  });
});

describe('register timeline line (direct-entry fix)', () => {
  it('counts the years from the entry level', () => {
    expect(programmeYears(4, 100)).toBe(4);
    expect(programmeYears(4, 200)).toBe(3);
    expect(programmeYears(5, 300)).toBe(3);
  });

  it('gives the right final year for a 100L student', () => {
    expect(timelineLine({ entrySession: '2022/2023', entryLevel: 100, currentLevel: 300, courseDuration: 4 }))
      .toBe('Started 2022/2023 in 100L, now 300L, final year 2025/2026');
  });

  it('does not add the skipped years for direct entry', () => {
    // A 200L entrant on a 4-year programme has three years: 2022/2023 to 2024/2025.
    expect(timelineLine({ entrySession: '2022/2023', entryLevel: 200, currentLevel: 300, courseDuration: 4 }))
      .toBe('Started 2022/2023 in 200L, now 300L, final year 2024/2025');
    expect(timelineLine({ entrySession: '2022/2023', entryLevel: 300, currentLevel: 300, courseDuration: 4 }))
      .toBe('Started 2022/2023 in 300L, now 300L, final year 2023/2024');
  });

  it('is empty until the session is valid', () => {
    expect(timelineLine({ entrySession: '2022', entryLevel: 100, currentLevel: 100, courseDuration: 4 })).toBe('');
  });
});
