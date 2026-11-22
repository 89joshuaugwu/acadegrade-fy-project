'use client';

import { useState, useEffect, useId, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Loader2, Minus, Plus } from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils/cn';
import { useAuth } from '@/hooks/useAuth';
import { formatCgpa, requiredAverageForTarget } from '@/lib/cgpa/academicRules';
import { useGradingScale } from '@/hooks/useGradingScale';
import { scaleContextFor } from '@/lib/ai/scaleContext';
import toast from 'react-hot-toast';
import { classifyAiResponse, type AiBlock } from './aiAccess';
import { AiDisclosure } from './AiDisclosure';
import { RangeSlider } from './RangeSlider';
import { DiscreetValue } from '@/lib/discreet';

interface WhatIfCalculatorProps {
  currentCGPA: number;
  totalCredits: number;
  initialRemainingSemesters: number;
  initialCreditLoad?: number;
  /** Graded units in unfinished semesters. Already inside the CGPA, so not counted as remaining again. */
  gradedInProgressUnits?: number;
  /** Called after each AI guidance request completes (success or error), e.g. to refresh credit counts. */
  onRequestSettled?: () => void;
  /** AI is not allowed (age, consent, maintenance): no guidance requests; the maths still works. */
  aiBlock?: AiBlock | null;
  /** The server refused guidance with a gate code (403 age/consent, 503 maintenance/disabled). */
  onAiBlocked?: (block: AiBlock) => void;
}

interface StepperFieldProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  /** Typed text, handled exactly like the old number field. */
  onType: (raw: string) => void;
  /** Buttons and arrow keys: the next whole number, already clamped. */
  onStep: (next: number) => void;
}

/** A whole-number field with − and + buttons (no native number spinner). Arrow keys step too. */
function StepperField({ id, label, value, min, max, disabled = false, onType, onStep }: StepperFieldProps) {
  const step = (delta: number) => onStep(Math.min(max, Math.max(min, value + delta)));
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowUp') { event.preventDefault(); step(1); }
    if (event.key === 'ArrowDown') { event.preventDefault(); step(-1); }
  };
  const buttonClass = 'flex size-12 shrink-0 items-center justify-center text-[var(--acade-text-muted)] transition-colors hover:bg-[var(--acade-overlay)] hover:text-[var(--acade-text)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--acade-primary)] disabled:cursor-not-allowed disabled:opacity-40';
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-[var(--acade-text-muted)]">{label}</label>
      <div
        className={cn(
          'flex h-12 items-stretch overflow-hidden rounded-[var(--radius-control)] border border-[var(--acade-control-border)] bg-[var(--acade-deep)] transition-colors',
          'focus-within:border-[var(--acade-primary)] focus-within:ring-2 focus-within:ring-[var(--acade-primary)]/20',
          disabled && 'opacity-50'
        )}
      >
        <button type="button" aria-label={`Decrease ${label.toLowerCase()}`} disabled={disabled || value <= min} onClick={() => step(-1)} className={buttonClass}>
          <Minus className="size-4" aria-hidden="true" />
        </button>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          role="spinbutton"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          autoComplete="off"
          value={value}
          onChange={(event) => onType(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="app-num min-w-0 flex-1 border-x border-[var(--acade-border-subtle)] bg-transparent text-center text-lg font-semibold text-[var(--acade-text)] focus:outline-none disabled:cursor-not-allowed"
        />
        <button type="button" aria-label={`Increase ${label.toLowerCase()}`} disabled={disabled || value >= max} onClick={() => step(1)} className={buttonClass}>
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export function WhatIfCalculator({
  currentCGPA,
  totalCredits,
  initialRemainingSemesters,
  initialCreditLoad = 18,
  gradedInProgressUnits = 0,
  onRequestSettled,
  aiBlock = null,
  onAiBlocked,
}: WhatIfCalculatorProps) {
  const settledRef = useRef(onRequestSettled);
  useEffect(() => { settledRef.current = onRequestSettled; }, [onRequestSettled]);
  const blockedRef = useRef(onAiBlocked);
  useEffect(() => { blockedRef.current = onAiBlocked; }, [onAiBlocked]);
  const shouldReduceMotion = useReducedMotion();
  const { user } = useAuth();
  const ids = useId();
  const { scale } = useGradingScale();
  const maxPoint = scale.maxPoint;
  const maxText = formatCgpa(maxPoint);

  const [targetCGPA, setTargetCGPA] = useState(Math.min(maxPoint, currentCGPA + 0.2));
  const [remainingSemesters, setRemainingSemesters] = useState(initialRemainingSemesters);
  const [creditLoad, setCreditLoad] = useState(initialCreditLoad);

  const [requiredGPA, setRequiredGPA] = useState<number>(0);
  const [requiredAvgScore, setRequiredAvgScore] = useState<number>(0);
  const [feasibilityNote, setFeasibilityNote] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const [countdown, setCountdown] = useState<number | null>(null);
  const [cooldown, setCooldown] = useState(0);
  /** Set when the server refuses with a gate code; stops further requests. */
  const [serverBlock, setServerBlock] = useState<AiBlock | null>(null);
  const block = aiBlock ?? serverBlock;
  const aiAllowed = !block;
  // Remaining units = planned units less units already graded in unfinished semesters (R3).
  const gradedInProgress = Math.max(0, Number(gradedInProgressUnits) || 0);
  const remainingUnits = Math.max(0, remainingSemesters * creditLoad - gradedInProgress);
  const nothingLeft = remainingUnits <= 0;

  useEffect(() => {
    setRemainingSemesters(initialRemainingSemesters);
  }, [initialRemainingSemesters]);

  // Client-side math computation
  useEffect(() => {
    const reqGPA = requiredAverageForTarget({
      currentCgpa: currentCGPA,
      completedUnits: totalCredits,
      targetCgpa: targetCGPA,
      remainingUnits,
    });
    if (reqGPA !== null) {
      setRequiredGPA(reqGPA);
      setRequiredAvgScore((reqGPA / maxPoint) * 100);
    }
  }, [targetCGPA, remainingUnits, currentCGPA, totalCredits, maxPoint]);

  // Cooldown effect
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Debounced API call for AI note
  useEffect(() => {
    // Skip in cooldown, while auth resolves, when AI is not allowed, or when there is nothing left to plan.
    if (cooldown > 0 || !user || !aiAllowed || nothingLeft) return;

    setCountdown(5);

    // UI countdown interval
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const timer = setTimeout(async () => {
      setCountdown(null);
      setLoading(true);
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/ai/whatif', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          // gradedInProgressUnits is additive: older servers ignore it.
          body: JSON.stringify({ currentCGPA, totalCredits, targetCGPA, remainingSemesters, creditLoad, ...(gradedInProgress > 0 ? { gradedInProgressUnits: gradedInProgress } : {}), ...scaleContextFor(scale) })
        });
        settledRef.current?.();

        if (!res.ok) {
          const { block: gate, body: data } = await classifyAiResponse(res);
          if (gate) {
            setServerBlock(gate);
            blockedRef.current?.(gate);
          } else if (res.status === 429) {
            const retryAfter = Number(res.headers.get('Retry-After') || data.retryAfterSeconds || 30);
            setCooldown(Math.max(1, retryAfter));
            toast.error(typeof data.error === 'string' ? data.error : `AI guidance limit reached. Try again in ${retryAfter}s.`);
          } else {
            toast.error(typeof data.error === 'string' ? data.error : 'Could not generate AI guidance.');
          }
          return;
        }

        const data = await res.json();
        if (data.feasibilityNote) {
          setFeasibilityNote(data.feasibilityNote);
          setCooldown(30); // Start 30s cooldown after success
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 5000); // 5 seconds debounce

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [targetCGPA, remainingSemesters, creditLoad, currentCGPA, totalCredits, user, aiAllowed, nothingLeft, gradedInProgress, scale]);

  const locked = aiAllowed && (cooldown > 0 || loading);
  const outOfReach = requiredGPA > maxPoint;
  const targetLabelId = `${ids}-target-label`;
  const sliderMin = Math.min(maxPoint, Math.max(0, currentCGPA));

  return (
    <section aria-labelledby={`${ids}-heading`} className="overflow-hidden rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-surface)]">
      <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        {/* Controls */}
        <div className="space-y-7 p-5 sm:p-7">
          <div>
            <h2 id={`${ids}-heading`} className="app-display text-[1.25rem] font-semibold text-[var(--acade-text)]">What-if planner</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--acade-text-muted)]">Drag the target and adjust your remaining load. The numbers update straight away.</p>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <span id={targetLabelId} className="text-sm font-medium text-[var(--acade-text-muted)]">Target CGPA</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="app-num text-[2.75rem] font-bold leading-none text-[var(--acade-text)]">
                    {formatCgpa(targetCGPA)}
                  </span>
                  <span className="app-num text-base font-medium text-[var(--acade-text-muted)]">/ {maxText}</span>
                </div>
              </div>
              <div className="rounded-full bg-[var(--acade-overlay)] px-3.5 py-1.5">
                <span className="text-sm font-medium tabular-nums text-[var(--acade-text-muted)]">Current: <DiscreetValue label="Current CGPA">{formatCgpa(currentCGPA)}</DiscreetValue></span>
              </div>
            </div>

            <RangeSlider
              id={`${ids}-target`}
              aria-labelledby={targetLabelId}
              min={sliderMin}
              max={maxPoint}
              step={0.01}
              pageStep={0.1}
              value={targetCGPA}
              valueText={(value) => `${formatCgpa(value)} out of ${maxText}`}
              onChange={setTargetCGPA}
              disabled={locked}
            />
            <div className="flex justify-between text-sm tabular-nums text-[var(--acade-text-faint)]" aria-hidden="true">
              <span>{formatCgpa(sliderMin)}</span>
              <span>{maxText}</span>
            </div>
            {aiAllowed && cooldown > 0 && (
              <p className="text-center text-sm font-medium tabular-nums text-[var(--acade-text-muted)]" role="status">
                Next AI guidance in {cooldown}s. The numbers above update straight away.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
            <StepperField
              id={`${ids}-semesters`}
              label="Remaining semesters"
              value={remainingSemesters}
              min={1}
              max={20}
              disabled={locked}
              onType={(raw) => setRemainingSemesters(Math.min(20, parseInt(raw) || 1))}
              onStep={setRemainingSemesters}
            />
            <StepperField
              id={`${ids}-units`}
              label="Units per semester"
              value={creditLoad}
              min={1}
              max={30}
              disabled={locked}
              onType={(raw) => setCreditLoad(parseInt(raw) || 18)}
              onStep={setCreditLoad}
            />
          </div>
        </div>

        {/* Results: a night panel, like the arc card on the home page */}
        <div className="flex flex-col gap-5 bg-ag-night p-5 text-white sm:p-7">
          <div className="grid grid-cols-2 gap-4" aria-live="polite">
            <div className="flex min-w-0 flex-col">
              <span className="mb-1 text-sm font-medium text-ag-mist-night">Required GPA</span>
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={outOfReach ? 'impossible' : formatCgpa(requiredGPA)}
                  initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'app-num text-[2.5rem] font-bold leading-none sm:text-[2.75rem]',
                    outOfReach ? 'text-[#FF8A7A]' : 'text-ag-gold'
                  )}
                >
                  <DiscreetValue label="Required GPA">{outOfReach ? `>${maxText}` : formatCgpa(Math.max(0, requiredGPA))}</DiscreetValue>
                </motion.span>
              </AnimatePresence>
              <span className="mt-2 text-sm text-ag-mist-night">each remaining semester</span>
            </div>

            <div className="flex min-w-0 flex-col border-l border-white/10 pl-4">
              <span className="mb-1 text-sm font-medium text-ag-mist-night">Target avg score</span>
              <span className="app-num text-[2rem] font-bold leading-none text-white sm:text-[2.25rem]">
                <DiscreetValue label="Target average score">{outOfReach ? 'Impossible' : `~${Math.max(0, requiredAvgScore).toFixed(0)}%`}</DiscreetValue>
              </span>
            </div>
          </div>

          <div className="flex min-h-[88px] flex-1 items-start gap-3 rounded-2xl bg-white/[0.06] p-4 ring-1 ring-inset ring-white/10">
            <Sparkles size={16} className="mt-1 shrink-0 text-ag-gold" aria-hidden="true" />
            <div className="min-w-0 flex-1" aria-live="polite">
              <p className="mb-1 text-sm font-semibold text-white">AcadeMind</p>
              {nothingLeft ? (
                <p className="text-pretty text-sm leading-relaxed text-white/90">
                  Nothing left to plan: every remaining unit is already graded, so your CGPA can no longer change. Add a future semester to explore a target.
                </p>
              ) : block ? (
                <p className="text-sm leading-relaxed text-ag-mist-night">{block.message}</p>
              ) : loading ? (
                <div className="flex items-center gap-2 text-sm text-ag-mist-night">
                  <Image src="/acadegradeailogo.png" alt="" width={18} height={18} className={cn('size-[18px] shrink-0 object-contain', !shouldReduceMotion && 'animate-pulse')} />
                  <span>AcadeMind is checking how realistic this is…</span>
                </div>
              ) : countdown !== null && countdown > 0 ? (
                <div className="flex items-center gap-2 text-sm text-ag-mist-night">
                  <Loader2 size={16} className={cn(!shouldReduceMotion && 'animate-spin')} aria-hidden="true" />
                  <span>AI guidance in {countdown}s</span>
                </div>
              ) : (
                <p className="text-pretty text-sm leading-relaxed text-white/90">
                  {feasibilityNote || 'Move the target to get AI guidance on how realistic it is.'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      {!block && feasibilityNote && !loading && (
        <div className="border-t border-[var(--acade-border-subtle)] px-5 py-3 sm:px-7">
          <AiDisclosure feature="whatif" />
        </div>
      )}
    </section>
  );
}
