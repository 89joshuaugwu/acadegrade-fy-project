'use client';

import { useCallback, useRef, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { cn } from '@/lib/utils/cn';

interface RangeSliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Larger jump for PageUp / PageDown. Defaults to ten steps. */
  pageStep?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  /** Spoken value, e.g. "3.60 out of 5.00". */
  valueText?: (value: number) => string;
  className?: string;
}

function decimalsOf(step: number) {
  const text = String(step);
  const dot = text.indexOf('.');
  return dot === -1 ? 0 : text.length - dot - 1;
}

/**
 * A custom horizontal slider (no native range input): role="slider" with the
 * full keyboard model (arrows, PageUp/PageDown, Home/End) and pointer drag.
 * The track fills along the brand arc colours, violet to gold.
 */
export function RangeSlider({
  value,
  min,
  max,
  step = 1,
  pageStep,
  onChange,
  disabled = false,
  id,
  valueText,
  className,
  ...aria
}: RangeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const decimals = decimalsOf(step);
  const span = Math.max(max - min, Number.EPSILON);
  const safeValue = Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
  const position = ((safeValue - min) / span) * 100;

  const snap = useCallback((raw: number) => {
    const clamped = Math.min(max, Math.max(min, raw));
    const stepped = Math.round((clamped - min) / step) * step + min;
    return Number(Math.min(max, Math.max(min, stepped)).toFixed(decimals));
  }, [decimals, max, min, step]);

  const commit = useCallback((next: number) => {
    const snapped = snap(next);
    if (snapped !== safeValue) onChange(snapped);
  }, [onChange, safeValue, snap]);

  const valueFromPointer = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return safeValue;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return min + ratio * span;
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const big = pageStep ?? step * 10;
    let next: number | null = null;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        next = safeValue + step;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        next = safeValue - step;
        break;
      case 'PageUp':
        next = safeValue + big;
        break;
      case 'PageDown':
        next = safeValue - big;
        break;
      case 'Home':
        next = min;
        break;
      case 'End':
        next = max;
        break;
      default:
        return;
    }
    event.preventDefault();
    commit(next);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || (event.pointerType === 'mouse' && event.button !== 0)) return;
    dragging.current = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.currentTarget.focus();
    commit(valueFromPointer(event.clientX));
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current || disabled) return;
    commit(valueFromPointer(event.clientX));
  };

  const stopDragging = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  return (
    <div
      id={id}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={safeValue}
      aria-valuetext={valueText ? valueText(safeValue) : undefined}
      aria-orientation="horizontal"
      aria-disabled={disabled || undefined}
      {...aria}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      className={cn(
        'group relative flex h-12 w-full touch-pan-y select-none items-center rounded-[var(--radius-control)] outline-none',
        'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--acade-primary)]',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        className
      )}
    >
      <div ref={trackRef} className="relative h-2.5 w-full rounded-full bg-[var(--acade-overlay)] ring-1 ring-inset ring-[var(--acade-border-subtle)]">
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-[linear-gradient(90deg,#6B4EFF_0%,#9C6BE8_45%,#F08C5A_75%,#FFB23F_100%)]"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0 round 9999px)` }}
        />
        <span
          aria-hidden="true"
          className={cn(
            'absolute top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[var(--acade-primary)] bg-white shadow-[0_2px_8px_rgba(23,19,58,0.22)] transition-transform duration-150',
            !disabled && 'group-hover:scale-110 group-active:scale-110',
            'group-focus-visible:ring-4 group-focus-visible:ring-[var(--acade-primary)]/25'
          )}
          style={{ left: `${position}%` }}
        />
      </div>
    </div>
  );
}
