'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

import { cn } from '@/lib/utils/cn';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useAuth } from '@/hooks/useAuth';
import { signInWithEmail, signInWithGoogle, resetPassword } from '@/lib/firebase/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Logo } from '@/components/ui';

/* ─── Validation Schema ─── */
const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

/* ─── Google Icon (inline SVG) ─── */
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

/* ════════════════════════════════════════════════════
   LOGIN PAGE
   ════════════════════════════════════════════════════ */
export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const shouldReduceMotion = useReducedMotion();

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [shakeForm, setShakeForm] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormData>();

  /* ── Email/Password Sign In ── */
  const onSubmit = useCallback(
    async (data: LoginFormData) => {
      setIsSubmitting(true);
      try {
        await signInWithEmail(data.email, data.password);
        toast.success('Welcome back!');
        router.push('/dashboard');
      } catch (err: unknown) {
        const msg =
          err instanceof Error && err.message.includes('invalid')
            ? 'Invalid email or password'
            : 'Something went wrong. Please try again.';
        setError('root', { message: msg });
        setShakeForm(true);
        setTimeout(() => setShakeForm(false), 600);
        toast.error(msg);
      } finally {
        setIsSubmitting(false);
      }
    },
    [router, setError]
  );

  /* ── Google Sign In ── */
  const handleGoogleSignIn = useCallback(async () => {
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      toast.success('Welcome!');
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg =
        err instanceof Error && err.message.includes('popup')
          ? 'Sign-in popup was closed'
          : 'Google sign-in failed. Please try again.';
      toast.error(msg);
    } finally {
      setIsGoogleLoading(false);
    }
  }, [router]);

  /* ── Password Reset ── */
  const handlePasswordReset = useCallback(async () => {
    if (!resetEmail.trim()) {
      toast.error('Enter your email address');
      return;
    }
    setResetLoading(true);
    try {
      await resetPassword(resetEmail.trim());
      toast.success('Reset link sent! Check your inbox.');
      setShowResetModal(false);
      setResetEmail('');
    } catch {
      toast.error('Could not send reset email. Check the address.');
    } finally {
      setResetLoading(false);
    }
  }, [resetEmail]);

  // Show nothing while checking auth state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--acade-void)]">
        <div className="size-10 rounded-full border-2 border-[var(--acade-primary)] border-t-transparent animate-spin" />
      </div>
    );
  }

  // Already logged in — waiting for redirect
  if (user) return null;

  const fadeUp = shouldReduceMotion
    ? {}
    : { initial: { opacity: 0, y: 24, filter: 'blur(6px)' }, animate: { opacity: 1, y: 0, filter: 'blur(0px)' }, transition: { duration: 0.4 } };

  return (
    <main className="min-h-screen flex items-center justify-center px-5 py-12 bg-[var(--acade-void)]">
      {/* Background glow */}
      <div
        className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, var(--acade-primary) 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      <motion.div
        {...fadeUp}
        className="relative w-full max-w-md"
      >
        {/* Logo + Title */}
        <div className="flex flex-col items-center mb-8">
          <div className="mb-6">
            <Logo href="/" size="lg" />
          </div>
          <h1 className="text-[length:var(--text-2xl)] font-bold font-[family-name:var(--font-bricolage)] text-[var(--acade-text)] text-center">
            Welcome Back
          </h1>
          <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] font-[family-name:var(--font-dm-sans)] mt-1.5">
            Sign in to continue tracking your academic progress
          </p>
        </div>

        {/* Card */}
        <motion.div
          animate={shakeForm && !shouldReduceMotion ? { x: [0, -8, 8, -5, 5, -2, 2, 0] } : {}}
          transition={{ duration: 0.5 }}
          className={cn(
            'bg-[var(--acade-deep)] border border-[var(--acade-border)] rounded-2xl p-6 md:p-8',
            'shadow-[0_0_40px_rgba(99,102,241,0.06)]'
          )}
        >
          {/* Google Sign-In */}
          <Button
            variant="outline"
            size="md"
            fullWidth
            loading={isGoogleLoading}
            onClick={handleGoogleSignIn}
            className="mb-5"
          >
            <GoogleIcon />
            Continue with Google
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-[var(--acade-border)]" />
            <span className="text-[length:var(--text-xs)] text-[var(--acade-text-faint)] font-[family-name:var(--font-dm-sans)] uppercase tracking-wider">
              or
            </span>
            <div className="flex-1 h-px bg-[var(--acade-border)]" />
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="you@university.edu"
              error={errors.email?.message}
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' },
              })}
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                error={errors.password?.message}
                {...register('password', { required: 'Password is required' })}
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

            {/* Forgot password */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="text-[length:var(--text-sm)] text-[var(--acade-primary)] hover:text-[var(--acade-primary-glow)] transition-colors font-[family-name:var(--font-dm-sans)] h-10 flex items-center"
              >
                Forgot password?
              </button>
            </div>

            {/* Root error */}
            <AnimatePresence>
              {errors.root && (
                <motion.p
                  initial={shouldReduceMotion ? {} : { opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                  className="text-[length:var(--text-sm)] text-[var(--acade-danger)] font-[family-name:var(--font-dm-sans)] text-center"
                >
                  {errors.root.message}
                </motion.p>
              )}
            </AnimatePresence>

            <Button type="submit" variant="primary" size="lg" fullWidth loading={isSubmitting}>
              Sign In <ArrowRight size={18} />
            </Button>
          </form>
        </motion.div>

        {/* Footer */}
        <p className="text-center mt-6 text-[length:var(--text-sm)] text-[var(--acade-text-muted)] font-[family-name:var(--font-dm-sans)]">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="text-[var(--acade-primary)] hover:text-[var(--acade-primary-glow)] font-semibold transition-colors"
          >
            Sign up →
          </Link>
        </p>
      </motion.div>

      {/* Password Reset Modal */}
      <Modal
        open={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Reset Password"
        description="Enter your email address and we'll send you a link to reset your password."
      >
        <div className="flex flex-col gap-4 mt-2">
          <Input
            label="Email Address"
            type="email"
            placeholder="you@university.edu"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
          />
          <div className="flex items-center justify-end gap-3 mt-2">
            <Button variant="ghost" size="sm" onClick={() => setShowResetModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" loading={resetLoading} onClick={handlePasswordReset}>
              <Mail size={16} /> Send Reset Link
            </Button>
          </div>
        </div>
      </Modal>
    </main>
  );
}
