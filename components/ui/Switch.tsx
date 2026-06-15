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
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--acade-primary)] focus-visible:ring-offset-2",
        checked ? "bg-[var(--acade-primary)]" : "bg-[var(--acade-border)]",
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
