'use client';

import { useState, useEffect, useId, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Loader2 } from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils/cn';
import { useAuth } from '@/hooks/useAuth';
import { formatCgpa, MAX_GRADE_POINT, requiredAverageForTarget } from '@/lib/cgpa/academicRules';
import toast from 'react-hot-toast';
import { classifyAiResponse, type AiBlock } from './aiAccess';
import { AiDisclosure } from './AiDisclosure';
import { DiscreetValue } from '@/lib/discreet';

interface WhatIfCalculatorProps {
  currentCGPA: number;
  totalCredits: number;
  initialRemainingSemesters: number;
  initialCreditLoad?: number;
  /** Called after each AI guidance request completes (success or error), e.g. to refresh credit counts. */
  onRequestSettled?: () => void;
  /** AI is not allowed (age, consent, maintenance): no guidance requests; the maths still works. */
  aiBlock?: AiBlock | null;
  /** The server refused guidance with a gate code (403 age/consent, 503 maintenance/disabled). */
  onAiBlocked?: (block: AiBlock) => void;
}

const fieldClass = 'w-full min-h-12 bg-[var(--acade-surface)] border border-[var(--acade-control-border)] rounded-[var(--radius-control)] px-4 py-3 text-base text-[var(--acade-text)] font-[family-name:var(--font-geist-mono)] tabular-nums focus:outline-none focus:border-[var(--acade-primary)] focus:ring-2 focus:ring-[var(--acade-primary)]/20 transition-colors';

export function WhatIfCalculator({
  currentCGPA,
  totalCredits,
  initialRemainingSemesters,
  initialCreditLoad = 18,
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

  const [targetCGPA, setTargetCGPA] = useState(Math.min(5.0, currentCGPA + 0.2));
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

  useEffect(() => {
    setRemainingSemesters(initialRemainingSemesters);
  }, [initialRemainingSemesters]);

  // Client-side math computation
  useEffect(() => {
    const reqGPA = requiredAverageForTarget({
      currentCgpa: currentCGPA,
      completedUnits: totalCredits,
      targetCgpa: targetCGPA,
      remainingUnits: remainingSemesters * creditLoad,
    });
    if (reqGPA !== null) {
      setRequiredGPA(reqGPA);
      setRequiredAvgScore((reqGPA / 5) * 100);
    }
  }, [targetCGPA, remainingSemesters, creditLoad, currentCGPA, totalCredits]);

  // Cooldown effect
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Debounced API call for AI note
  useEffect(() => {
    if (cooldown > 0 || !user || !aiAllowed) return; // Skip in cooldown, while auth resolves, or when AI is not allowed

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
          body: JSON.stringify({ currentCGPA, totalCredits, targetCGPA, remainingSemesters, creditLoad })
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
  }, [targetCGPA, remainingSemesters, creditLoad, currentCGPA, totalCredits, user, aiAllowed]);

  const locked = aiAllowed && (cooldown > 0 || loading);
  const span = Math.max(0.01, MAX_GRADE_POINT - currentCGPA);
  const position = Math.min(100, Math.max(0, ((targetCGPA - currentCGPA) / span) * 100));
  const outOfReach = requiredGPA > MAX_GRADE_POINT;

  return (
    <div className="bg-[var(--acade-deep)] border border-[var(--acade-border)] rounded-[var(--radius-surface)] overflow-hidden">
      {/* Top Section - Controls */}
      <div className="p-5 md:p-8 border-b border-[var(--acade-border-subtle)] space-y-8">

        {/* Slider Area */}
        <div className="space-y-4">
          <div className="flex flex-wrap justify-between items-end gap-3">
            <div>
              <label htmlFor={`${ids}-target`} className="text-sm font-medium text-[var(--acade-text-muted)]">Target CGPA</label>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-[length:var(--text-4xl)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-geist-mono)] tabular-nums">
                  {formatCgpa(targetCGPA)}
                </span>
                <span className="text-sm text-[var(--acade-text-muted)]">/ 5.00</span>
              </div>
            </div>
            <div className="bg-[var(--acade-surface)] px-3 py-1.5 rounded-lg border border-[var(--acade-border)]">
              <span className="text-sm text-[var(--acade-text-muted)] font-medium tabular-nums">Current: <DiscreetValue label="Current CGPA">{formatCgpa(currentCGPA)}</DiscreetValue></span>
            </div>
          </div>

          <div className="relative w-full h-12 flex items-center">
            <input
              id={`${ids}-target`}
              type="range"
              min={currentCGPA}
              max={5.0}
              step={0.01}
              value={targetCGPA}
              aria-valuetext={`${formatCgpa(targetCGPA)} out of 5.00`}
              onChange={(e) => setTargetCGPA(parseFloat(e.target.value))}
              disabled={locked}
              className={cn("peer absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10", locked && "cursor-not-allowed")}
            />
            {/* Custom Track */}
            <div className="absolute inset-x-0 h-2 bg-[var(--acade-surface)] rounded-full overflow-hidden border border-[var(--acade-border-subtle)] pointer-events-none">
              <div className="h-full bg-[var(--acade-primary)]" style={{ width: `${position}%` }} />
            </div>
            {/* Custom Thumb */}
            <motion.div
              className="absolute h-6 w-6 -ml-3 bg-white rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.3)] border-2 border-[var(--acade-primary)] pointer-events-none flex items-center justify-center peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--acade-primary)]"
              style={{ left: `${position}%` }}
              animate={{ scale: loading && !shouldReduceMotion ? 0.9 : 1 }}
            >
              <div className="w-1.5 h-1.5 bg-[var(--acade-primary)] rounded-full" />
            </motion.div>
          </div>
          {aiAllowed && cooldown > 0 && (
            <p className="text-center text-xs font-semibold text-[var(--acade-text-muted)] tabular-nums" role="status">
              Next AI guidance in {cooldown}s. The numbers above update straight away.
            </p>
          )}
        </div>

        {/* Number Inputs */}
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor={`${ids}-semesters`} className="text-sm font-medium text-[var(--acade-text-muted)]">Remaining semesters</label>
            <input
              id={`${ids}-semesters`}
              type="number"
              inputMode="numeric"
              min={1}
              max={20}
              value={remainingSemesters}
              onChange={(e) => setRemainingSemesters(Math.min(20, parseInt(e.target.value) || 1))}
              disabled={locked}
              className={cn(fieldClass, locked && "opacity-50 cursor-not-allowed")}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor={`${ids}-units`} className="text-sm font-medium text-[var(--acade-text-muted)]">Units per semester</label>
            <input
              id={`${ids}-units`}
              type="number"
              inputMode="numeric"
              min={1}
              max={30}
              value={creditLoad}
              onChange={(e) => setCreditLoad(parseInt(e.target.value) || 18)}
              disabled={locked}
              className={cn(fieldClass, locked && "opacity-50 cursor-not-allowed")}
            />
          </div>
        </div>
      </div>

      {/* Bottom Section - Results */}
      <div className="p-5 md:p-8 bg-[var(--acade-surface)]/50 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6 w-full md:w-auto" aria-live="polite">
            <div className="flex flex-col">
              <span className="text-sm text-[var(--acade-text-muted)] font-medium mb-1">Required GPA</span>
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={outOfReach ? 'impossible' : formatCgpa(requiredGPA)}
                  initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "text-[length:var(--text-3xl)] font-bold font-[family-name:var(--font-geist-mono)] tabular-nums",
                    outOfReach ? "text-[var(--acade-danger)]" : "text-[var(--acade-primary)]"
                  )}
                >
                  <DiscreetValue label="Required GPA">{outOfReach ? '>5.00' : formatCgpa(Math.max(0, requiredGPA))}</DiscreetValue>
                </motion.span>
              </AnimatePresence>
            </div>

            <div className="w-px h-12 bg-[var(--acade-border)]" aria-hidden="true" />

            <div className="flex flex-col">
              <span className="text-sm text-[var(--acade-text-muted)] font-medium mb-1">Target avg score</span>
              <span className="text-[length:var(--text-2xl)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-geist-mono)] tabular-nums">
                <DiscreetValue label="Target average score">{outOfReach ? 'Impossible' : `~${Math.max(0, requiredAvgScore).toFixed(0)}%`}</DiscreetValue>
              </span>
            </div>
          </div>

          <div className="flex-1 bg-[var(--acade-overlay)] rounded-[var(--radius-control)] p-4 border border-[var(--acade-border-subtle)] min-h-[80px] flex items-start gap-3 w-full">
            <Sparkles size={16} className="mt-1 shrink-0 text-[var(--acade-gold)]" aria-hidden="true" />
            <div className="min-w-0 flex-1" aria-live="polite">
              {block ? (
                <p className="text-sm text-[var(--acade-text-muted)] leading-relaxed">{block.message}</p>
              ) : loading ? (
                <div className="flex items-center gap-2 text-[var(--acade-text-muted)] text-sm">
                  <Image src="/acadegradeailogo.png" alt="" width={18} height={18} className={cn("size-[18px] shrink-0 object-contain", !shouldReduceMotion && "animate-pulse")} />
                  <span>AcadeMind is checking how realistic this is…</span>
                </div>
              ) : countdown !== null && countdown > 0 ? (
                <div className="flex items-center gap-2 text-[var(--acade-text-muted)] text-sm">
                  <Loader2 size={16} className={cn(!shouldReduceMotion && "animate-spin")} aria-hidden="true" />
                  <span>AI guidance in {countdown}s</span>
                </div>
              ) : (
                <p className="text-sm text-[var(--acade-text)] leading-relaxed text-pretty">
                  {feasibilityNote || 'Move the target to get AI guidance on how realistic it is.'}
                </p>
              )}
            </div>
          </div>
        </div>
        {!block && feasibilityNote && !loading && <AiDisclosure feature="whatif" />}
      </div>
    </div>
  );
}
