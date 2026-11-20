'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { AuthShell } from '@/components/public/shells/AuthShell';
import { AuthButton, CodeField, InlineLink, PasswordField, TextButton, TextField } from '@/components/site/auth/controls';
import { isDesktopViewport, useCooldown, useShake } from '@/components/site/auth/hooks';
import { AuthNoticeLine, CooldownNotice } from '@/components/site/auth/messages';
import { StepFrame, StepProgress } from '@/components/site/auth/steps';
import {
  CHECKING_CODE,
  NO_CONNECTION,
  RESET_COPY,
  RESET_NO_CONNECTION,
  RESET_STEPS,
  formatCountdown,
  messageForOtpSend,
  messageForOtpVerifyError,
  messageForResetError,
  type AuthNotice,
} from '@/lib/public/auth-copy';

type ForgotStep = 'email' | 'otp' | 'newPassword' | 'success';

const recoveryStepNumber: Record<ForgotStep, number> = {
  email: 1,
  otp: 2,
  newPassword: 3,
  success: 3,
};

const EMAIL_PATTERN = /\S+@\S+\.\S+/;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<ForgotStep>('email');
  const [navigated, setNavigated] = useState(false);
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, startCooldown] = useCooldown();
  const [notice, setNotice] = useState<AuthNotice | null>(null);
  const [showCooldown, setShowCooldown] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const verifying = useRef(false);
  const { shake, props: shakeProps } = useShake();

  // Focus the email field on load on wide screens only; on phones the keyboard would cover the h1.
  useEffect(() => {
    if (isDesktopViewport()) emailRef.current?.focus();
  }, []);

  const goTo = useCallback((next: ForgotStep) => {
    setNotice(null);
    setShowCooldown(false);
    setNavigated(true);
    setStep(next);
  }, []);

  const handleSendOtp = useCallback(async () => {
    if (!email.trim() || !EMAIL_PATTERN.test(email)) {
      setEmailError('Enter a valid email address, like you@example.com');
      emailRef.current?.focus();
      return;
    }
    setEmailError(null);
    setNotice(null);
    setShowCooldown(false);
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), type: 'reset' }),
      });
      const data = await response.json().catch(() => ({}));
      const result = messageForOtpSend(response.ok ? 200 : response.status, data, 'reset');
      if (result.cooldown) startCooldown(result.cooldown);
      if (result.ok) {
        setOtpCode('');
        setCodeError(null);
        if (step !== 'otp') goTo('otp');
        return;
      }
      if (result.cooldownNotice) setShowCooldown(true);
      if (result.notice) setNotice(result.notice);
    } catch {
      setNotice({ tone: 'error', text: NO_CONNECTION });
    } finally {
      setIsLoading(false);
    }
  }, [email, goTo, startCooldown, step]);

  const handleVerifyOtp = useCallback(async (code: string) => {
    if (code.length !== 6) {
      setCodeError('Enter the 6 digits from the email');
      return;
    }
    if (verifying.current) return;
    verifying.current = true;
    setCodeError(null);
    setShowCooldown(false);
    setNotice(CHECKING_CODE);
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), type: 'reset', code }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setNotice(messageForOtpVerifyError(data, 'reset'));
        shake();
        // Keep the digits selected so the next key replaces them; never resend automatically.
        codeRef.current?.select();
        return;
      }
      goTo('newPassword');
    } catch {
      setNotice({ tone: 'error', text: NO_CONNECTION });
    } finally {
      verifying.current = false;
      setIsLoading(false);
    }
  }, [email, goTo, shake]);

  const handleResetPassword = useCallback(async () => {
    if (newPassword.length < 8) {
      setPasswordError('Use at least 8 characters');
      return;
    }
    setPasswordError(null);
    if (newPassword !== confirmPassword) {
      setConfirmError("The two passwords don't match");
      return;
    }
    setConfirmError(null);
    setNotice(null);
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          code: otpCode,
          newPassword,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setNotice(messageForResetError(response.status, data));
        return;
      }
      goTo('success');
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch {
      setNotice(RESET_NO_CONNECTION);
    } finally {
      setIsLoading(false);
    }
  }, [email, otpCode, newPassword, confirmPassword, goTo, router]);

  /** "Start again": the same transition step 2's "Use a different email" uses; the email is kept. */
  const startAgain = useCallback(() => {
    setOtpCode('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
    setConfirmError(null);
    goTo('email');
  }, [goTo]);

  const done = step === 'success';
  const current = recoveryStepNumber[step];
  const resendLabel = cooldown > 0 ? `Send a new code in ${formatCountdown(cooldown)}` : 'Send a new code';
  const message = showCooldown ? <CooldownNotice seconds={cooldown} /> : <AuthNoticeLine notice={notice} onAction={startAgain} />;

  return (
    <AuthShell
      title={RESET_COPY.h1}
      photo="auth.forgot"
      reassurance={RESET_COPY.reassurance}
      progress={<StepProgress steps={RESET_STEPS} current={current} done={done} label="Password recovery progress" />}
      below={
        done ? undefined : (
          <p>
            Remember it? <InlineLink href="/login">Sign in</InlineLink>
          </p>
        )
      }
    >
      {step === 'email' && (
        <StepFrame
          key="email"
          heading="Your email"
          sentence="We'll send a 6-digit code to the email on your account."
          focusOnMount={navigated}
          enter={navigated}
          formLabel="Request a verification code"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSendOtp();
          }}
        >
          <TextField
            ref={emailRef}
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            readOnly={isLoading}
            error={emailError}
            onChange={(event) => setEmail(event.target.value)}
          />
          {message}
          <AuthButton type="submit" block busy={isLoading}>
            {isLoading ? 'Sending your code…' : 'Email me a code'}
          </AuthButton>
        </StepFrame>
      )}

      {step === 'otp' && (
        <StepFrame
          key="otp"
          heading="Check your email"
          sentence={
            <>
              If that email has an account, we&apos;ve sent a 6-digit code to <strong className="font-semibold text-ag-ink">{email.trim()}</strong>. It works for
              five minutes.
            </>
          }
          focusOnMount={navigated}
          enter={navigated}
          formLabel="Verify your code"
          onSubmit={(event) => {
            event.preventDefault();
            void handleVerifyOtp(otpCode);
          }}
        >
          <div {...shakeProps}>
            <CodeField
              ref={codeRef}
              value={otpCode}
              onChange={(code) => {
                setOtpCode(code);
                if (codeError) setCodeError(null);
              }}
              onComplete={(code) => void handleVerifyOtp(code)}
              error={codeError}
            />
          </div>
          {message}
          <AuthButton type="submit" block busy={isLoading} disabled={otpCode.length !== 6}>
            {isLoading ? 'Checking…' : 'Verify code'}
          </AuthButton>
          <div className="flex flex-wrap items-center justify-between gap-x-6">
            <TextButton onClick={() => goTo('email')}>Use a different email</TextButton>
            <TextButton onClick={() => void handleSendOtp()} disabled={cooldown > 0 || isLoading}>
              {resendLabel}
            </TextButton>
          </div>
          {cooldown === 0 && navigated ? <span className="sr-only" role="status">You can ask for a new code now.</span> : null}
        </StepFrame>
      )}

      {step === 'newPassword' && (
        <StepFrame
          key="password"
          heading="Choose a new password"
          sentence="Code accepted. Use at least 8 characters. You have 15 minutes to save it."
          focusOnMount={navigated}
          enter={navigated}
          formLabel="Choose a new password"
          onSubmit={(event) => {
            event.preventDefault();
            void handleResetPassword();
          }}
        >
          <PasswordField
            label="New password"
            autoComplete="new-password"
            hint="At least 8 characters."
            value={newPassword}
            readOnly={isLoading}
            error={passwordError}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <PasswordField
            label="Type it again"
            autoComplete="new-password"
            value={confirmPassword}
            readOnly={isLoading}
            error={confirmError}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          {message}
          <AuthButton type="submit" block busy={isLoading} disabled={newPassword.length < 8}>
            {isLoading ? 'Saving…' : 'Save new password'}
          </AuthButton>
        </StepFrame>
      )}

      {done && (
        <div className="ag-step flex flex-col items-start gap-4" data-enter="true" role="status" aria-live="polite">
          <span aria-hidden="true" className="grid size-14 place-items-center rounded-2xl bg-ag-gold text-ag-night">
            <svg width="26" height="26" viewBox="0 0 26 26">
              <path d="M6.5 13.5l4.2 4.2 8.8-9.2" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <h2 className="ag-display text-[2rem] font-bold leading-[1.08] text-ag-ink">Password changed</h2>
          <p className="text-[1rem] leading-relaxed text-ag-mist">You can now sign in with your new password. Taking you to sign in…</p>
          <p>
            <InlineLink href="/login" className="inline-flex min-h-11 items-center">
              Sign in now
            </InlineLink>
          </p>
        </div>
      )}
    </AuthShell>
  );
}
