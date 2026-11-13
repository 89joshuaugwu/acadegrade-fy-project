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

export function InsightCard({ title, content, type, animated = true }: InsightCardProps) {
  const isList = Array.isArray(content);
  
  return (
    <motion.div 
      initial={animated ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--acade-surface)] border border-[var(--acade-border)] rounded-2xl p-5 md:p-6 relative overflow-hidden"
    >
      {/* Title and AI badge share a wrapping row so a long title never sits under the badge on phones. */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <h3 className="flex min-w-0 items-center gap-2 text-[length:var(--text-base)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)] text-balance">
          <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', dotMap[type])} />
          {title}
        </h3>
        <span className="flex shrink-0 items-center gap-1.5 bg-[var(--acade-deep)] border border-[var(--acade-border-subtle)] px-2 py-1 rounded-full">
          <Image src="/acadegradeailogo.png" alt="" width={14} height={14} className="rounded-full" />
          <span className="text-xs font-semibold text-[var(--acade-text-muted)]">AI analysis</span>
        </span>
      </div>

      <div className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] leading-relaxed space-y-2">
        {isList ? (
          <ul className="list-disc list-inside space-y-2">
            {(content as string[]).map((item, idx) => (
              <li key={idx} className="pl-1 text-pretty">
                <TypewriterText text={item} animated={animated} />
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
