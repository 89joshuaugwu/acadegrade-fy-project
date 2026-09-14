'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Check, Lock, Mail, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

import { AuthProgress, AuthShell } from '@/components/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type ForgotStep = 'email' | 'otp' | 'newPassword' | 'success';

const recoverySteps = ['Email', 'Verify', 'New password', 'Done'] as const;

const recoveryStepNumber: Record<ForgotStep, number> = {
  email: 1,
  otp: 2,
  newPassword: 3,
  success: 4,
};

interface RecoveryStepHeaderProps {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  title: string;
  description: React.ReactNode;
  tone?: 'primary' | 'success';
}

function RecoveryStepHeader({
  icon: Icon,
  title,
  description,
  tone = 'primary',
}: RecoveryStepHeaderProps) {
  const toneClass = tone === 'success'
    ? 'bg-[var(--acade-success-dim)] text-[var(--acade-success)]'
    : 'bg-[var(--acade-primary-dim)] text-[var(--acade-primary)]';

  return (
    <div className="mb-1 flex items-start gap-3">
      <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${toneClass}`}>
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 pt-0.5">
        <h2 className="font-[family-name:var(--font-bricolage)] text-[length:var(--text-lg)] font-bold text-[var(--acade-text)]">
          {title}
        </h2>
        <p className="mt-0.5 text-[length:var(--text-xs)] leading-5 text-[var(--acade-text-muted)]">
          {description}
        </p>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const [step, setStep] = useState<ForgotStep>('email');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((previous) => previous - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSendOtp = useCallback(async () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), type: 'reset' }),
      });
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setCooldown(data.cooldownRemaining || 60);
        }
        toast.error(data.error || 'Failed to send verification code');
        return;
      }

      setStep('otp');
      setCooldown(60);
      toast.success('Verification code sent to your email!');
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [email]);

  const handleVerifyOtp = useCallback(async () => {
    if (otpCode.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), type: 'reset', code: otpCode }),
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Invalid verification code');
        return;
      }

      setStep('newPassword');
      toast.success('Code verified! Set your new password.');
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [email, otpCode]);

  const handleResetPassword = useCallback(async () => {
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

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
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to reset password');
        return;
      }

      setStep('success');
      toast.success('Password reset successfully!');

      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [email, otpCode, newPassword, confirmPassword, router]);

  const stepMotion = shouldReduceMotion
    ? {}
    : {
        initial: { x: -16, opacity: 0 },
        animate: { x: 0, opacity: 1 },
        exit: { x: 16, opacity: 0 },
        transition: { duration: 0.2 },
      };

  return (
    <AuthShell
      eyebrow="Secure account recovery"
      title="Reset your password"
      description="Verify your email, then choose a new password for your account."
      proofTitle="Recovery without losing your progress"
      proofDescription="Your academic records stay untouched while AcadeGrade verifies account ownership and updates your password."
      proofItems={[
        'A time-limited code verifies your email',
        'Your results and transcript remain unchanged',
        'Return to sign in after a successful reset',
      ]}
      support={
        step !== 'success' ? (
          <>
            Remember your password? <Link href="/login">Sign in</Link>
          </>
        ) : undefined
      }
    >
      <AuthProgress
        label="Password recovery progress"
        currentStep={recoveryStepNumber[step]}
        steps={recoverySteps}
        className="mb-7"
      />

      <AnimatePresence mode="wait" initial={false}>
        {step === 'email' && (
          <motion.form
            key="email-step"
            {...stepMotion}
            onSubmit={(event) => {
              event.preventDefault();
              void handleSendOtp();
            }}
            aria-label="Request a verification code"
            noValidate
            className="flex flex-col gap-4"
          >
            <RecoveryStepHeader
              icon={Mail}
              title="Enter your email"
              description="We’ll send a six-digit code to verify your account."
            />

            <Input
              label="Email Address"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@university.edu"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoFocus
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isLoading}
              loadingLabel="Sending code…"
              className="mt-1"
            >
              Send verification code <ArrowRight size={18} aria-hidden="true" />
            </Button>
          </motion.form>
        )}

        {step === 'otp' && (
          <motion.form
            key="otp-step"
            {...stepMotion}
            onSubmit={(event) => {
              event.preventDefault();
              void handleVerifyOtp();
            }}
            aria-label="Verify your code"
            noValidate
            className="flex flex-col gap-4"
          >
            <RecoveryStepHeader
              icon={ShieldCheck}
              title="Enter verification code"
              description={<>Sent to <strong className="font-semibold text-[var(--acade-text)]">{email}</strong>. It expires in five minutes.</>}
            />

            <Input
              label="Verification Code (OTP)"
              hint="Enter all six digits from the email."
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              value={otpCode}
              onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              className="text-center font-mono text-lg tracking-[0.45em]"
              autoFocus
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isLoading}
              loadingLabel="Verifying code…"
              disabled={otpCode.length !== 6}
              className="mt-1"
            >
              Verify code
            </Button>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStep('email')}
                className="flex min-h-12 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-[length:var(--text-sm)] font-semibold text-[var(--acade-text-muted)] transition-colors hover:bg-[var(--acade-overlay)] hover:text-[var(--acade-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]"
              >
                <ArrowLeft size={16} aria-hidden="true" /> Back
              </button>
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={cooldown > 0 || isLoading}
                className="min-h-12 cursor-pointer rounded-lg px-2 text-[length:var(--text-sm)] font-semibold text-[var(--acade-primary)] underline-offset-4 transition-colors hover:bg-[var(--acade-primary-dim)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:no-underline"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
              </button>
            </div>
          </motion.form>
        )}

        {step === 'newPassword' && (
          <motion.form
            key="password-step"
            {...stepMotion}
            onSubmit={(event) => {
              event.preventDefault();
              void handleResetPassword();
            }}
            aria-label="Choose a new password"
            noValidate
            className="flex flex-col gap-4"
          >
            <RecoveryStepHeader
              icon={Lock}
              title="Create a new password"
              description="Use at least eight characters for your account."
              tone="success"
            />

            <Input
              label="New Password"
              type="password"
              autoComplete="new-password"
              hint="Use at least eight characters."
              placeholder="Enter a new password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoFocus
            />

            <Input
              label="Confirm Password"
              type="password"
              autoComplete="new-password"
              placeholder="Type the password again"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isLoading}
              loadingLabel="Resetting password…"
              disabled={newPassword.length < 8}
              className="mt-1"
            >
              Reset password <Check size={18} aria-hidden="true" />
            </Button>
          </motion.form>
        )}

        {step === 'success' && (
          <motion.div
            key="success-step"
            initial={shouldReduceMotion ? false : { scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            role="status"
            aria-live="polite"
            className="flex flex-col items-center py-8 text-center"
          >
            <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-[var(--acade-success-dim)] text-[var(--acade-success)]">
              <Check size={38} aria-hidden="true" />
            </div>
            <h2 className="font-[family-name:var(--font-bricolage)] text-[length:var(--text-2xl)] font-bold text-[var(--acade-text)]">
              Password reset
            </h2>
            <p className="mt-2 max-w-sm text-[length:var(--text-base)] leading-6 text-[var(--acade-text-muted)]">
              Your password has been updated. Redirecting you to sign in…
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}
