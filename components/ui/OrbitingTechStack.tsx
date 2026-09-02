'use client';

import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils/cn';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Zap, Code2, ShieldCheck, Palette, Database, Cpu } from 'lucide-react';

const TECH_ICONS: Record<string, React.ReactNode> = {
  'Next.js': <Zap size={24} />,
  React: <Code2 size={24} />,
  Firebase: <ShieldCheck size={24} />,
  'Tailwind CSS': <Palette size={24} />,
  TypeScript: <Code2 size={24} />,
  Firestore: <Database size={24} />,
  Default: <Cpu size={24} />,
};

function getIcon(name: string) {
  return TECH_ICONS[name] ?? TECH_ICONS.Default;
}

interface TechNode {
  name: string;
  description: string;
}

export function OrbitingTechStack({ techStack }: { techStack: TechNode[] }) {
  const shouldReduceMotion = useReducedMotion();
  
  // Desktop responsive radiuses
  const radius = 240; 

  if (shouldReduceMotion) {
      // Fallback for reduced motion is just the normal 2D grid
      return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {techStack.map(tech => (
                <div
                  key={tech.name}
                  className="bg-[var(--acade-surface)] border border-[var(--acade-border-subtle)] rounded-2xl p-6 flex flex-col items-center text-center gap-4 hover:border-[var(--acade-border)] hover:bg-[var(--acade-deep)] transition-all"
                >
                  <div className="p-3 bg-[var(--acade-deep)] rounded-xl text-[var(--acade-primary)]">
                    {getIcon(tech.name)}
                  </div>
                  <div>
                    <h3 className="font-bold text-[length:var(--text-lg)] text-white">{tech.name}</h3>
                    <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] mt-1">
                      {tech.description}
                    </p>
                  </div>
                </div>
              ))}
          </div>
      );
  }

  return (
    <div className="relative w-full h-[600px] flex items-center justify-center overflow-hidden my-10 hidden md:flex">
      
      {/* Central Core Glow to match the 3D Tesseract behind it */}
      <div className="absolute w-40 h-40 bg-[var(--acade-primary)]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute w-20 h-20 bg-[var(--acade-gold)]/10 rounded-full blur-2xl pointer-events-none" />

      {/* Orbit Rings (Subtle guides) */}
      <div className="absolute w-[440px] h-[440px] border border-[var(--acade-border)]/30 rounded-full pointer-events-none" />
      <div className="absolute w-[300px] h-[300px] border border-[var(--acade-border)]/10 rounded-full pointer-events-none" />

      {/* Rotating Container */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        className="absolute w-[600px] h-[600px]"
      >
        {techStack.map((tech, i) => {
          const angle = (i / techStack.length) * 360;
          return (
            <div
              key={tech.name}
              className="absolute top-1/2 left-1/2"
              style={{
                transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-${radius}px)`,
              }}
            >
              {/* Counter-rotate the card itself so the text remains upright while orbiting */}
              <motion.div
                animate={{ rotate: [-angle, -angle - 360] }}
                transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
                className={cn(
                  "w-48 bg-[var(--acade-deep)]/60 backdrop-blur-xl border border-[var(--acade-border)]/50 rounded-2xl p-4 flex flex-col items-center text-center gap-2",
                  "shadow-[0_0_30px_rgba(79,70,229,0.15)] hover:border-[var(--acade-primary)] hover:scale-105 hover:shadow-[0_0_40px_rgba(79,70,229,0.3)] transition-all cursor-default"
                )}
              >
                <div className="p-2.5 bg-[var(--acade-surface)] rounded-xl text-[var(--acade-primary)] shadow-inner">
                  {getIcon(tech.name)}
                </div>
                <div>
                  <h3 className="font-bold text-[length:var(--text-base)] text-white">{tech.name}</h3>
                  <p className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)] mt-1 line-clamp-2">
                    {tech.description}
                  </p>
                </div>
              </motion.div>
            </div>
          );
        })}
      </motion.div>
      
      {/* Fallback text for screen readers while the orbit hides the actual text visually in complex ways */}
      <div className="sr-only">
        {techStack.map(t => (
            <p key={t.name}>{t.name}: {t.description}</p>
        ))}
      </div>
    </div>
  );
}
