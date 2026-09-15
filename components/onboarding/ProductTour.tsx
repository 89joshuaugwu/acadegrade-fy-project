'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Sparkles, X } from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { navigationSpring } from '@/lib/ui/motion';

export type ProductTourPosition = 'top' | 'bottom' | 'left' | 'right' | 'center';

export interface ProductTourStep {
  targetId?: string;
  title: string;
  description: string;
  position?: ProductTourPosition;
}

interface ProductTourProps {
  tourId: string;
  version: number;
  eligible: boolean;
  completedVersion?: number;
  legacyCompleted?: boolean;
  steps: readonly ProductTourStep[];
  onComplete: (tourId: string, version: number) => void | Promise<void>;
}

const REPLAY_PREFIX = 'acadegrade:tour:replay:';

export function requestTourReplay(tourId: string) {
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(`${REPLAY_PREFIX}${tourId}`, 'true');
  }
}

function hasTarget(step: ProductTourStep) {
  return !step.targetId || Boolean(document.getElementById(step.targetId));
}

function nextAvailableStep(steps: readonly ProductTourStep[], start: number, direction: 1 | -1) {
  let index = start;
  while (index >= 0 && index < steps.length) {
    if (hasTarget(steps[index])) return index;
    index += direction;
  }
  return -1;
}

export function ProductTour({
  tourId,
  version,
  eligible,
  completedVersion = 0,
  legacyCompleted = false,
  steps,
  onComplete,
}: ProductTourProps) {
  const shouldReduceMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [forceOpen, setForceOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);

  useEffect(() => {
    setIsClient(true);
    setViewportWidth(window.innerWidth);
    const replayKey = `${REPLAY_PREFIX}${tourId}`;
    if (window.sessionStorage.getItem(replayKey) === 'true') {
      window.sessionStorage.removeItem(replayKey);
      setForceOpen(true);
    }
  }, [tourId]);

  const shouldShow = isClient && eligible && steps.length > 0 && (
    forceOpen || (!legacyCompleted && completedVersion < version)
  );

  useEffect(() => {
    if (!shouldShow) return;
    const available = nextAvailableStep(steps, 0, 1);
    if (available >= 0) setStepIndex(available);
  }, [shouldShow, steps]);

  const step = steps[stepIndex];

  const updateTarget = useCallback(() => {
    setViewportWidth(window.innerWidth);
    if (!step?.targetId) {
      setTargetRect(null);
      return;
    }
    setTargetRect(document.getElementById(step.targetId)?.getBoundingClientRect() ?? null);
  }, [step]);

  useEffect(() => {
    if (!shouldShow || !step) return;
    updateTarget();
    const target = step.targetId ? document.getElementById(step.targetId) : null;
    if (target && typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ behavior: shouldReduceMotion ? 'auto' : 'smooth', block: 'center' });
    }
    window.addEventListener('resize', updateTarget);
    window.addEventListener('scroll', updateTarget, true);
    return () => {
      window.removeEventListener('resize', updateTarget);
      window.removeEventListener('scroll', updateTarget, true);
    };
  }, [shouldShow, shouldReduceMotion, step, updateTarget]);

  const finish = useCallback(async () => {
    setForceOpen(false);
    await onComplete(tourId, version);
  }, [onComplete, tourId, version]);

  const move = (direction: 1 | -1) => {
    const available = nextAvailableStep(steps, stepIndex + direction, direction);
    if (available < 0 && direction === 1) {
      void finish();
      return;
    }
    if (available >= 0) setStepIndex(available);
  };

  useEffect(() => {
    if (!shouldShow) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const frame = window.requestAnimationFrame(() => dialogRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(frame);
      returnFocusRef.current?.focus?.();
    };
  }, [shouldShow]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      void finish();
      return;
    }
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const availableIndexes = useMemo(
    () => isClient ? steps.map((item, index) => hasTarget(item) ? index : -1).filter((index) => index >= 0) : [],
    [isClient, steps, targetRect]
  );
  const ordinal = Math.max(0, availableIndexes.indexOf(stepIndex));
  const isLast = ordinal === availableIndexes.length - 1;

  const desktopStyle = useMemo<React.CSSProperties>(() => {
    if (viewportWidth < 768 || !targetRect || step?.position === 'center') return {};
    const width = 352;
    const gap = 18;
    const left = Math.max(16, Math.min(targetRect.left + targetRect.width / 2 - width / 2, viewportWidth - width - 16));
    const below = targetRect.bottom + gap;
    const top = below + 250 < window.innerHeight ? below : Math.max(16, targetRect.top - 250 - gap);
    return { left, top, width };
  }, [step?.position, targetRect, viewportWidth]);

  if (!shouldShow || !step || availableIndexes.length === 0) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120]">
        <motion.div
          aria-hidden="true"
          className="absolute inset-0 bg-[rgba(5,8,18,0.76)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}
        />

        {targetRect && viewportWidth >= 768 && (
          <div
            aria-hidden="true"
            className="pointer-events-none fixed rounded-2xl border-2 border-[var(--acade-primary)]"
            style={{
              left: targetRect.left - 7,
              top: targetRect.top - 7,
              width: targetRect.width + 14,
              height: targetRect.height + 14,
              boxShadow: '0 0 0 9999px rgba(5,8,18,0.35), 0 0 28px var(--acade-primary-glow)',
            }}
          />
        )}

        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`tour-${tourId}-title`}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-[121] max-h-[min(32rem,calc(100dvh-1.5rem))] overflow-auto rounded-[var(--radius-dialog)] border border-[var(--acade-border)] bg-[var(--acade-surface)] shadow-[var(--shadow-popover)] outline-none md:inset-auto md:w-[22rem]"
          style={desktopStyle}
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
          transition={shouldReduceMotion ? { duration: 0 } : navigationSpring}
        >
          <div className="h-1 bg-[var(--acade-border-subtle)]">
            <div className="h-full bg-[var(--acade-primary)] transition-[width] motion-reduce:transition-none" style={{ width: `${((ordinal + 1) / availableIndexes.length) * 100}%` }} />
          </div>
          <div className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--acade-primary-dim)] text-[var(--acade-primary)]">
                  <Sparkles size={18} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[length:var(--text-xs)] font-semibold uppercase tracking-[0.14em] text-[var(--acade-text-muted)]">Guided tour</p>
                  <h2 id={`tour-${tourId}-title`} className="mt-1 font-[family-name:var(--font-bricolage)] text-[length:var(--text-lg)] font-bold leading-tight text-[var(--acade-text)]">{step.title}</h2>
                </div>
              </div>
              <button type="button" onClick={() => void finish()} className="flex size-11 shrink-0 items-center justify-center rounded-xl text-[var(--acade-text-muted)] hover:bg-[var(--acade-deep)] hover:text-[var(--acade-text)]" aria-label="Skip tour">
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <p className="mt-4 text-[length:var(--text-sm)] leading-6 text-[var(--acade-text-muted)]">{step.description}</p>
            <div className="mt-6 flex items-center justify-between gap-3 border-t border-[var(--acade-border-subtle)] pt-4">
              <span className="text-[length:var(--text-xs)] tabular-nums text-[var(--acade-text-muted)]">{ordinal + 1} of {availableIndexes.length}</span>
              <div className="flex items-center gap-2">
                {ordinal > 0 && (
                  <button type="button" onClick={() => move(-1)} className="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-[length:var(--text-sm)] font-semibold text-[var(--acade-text-muted)] hover:bg-[var(--acade-deep)] hover:text-[var(--acade-text)]">
                    <ArrowLeft size={16} aria-hidden="true" /> Back
                  </button>
                )}
                <button type="button" onClick={() => move(1)} className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-[var(--acade-primary)] px-4 text-[length:var(--text-sm)] font-semibold text-white hover:bg-[var(--acade-primary-hover)]" aria-label={isLast ? 'Finish tour' : 'Next tour step'}>
                  {isLast ? 'Finish' : 'Next'} {!isLast && <ArrowRight size={16} aria-hidden="true" />}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
