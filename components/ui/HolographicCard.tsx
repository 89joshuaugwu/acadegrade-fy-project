'use client';

import React, { useState, MouseEvent } from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { cn } from '@/lib/utils/cn';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface HolographicCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  glass?: boolean;
}

export function HolographicCard({ children, className, innerClassName, glass = false, ...props }: HolographicCardProps) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (shouldReduceMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <motion.div
      {...props}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'relative overflow-hidden border border-[var(--acade-border)] rounded-2xl shadow-[0_0_40px_rgba(99,102,241,0.06)]',
        glass ? 'bg-[var(--acade-deep)]/40 backdrop-blur-xl border-[var(--acade-border)]/50' : 'bg-[var(--acade-deep)] p-6 md:p-8',
        className
      )}
    >
      {/* Glare effect */}
      {!shouldReduceMotion && (
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-300 z-0"
          style={{
            opacity: isHovered ? 1 : 0,
            background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(99, 102, 241, 0.12), transparent 40%)`,
          }}
        />
      )}
      
      {/* Content wrapper to stay above the glare */}
      <div className={cn("relative z-10 w-full h-full", innerClassName)}>
        {children}
      </div>
    </motion.div>
  );
}
