'use client';

import { useEffect, useId } from 'react';
import Link from 'next/link';
import { useFormContext } from 'react-hook-form';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import {
  ADULT_CHOICE,
  AGE_QUESTION,
  AI_CONSENT_LABEL,
  MINOR_CHOICE,
  MINOR_NOTICE,
  type AgeAnswer,
} from './consent';

export interface ConsentFields {
  age?: AgeAnswer;
  termsAccepted: boolean;
  aiConsent?: boolean;
}

const choiceClass =
  'flex min-h-12 cursor-pointer items-center gap-3 rounded-[var(--radius-control)] border border-[var(--acade-control-border)] bg-[var(--acade-surface)] px-4 py-3 text-[length:var(--text-sm)] font-medium text-[var(--acade-text)] transition-colors hover:bg-[var(--acade-overlay)] has-[:checked]:border-[var(--acade-text)] has-[:checked]:bg-[var(--acade-overlay)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--acade-primary)]';

const controlClass = 'size-5 shrink-0 accent-[var(--acade-text)] focus-visible:outline-none';

/** Age, Terms/Privacy and AI-processing answers. Both age choices carry equal weight. */
export function RegistrationConsents() {
  const { register, watch, setValue, formState: { errors } } = useFormContext<ConsentFields>();
  const age = watch('age');
  const questionId = useId();
  const ageErrorId = useId();
  const termsErrorId = useId();

  useEffect(() => {
    // AI processing is for adults only; never carry a ticked box into a minor's answers.
    if (age === 'minor') setValue('aiConsent', false);
  }, [age, setValue]);

  return (
    <div className="flex flex-col gap-5">
      <fieldset
        role="radiogroup"
        aria-labelledby={questionId}
        aria-describedby={errors.age ? ageErrorId : undefined}
        aria-required="true"
        className="min-w-0"
      >
        <legend id={questionId} className="mb-3 text-[length:var(--text-base)] font-semibold text-[var(--acade-text)]">
          {AGE_QUESTION}
        </legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className={choiceClass}>
            <input type="radio" value="adult" required className={controlClass} {...register('age')} />
            {ADULT_CHOICE}
          </label>
          <label className={choiceClass}>
            <input type="radio" value="minor" required className={controlClass} {...register('age')} />
            {MINOR_CHOICE}
          </label>
        </div>
        {errors.age ? (
          <p id={ageErrorId} role="alert" className="mt-2 text-[length:var(--text-sm)] text-[var(--acade-danger)]">
            {errors.age.message}
          </p>
        ) : null}
      </fieldset>

      {age === 'adult' ? (
        <label className="flex cursor-pointer items-start gap-3 text-[length:var(--text-sm)] leading-6 text-[var(--acade-text)]">
          <input type="checkbox" className={cn(controlClass, 'mt-0.5')} {...register('aiConsent')} />
          <span>{AI_CONSENT_LABEL}</span>
        </label>
      ) : null}

      {age === 'minor' ? (
        <p role="note" className="flex gap-3 rounded-[var(--radius-control)] bg-[var(--acade-info-dim)] p-4 text-[length:var(--text-sm)] leading-6 text-[var(--acade-text)]">
          <Info className="mt-0.5 size-5 shrink-0 text-[var(--acade-info)]" aria-hidden="true" />
          <span>{MINOR_NOTICE}</span>
        </p>
      ) : null}

      <div>
        <label className="flex cursor-pointer items-start gap-3 text-[length:var(--text-sm)] leading-6 text-[var(--acade-text)]">
          <input
            type="checkbox"
            required
            aria-invalid={errors.termsAccepted ? true : undefined}
            aria-describedby={errors.termsAccepted ? termsErrorId : undefined}
            className={cn(controlClass, 'mt-0.5')}
            {...register('termsAccepted')}
          />
          <span>
            I agree to the{' '}
            <Link href="/terms" target="_blank" rel="noopener" className="font-semibold text-[var(--acade-primary)] underline underline-offset-4">Terms</Link>
            {' '}and{' '}
            <Link href="/privacy" target="_blank" rel="noopener" className="font-semibold text-[var(--acade-primary)] underline underline-offset-4">Privacy notice</Link>
          </span>
        </label>
        {errors.termsAccepted ? (
          <p id={termsErrorId} role="alert" className="mt-2 text-[length:var(--text-sm)] text-[var(--acade-danger)]">
            {errors.termsAccepted.message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
