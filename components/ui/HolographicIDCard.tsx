'use client';

import React, { useRef } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'motion/react';
import { cn } from '@/lib/utils/cn';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface Props {
  children: React.ReactNode;
  className?: string;
}

export function HolographicIDCard({ children, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  // Motion values to track mouse position
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth springs to make the tilt feel physical and heavy
  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });

  // Map mouse position to rotation degrees (tilt effect)
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['10deg', '-10deg']);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-10deg', '10deg']);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current || shouldReduceMotion) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Convert to percentages (-0.5 to 0.5)
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    // Return to center when mouse leaves
    x.set(0);
    y.set(0);
  };

  return (
    <div className={cn("perspective-1000", className)} style={{ perspective: 1000 }}>
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX: shouldReduceMotion ? 0 : rotateX,
          rotateY: shouldReduceMotion ? 0 : rotateY,
          transformStyle: 'preserve-3d',
        }}
        className="relative w-full h-full rounded-3xl bg-gradient-to-br from-[var(--acade-surface)] to-[var(--acade-deep)] border border-[var(--acade-border)] shadow-2xl p-8 transition-shadow hover:shadow-[0_0_40px_rgba(79,70,229,0.1)]"
      >
        {/* Holographic Sheen/Glare */}
        {!shouldReduceMotion && (
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-3xl z-10"
            style={{
              background: useTransform(
                () =>
                  `radial-gradient(circle at ${(x.get() + 0.5) * 100}% ${(y.get() + 0.5) * 100}%, rgba(255,255,255,0.06) 0%, transparent 60%)`
              ),
            }}
          />
        )}
        
        {/* TranslateZ pops the content off the card in 3D space */}
        <div style={{ transform: 'translateZ(40px)' }} className="relative z-20 w-full h-full">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
