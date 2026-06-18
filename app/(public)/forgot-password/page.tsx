'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ArrowRight, Mail, Lock, Eye, EyeOff, Check, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

import { cn } from '@/lib/utils/cn';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Logo } from '@/components/ui';

type ForgotStep = 'email' | 'otp' | 'newPassword' | 'success';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  const [step, setStep] = useState<ForgotStep>('email');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Cooldown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  /* ── Step 1: Send OTP to email ── */
  const handleSendOtp = useCallback(async () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), type: 'reset' }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
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

  /* ── Step 2: Verify OTP ── */
  const handleVerifyOtp = useCallback(async () => {
    if (otpCode.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), type: 'reset', code: otpCode }),
      });
      const data = await res.json();

      if (!res.ok) {
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

  /* ── Step 3: Set new password ── */
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
      const res = await fetch('/api/auth/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          code: otpCode,
          newPassword,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to reset password');
        return;
      }

      setStep('success');
      toast.success('Password reset successfully!');

      // Auto redirect after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [email, otpCode, newPassword, confirmPassword, router]);

  const fadeUp = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 24, filter: 'blur(6px)' },
        animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
        transition: { duration: 0.4 },
      };

  return (
    <main className="min-h-screen flex items-center justify-center px-5 py-12 bg-[var(--acade-void)]">
      {/* Background glow */}
      <div
        className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, var(--acade-primary) 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      <motion.div {...fadeUp} className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="mb-6">
            <Logo href="/" size="lg" />
          </div>
          <h1 className="text-[length:var(--text-2xl)] font-bold font-[family-name:var(--font-bricolage)] text-[var(--acade-text)] text-center">
            Forgot Password
          </h1>
          <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] font-[family-name:var(--font-dm-sans)] mt-1.5 text-center">
            We&apos;ll send you a verification code to reset your password
          </p>
        </div>

        {/* Card */}
        <div
          className={cn(
            'bg-[var(--acade-deep)] border border-[var(--acade-border)] rounded-2xl p-6 md:p-8',
            'shadow-[0_0_40px_rgba(99,102,241,0.06)]'
          )}
        >
          <AnimatePresence mode="wait">
            {/* ── STEP: EMAIL ── */}
            {step === 'email' && (
              <motion.div
                key="email-step"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-4"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="size-10 rounded-full bg-[var(--acade-primary)]/10 flex items-center justify-center">
                    <Mail size={20} className="text-[var(--acade-primary)]" />
                  </div>
                  <div>
                    <h2 className="text-[length:var(--text-lg)] font-bold font-[family-name:var(--font-bricolage)] text-[var(--acade-text)]">
                      Enter Your Email
                    </h2>
                    <p className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)]">
                      We&apos;ll send a 6-digit OTP to verify you
                    </p>
                  </div>
                </div>

                <Input
                  label="Email Address"
                  type="email"
                  placeholder="you@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                />

                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={handleSendOtp}
                  disabled={isLoading}
                  className="mt-2"
                >
                  {isLoading ? 'Sending...' : 'Send Verification Code'} <ArrowRight size={18} />
                </Button>
              </motion.div>
            )}

            {/* ── STEP: OTP ── */}
            {step === 'otp' && (
              <motion.div
                key="otp-step"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-4"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="size-10 rounded-full bg-[var(--acade-primary)]/10 flex items-center justify-center">
                    <ShieldCheck size={20} className="text-[var(--acade-primary)]" />
                  </div>
                  <div>
                    <h2 className="text-[length:var(--text-lg)] font-bold font-[family-name:var(--font-bricolage)] text-[var(--acade-text)]">
                      Enter Verification Code
                    </h2>
                    <p className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)]">
                      Sent to <strong>{email}</strong>. Expires in 5 min.
                    </p>
                  </div>
                </div>

                <Input
                  label="Verification Code (OTP)"
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="text-center tracking-[0.5em] font-mono text-lg"
                  autoFocus
                />

                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={handleVerifyOtp}
                  disabled={isLoading || otpCode.length !== 6}
                  className="mt-2"
                >
                  {isLoading ? 'Verifying...' : 'Verify Code'}
                </Button>

                <div className="flex items-center justify-between mt-2">
                  <button
                    type="button"
                    onClick={() => setStep('email')}
                    className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] hover:text-white transition-colors flex items-center gap-1"
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={cooldown > 0 || isLoading}
                    className="text-[length:var(--text-sm)] text-[var(--grade-b)] hover:underline disabled:opacity-50 disabled:hover:no-underline"
                  >
                    {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP: NEW PASSWORD ── */}
            {step === 'newPassword' && (
              <motion.div
                key="password-step"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-4"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="size-10 rounded-full bg-[var(--acade-success)]/10 flex items-center justify-center">
                    <Lock size={20} className="text-[var(--acade-success)]" />
                  </div>
                  <div>
                    <h2 className="text-[length:var(--text-lg)] font-bold font-[family-name:var(--font-bricolage)] text-[var(--acade-text)]">
                      Create New Password
                    </h2>
                    <p className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)]">
                      Choose a strong password for your account
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <Input
                    label="New Password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-[38px] size-10 flex items-center justify-center text-[var(--acade-text-faint)] hover:text-[var(--acade-text)] transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <Input
                  label="Confirm Password"
                  type="password"
                  placeholder="Type password again"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />

                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={handleResetPassword}
                  disabled={isLoading || newPassword.length < 8}
                  className="mt-2"
                >
                  {isLoading ? 'Resetting...' : 'Reset Password'} <Check size={18} />
                </Button>
              </motion.div>
            )}

            {/* ── STEP: SUCCESS ── */}
            {step === 'success' && (
              <motion.div
                key="success-step"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center text-center py-10"
              >
                <div className="size-20 bg-[var(--acade-success)]/20 text-[var(--acade-success)] rounded-full flex items-center justify-center mb-6">
                  <Check size={40} />
                </div>
                <h2 className="text-[length:var(--text-2xl)] font-bold font-[family-name:var(--font-bricolage)] text-[var(--acade-text)] mb-2">
                  Password Reset!
                </h2>
                <p className="text-[length:var(--text-base)] text-[var(--acade-text-muted)] font-[family-name:var(--font-dm-sans)] max-w-sm">
                  Your password has been successfully updated. Redirecting you to login...
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {step !== 'success' && (
          <p className="text-center mt-6 text-[length:var(--text-sm)] text-[var(--acade-text-muted)] font-[family-name:var(--font-dm-sans)]">
            Remember your password?{' '}
            <Link
              href="/login"
              className="text-[var(--acade-primary)] hover:text-[var(--acade-primary-glow)] font-semibold transition-colors"
            >
              Sign in →
            </Link>
          </p>
        )}
      </motion.div>
    </main>
  );
}
