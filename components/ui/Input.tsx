'use client';

import { forwardRef, useId, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type InputVariant = 'default' | 'search' | 'score';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  variant?: InputVariant;
  icon?: React.ReactNode;
}

const variantStyles: Record<InputVariant, string> = {
  default: 'font-[family-name:var(--font-dm-sans)]',
  search: 'font-[family-name:var(--font-dm-sans)] pl-10',
  score: 'font-[family-name:var(--font-geist-mono)] text-right tabular-nums',
};

/**
 * Input component — label above, error below with animated reveal.
 *
 * Variants: default | search (icon left) | score (Geist Mono, right-aligned, numeric keyboard)
 * Min height: 48px (h-12). Focus ring uses --acade-primary.
 */
const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      variant = 'default',
      icon,
      className,
      id: propId,
      type,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = propId ?? generatedId;
    const shouldReduceMotion = useReducedMotion();
    const [showPassword, setShowPassword] = useState(false);

    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={id}
            className="text-[length:var(--text-sm)] font-medium text-[var(--acade-text-muted)] font-[family-name:var(--font-dm-sans)]"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {variant === 'search' && icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--acade-text-faint)] pointer-events-none">
              {icon}
            </div>
          )}

          <input
            ref={ref}
            id={id}
            type={inputType}
            inputMode={variant === 'score' ? 'numeric' : undefined}
            className={cn(
              'w-full h-12 px-4 rounded-xl',
              'bg-[var(--acade-deep)] text-[var(--acade-text)]',
              'border border-[var(--acade-border)]',
              'text-[length:var(--text-base)]',
              'placeholder:text-[var(--acade-text-faint)]',
              'transition-colors duration-150',
              'focus:outline-none focus:border-[var(--acade-primary)] focus:ring-2 focus:ring-[var(--acade-primary)]/20',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error && 'border-[var(--acade-danger)] focus:border-[var(--acade-danger)] focus:ring-[var(--acade-danger)]/20',
              isPassword && 'pr-12', // make room for the eye icon
              variantStyles[variant],
              className
            )}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
            {...props}
          />

          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--acade-text-muted)] hover:text-[var(--acade-text)] transition-colors p-1"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.p
              key="error"
              id={`${id}-error`}
              role="alert"
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="text-[length:var(--text-xs)] text-[var(--acade-danger)] font-[family-name:var(--font-dm-sans)] overflow-hidden"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {hint && !error && (
          <p
            id={`${id}-hint`}
            className="text-[length:var(--text-xs)] text-[var(--acade-text-faint)] font-[family-name:var(--font-dm-sans)]"
          >
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export { Input };
export type { InputProps, InputVariant };
