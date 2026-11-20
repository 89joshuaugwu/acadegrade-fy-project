'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { getIdToken, signInWithEmail } from '@/lib/firebase/auth';
import { getDocument } from '@/lib/firebase/firestore';
import { DEFAULT_ACADEMIC_CATALOG, loadAcademicCatalog } from '@/lib/academic-catalog/client';
import { missingAcademicNames } from '@/lib/academic-catalog/suggestions';
import type { AcademicCatalogNames } from '@/lib/academic-catalog/merge';
import type { LegalVersions } from '@/lib/user/requirements';
import { isStudentProfileComplete } from '@/lib/auth/profile';
import { buildMaintenanceRedirect } from '@/lib/public/maintenance-redirect';
import {
  CHECKING_SIGN_IN,
  GOOGLE_SESSION_ENDED,
  REGISTER_CHECK_ENDED,
  REGISTER_COPY,
  REGISTER_REVIEW,
  REGISTER_STEPS_FRESH,
  REGISTER_STEPS_WITH_PAST,
  messageForFinalizeError,
  type AuthNotice,
} from '@/lib/public/auth-copy';

import { AuthShell } from '@/components/public/shells/AuthShell';
import { AppLinksLine } from '@/components/site/auth/AppLinksLine';
import { AuthLinkButton, InlineLink } from '@/components/site/auth/controls';
import { AuthPending, HandoffNote } from '@/components/site/auth/messages';
import { FilledSoFar, StepProgress, type FilledLine } from '@/components/site/auth/steps';

import { FALLBACK_LEGAL_VERSIONS, buildRegistrationAnswers, loadLegalVersions } from './consent';
import {
  REGISTRATION_DRAFT_KEY,
  formSchema,
  withoutRegistrationSecrets,
  type FormData,
  type SafeRegistrationDraft,
} from './schema';
import { Step1Account, Step2Study, Step3Record, Step4Past } from './steps';

interface PublicSettings {
  maintenanceMode?: boolean;
  disableSignups?: boolean;
  mobileAppLinks?: { iosUrl?: string | null } | null;
}

// The desktop panel shows the 'auth.register' image.
const AUTH_PHOTO = 'auth.register' as const;

function filledLines(values: Partial<FormData>, step: number): FilledLine[] {
  const lines: FilledLine[] = [];
  const join = (parts: (string | number | undefined | null)[]) => parts.filter((part) => part !== undefined && part !== null && String(part).trim() !== '').join(', ');
  if (step >= 2) {
    const account = join([values.fullName, values.matric, values.email]);
    lines.push({ label: 'Your account', value: values.authMethod === 'google' ? `${account} (with Google)` : account });
  }
  if (step >= 3) {
    lines.push({
      label: 'Where you study',
      value: join([values.university, values.department, values.programme, values.currentLevel ? `${values.currentLevel}L` : null]),
    });
  }
  if (step >= 4) {
    const count = values.semestersCompleted ?? 0;
    lines.push({ label: 'Your record', value: `Adding ${count} past semester${count === 1 ? '' : 's'}` });
  }
  return lines;
}

export default function RegisterWizard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [navigated, setNavigated] = useState(false);
  const [pageNotice, setPageNotice] = useState<AuthNotice | null>(null);
  const [emailChecked, setEmailChecked] = useState(false);
  const [restored, setRestored] = useState<'google' | 'email' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [signupsDisabled, setSignupsDisabled] = useState(false);
  const [iosUrl, setIosUrl] = useState<string | null>(null);
  const [academicCatalog, setAcademicCatalog] = useState<AcademicCatalogNames>(DEFAULT_ACADEMIC_CATALOG);
  const [suggestToCatalog, setSuggestToCatalog] = useState(false);

  useEffect(() => {
    let active = true;
    void loadAcademicCatalog().then((loaded) => { if (active) setAcademicCatalog(loaded); });
    return () => { active = false; };
  }, []);

  const { profile, loading: profileLoading } = useProfile();
  const draftRestored = useRef(false);

  const methods = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: 'onTouched',
    defaultValues: {
      authMethod: 'email',
      // Owner decision C13: the University field starts empty (was "ESUT Agbani").
      university: '',
      recordMode: 'fromScratch',
      courseDuration: 4,
      termsAccepted: false,
      aiConsent: false,
    },
  });

  const recordMode = useWatch({ control: methods.control, name: 'recordMode' });

  const [legalVersions, setLegalVersions] = useState<LegalVersions>(FALLBACK_LEGAL_VERSIONS);
  useEffect(() => {
    let active = true;
    void loadLegalVersions((path) => getDocument(path)).then((versions) => { if (active) setLegalVersions(versions); });
    return () => { active = false; };
  }, []);

  /** Every step change: focus moves to the new heading, the step rises, the notice is replaced. */
  const goTo = useCallback((step: number, notice: AuthNotice | null = null) => {
    setNavigated(true);
    setPageNotice(notice);
    setCurrentStep(step);
  }, []);

  // Redirect only when the Firestore student profile is actually complete.
  useEffect(() => {
    if (!authLoading && !profileLoading && user && isStudentProfileComplete(profile) && !isSubmitting && !isSuccess) {
      sessionStorage.removeItem(REGISTRATION_DRAFT_KEY);
      router.replace('/dashboard');
    }
  }, [user, profile, authLoading, profileLoading, isSubmitting, isSuccess, router]);

  // Restore non-secret progress. Passwords and OTP tickets are deliberately
  // never written to browser storage.
  useEffect(() => {
    if (authLoading || profileLoading || draftRestored.current) return;
    try {
      const rawDraft = sessionStorage.getItem(REGISTRATION_DRAFT_KEY);
      if (rawDraft) {
        const draft = JSON.parse(rawDraft) as SafeRegistrationDraft;
        const signedInWithGoogle = Boolean(user?.providerData.some((provider) => provider.providerId === 'google.com'));
        methods.reset({
          ...methods.getValues(),
          ...withoutRegistrationSecrets(draft.values),
          authMethod: signedInWithGoogle ? 'google' : 'email',
          password: '',
          confirmPassword: '',
          verificationToken: undefined,
        });
        setCurrentStep(signedInWithGoogle ? Math.max(1, Math.min(4, Number(draft.step) || 1)) : 1);
        setRestored(signedInWithGoogle ? 'google' : 'email');
      }
    } catch {
      sessionStorage.removeItem(REGISTRATION_DRAFT_KEY);
    } finally {
      draftRestored.current = true;
    }
  }, [authLoading, profileLoading, user, methods]);

  useEffect(() => {
    if (!draftRestored.current || isSuccess) return;
    const persistDraft = (values: unknown) => {
      const draft: SafeRegistrationDraft = { step: currentStep, values: withoutRegistrationSecrets(values) };
      sessionStorage.setItem(REGISTRATION_DRAFT_KEY, JSON.stringify(draft));
    };
    persistDraft(methods.getValues());
    const subscription = methods.watch((values) => persistDraft(values));
    return () => subscription.unsubscribe();
  }, [currentStep, isSuccess, methods]);

  // Pre-fill the correct provider when an interrupted registration resumes.
  useEffect(() => {
    if (!authLoading && !profileLoading && user && !isStudentProfileComplete(profile)) {
      const signedInWithGoogle = user.providerData.some((provider) => provider.providerId === 'google.com');
      methods.setValue('authMethod', signedInWithGoogle ? 'google' : 'email');
      if (user.email) methods.setValue('email', user.email);
      if (user.displayName) methods.setValue('fullName', user.displayName);
    }
  }, [user, profile, authLoading, profileLoading, methods]);

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
        if (settings?.disableSignups) setSignupsDisabled(true);
        const ios = settings?.mobileAppLinks?.iosUrl;
        setIosUrl(typeof ios === 'string' && ios.trim() ? ios : null);
      } catch {}
    };
    void checkMaintenance();
    return () => { active = false; };
  }, [router]);

  // Final submit handler
  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setPageNotice(null);
    try {
      if (data.authMethod === 'google' && !user) {
        throw Object.assign(new Error(GOOGLE_SESSION_ENDED), { code: 'google-session-expired' });
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`;

      const response = await fetch('/api/auth/register/finalize', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          authMethod: data.authMethod,
          verificationToken: data.verificationToken,
          password: data.authMethod === 'email' ? data.password : undefined,
          profile: {
            fullName: data.fullName,
            matric: data.matric,
            email: data.email,
            university: data.university,
            department: data.department,
            programme: data.programme,
            courseDuration: data.courseDuration,
            currentLevel: data.currentLevel,
            entrySession: data.entrySession,
            ...(data.entryLevel && data.entryLevel > 100 ? { entryLevel: data.entryLevel } : {}),
            ...(data.spilloverSemesters ? { spilloverSemesters: data.spilloverSemesters } : {}),
            recordMode: data.recordMode,
            semestersCompleted: data.recordMode === 'complete' ? data.semestersCompleted : 0,
          },
          pastSemesters: data.recordMode === 'complete' ? data.pastSemesters || [] : [],
          answers: buildRegistrationAnswers({ age: data.age, aiConsent: data.aiConsent }, legalVersions),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const registrationError = new Error(result.error || 'Failed to create account. Please try again.') as Error & { code?: string };
        registrationError.code = result.code;
        throw registrationError;
      }

      if (data.authMethod === 'email') {
        await signInWithEmail(data.email.trim().toLowerCase(), data.password!);
      }

      if (suggestToCatalog) {
        const token = await getIdToken();
        if (token) {
          const suggestions = missingAcademicNames(data, academicCatalog);
          void Promise.allSettled(suggestions.map((suggestion) => fetch('/api/academic-catalog/suggestions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(suggestion),
          })));
        }
      }

      sessionStorage.removeItem(REGISTRATION_DRAFT_KEY);
      setIsSuccess(true);
      setCurrentStep(5);

      // Auto redirect after 3 seconds
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
    } catch (err: unknown) {
      console.error(err);
      const code = (err as { code?: string } | null)?.code;
      if (code === 'signups-disabled') {
        setSignupsDisabled(true);
        return;
      }
      const notice = messageForFinalizeError(code, err instanceof Error ? err.message : undefined);
      if (code === 'verification-expired' || code === 'verification-mismatch') {
        methods.setValue('verificationToken', undefined);
        goTo(1, notice);
      } else {
        setPageNotice(notice);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitValidatedRegistration = methods.handleSubmit(onSubmit, (validationErrors) => {
    if (
      validationErrors.fullName ||
      validationErrors.matric ||
      validationErrors.email ||
      validationErrors.password ||
      validationErrors.confirmPassword ||
      validationErrors.verificationToken
    ) {
      goTo(1, REGISTER_REVIEW);
    } else if (
      validationErrors.university ||
      validationErrors.department ||
      validationErrors.programme ||
      validationErrors.courseDuration ||
      validationErrors.currentLevel ||
      validationErrors.entrySession
    ) {
      goTo(2, REGISTER_REVIEW);
    } else if (
      validationErrors.recordMode ||
      validationErrors.semestersCompleted ||
      validationErrors.age ||
      validationErrors.termsAccepted
    ) {
      goTo(3, REGISTER_REVIEW);
    } else if (validationErrors.pastSemesters) {
      goTo(4, REGISTER_REVIEW);
    } else {
      setPageNotice(REGISTER_REVIEW);
    }
  });

  const submitRegistration = async () => {
    if (methods.getValues('authMethod') === 'email' && !methods.getValues('verificationToken')) {
      goTo(1, REGISTER_CHECK_ENDED);
      return;
    }
    await submitValidatedRegistration();
  };

  const below = (
    <>
      <p>
        Already have an account? <InlineLink href="/login">Sign in</InlineLink>
      </p>
      <AppLinksLine iosUrl={iosUrl} />
    </>
  );

  if (authLoading || (user && profileLoading)) {
    return (
      <AuthShell title={REGISTER_COPY.h1} photo={AUTH_PHOTO} reassurance={REGISTER_COPY.reassurance}>
        <AuthPending text={CHECKING_SIGN_IN} />
      </AuthShell>
    );
  }

  // Signed in with a complete profile: the redirect effect is running.
  if (user && isStudentProfileComplete(profile) && !isSuccess) {
    return (
      <AuthShell title={REGISTER_COPY.h1} photo={AUTH_PHOTO} reassurance={REGISTER_COPY.reassurance}>
        <AuthPending text={REGISTER_COPY.routing} bars={false} />
      </AuthShell>
    );
  }

  if (signupsDisabled) {
    return (
      <AuthShell
        title="Registration is paused"
        sentence="New accounts can't be created right now. If you already have one, you can sign in as usual."
        photo={AUTH_PHOTO}
        reassurance={REGISTER_COPY.reassurance}
      >
        <div className="flex flex-col gap-5">
          <AuthLinkButton href="/login" block>
            Sign in
          </AuthLinkButton>
          <p className="text-[0.9375rem]">
            <InlineLink href="/" className="inline-flex min-h-11 items-center">
              Back to the site
            </InlineLink>
          </p>
        </div>
      </AuthShell>
    );
  }

  // An honest count that only shrinks: "of 4" until the record choice, then "of 3" while starting fresh.
  const steps = currentStep >= 3 && recordMode === 'fromScratch' ? REGISTER_STEPS_FRESH : REGISTER_STEPS_WITH_PAST;
  const stepMotion = { focusOnMount: navigated, enter: navigated };
  const lines = !isSuccess && !isSubmitting ? filledLines(methods.getValues(), currentStep) : [];

  const header = isSuccess ? undefined : (
    <span className="flex flex-col gap-2 text-[0.9375rem]">
      <span>{REGISTER_COPY.draftLine}</span>
      {restored ? (
        <span className="font-medium text-ag-ink" role="status">
          {restored === 'email' ? REGISTER_COPY.restoredEmail : REGISTER_COPY.restoredGoogle}
        </span>
      ) : null}
    </span>
  );

  let content;
  if (isSuccess) {
    content = (
      <div className="ag-step flex flex-col items-start gap-4" data-enter="true" role="status">
        <span aria-hidden="true" className="grid size-14 place-items-center rounded-2xl bg-ag-gold text-ag-night">
          <svg width="26" height="26" viewBox="0 0 26 26">
            <path d="M6.5 13.5l4.2 4.2 8.8-9.2" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <h2 className="ag-display text-[2rem] font-bold leading-[1.08] text-ag-ink">Your record is ready</h2>
        <p className="text-[1rem] text-ag-mist">Opening your dashboard…</p>
        <p>
          <InlineLink href="/dashboard" className="inline-flex min-h-11 items-center">
            Open it now
          </InlineLink>
        </p>
      </div>
    );
  } else if (isSubmitting) {
    content = (
      <div className="flex flex-col gap-2 rounded-2xl bg-ag-haze px-5 py-6" role="status" aria-live="polite">
        <p className="ag-display text-[1.375rem] font-bold text-ag-ink">Setting up your record…</p>
        <p className="text-[0.9375rem] text-ag-mist">Keep this page open. It takes a few seconds.</p>
      </div>
    );
  } else if (currentStep === 1) {
    content = (
      <Step1Account
        key="step1"
        motion={stepMotion}
        pageNotice={pageNotice}
        onPaused={() => setSignupsDisabled(true)}
        onNext={(fromCode) => {
          setEmailChecked(fromCode);
          goTo(2);
        }}
      />
    );
  } else if (currentStep === 2) {
    content = (
      <Step2Study
        key="step2"
        motion={stepMotion}
        emailChecked={emailChecked}
        onNext={() => {
          setEmailChecked(false);
          goTo(3);
        }}
        onBack={() => {
          setEmailChecked(false);
          goTo(1);
        }}
        catalog={academicCatalog}
        suggestToCatalog={suggestToCatalog}
        onSuggestToggle={setSuggestToCatalog}
      />
    );
  } else if (currentStep === 3) {
    content = (
      <Step3Record key="step3" motion={stepMotion} pageNotice={pageNotice} onNext={() => goTo(4)} onSubmit={submitRegistration} onBack={() => goTo(2)} />
    );
  } else {
    content = <Step4Past key="step4" motion={stepMotion} pageNotice={pageNotice} onNext={submitRegistration} onBack={() => goTo(3)} />;
  }

  return (
    <AuthShell
      title={REGISTER_COPY.h1}
      sentence={header}
      photo={AUTH_PHOTO}
      reassurance={REGISTER_COPY.reassurance}
      progress={<StepProgress steps={steps} current={Math.min(currentStep, steps.length)} done={isSuccess} label="Registration progress" />}
      below={isSuccess ? undefined : below}
    >
      <div className="flex flex-col gap-6">
        {!isSuccess && currentStep === 1 ? <HandoffNote flow="register" /> : null}
        {lines.length ? <FilledSoFar lines={lines} /> : null}
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} noValidate aria-label="Registration form">
            {content}
          </form>
        </FormProvider>
      </div>
    </AuthShell>
  );
}
