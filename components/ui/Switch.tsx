'use client';

import { motion } from 'motion/react';
import { cn } from '@/lib/utils/cn';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function Switch({ checked, onCheckedChange, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--acade-primary)] focus-visible:ring-offset-2",
        checked ? "bg-[var(--acade-primary)] shadow-[0_0_12px_rgba(99,102,241,0.5)]" : "bg-[var(--acade-border)] hover:bg-[var(--acade-text-muted)]/50",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <span className="sr-only">Toggle</span>
      <motion.span
        initial={false}
        animate={{
          x: checked ? 20 : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30
        }}
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform"
        )}
      />
    </button>
  );
}
