'use client';

import { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { motion, useSpring, useTransform, AnimatePresence } from 'motion/react';
import CountUp from 'react-countup';
import { cn } from '@/lib/utils/cn';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { resolveDegreeClass } from '@/lib/cgpa/degreeClass';
import { DegreeClassBadge } from './DegreeClassBadge';

type ArcSize = 'sm' | 'md' | 'lg';

interface CGPAArcProps {
  cgpa: number;
  pi: number;
  size?: ArcSize;
  animateOnMount?: boolean;
  showParticles?: boolean;
  className?: string;
  primaryMetric?: 'cgpa' | 'pi';
}

/* ─── Size presets ─── */
const sizeConfig = {
  sm: { viewBox: 52, outerR: 20, innerR: 15, outerStroke: 4, innerStroke: 2.5, padding: 2 },
  md: { viewBox: 180, outerR: 72, innerR: 58, outerStroke: 9, innerStroke: 5, padding: 8 },
  lg: { viewBox: 280, outerR: 112, innerR: 92, outerStroke: 12, innerStroke: 6, padding: 12 },
};

const containerSizes = { sm: 'w-[52px] h-[52px]', md: 'w-[180px] h-[180px]', lg: 'w-[280px] h-[280px]' };

/* ─── Arc math ─── */
const SWEEP_DEGREES = 270;
const START_ANGLE_DEG = 135; // Open at bottom
const SWEEP_RAD = (SWEEP_DEGREES * Math.PI) / 180;
const START_RAD = (START_ANGLE_DEG * Math.PI) / 180;

function polarToCartesian(cx: number, cy: number, r: number, angleRad: number) {
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const sweepDeg = ((endAngle - startAngle) * 180) / Math.PI;
  const largeArc = sweepDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

/** Map a 0-5 metric value to a gradient color */
function getMetricColor(value: number): string {
  if (value >= 4.5) return 'var(--grade-a)';     // First class — green
  if (value >= 3.5) return 'var(--grade-b)';     // 2:1 — indigo
  if (value >= 2.4) return 'var(--grade-c)';     // 2:2 — amber
  if (value >= 1.5) return 'var(--grade-d)';     // Third — orange
  return 'var(--grade-e)';                       // Below — red
}

/** PI Info Tooltip Component */
function PITooltip({ size }: { size: ArcSize }) {
  const [show, setShow] = useState(false);

  if (size === 'sm') return null;

  return (
    <span className="relative inline-flex items-center ml-1">
      <button
        type="button"
        aria-label="What is Performance Index?"
        className={cn(
          'inline-flex items-center justify-center rounded-full',
          'text-[var(--acade-text-faint)] hover:text-[var(--acade-gold)]',
          'transition-colors duration-200 cursor-help',
          size === 'lg' ? 'w-4 h-4 text-[11px]' : 'w-3.5 h-3.5 text-[10px]'
        )}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        onClick={() => setShow((v) => !v)}
      >
        ℹ️
      </button>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2',
              'w-[260px] p-3 rounded-xl',
              'bg-[var(--acade-surface)] border border-[var(--acade-border)]',
              'shadow-[0_8px_32px_rgba(0,0,0,0.5)]',
              'text-[length:var(--text-xs)] leading-relaxed',
              'text-[var(--acade-text-muted)]',
              'font-[family-name:var(--font-dm-sans)]',
              'pointer-events-none'
            )}
          >
            <span className="font-semibold text-[var(--acade-text)]">
              Performance Index (PI)
            </span>{' '}
            measures your raw continuous academic mastery. While CGPA rounds your
            grades into letters, PI represents your actual weighted percentage
            score on a 5.0 scale{' '}
            <span className="text-[var(--acade-gold)] font-medium">
              (e.g., a 3.04 PI means your overall average raw score is 60.8%)
            </span>
            .
            {/* Tooltip arrow */}
            <span
              className="absolute top-full left-1/2 -translate-x-1/2 -mt-px"
              style={{
                width: 0,
                height: 0,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: '6px solid var(--acade-border)',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

/**
 * CGPAArc — THE SIGNATURE COMPONENT
 *
 * 270° sweep arc (open at bottom):
 * - Outer arc: CGPA (thick stroke, color coded by grade)
 * - Inner arc: PI (thin stroke, gold)
 * - Center: CGPA number (Geist Mono, react-countup)
 * - Below center: PI value (muted)
 * - Glowing dot at arc tip
 * - Particle burst on animation completion (lg only)
 * - DegreeClassBadge below the arc
 */
function CGPAArc({
  cgpa,
  pi,
  size = 'lg',
  animateOnMount = true,
  showParticles = false,
  className,
  primaryMetric = 'cgpa',
}: CGPAArcProps) {
  const shouldReduceMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hasAnimated = useRef(false);

  const config = sizeConfig[size];
  const cx = config.viewBox / 2;
  const cy = config.viewBox / 2;

  // Clamp values to 0-5 range
  const clampedCGPA = Math.max(0, Math.min(5, cgpa));
  const clampedPI = Math.max(0, Math.min(5, pi));

  // Arc fractions (0 to 1)
  const cgpaFrac = clampedCGPA / 5;
  const piFrac = clampedPI / 5;

  // Full arc path (background track)
  const fullArcPath = describeArc(cx, cy, config.outerR, START_RAD, START_RAD + SWEEP_RAD);
  const fullInnerPath = describeArc(cx, cy, config.innerR, START_RAD, START_RAD + SWEEP_RAD);

  // Circumference of the arc path
  const outerCircumference = config.outerR * SWEEP_RAD;
  const innerCircumference = config.innerR * SWEEP_RAD;

  // Spring for CGPA arc
  const cgpaSpring = useSpring(shouldReduceMotion || !animateOnMount ? cgpaFrac : 0, {
    stiffness: 55,
    damping: 16,
    mass: 1.3,
  });

  // Spring for PI arc
  const piSpring = useSpring(shouldReduceMotion || !animateOnMount ? piFrac : 0, {
    stiffness: 55,
    damping: 16,
    mass: 1.3,
  });

  // Dash offset transforms
  const outerSpring = primaryMetric === 'cgpa' ? cgpaSpring : piSpring;
  const innerSpring = primaryMetric === 'cgpa' ? piSpring : cgpaSpring;

  const outerDashOffset = useTransform(outerSpring, (v: number) => outerCircumference * (1 - v));
  const innerDashOffset = useTransform(innerSpring, (v: number) => innerCircumference * (1 - v));

  // Determine active metrics
  const primarySpring = outerSpring;
  const primaryFrac = primaryMetric === 'cgpa' ? cgpaFrac : piFrac;

  // Glowing dot position
  const dotAngle = useTransform(primarySpring, (v: number) => START_RAD + SWEEP_RAD * v);
  const dotX = useTransform(dotAngle, (a: number) => cx + config.outerR * Math.cos(a));
  const dotY = useTransform(dotAngle, (a: number) => cx + config.outerR * Math.sin(a));

  // Animate on mount
  useEffect(() => {
    if (!hasAnimated.current) {
      cgpaSpring.set(cgpaFrac);
      piSpring.set(piFrac);
      hasAnimated.current = true;
    }
  }, [cgpaFrac, piFrac, cgpaSpring, piSpring]);

  // Update on value changes after initial mount
  useEffect(() => {
    if (hasAnimated.current) {
      cgpaSpring.set(cgpaFrac);
      piSpring.set(piFrac);
    }
  }, [cgpaFrac, piFrac, cgpaSpring, piSpring]);

  // Particle burst effect (large size only)
  const fireParticles = useCallback(() => {
    if (!showParticles || size !== 'lg' || shouldReduceMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 280;
    canvas.height = 280;

    const particles: { x: number; y: number; vx: number; vy: number; r: number; alpha: number; color: string }[] = [];
    const colors = ['#6366F1', '#818CF8', '#F59E0B', '#22C55E', '#38BDF8'];

    // Spawn from arc tip position
    const tipAngle = START_RAD + SWEEP_RAD * primaryFrac;
    const tipX = cx + config.outerR * Math.cos(tipAngle);
    const tipY = cy + config.outerR * Math.sin(tipAngle);

    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      particles.push({
        x: tipX,
        y: tipY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 1.5 + Math.random() * 2.5,
        alpha: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    let frame: number;
    function animate() {
      ctx!.clearRect(0, 0, 280, 280);
      let alive = false;

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.015;
        p.r *= 0.98;

        if (p.alpha > 0) {
          alive = true;
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx!.fillStyle = p.color;
          ctx!.globalAlpha = Math.max(0, p.alpha);
          ctx!.fill();
        }
      }

      ctx!.globalAlpha = 1;
      if (alive) {
        frame = requestAnimationFrame(animate);
      }
    }

    // Fire after spring settles (~1.5s)
    const timeout = setTimeout(() => animate(), 1500);
    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(frame);
    };
  }, [showParticles, size, shouldReduceMotion, primaryFrac, cx, cy, config.outerR]);

  useEffect(() => {
    const cleanup = fireParticles();
    return () => cleanup?.();
  }, [fireParticles]);

  // CGPA always gets gold/orange, PI always gets the grade-based color
  const piColor = getMetricColor(clampedPI);
  const cgpaGoldColor = 'var(--acade-gold)';

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <div className={cn('relative', containerSizes[size])}>
        <svg
          viewBox={`0 0 ${config.viewBox} ${config.viewBox}`}
          className="w-full h-full"
          aria-label={`CGPA: ${clampedCGPA.toFixed(2)}, PI: ${clampedPI.toFixed(2)}`}
          role="img"
        >
          <defs>
            <linearGradient id={`pi-grad-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={piColor} stopOpacity="0.9" />
              <stop offset="100%" stopColor={piColor} stopOpacity="1" />
            </linearGradient>
            <linearGradient id={`cgpa-gold-grad-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={cgpaGoldColor} stopOpacity="0.9" />
              <stop offset="100%" stopColor={cgpaGoldColor} stopOpacity="1" />
            </linearGradient>
            <filter id={`arc-glow-${size}`}>
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background tracks */}
          <path
            d={fullArcPath}
            fill="none"
            stroke="var(--acade-border)"
            strokeWidth={config.outerStroke}
            strokeLinecap="round"
            opacity="0.3"
          />
          <path
            d={fullInnerPath}
            fill="none"
            stroke="var(--acade-border)"
            strokeWidth={config.innerStroke}
            strokeLinecap="round"
            opacity="0.2"
          />

          {/* Inner arc (Secondary Metric) */}
          <motion.path
            d={fullInnerPath}
            fill="none"
            stroke={primaryMetric === 'cgpa' ? `url(#pi-grad-${size})` : `url(#cgpa-gold-grad-${size})`}
            strokeWidth={config.innerStroke}
            strokeLinecap="round"
            strokeDasharray={innerCircumference}
            style={{ strokeDashoffset: innerDashOffset }}
            opacity="0.85"
          />

          {/* Outer arc (Primary Metric) */}
          <motion.path
            d={fullArcPath}
            fill="none"
            stroke={primaryMetric === 'cgpa' ? `url(#cgpa-gold-grad-${size})` : `url(#pi-grad-${size})`}
            strokeWidth={config.outerStroke}
            strokeLinecap="round"
            strokeDasharray={outerCircumference}
            style={{ strokeDashoffset: outerDashOffset }}
            filter={size === 'lg' ? `url(#arc-glow-${size})` : undefined}
          />

          {/* Glowing dot at arc tip */}
          {size !== 'sm' && (
            <motion.circle
              cx={dotX}
              cy={dotY}
              r={size === 'lg' ? 5 : 3.5}
              fill="white"
              className="animate-[pulse-glow_2s_ease-in-out_infinite]"
            />
          )}
        </svg>

        {/* Center text — CGPA + PI numbers */}
        {size !== 'sm' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={cn(
                'font-[family-name:var(--font-geist-mono)] font-bold tabular-nums leading-none',
                size === 'lg'
                  ? 'text-[length:var(--cgpa-num)]'
                  : 'text-[length:var(--text-3xl)]'
              )}
              style={{ color: primaryMetric === 'cgpa' ? cgpaGoldColor : piColor }}
            >
              {animateOnMount && !shouldReduceMotion ? (
                <CountUp
                  end={primaryMetric === 'cgpa' ? clampedCGPA : clampedPI}
                  decimals={2}
                  duration={1.8}
                  delay={0.3}
                />
              ) : (
                (primaryMetric === 'cgpa' ? clampedCGPA : clampedPI).toFixed(2)
              )}
            </span>
            <span
              className={cn(
                'font-[family-name:var(--font-geist-mono)] text-[var(--acade-text-muted)] tabular-nums mt-1 inline-flex items-center',
                size === 'lg'
                  ? 'text-[length:var(--text-sm)]'
                  : 'text-[length:var(--text-xs)]'
              )}
            >
              {primaryMetric === 'cgpa'
                ? <><span>PI: {clampedPI.toFixed(2)}</span><PITooltip size={size} /></>
                : `CGPA: ${clampedCGPA.toFixed(2)}`
              }
            </span>
          </div>
        )}

        {/* Particle canvas overlay (lg only) */}
        {showParticles && size === 'lg' && !shouldReduceMotion && (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            aria-hidden="true"
          />
        )}
      </div>

      {/* Degree class badge below arc */}
      {size !== 'sm' && (
        <DegreeClassBadge
          cgpa={primaryMetric === 'cgpa' ? clampedCGPA : clampedPI}
          animated={animateOnMount}
        />
      )}
    </div>
  );
}

export { CGPAArc };
export type { CGPAArcProps, ArcSize };
