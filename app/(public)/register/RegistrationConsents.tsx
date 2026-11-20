'use client';

import { useEffect, useId } from 'react';
import Link from 'next/link';
import { useFormContext } from 'react-hook-form';
import {
  ADULT_CHOICE,
  AGE_QUESTION,
  AI_CONSENT_LABEL,
  MINOR_CHOICE,
  MINOR_NOTICE,
  type AgeAnswer,
} from './consent';
import { CheckField, FieldError } from '@/components/site/auth/controls';

const LINK = 'ag-focus rounded font-semibold text-ag-violet underline decoration-ag-violet/35 underline-offset-4 hover:decoration-ag-violet';

export interface ConsentFields {
  age?: AgeAnswer;
  termsAccepted: boolean;
  aiConsent?: boolean;
}

/**
 * One class for both age choices, so neither answer looks preferred: same
 * size, same fill, same type, side by side (stacked in the same order on
 * phones), neither chosen at first. The chosen one gains the same violet
 * ring whichever it is.
 */
const AGE_CHOICE_CLASS =
  'relative flex min-h-[3.25rem] cursor-pointer items-center gap-3 rounded-xl bg-white px-4 text-[0.9375rem] font-medium text-ag-ink ring-1 ring-ag-ink/15 transition hover:ring-ag-ink/35 has-[input:checked]:ring-2 has-[input:checked]:ring-ag-violet has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-ag-violet';

/** The drawn radio dot, identical for both answers. */
const AGE_DOT_CLASS =
  'grid size-5 shrink-0 place-items-center rounded-full bg-white ring-[1.5px] ring-ag-ink/30 transition peer-checked:ring-ag-violet peer-checked:[&>span]:scale-100';

/**
 * Age, Terms/Privacy and AI-processing answers. The two age choices have the
 * same size, fill and type, side by side (stacked in the same order on
 * phones), neither chosen; both are drawn radios over real, visually hidden
 * inputs, as are the checkboxes. Adults see the optional AI box, unticked, with
 * the legal label word for word; under-18s never see it and any tick is
 * cleared. Agreements are never restored from the draft.
 */
export function RegistrationConsents() {
  const { register, watch, setValue, formState: { errors } } = useFormContext<ConsentFields>();
  const age = watch('age');
  const questionId = useId();
  const ageErrorId = useId();
  const termsErrorId = useId();
  const aiHintId = useId();
  const newTabId = useId();

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
        className="m-0 min-w-0 border-0 p-0"
      >
        <legend id={questionId} className="mb-3 p-0 text-[0.9375rem] font-semibold text-ag-ink">
          {AGE_QUESTION}
        </legend>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2">
          <label className={AGE_CHOICE_CLASS}>
            <input type="radio" value="adult" required className="peer sr-only" {...register('age')} />
            <span aria-hidden="true" className={AGE_DOT_CLASS}>
              <span className="size-2.5 scale-0 rounded-full bg-ag-violet transition" />
            </span>
            <span>{ADULT_CHOICE}</span>
          </label>
          <label className={AGE_CHOICE_CLASS}>
            <input type="radio" value="minor" required className="peer sr-only" {...register('age')} />
            <span aria-hidden="true" className={AGE_DOT_CLASS}>
              <span className="size-2.5 scale-0 rounded-full bg-ag-violet transition" />
            </span>
            <span>{MINOR_CHOICE}</span>
          </label>
        </div>
        {errors.age ? (
          <div className="mt-2">
            <FieldError id={ageErrorId} alert>
              {errors.age.message}
            </FieldError>
          </div>
        ) : null}
      </fieldset>

      {age === 'adult' ? (
        <CheckField aria-describedby={aiHintId} hint="Optional. You can change this later in Settings." hintId={aiHintId} {...register('aiConsent')}>
          {AI_CONSENT_LABEL}
        </CheckField>
      ) : null}

      {age === 'minor' ? (
        <p role="note" className="rounded-2xl bg-ag-haze px-4 py-3.5 text-[0.9375rem] leading-relaxed text-ag-ink">
          {MINOR_NOTICE}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <CheckField
          required
          aria-invalid={errors.termsAccepted ? true : undefined}
          aria-describedby={errors.termsAccepted ? termsErrorId : undefined}
          {...register('termsAccepted')}
        >
          I agree to the{' '}
          <Link href="/terms" target="_blank" rel="noopener" className={LINK} aria-describedby={newTabId}>
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" target="_blank" rel="noopener" className={LINK} aria-describedby={newTabId}>
            Privacy notice
          </Link>
        </CheckField>
        <span id={newTabId} className="sr-only">
          Opens in a new tab
        </span>
        {errors.termsAccepted ? (
          <div className="pl-8">
            <FieldError id={termsErrorId} alert>
              {errors.termsAccepted.message}
            </FieldError>
          </div>
        ) : null}
      </div>
    </div>
  );
}
