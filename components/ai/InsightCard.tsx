'use client';

import { useState, useEffect } from 'react';
import { motion, animate, useMotionValue, useTransform } from 'motion/react';
import Image from 'next/image';
import { cn } from '@/lib/utils/cn';

interface InsightCardProps {
  title: string;
  content: string | string[];
  type: 'success' | 'warning' | 'danger' | 'info';
  animated?: boolean;
}

const colorMap = {
  success: 'border-l-[var(--acade-success)]',
  warning: 'border-l-[var(--acade-warning)]',
  danger: 'border-l-[var(--acade-danger)]',
  info: 'border-l-[var(--acade-primary)]',
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-[var(--acade-surface)] border border-[var(--acade-border)] rounded-2xl p-5 md:p-6 relative overflow-hidden',
        'border-l-4',
        colorMap[type]
      )}
    >
      <div className="absolute top-4 right-4 flex items-center gap-2 bg-[var(--acade-deep)] border border-[var(--acade-border-subtle)] px-2 py-1 rounded-full">
        <Image src="/acadegradeailogo.png" alt="AcadeMind" width={14} height={14} className="rounded-full" />
        <span className="text-[10px] font-bold text-[var(--acade-text-muted)] tracking-wider uppercase">AcadeMind Analysis</span>
      </div>

      <h3 className="text-[length:var(--text-base)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)] mb-4">
        {title}
      </h3>

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
