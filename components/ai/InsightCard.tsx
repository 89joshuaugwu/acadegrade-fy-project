'use client';

import { useEffect } from 'react';
import { motion, animate, useMotionValue, useTransform } from 'motion/react';
import Image from 'next/image';
import { cn } from '@/lib/utils/cn';

interface InsightCardProps {
  title: string;
  content: string | string[];
  type: 'success' | 'warning' | 'danger' | 'info';
  animated?: boolean;
  /** "hero" sets the card on a night panel (used for the degree outlook). */
  variant?: 'default' | 'hero';
  className?: string;
}

const dotMap = {
  success: 'bg-[var(--acade-success)]',
  warning: 'bg-[var(--acade-warning)]',
  danger: 'bg-[var(--acade-danger)]',
  info: 'bg-[var(--acade-primary)]',
};

function TypewriterText({ text, animated = true }: { text: string; animated?: boolean }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  const displayText = useTransform(rounded, (latest) => text.slice(0, latest));

  useEffect(() => {
    if (!animated) {
      count.set(text.length);
      return;
    }
    const controls = animate(count, text.length, {
      type: 'tween',
      duration: Math.min(2, text.length * 0.015), // Scale duration with length, max 2s
      ease: 'linear',
    });
    return controls.stop;
  }, [text, animated, count]);

  return <motion.span>{displayText}</motion.span>;
}

export function InsightCard({ title, content, type, animated = true, variant = 'default', className }: InsightCardProps) {
  const isList = Array.isArray(content);
  const hero = variant === 'hero';

  return (
    <motion.div
      initial={animated ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative overflow-hidden rounded-[var(--radius-surface)] p-5 sm:p-6',
        hero
          ? 'bg-ag-night text-white ring-1 ring-inset ring-white/10 sm:p-7'
          : 'border border-[var(--acade-border)] bg-[var(--acade-surface)]',
        className
      )}
    >
      {hero && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-[radial-gradient(circle,rgba(255,178,63,0.28),transparent_65%)]"
        />
      )}
      {/* Title and AI badge share a wrapping row so a long title never sits under the badge on phones. */}
      <div className="relative mb-4 flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <h3
          className={cn(
            'app-display flex min-w-0 items-center gap-2 text-balance font-semibold',
            hero ? 'text-[1.375rem] text-white' : 'text-[1.0625rem] text-[var(--acade-text)]'
          )}
        >
          <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', hero ? 'bg-ag-gold' : dotMap[type])} />
          {title}
        </h3>
        <span
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1',
            hero ? 'bg-white/10' : 'bg-[var(--acade-overlay)]'
          )}
        >
          <Image src="/acadegradeailogo.png" alt="" width={14} height={14} className="rounded-full" />
          <span className={cn('text-[0.8125rem] font-medium', hero ? 'text-ag-mist-night' : 'text-[var(--acade-text-muted)]')}>AI analysis</span>
        </span>
      </div>

      <div
        className={cn(
          'relative space-y-2 leading-relaxed',
          hero ? 'text-base leading-7 text-white/90' : 'text-[0.9375rem] text-[var(--acade-text-muted)]'
        )}
      >
        {isList ? (
          <ul className="space-y-2.5">
            {(content as string[]).map((item, idx) => (
              <li key={idx} className="flex gap-2.5 text-pretty">
                <span aria-hidden="true" className={cn('mt-[0.6em] size-1.5 shrink-0 rounded-full', hero ? 'bg-ag-gold' : dotMap[type])} />
                <span className="min-w-0"><TypewriterText text={item} animated={animated} /></span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-pretty">
            <TypewriterText text={content as string} animated={animated} />
          </p>
        )}
      </div>
    </motion.div>
  );
}
