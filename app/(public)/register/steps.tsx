'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { useAuth } from '@/hooks/useAuth';
import { signInWithGoogle } from '@/lib/firebase/auth';
import type { AcademicCatalogNames } from '@/lib/academic-catalog/merge';
import { formatSessionInput, inferCurrentLevel, parseAcademicSession } from '@/lib/academic/timeline';
import {
  CHECKING_CODE,
  NO_CONNECTION,
  REGISTER_COPY,
  VERIFY_UNSECURED,
  formatCountdown,
  isPopupClosed,
  messageForOtpSend,
  messageForOtpVerifyError,
  programmeYears as yearsOnProgramme,
  timelineLine,
  type AuthNotice,
} from '@/lib/public/auth-copy';

import {
  AuthButton,
  CheckField,
  ChoiceCards,
  ChoicePills,
  CodeField,
  FieldError,
  FieldHint,
  GoogleButton,
  GoogleG,
  LABEL,
  NumberStepper,
  OrDivider,
  PasswordField,
  TextButton,
  TextField,
} from '@/components/site/auth/controls';
import { useCooldown, useShake } from '@/components/site/auth/hooks';
import { SuggestField } from '@/components/site/auth/SuggestField';
import { AuthNoticeLine, CooldownNotice } from '@/components/site/auth/messages';
import { StepActions, StepFrame } from '@/components/site/auth/steps';

import { RegistrationConsents } from './RegistrationConsents';
import { generatePastSemesters, maxCompletedSemesters, type FormData } from './schema';

/** Shared by every step: focus and motion only after the first step change. */
export interface StepMotion {
  focusOnMount: boolean;
  enter: boolean;
}

/* ─────────────────────────────── Step 1 · Your account (and the code screen) */

export function Step1Account({
  onNext,
  onPaused,
  pageNotice,
  motion,
}: {
  onNext: (fromCode: boolean) => void;
  onPaused: () => void;
  pageNotice: AuthNotice | null;
  motion: StepMotion;
}) {
  const { register, trigger, getValues, setValue, watch, formState: { errors } } = useFormContext<FormData>();
  const { user: signedInUser } = useAuth();
  const [showOtp, setShowOtp] = useState(false);
  const [switched, setSwitched] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [cooldown, startCooldown] = useCooldown();
  const [notice, setNotice] = useState<AuthNotice | null>(null);
  const [showCooldown, setShowCooldown] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);
  const verifying = useRef(false);
  const { shake, props: shakeProps } = useShake();
  const authMethod = watch('authMethod');

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    setGoogleBusy(true);
    setNotice(null);
    try {
      const result = await signInWithGoogle();
      const user = result.user;
      setValue('authMethod', 'google', { shouldValidate: true });
      setValue('verificationToken', undefined);
      if (user.email) setValue('email', user.email, { shouldValidate: true });
      if (user.displayName) setValue('fullName', user.displayName, { shouldValidate: true });
    } catch (err: unknown) {
      // A closed popup says nothing, as before.
      if (!isPopupClosed(err)) setNotice({ tone: 'error', text: "Google sign-in didn't work. Try again, or use your email." });
    } finally {
      setIsLoading(false);
      setGoogleBusy(false);
    }
  };

  const handleSendOtp = async () => {
    const fieldsToValidate = authMethod === 'google'
      ? (['fullName', 'matric', 'email'] as const)
      : (['fullName', 'matric', 'email', 'password', 'confirmPassword'] as const);
    const valid = await trigger(fieldsToValidate, { shouldFocus: true });
    if (!valid) return;

    if (authMethod === 'google') {
      onNext(false);
      return;
    }

    setIsLoading(true);
    setNotice(null);
    setShowCooldown(false);
    try {
      const email = getValues('email');
      setValue('verificationToken', undefined);
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'registration' }),
      });
      const data = await res.json().catch(() => ({}));
      const result = messageForOtpSend(res.ok ? 200 : res.status, data, 'registration');
      if (result.cooldown) startCooldown(result.cooldown);
      if (result.paused) {
        onPaused();
        return;
      }
      if (result.ok) {
        setOtpCode('');
        setSwitched(true);
        setShowOtp(true);
        return;
      }
      if (result.cooldownNotice) setShowCooldown(true);
      if (result.notice) setNotice(result.notice);
    } catch {
      setNotice({ tone: 'error', text: NO_CONNECTION });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (code: string) => {
    if (code.length !== 6 || verifying.current) return;
    verifying.current = true;
    setIsLoading(true);
    setShowCooldown(false);
    setNotice(CHECKING_CODE);
    try {
      const email = getValues('email');
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'registration', code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice(messageForOtpVerifyError(data, 'registration'));
        shake();
        codeRef.current?.select();
        return;
      }
      if (!data.verificationToken) {
        setNotice(VERIFY_UNSECURED);
        return;
      }
      setValue('verificationToken', data.verificationToken, { shouldValidate: true });
      setNotice(null);
      onNext(true);
    } catch {
      setNotice({ tone: 'error', text: NO_CONNECTION });
    } finally {
      verifying.current = false;
      setIsLoading(false);
    }
  };

  const message = showCooldown ? <CooldownNotice seconds={cooldown} /> : <AuthNoticeLine notice={notice ?? pageNotice} />;

  if (showOtp) {
    return (
      <StepFrame
        key="code"
        heading="Check your email"
        sentence={
          <>
            We sent a 6-digit code to <strong className="font-semibold text-ag-ink">{getValues('email')}</strong>. It works for five minutes.
          </>
        }
        focusOnMount
        enter
      >
        <div {...shakeProps}>
          <CodeField ref={codeRef} value={otpCode} onChange={setOtpCode} onComplete={(code) => void handleVerifyOtp(code)} />
        </div>
        {message}
        <AuthButton block busy={isLoading} disabled={otpCode.length !== 6} onClick={() => void handleVerifyOtp(otpCode)}>
          {isLoading ? 'Checking…' : 'Verify email'}
        </AuthButton>
        <div className="flex flex-wrap items-center justify-between gap-x-6">
          <TextButton
            onClick={() => {
              setShowOtp(false);
              setNotice(null);
              setShowCooldown(false);
              setValue('verificationToken', undefined);
            }}
          >
            Use a different email
          </TextButton>
          <TextButton onClick={() => void handleSendOtp()} disabled={cooldown > 0 || isLoading}>
            {cooldown > 0 ? `Send a new code in ${formatCountdown(cooldown)}` : 'Send a new code'}
          </TextButton>
        </div>
        {cooldown === 0 && showCooldown ? <span className="sr-only" role="status">You can ask for a new code now.</span> : null}
      </StepFrame>
    );
  }

  const emailReadOnly = authMethod === 'google' || Boolean(signedInUser?.email);

  return (
    <StepFrame
      key="account"
      heading="Your account"
      sentence="Use Google, or your email and a password."
      focusOnMount={motion.focusOnMount || switched}
      enter={motion.enter || switched}
    >
      {authMethod === 'email' ? (
        <>
          <GoogleButton busy={googleBusy} disabled={isLoading && !googleBusy} onClick={() => void handleGoogleSignup()} />
          <OrDivider label={REGISTER_COPY.divider} />
        </>
      ) : (
        <p className="flex items-start gap-3 rounded-2xl bg-ag-haze px-4 py-3.5 text-[0.9375rem] leading-snug text-ag-ink">
          <GoogleG />
          <span>
            Signed in with Google as {getValues('email')}. Check your name and add your matric number.
          </span>
        </p>
      )}

      <TextField label="Full name" autoComplete="name" hint="As it appears on your school records." error={errors.fullName?.message} {...register('fullName')} />
      <TextField label="Matric number" placeholder="e.g. 2021/243567" hint="As printed on your ID card." error={errors.matric?.message} {...register('matric')} />
      <TextField
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="you@example.com"
        readOnly={emailReadOnly}
        error={errors.email?.message}
        {...register('email')}
      />
      {authMethod === 'email' ? (
        <>
          <PasswordField label="Password" autoComplete="new-password" hint="At least 8 characters." error={errors.password?.message} {...register('password')} />
          <PasswordField label="Type the password again" autoComplete="new-password" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
        </>
      ) : null}

      {message}
      <AuthButton block busy={isLoading && !googleBusy} onClick={() => void handleSendOtp()}>
        {authMethod === 'google' ? (isLoading && !googleBusy ? 'Saving…' : 'Continue') : isLoading && !googleBusy ? 'Sending your code…' : 'Email me a code'}
      </AuthButton>
    </StepFrame>
  );
}

/* ─────────────────────────────── Step 2 · Where you study */

export function Step2Study({
  onNext,
  onBack,
  catalog,
  suggestToCatalog,
  onSuggestToggle,
  emailChecked,
  motion,
}: {
  onNext: () => void;
  onBack: () => void;
  catalog: AcademicCatalogNames;
  suggestToCatalog: boolean;
  onSuggestToggle: (enabled: boolean) => void;
  emailChecked: boolean;
  motion: StepMotion;
}) {
  const { register, trigger, formState: { errors }, watch, setValue } = useFormContext<FormData>();
  const ids = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const entryLabelId = `${ids}-entry`;
  const entryHintId = `${ids}-entry-hint`;
  const levelLabelId = `${ids}-level`;
  const levelHintId = `${ids}-level-hint`;
  const levelErrorId = `${ids}-level-error`;
  const spillLabelId = `${ids}-spill`;
  const spillHintId = `${ids}-spill-hint`;

  const handleNext = async () => {
    const valid = await trigger(['university', 'department', 'programme', 'courseDuration', 'currentLevel', 'entrySession', 'entryLevel', 'spilloverSemesters'], { shouldFocus: true });
    if (valid) onNext();
  };

  const levelVal = watch('currentLevel');
  const universityVal = watch('university');
  const departmentVal = watch('department');
  const programmeVal = watch('programme');
  const entrySessionVal = watch('entrySession');
  const entrySessionField = register('entrySession');
  const durationVal = watch('courseDuration');
  const entryLevelVal = watch('entryLevel') ?? 100;
  const spilloverVal = watch('spilloverSemesters') ?? 0;
  const programmeYears = yearsOnProgramme(durationVal || 4, entryLevelVal);

  // Auto-set the level from the entry session with the September rollover shared
  // with the mobile app. Direct-entry students count years from their entry level.
  useEffect(() => {
    if (parseAcademicSession(entrySessionVal) !== null) {
      setValue('currentLevel', inferCurrentLevel(entrySessionVal, programmeYears) + (entryLevelVal - 100), { shouldValidate: true });
    }
  }, [entrySessionVal, programmeYears, entryLevelVal, setValue]);

  const levels = Array.from({ length: programmeYears }, (_, i) => entryLevelVal + i * 100);
  const line = timelineLine({ entrySession: entrySessionVal ?? '', entryLevel: entryLevelVal, currentLevel: levelVal, courseDuration: durationVal || 4 });

  return (
    <StepFrame
      heading="Where you study"
      sentence={`${emailChecked ? 'Email checked. ' : ''}Pick from the list or type your own. You can change these later in Settings.`}
      focusOnMount={motion.focusOnMount}
      enter={motion.enter}
    >
      <div className="flex flex-col gap-5">
        <SuggestField
          label="University"
          hint="Start typing, for example University of Nigeria, Nsukka"
          error={errors.university?.message}
          suggestions={catalog.universities}
          aliases={catalog.aliases?.universities}
          current={universityVal ?? ''}
          onPick={(value) => setValue('university', value, { shouldValidate: true, shouldDirty: true, shouldTouch: true })}
          {...register('university')}
        />
        <SuggestField
          label="Department"
          placeholder="e.g. Computer Science"
          error={errors.department?.message}
          suggestions={catalog.departments}
          aliases={catalog.aliases?.departments}
          current={departmentVal ?? ''}
          onPick={(value) => setValue('department', value, { shouldValidate: true, shouldDirty: true, shouldTouch: true })}
          {...register('department')}
        />
        <SuggestField
          label="Programme"
          placeholder="e.g. B.Sc. Computer Science"
          error={errors.programme?.message}
          suggestions={catalog.programmes}
          aliases={catalog.aliases?.programmes}
          current={programmeVal ?? ''}
          onPick={(value) => setValue('programme', value, { shouldValidate: true, shouldDirty: true, shouldTouch: true })}
          {...register('programme')}
        />
        <div className="flex flex-col gap-2 rounded-2xl bg-ag-haze px-4 py-3.5">
          <p className="text-[0.875rem] text-ag-mist">Can&apos;t find yours? Type it in full and we&apos;ll use it as you typed it.</p>
          <CheckField checked={suggestToCatalog} onChange={(event) => onSuggestToggle(event.target.checked)}>
            Also suggest what I typed for the shared list. An admin checks it first.
          </CheckField>
        </div>
      </div>

      <div className="flex flex-col gap-6 border-t border-ag-ink/10 pt-6">
        <h3 className="text-[1.0625rem] font-semibold text-ag-ink">Your timeline</h3>
        <TextField
          label="Session you started"
          placeholder="e.g. 2022/2023"
          hint="Type the two years, like 20222023. We add the slash for you."
          inputMode="numeric"
          maxLength={9}
          error={errors.entrySession?.message}
          {...entrySessionField}
          onChange={(event) => {
            event.target.value = formatSessionInput(event.target.value);
            return entrySessionField.onChange(event);
          }}
        />

        <div className="flex flex-col gap-2">
          <span id={entryLabelId} className={LABEL}>Level you started in</span>
          <ChoicePills
            name="entryLevel"
            labelledBy={entryLabelId}
            describedBy={entryHintId}
            value={String(entryLevelVal)}
            options={[{ value: '100', label: '100L' }, { value: '200', label: '200L' }, { value: '300', label: '300L' }]}
            onChange={(value) => setValue('entryLevel', Number(value) as 100 | 200 | 300, { shouldValidate: true, shouldDirty: true })}
          />
          <FieldHint id={entryHintId}>Came in by direct entry? Choose 200L or 300L.</FieldHint>
        </div>

        <NumberStepper
          label="Length of your programme"
          unit="years"
          min={1}
          max={10}
          value={durationVal || 4}
          onChange={(value) => setValue('courseDuration', value, { shouldValidate: true, shouldDirty: true })}
          hint="From 100L to your final year: 4 for most degrees, 5 for engineering, 6 for medicine. Direct entry? Keep the full length; we take off the years you skipped."
          error={errors.courseDuration?.message}
        />

        <div className="flex flex-col gap-2">
          <span id={levelLabelId} className={LABEL}>Current level</span>
          <ChoicePills
            name="currentLevel"
            labelledBy={levelLabelId}
            describedBy={[errors.currentLevel ? levelErrorId : '', levelHintId].filter(Boolean).join(' ')}
            value={levelVal ? String(levelVal) : null}
            options={levels.map((level) => ({ value: String(level), label: `${level}L` }))}
            onChange={(value) => setValue('currentLevel', Number(value), { shouldValidate: true, shouldDirty: true, shouldTouch: true })}
          />
          {errors.currentLevel ? <FieldError id={levelErrorId}>{errors.currentLevel.message}</FieldError> : null}
          <FieldHint id={levelHintId}>Worked out from your session. Change it if it&apos;s wrong.</FieldHint>
        </div>

        <div className="flex flex-col gap-2">
          <span id={spillLabelId} className={LABEL}>Extra semesters after your final year</span>
          <ChoicePills
            name="spilloverSemesters"
            labelledBy={spillLabelId}
            describedBy={spillHintId}
            value={String(spilloverVal)}
            options={[0, 1, 2, 3, 4].map((count) => ({
              value: String(count),
              label: String(count),
              accessibleName: count === 0 ? 'No extra semesters' : `${count} extra semester${count === 1 ? '' : 's'}`,
            }))}
            onChange={(value) => setValue('spilloverSemesters', Number(value), { shouldValidate: true, shouldDirty: true })}
          />
          <FieldHint id={spillHintId}>For a spill-over. Leave at 0 if this isn&apos;t you.</FieldHint>
        </div>

        {line ? (
          <p className="rounded-xl bg-ag-violet/[0.07] px-4 py-3 text-[0.9375rem] font-medium text-ag-ink" aria-live="polite">
            {line}
          </p>
        ) : null}
      </div>

      <StepActions onBack={onBack}>
        <AuthButton block onClick={() => void handleNext()}>Continue</AuthButton>
      </StepActions>
    </StepFrame>
  );
}

/* ─────────────────────────────── Step 3 · Your record */

export function Step3Record({
  onNext,
  onSubmit,
  onBack,
  pageNotice,
  motion,
}: {
  onNext: () => void;
  onSubmit: () => void | Promise<void>;
  onBack: () => void;
  pageNotice: AuthNotice | null;
  motion: StepMotion;
}) {
  const { trigger, watch, setValue, getValues, formState: { errors } } = useFormContext<FormData>();
  const modeVal = watch('recordMode');
  const durationVal = watch('courseDuration') || 4;
  const currentLevel = watch('currentLevel') || 100;
  const maxSemesters = maxCompletedSemesters(durationVal, currentLevel, watch('entryLevel') ?? 100);
  const semsCompleted = watch('semestersCompleted') || 1;

  useEffect(() => {
    if (modeVal === 'complete' && semsCompleted > maxSemesters) {
      setValue('semestersCompleted', maxSemesters, { shouldValidate: true });
    }
  }, [maxSemesters, modeVal, semsCompleted, setValue]);

  const handleNext = async () => {
    const valid = await trigger(['recordMode', 'semestersCompleted', 'age', 'termsAccepted'], { shouldFocus: true });
    if (valid) {
      if (modeVal === 'fromScratch') {
        setValue('pastSemesters', []);
        setValue('semestersCompleted', undefined);
        await onSubmit();
      } else {
        onNext();
      }
    }
  };

  const upTo = maxSemesters === 1 ? '1 semester' : `${maxSemesters} semesters`;

  return (
    <StepFrame
      heading="Your record"
      sentence="Start with this semester, or add the semesters you've already finished."
      focusOnMount={motion.focusOnMount}
      enter={motion.enter}
    >
      <ChoiceCards
        name="recordMode"
        label="How to start your record"
        value={modeVal}
        options={[
          { value: 'fromScratch', title: 'Start with this semester', line: 'Add results as they come out. Good for freshers.' },
          { value: 'complete', title: 'Add my past semesters now', line: 'Enter earlier results to build your CGPA from the start.' },
        ]}
        onChange={(value) => {
          setValue('recordMode', value, { shouldValidate: true });
          if (value === 'fromScratch') {
            setValue('pastSemesters', []);
            setValue('semestersCompleted', undefined);
          } else if (!getValues('semestersCompleted')) {
            setValue('semestersCompleted', 1, { shouldValidate: true });
          }
        }}
      />

      {modeVal === 'complete' ? (
        <NumberStepper
          label="Semesters you've finished"
          min={1}
          max={Math.max(1, maxSemesters)}
          value={semsCompleted}
          onChange={(value) => setValue('semestersCompleted', value, { shouldValidate: true })}
          hint={`Up to ${upTo} by ${currentLevel}L from the level you started in.`}
          error={errors.semestersCompleted?.message}
        />
      ) : null}

      <div className="flex flex-col gap-5 border-t border-ag-ink/10 pt-6">
        <h3 className="text-[1.0625rem] font-semibold text-ag-ink">Before you finish</h3>
        <RegistrationConsents />
      </div>

      <AuthNoticeLine notice={pageNotice} />
      <StepActions onBack={onBack}>
        <AuthButton block onClick={() => void handleNext()}>
          {modeVal === 'fromScratch' ? 'Create my record' : 'Continue'}
        </AuthButton>
      </StepActions>
    </StepFrame>
  );
}

/* ─────────────────────────────── Step 4 · Past semesters */

export function Step4Past({
  onNext,
  onBack,
  pageNotice,
  motion,
}: {
  onNext: () => void;
  onBack: () => void;
  pageNotice: AuthNotice | null;
  motion: StepMotion;
}) {
  const { watch, setValue, trigger, formState: { errors } } = useFormContext<FormData>();
  const currentLevel = watch('currentLevel');
  const semestersCompleted = watch('semestersCompleted') || 1;
  const entrySession = watch('entrySession');
  const courseDuration = watch('courseDuration') || 4;
  const entryLevel = watch('entryLevel') ?? 100;
  const pastSemesters = watch('pastSemesters') || [];

  // Generate the rows when empty.
  useEffect(() => {
    if (pastSemesters.length === 0 && currentLevel && entrySession) {
      setValue('pastSemesters', generatePastSemesters(currentLevel, semestersCompleted, entrySession, courseDuration, entryLevel));
    }
  }, [currentLevel, semestersCompleted, entrySession, courseDuration, entryLevel, pastSemesters, setValue]);

  const handleNext = async () => {
    const valid = await trigger('pastSemesters', { shouldFocus: true });
    if (valid) onNext();
  };

  const listError = errors.pastSemesters?.message ?? errors.pastSemesters?.root?.message;

  return (
    <StepFrame
      heading="Check your past semesters"
      sentence="We filled in each session from the year you started. Fix any that moved, for example after a strike or a repeated year."
      focusOnMount={motion.focusOnMount}
      enter={motion.enter}
    >
      <div className="overflow-hidden rounded-2xl ring-1 ring-ag-ink/10">
        <table className="w-full text-left text-[0.9375rem]">
          <thead className="bg-ag-haze text-[0.8125rem] text-ag-mist">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-medium">Semester</th>
              <th scope="col" className="w-[9.5rem] px-4 py-2.5 font-medium">Session</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ag-ink/10">
            {pastSemesters.map((sem, index) => (
              <tr key={`${sem.level}-${sem.semester}`} className="align-top">
                <th scope="row" className="px-4 py-3 pt-[1.4rem] font-medium text-ag-ink">{sem.label}</th>
                <td className="px-3 py-2.5">
                  <TextField
                    label={`Session for ${sem.label}`}
                    hideLabel
                    value={sem.session}
                    inputMode="numeric"
                    maxLength={9}
                    inputClassName="ag-num"
                    error={errors.pastSemesters?.[index]?.session?.message}
                    onChange={(event) => {
                      const session = formatSessionInput(event.target.value);
                      const next = pastSemesters.map((row, rowIndex) => (rowIndex === index ? { ...row, session } : row));
                      setValue('pastSemesters', next, { shouldDirty: true, shouldValidate: true });
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {listError ? <AuthNoticeLine notice={{ tone: 'error', text: listError }} /> : null}

      <AuthNoticeLine notice={pageNotice} />
      <StepActions
        onBack={() => {
          setValue('pastSemesters', []);
          onBack();
        }}
      >
        <AuthButton block onClick={() => void handleNext()}>Create my record</AuthButton>
      </StepActions>
    </StepFrame>
  );
}
