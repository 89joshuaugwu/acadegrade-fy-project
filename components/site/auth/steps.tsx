'use client';

import { useEffect, useRef, type FormEventHandler, type ReactNode } from 'react';
import './auth.css';

/* ------------------------------------------------------------- progress */

/** "Step 2 of 4". The step's own name is its h2, and the hidden list names every step. */
export function stepLine(steps: readonly string[], current: number): string {
  const index = Math.min(Math.max(current, 1), steps.length);
  return `Step ${index} of ${steps.length}`;
}

/** Segments 1..n filled for a step: the current one and everything before it; all of them when done. */
export function filledSegments(count: number, current: number, done = false): boolean[] {
  return Array.from({ length: count }, (_, index) => done || index < Math.min(Math.max(current, 0), count));
}

const ARC = 'linear-gradient(90deg, #6B4EFF 0%, #9C6BE8 45%, #F08C5A 75%, #FFB23F 100%)';

interface StepProgressProps {
  /** Step names, in order ("Your account", "Where you study", …). */
  steps: readonly string[];
  /** Current step, 1-based. */
  current: number;
  /** The flow is finished: every segment fills. */
  done?: boolean;
  /** Accessible name for the nav. */
  label?: string;
}

/**
 * A slim stepped bar that fills violet to gold, like the logo's arc, with
 * "Step 2 of 4" above it and a hidden ordered list ("complete / current step
 * / upcoming") inside a nav for screen readers.
 */
export function StepProgress({ steps, current, done = false, label = 'Progress' }: StepProgressProps) {
  const count = steps.length;
  const filled = filledSegments(count, current, done);
  return (
    <nav aria-label={label} className="mb-8">
      <p className="mb-2.5 text-[0.8125rem] font-semibold text-ag-mist" aria-hidden="true">
        {done ? 'All done' : stepLine(steps, current)}
      </p>
      <div className="flex gap-1.5" aria-hidden="true">
        {filled.map((on, index) => (
          <span
            key={index}
            data-filled={on ? 'true' : 'false'}
            className="h-1.5 flex-1 rounded-full bg-ag-ink/10 transition-[background] duration-500"
            style={
              on
                ? {
                    backgroundImage: ARC,
                    backgroundSize: `${count * 100}% 100%`,
                    backgroundPosition: `${count > 1 ? (index / (count - 1)) * 100 : 0}% 0`,
                  }
                : undefined
            }
          />
        ))}
      </div>
      <ol className="sr-only">
        {steps.map((step, index) => {
          const state = done || index + 1 < current ? 'complete' : index + 1 === current ? 'current step' : 'upcoming';
          return (
            <li key={step} aria-current={!done && index + 1 === current ? 'step' : undefined}>
              {step}, {state}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ------------------------------------------------------------- one step */

interface StepFrameProps {
  /** The step's h2 ("Your account", "Check your email"). */
  heading: ReactNode;
  sentence?: ReactNode;
  /** Move focus to the heading when the step appears (every step change). Off for the first step on load. */
  focusOnMount?: boolean;
  /** Play the step rise; off for the first step on load. */
  enter?: boolean;
  /** Render as a <form> with this accessible name (reset password's steps). */
  formLabel?: string;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  children: ReactNode;
}

/** One step of an auth flow: heading, sentence and the step's controls, top to bottom. */
export function StepFrame({ heading, sentence, focusOnMount = false, enter = false, formLabel, onSubmit, children }: StepFrameProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!focusOnMount) return;
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.closest('[data-auth-column]')?.scrollIntoView?.({ block: 'start', behavior: 'auto' });
    // Only when the step first appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const content = (
    <>
      <div className="flex flex-col gap-2">
        <h2 ref={headingRef} tabIndex={-1} className="ag-display text-[1.5rem] font-bold leading-[1.15] text-ag-ink outline-none">
          {heading}
        </h2>
        {sentence ? <p className="text-[0.9375rem] leading-relaxed text-ag-mist">{sentence}</p> : null}
      </div>
      {children}
    </>
  );

  const cls = 'ag-step flex flex-col gap-6';
  if (formLabel) {
    return (
      <form className={cls} data-enter={enter ? 'true' : undefined} aria-label={formLabel} noValidate onSubmit={onSubmit}>
        {content}
      </form>
    );
  }
  return (
    <div className={cls} data-enter={enter ? 'true' : undefined}>
      {content}
    </div>
  );
}

/** Back (a quiet button with a chevron) and the step's one primary. Phones: Back above. */
export function StepActions({ onBack, backDisabled, children }: { onBack?: () => void; backDisabled?: boolean; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          disabled={backDisabled}
          className="ag-focus inline-flex min-h-[3.25rem] items-center gap-2 self-start rounded-xl px-4 text-[0.9375rem] font-semibold text-ag-ink ring-1 ring-ag-ink/15 transition hover:ring-ag-ink/35 disabled:opacity-40 sm:self-auto"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M10 3.5 5.5 8l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>
      ) : null}
      <div className="min-w-0 flex-1 [&>*]:w-full">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------- filled so far */

export interface FilledLine {
  label: string;
  value: ReactNode;
}

/** A read-only summary of the steps already done on register. */
export function FilledSoFar({ lines, label = 'Filled in so far' }: { lines: readonly FilledLine[]; label?: string }) {
  if (!lines.length) return null;
  return (
    <section aria-label={label} className="rounded-2xl bg-ag-haze px-4 py-3.5 sm:px-5">
      <dl className="flex flex-col gap-2.5">
        {lines.map((line) => (
          <div key={line.label} className="flex min-w-0 items-start gap-3">
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="mt-[3px] shrink-0 text-ag-violet">
              <circle cx="9" cy="9" r="9" fill="currentColor" opacity="0.16" />
              <path d="M5.2 9.3l2.4 2.3 5-5.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="min-w-0">
              <dt className="text-[0.8125rem] text-ag-mist">{line.label}</dt>
              <dd className="break-words text-[0.9375rem] font-medium text-ag-ink">{line.value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}
