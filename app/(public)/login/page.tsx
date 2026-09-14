'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import toast from 'react-hot-toast';

import { AuthDivider, AuthShell } from '@/components/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { MobileAppDownload } from '@/components/ui/MobileAppDownload';
import { useAuth } from '@/hooks/useAuth';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { isStudentProfileComplete } from '@/lib/auth/profile';
import { signInWithEmail, signInWithGoogle } from '@/lib/firebase/auth';
import { getDocument } from '@/lib/firebase/firestore';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

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

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const shouldReduceMotion = useReducedMotion();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [shakeForm, setShakeForm] = useState(false);

  const routeAuthenticatedUser = useCallback(async (signedInUser: { uid: string }) => {
    const profile = await getDocument(`users/${signedInUser.uid}`);
    const profileComplete = isStudentProfileComplete(profile);
    router.replace(profileComplete ? '/dashboard' : '/register');
    return profileComplete;
  }, [router]);

  useEffect(() => {
    if (!authLoading && user) {
      routeAuthenticatedUser(user).catch(() => {
        toast.error('Could not load your profile. Please try again.');
        router.replace('/register');
      });
    }
  }, [user, authLoading, routeAuthenticatedUser, router]);

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const doc = await getDocument<any>('config/settings');
        if (doc?.maintenanceMode) {
          router.replace('/maintenance');
        }
      } catch {}
    };
    checkMaintenance();
  }, [router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormData>();

  const onSubmit = useCallback(
    async (data: LoginFormData) => {
      setIsSubmitting(true);
      try {
        const credential = await signInWithEmail(data.email.trim().toLowerCase(), data.password);
        const profileComplete = await routeAuthenticatedUser(credential.user);
        toast.success(profileComplete ? 'Welcome back!' : 'Finish setting up your profile to continue.');
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
    [routeAuthenticatedUser, setError]
  );

  const handleGoogleSignIn = useCallback(async () => {
    setIsGoogleLoading(true);
    try {
      const credential = await signInWithGoogle();
      const profileComplete = await routeAuthenticatedUser(credential.user);
      toast.success(profileComplete ? 'Welcome!' : 'Google verified. Complete your academic profile.');
    } catch (err: unknown) {
      const msg =
        err instanceof Error && err.message.includes('popup')
          ? 'Sign-in popup was closed'
          : 'Google sign-in failed. Please try again.';
      toast.error(msg);
    } finally {
      setIsGoogleLoading(false);
    }
  }, [routeAuthenticatedUser]);

  if (authLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--acade-void)] px-4">
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-3 rounded-xl border border-[var(--acade-border)] bg-[var(--acade-deep)] px-5 py-4 text-[length:var(--text-sm)] text-[var(--acade-text-muted)] shadow-[var(--shadow-card)]"
        >
          <LoaderCircle className="size-5 animate-spin text-[var(--acade-primary)]" aria-hidden="true" />
          Checking your sign-in status…
        </div>
      </div>
    );
  }

  if (user) return null;

  return (
    <AuthShell
      eyebrow="Student access"
      title="Welcome back"
      description="Sign in to continue tracking your academic progress."
      proofTitle="Know where you stand before the next result"
      proofDescription="Bring every semester into one dependable record, then use CGPA and PI together to understand your direction."
      proofItems={[
        'Resume from your latest academic record',
        'Keep incomplete profile setup on the right path',
        'Review results, forecasts, and transcripts in one place',
      ]}
      support={
        <>
          New to AcadeGrade? <Link href="/register">Create an account</Link>
        </>
      }
    >
      <motion.div
        animate={shakeForm && !shouldReduceMotion ? { x: [0, -8, 8, -5, 5, -2, 2, 0] } : { x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Button
          variant="outline"
          size="md"
          fullWidth
          loading={isGoogleLoading}
          loadingLabel="Signing in with Google…"
          onClick={handleGoogleSignIn}
        >
          <GoogleIcon />
          Continue with Google
        </Button>

        <AuthDivider className="my-5">Or sign in with email</AuthDivider>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          aria-label="Sign in with email"
          noValidate
        >
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@university.edu"
            error={errors.email?.message}
            {...register('email', {
              required: 'Email is required',
              pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' },
            })}
          />

          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            error={errors.password?.message}
            {...register('password', { required: 'Password is required' })}
          />

          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="flex min-h-12 items-center rounded-lg text-[length:var(--text-sm)] font-semibold text-[var(--acade-primary)] underline-offset-4 transition-colors hover:text-[var(--acade-primary-hover)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]"
            >
              Forgot password?
            </Link>
          </div>

          <AnimatePresence initial={false}>
            {errors.root && (
              <motion.p
                role="alert"
                initial={shouldReduceMotion ? {} : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                className="overflow-hidden rounded-xl bg-[var(--acade-danger-dim)] px-4 py-3 text-[length:var(--text-sm)] text-[var(--acade-danger)]"
              >
                {errors.root.message}
              </motion.p>
            )}
          </AnimatePresence>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={isSubmitting}
            loadingLabel="Signing in…"
          >
            Sign in <ArrowRight size={18} aria-hidden="true" />
          </Button>
        </form>

        <MobileAppDownload compact className="mt-5" />
      </motion.div>
    </AuthShell>
  );
}
