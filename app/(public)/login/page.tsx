'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

import { AuthShell } from '@/components/public/shells/AuthShell';
import { AppLinksLine } from '@/components/site/auth/AppLinksLine';
import { AuthButton, GoogleButton, InlineLink, OrDivider, PasswordField, TextField } from '@/components/site/auth/controls';
import { useShake } from '@/components/site/auth/hooks';
import { AuthNoticeLine, AuthPending, HandoffNote } from '@/components/site/auth/messages';
import { useAuth } from '@/hooks/useAuth';
import { isStudentProfileComplete } from '@/lib/auth/profile';
import { signInWithEmail, signInWithGoogle } from '@/lib/firebase/auth';
import { getDocument } from '@/lib/firebase/firestore';
import { afterSignInPath, buildMaintenanceRedirect } from '@/lib/public/maintenance-redirect';
import {
  CHECKING_SIGN_IN,
  LOGIN_COPY,
  messageForGoogleError,
  messageForSignInError,
  type AuthNotice,
} from '@/lib/public/auth-copy';

interface LoginFormData {
  email: string;
  password: string;
}

interface PublicSettings {
  maintenanceMode?: boolean;
  mobileAppLinks?: { iosUrl?: string | null } | null;
}

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [notice, setNotice] = useState<AuthNotice | null>(null);
  const [iosUrl, setIosUrl] = useState<string | null>(null);
  const { shake, props: shakeProps } = useShake();

  const routeAuthenticatedUser = useCallback(async (signedInUser: { uid: string }) => {
    const profile = await getDocument(`users/${signedInUser.uid}`);
    const profileComplete = isStudentProfileComplete(profile);
    // A complete profile returns to the checked ?next= (for example /settings#delete-account).
    router.replace(profileComplete ? afterSignInPath(window.location.search) : '/register');
    return profileComplete;
  }, [router]);

  useEffect(() => {
    if (!authLoading && user) {
      routeAuthenticatedUser(user).catch(() => {
        toast.error("We couldn't load your profile. Please finish setting up.");
        router.replace('/register');
      });
    }
  }, [user, authLoading, routeAuthenticatedUser, router]);

  useEffect(() => {
    let active = true;
    const checkMaintenance = async () => {
      try {
        const settings = await getDocument<PublicSettings>('config/settings');
        if (!active) return;
        if (settings?.maintenanceMode) {
          router.replace(buildMaintenanceRedirect(window.location.pathname + window.location.search));
          return;
        }
        const ios = settings?.mobileAppLinks?.iosUrl;
        setIosUrl(typeof ios === 'string' && ios.trim() ? ios : null);
      } catch {}
    };
    void checkMaintenance();
    return () => {
      active = false;
    };
  }, [router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({ mode: 'onTouched' });

  const onSubmit = useCallback(
    async (data: LoginFormData) => {
      setIsSubmitting(true);
      setNotice(null);
      try {
        const credential = await signInWithEmail(data.email.trim().toLowerCase(), data.password);
        const profileComplete = await routeAuthenticatedUser(credential.user);
        toast.success(profileComplete ? 'Welcome back.' : 'Finish setting up your account to continue.');
      } catch (err: unknown) {
        setNotice(messageForSignInError(err));
        shake();
      } finally {
        setIsSubmitting(false);
      }
    },
    [routeAuthenticatedUser, shake]
  );

  const handleGoogleSignIn = useCallback(async () => {
    setIsGoogleLoading(true);
    setNotice(null);
    try {
      const credential = await signInWithGoogle();
      const profileComplete = await routeAuthenticatedUser(credential.user);
      toast.success(profileComplete ? 'Welcome back.' : 'Finish setting up your account to continue.');
    } catch (err: unknown) {
      setNotice(messageForGoogleError(err));
    } finally {
      setIsGoogleLoading(false);
    }
  }, [routeAuthenticatedUser]);

  const below = (
    <>
      <p>
        New to AcadeGrade? <InlineLink href="/register">Create a free account</InlineLink>
      </p>
      <AppLinksLine iosUrl={iosUrl} />
    </>
  );

  let body;
  if (authLoading) {
    body = <AuthPending text={CHECKING_SIGN_IN} />;
  } else if (user) {
    body = <AuthPending text={LOGIN_COPY.routing} bars={false} />;
  } else {
    body = (
      <div className="flex flex-col gap-6">
        <HandoffNote flow="login" />
        <GoogleButton busy={isGoogleLoading} onClick={handleGoogleSignIn} />
        <OrDivider label={LOGIN_COPY.divider} />
        <form
          onSubmit={handleSubmit(onSubmit)}
          aria-label="Sign in with email"
          noValidate
          {...shakeProps}
          className={`flex flex-col gap-5 ${shakeProps.className}`}
        >
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            readOnly={isSubmitting}
            error={errors.email?.message}
            {...register('email', {
              required: 'Enter your email',
              pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address, like you@example.com' },
            })}
          />
          <div className="flex flex-col gap-1">
            <PasswordField
              label="Password"
              autoComplete="current-password"
              readOnly={isSubmitting}
              error={errors.password?.message}
              {...register('password', { required: 'Enter your password' })}
            />
            <p className="flex justify-end">
              <InlineLink href="/forgot-password" className="inline-flex min-h-10 items-center text-[0.875rem]">
                Forgot password?
              </InlineLink>
            </p>
          </div>
          <AuthNoticeLine notice={notice} />
          <AuthButton type="submit" block busy={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </AuthButton>
        </form>
      </div>
    );
  }

  return (
    <AuthShell
      title={LOGIN_COPY.h1}
      sentence={LOGIN_COPY.sentence}
      photo="auth.login"
      reassurance={LOGIN_COPY.reassurance}
      below={authLoading || user ? undefined : below}
    >
      {body}
    </AuthShell>
  );
}
