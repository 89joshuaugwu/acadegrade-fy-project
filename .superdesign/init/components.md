# Shared UI Components

## Repository UI stack

- Framework: React 19 with Next.js 16 App Router and TypeScript.
- Styling: Tailwind CSS 4 using the CSS-first `@theme inline` contract in `app/globals.css`; no `tailwind.config.*` is present.
- Component library: custom AcadeGrade primitives in `components/ui/`, with Lucide icons, Motion, and no shadcn/Radix/MUI/Chakra dependency.
- Scope: canonical shared primitives and shared state/form presentation only. Page-specific, marketing-only, chart, animation-background, and domain components are intentionally excluded.
- Source snapshot: exact repository source at init time. If source and this artifact diverge later, refresh init before design generation.

## Button

- Path: `components/ui/Button.tsx`
- Description: Primary action primitive with motion-aware loading and variant/size styling.
- Key props: variant, size, loading, loadingText, fullWidth.

```tsx
'use client';

import { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type ButtonVariant = 'primary' | 'ghost' | 'outline' | 'danger' | 'gold';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingLabel?: string;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    'bg-[var(--acade-primary)] text-[var(--acade-on-primary)]',
    'hover:bg-[var(--acade-primary-hover)]',
    'active:bg-[var(--acade-primary-hover)]',
  ].join(' '),
  ghost: [
    'bg-transparent text-[var(--acade-text-muted)]',
    'hover:bg-[var(--acade-overlay)] hover:text-[var(--acade-text)]',
  ].join(' '),
  outline: [
    'bg-transparent text-[var(--acade-text)]',
    'border border-[var(--acade-border)]',
    'hover:border-[var(--acade-primary)] hover:text-[var(--acade-primary)]',
  ].join(' '),
  danger: [
    'bg-[var(--acade-danger)] text-[var(--acade-on-danger)]',
    'hover:bg-[var(--acade-danger)]/90',
  ].join(' '),
  gold: [
    'bg-[var(--acade-gold)] text-[var(--acade-text-inverse)]',
    'hover:bg-[var(--acade-gold-hover)]',
  ].join(' '),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-12 px-4 text-[length:var(--text-sm)] rounded-lg gap-1.5',
  md: 'h-12 px-6 text-[length:var(--text-base)] rounded-xl gap-2',
  lg: 'h-14 px-8 text-[length:var(--text-lg)] rounded-xl gap-2.5',
};

/**
 * Button component — built from scratch, no external UI library.
 * 
 * Variants: primary | ghost | outline | danger | gold
 * Sizes: sm (40px) | md (48px) | lg (56px) — minimum 48px touch target
 * Features: loading spinner, motion tap/hover, reduced motion support
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      loadingLabel = 'Working…',
      fullWidth = false,
      children,
      className,
      disabled,
      type = 'button',
      'aria-label': ariaLabel,
      ...props
    },
    ref
  ) => {
    return (
      <motion.button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        aria-label={loading ? loadingLabel : ariaLabel}
        className={cn(
          'relative inline-flex items-center justify-center',
          'font-[family-name:var(--font-dm-sans)] font-semibold',
          'cursor-pointer select-none',
          'transition-colors duration-150',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {loading && (
          <Loader2
            className="animate-spin shrink-0"
            size={size === 'sm' ? 14 : size === 'md' ? 16 : 18}
            aria-hidden="true"
          />
        )}
        <span className={cn('inline-flex items-center justify-center gap-[inherit]', loading && 'opacity-80')}>
          {loading ? loadingLabel : children}
        </span>
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
export { Button };
export type { ButtonProps, ButtonVariant, ButtonSize };
```

## LinkButton

- Path: `components/ui/LinkButton.tsx`
- Description: Next.js Link rendered with canonical button styling.
- Key props: href, variant, size, fullWidth.

```tsx
import Link, { type LinkProps } from 'next/link';
import { cn } from '@/lib/utils/cn';

export type LinkButtonVariant = 'primary' | 'outline' | 'ghost';
export type LinkButtonSize = 'sm' | 'md' | 'lg';

export interface LinkButtonProps extends LinkProps {
  children: React.ReactNode;
  className?: string;
  variant?: LinkButtonVariant;
  size?: LinkButtonSize;
  fullWidth?: boolean;
}

const variants: Record<LinkButtonVariant, string> = {
  primary: 'bg-[var(--acade-primary)] text-[var(--acade-on-primary)] hover:bg-[var(--acade-primary-hover)]',
  outline: 'border border-[var(--acade-border)] bg-transparent text-[var(--acade-text)] hover:border-[var(--acade-primary)] hover:text-[var(--acade-primary)]',
  ghost: 'bg-transparent text-[var(--acade-text-muted)] hover:bg-[var(--acade-overlay)] hover:text-[var(--acade-text)]',
};

const sizes: Record<LinkButtonSize, string> = {
  sm: 'min-h-12 px-4 text-sm',
  md: 'min-h-12 px-6 text-base',
  lg: 'min-h-14 px-8 text-lg',
};

export function LinkButton({
  children,
  className,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  ...props
}: LinkButtonProps) {
  return (
    <Link
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] font-semibold',
        'transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
```

## IconButton

- Path: `components/ui/IconButton.tsx`
- Description: Accessible icon-only action with canonical sizing and variants.
- Key props: label, variant, size.

```tsx
'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

export interface IconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  'aria-label': string;
  variant?: 'ghost' | 'outline' | 'danger';
}

const variants = {
  ghost: 'border border-transparent text-[var(--acade-text-muted)] hover:bg-[var(--acade-overlay)] hover:text-[var(--acade-text)]',
  outline: 'border border-[var(--acade-border)] text-[var(--acade-text)] hover:border-[var(--acade-primary)] hover:text-[var(--acade-primary)]',
  danger: 'border border-transparent text-[var(--acade-danger)] hover:bg-[var(--acade-danger-dim)]',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, type = 'button', variant = 'ghost', children, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-control)]',
        'transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);

IconButton.displayName = 'IconButton';
```

## Card

- Path: `components/ui/Card.tsx`
- Description: Canonical bordered surface with optional hover/glass presentation.
- Key props: variant, padding, hoverable.

```tsx
'use client';

import { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'motion/react';
import { cn } from '@/lib/utils/cn';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type CardVariant = 'default' | 'hover' | 'glass';

interface CardProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-5 md:p-6',
  lg: 'p-6 md:p-8',
};

/**
 * Card component — base surface container.
 *
 * Variants:
 * - default: static card with border
 * - hover: lifts on hover with indigo glow shadow
 * - glass: glassmorphism effect with backdrop blur
 */
const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', padding = 'md', children, className, ...props }, ref) => {
    const shouldReduceMotion = useReducedMotion();

    const baseStyles = cn(
      'rounded-2xl border border-[var(--acade-border)]',
      paddingStyles[padding],
      variant === 'glass'
        ? 'bg-[var(--acade-deep)]/60 backdrop-blur-md border-[var(--acade-border-subtle)]'
        : 'bg-[var(--acade-deep)]',
      className
    );

    if (variant === 'hover' && !shouldReduceMotion) {
      return (
        <motion.div
          ref={ref}
          whileHover={{
            y: -4,
            boxShadow: '0 24px 48px rgba(99,102,241,0.18)',
            transition: { duration: 0.2 },
          }}
          className={cn(baseStyles, 'transition-shadow cursor-pointer')}
          {...props}
        >
          {children}
        </motion.div>
      );
    }

    return (
      <motion.div ref={ref} className={baseStyles} {...props}>
        {children}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';
export { Card };
export type { CardProps, CardVariant };
```

## Badge

- Path: `components/ui/Badge.tsx`
- Description: Status and classification label with semantic color variants.
- Key props: variant, size, dot, icon.

```tsx
import { cn } from '@/lib/utils/cn';

type BadgeVariant =
  | 'grade-a' | 'grade-b' | 'grade-c' | 'grade-d' | 'grade-e' | 'grade-f'
  | 'first-class' | '2upper' | '2lower' | 'third' | 'pass' | 'fail'
  | 'ongoing' | 'status' | 'info' | 'success' | 'danger';

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  // Grade badges — B is indigo NOT green
  'grade-a': 'bg-[var(--grade-a)]/15 text-[var(--grade-a)] border-[var(--grade-a)]/30',
  'grade-b': 'bg-[var(--grade-b)]/15 text-[var(--grade-b)] border-[var(--grade-b)]/30',
  'grade-c': 'bg-[var(--grade-c)]/15 text-[var(--grade-c)] border-[var(--grade-c)]/30',
  'grade-d': 'bg-[var(--grade-d)]/15 text-[var(--grade-d)] border-[var(--grade-d)]/30',
  'grade-e': 'bg-[var(--grade-e)]/15 text-[var(--grade-e)] border-[var(--grade-e)]/30',
  'grade-f': 'bg-[var(--grade-f)]/15 text-[var(--grade-f)] border-[var(--grade-f)]/30',

  // Degree class badges
  'first-class': 'bg-[var(--class-first)]/15 text-[var(--class-first)] border-[var(--class-first)]/30',
  '2upper': 'bg-[var(--class-2upper)]/15 text-[var(--class-2upper)] border-[var(--class-2upper)]/30',
  '2lower': 'bg-[var(--class-2lower)]/15 text-[var(--class-2lower)] border-[var(--class-2lower)]/30',
  'third': 'bg-[var(--class-third)]/15 text-[var(--class-third)] border-[var(--class-third)]/30',
  'pass': 'bg-[var(--class-pass)]/15 text-[var(--class-pass)] border-[var(--class-pass)]/30',
  'fail': 'bg-[var(--class-fail)]/15 text-[var(--class-fail)] border-[var(--class-fail)]/30',

  // Status badges
  'ongoing': 'bg-[var(--acade-gold)]/15 text-[var(--acade-gold)] border-[var(--acade-gold)]/30',
  'status': 'bg-[var(--acade-primary)]/15 text-[var(--acade-primary)] border-[var(--acade-primary)]/30',
  'info': 'bg-[var(--acade-info)]/15 text-[var(--acade-info)] border-[var(--acade-info)]/30',
  'success': 'bg-[var(--acade-success)]/15 text-[var(--acade-success)] border-[var(--acade-success)]/30',
  'danger': 'bg-[var(--acade-danger)]/15 text-[var(--acade-danger)] border-[var(--acade-danger)]/30',
};

/**
 * Badge component — colored pill for grades, degree classes, and status indicators.
 *
 * Grade B = indigo (#6366F1), NOT green.
 * Ongoing = amber/gold for active semester.
 */
function Badge({ variant, children, className, icon }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full',
        'text-[length:var(--text-xs)] font-semibold font-[family-name:var(--font-dm-sans)]',
        'border whitespace-nowrap',
        variantStyles[variant],
        className
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
}

/**
 * Helper to get badge variant from letter grade.
 */
function getGradeBadgeVariant(grade: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    A: 'grade-a',
    B: 'grade-b',
    C: 'grade-c',
    D: 'grade-d',
    E: 'grade-e',
    F: 'grade-f',
  };
  return map[grade] ?? 'grade-f';
}

export { Badge, getGradeBadgeVariant };
export type { BadgeProps, BadgeVariant };
```

## Input

- Path: `components/ui/Input.tsx`
- Description: Labeled text/password field with description, error, and reveal behavior.
- Key props: label, error, description, variant, leftIcon.

```tsx
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
    const describedBy = [hint && `${id}-hint`, error && `${id}-error`]
      .filter(Boolean)
      .join(' ') || undefined;

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
            aria-describedby={describedBy}
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

        {hint && (
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
```

## Textarea

- Path: `components/ui/Textarea.tsx`
- Description: Labeled multiline field with description and error relationships.
- Key props: label, error, description.

```tsx
'use client';

import { forwardRef, useId } from 'react';
import { cn } from '@/lib/utils/cn';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ id: propId, label, hint, error, className, required, ...props }, ref) => {
    const generatedId = useId();
    const id = propId ?? generatedId;
    const describedBy = [hint && `${id}-hint`, error && `${id}-error`]
      .filter(Boolean)
      .join(' ') || undefined;

    return (
      <div className="flex w-full flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-[var(--acade-text-muted)]">
            {label}{required && <span aria-hidden="true"> *</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          required={required}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={cn(
            'min-h-[120px] max-h-80 w-full resize-y rounded-[var(--radius-control)] px-4 py-3',
            'border border-[var(--acade-control-border)] bg-[var(--acade-deep)] text-base text-[var(--acade-text)]',
            'placeholder:text-[var(--acade-text-faint)] focus:border-[var(--acade-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--acade-primary)]/20',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-[var(--acade-danger)] focus:border-[var(--acade-danger)]',
            className
          )}
          {...props}
        />
        {hint && <p id={`${id}-hint`} className="text-xs text-[var(--acade-text-faint)]">{hint}</p>}
        {error && <p id={`${id}-error`} role="alert" className="text-xs text-[var(--acade-danger)]">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
```

## FormField

- Path: `components/ui/FormField.tsx`
- Description: Field wrapper for stable label, description, and validation messaging.
- Key props: label, error, description, required.

```tsx
'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils/cn';

export interface FormFieldRenderProps {
  id: string;
  describedBy?: string;
  invalid: boolean;
  required: boolean;
}

export interface FormFieldProps {
  id?: string;
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: (field: FormFieldRenderProps) => React.ReactNode;
}

export function FormField({
  id: propId,
  label,
  description,
  error,
  required = false,
  className,
  children,
}: FormFieldProps) {
  const generatedId = useId();
  const id = propId ?? generatedId;
  const describedBy = [
    description && `${id}-description`,
    error && `${id}-error`,
  ].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex w-full flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-[var(--acade-text-muted)]">
        {label}{required && <span aria-hidden="true"> *</span>}
      </label>
      {children({ id, describedBy, invalid: Boolean(error), required })}
      {description && (
        <p id={`${id}-description`} className="text-xs leading-5 text-[var(--acade-text-faint)]">
          {description}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs leading-5 text-[var(--acade-danger)]">
          {error}
        </p>
      )}
    </div>
  );
}
```

## FormSection

- Path: `components/forms/FormSection.tsx`
- Description: Reusable titled grouping for related form controls.
- Key props: title, description.

```tsx
'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils/cn';

export interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({ title, description, children, className }: FormSectionProps) {
  const id = useId();
  return (
    <section
      role="group"
      aria-labelledby={`${id}-title`}
      aria-describedby={description ? `${id}-description` : undefined}
      className={cn(
        'rounded-[var(--radius-surface)] border border-[var(--acade-border)]',
        'bg-[var(--acade-surface)] p-5 shadow-[var(--shadow-card)] md:p-6',
        className
      )}
    >
      <div className="mb-5 border-b border-[var(--acade-border-subtle)] pb-4">
        <h2 id={`${id}-title`} className="text-lg font-semibold text-[var(--acade-text)]">
          {title}
        </h2>
        {description && (
          <p id={`${id}-description`} className="mt-1 text-sm leading-6 text-[var(--acade-text-muted)]">
            {description}
          </p>
        )}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}
```

## Select

- Path: `components/ui/Select.tsx`
- Description: Searchable accessible custom select for short and academic option sets.
- Key props: options, value, onChange, searchable, label, error.

```tsx
'use client';

import { useState, useRef, useEffect, useId, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Custom Select dropdown — fully custom, not native <select>.
 *
 * Features:
 * - Searchable variant with input filtering
 * - Min 48px touch targets on all options
 * - Keyboard navigation (Arrow keys, Enter, Escape)
 * - AnimatePresence dropdown open/close
 * - Reduced motion support
 */
function Select({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  label,
  error,
  searchable = false,
  disabled = false,
  className,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const id = useId();
  const listboxId = `${id}-listbox`;
  const shouldReduceMotion = useReducedMotion();

  const selectedOption = options.find((o) => o.value === value);

  const filtered = searchable && search
    ? options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase())
      )
    : options;
  const activeOption = highlightIndex >= 0 ? filtered[highlightIndex] : undefined;
  const optionId = (optionValue: string) => `${listboxId}-option-${optionValue.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchable) {
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [isOpen, searchable]);

  // Reset highlight on filter change
  useEffect(() => {
    setHighlightIndex(-1);
  }, [search]);

  const handleSelect = useCallback(
    (optionValue: string) => {
      onChange(optionValue);
      setIsOpen(false);
      setSearch('');
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
          e.preventDefault();
          setIsOpen(true);
          const selectedIndex = filtered.findIndex((option) => option.value === value);
          setHighlightIndex(selectedIndex >= 0 ? selectedIndex : 0);
        }
        return;
      }

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setSearch('');
          break;
        case 'ArrowDown':
          e.preventDefault();
          setHighlightIndex((prev) =>
            prev < filtered.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightIndex((prev) =>
            prev > 0 ? prev - 1 : filtered.length - 1
          );
          break;
        case 'Home':
          e.preventDefault();
          setHighlightIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setHighlightIndex(filtered.length - 1);
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightIndex >= 0 && filtered[highlightIndex]) {
            handleSelect(filtered[highlightIndex].value);
          }
          break;
      }
    },
    [isOpen, filtered, highlightIndex, handleSelect, value]
  );

  // Scroll highlighted option into view
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[role="option"]');
      const item = items[highlightIndex] as HTMLElement | undefined;
      item?.scrollIntoView?.({ block: 'nearest' });
    }
  }, [highlightIndex]);

  return (
    <div className={cn('flex flex-col gap-1.5 w-full', className)} ref={containerRef}>
      {label && (
        <label
          htmlFor={id}
          className="text-[length:var(--text-sm)] font-medium text-[var(--acade-text-muted)] font-[family-name:var(--font-dm-sans)]"
        >
          {label}
        </label>
      )}

      <div className="relative" onKeyDown={handleKeyDown}>
        {/* Trigger button */}
        <button
          id={id}
          type="button"
          role="combobox"
          aria-controls={listboxId}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-activedescendant={isOpen && activeOption ? optionId(activeOption.value) : undefined}
          aria-label={label ?? placeholder}
          disabled={disabled}
          onClick={() => {
            const nextOpen = !isOpen;
            setIsOpen(nextOpen);
            if (nextOpen) {
              const selectedIndex = filtered.findIndex((option) => option.value === value);
              setHighlightIndex(selectedIndex >= 0 ? selectedIndex : 0);
            }
          }}
          className={cn(
            'w-full h-12 px-4 rounded-xl flex items-center justify-between',
            'bg-[var(--acade-deep)] text-[var(--acade-text)]',
            'border border-[var(--acade-control-border)]',
            'text-[length:var(--text-base)] font-[family-name:var(--font-dm-sans)]',
            'transition-colors duration-150 cursor-pointer',
            'focus:outline-none focus:border-[var(--acade-primary)] focus:ring-2 focus:ring-[var(--acade-primary)]/20',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-[var(--acade-danger)]',
            isOpen && 'border-[var(--acade-primary)] ring-2 ring-[var(--acade-primary)]/20'
          )}
        >
          <span className={cn(!selectedOption && 'text-[var(--acade-text-faint)]')}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown
            size={18}
            className={cn(
              'shrink-0 text-[var(--acade-text-faint)] transition-transform duration-150',
              isOpen && 'rotate-180'
            )}
          />
        </button>

        {/* Dropdown */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
              className={cn(
                'absolute top-full left-0 right-0 mt-1',
                'bg-[var(--acade-surface)] border border-[var(--acade-border)]',
                'rounded-xl shadow-2xl overflow-hidden'
              )}
              style={{ zIndex: 'var(--z-dropdown)' } as React.CSSProperties}
            >
              {/* Search input */}
              {searchable && (
                <div className="p-2 border-b border-[var(--acade-border)]">
                  <div className="relative">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--acade-text-faint)]"
                    />
                    <input
                      ref={searchRef}
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search..."
                      aria-label={`Search ${label ?? 'options'}`}
                      className={cn(
                        'w-full h-10 pl-9 pr-3 rounded-lg',
                        'bg-[var(--acade-deep)] text-[var(--acade-text)]',
                        'border border-[var(--acade-border-subtle)]',
                        'text-[length:var(--text-sm)] font-[family-name:var(--font-dm-sans)]',
                        'placeholder:text-[var(--acade-text-faint)]',
                        'focus:outline-none focus:border-[var(--acade-primary)]'
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Options list */}
              <ul
                id={listboxId}
                ref={listRef}
                role="listbox"
                className="max-h-60 overflow-y-auto py-1"
              >
                {filtered.length === 0 ? (
                  <li className="px-4 py-3 text-[length:var(--text-sm)] text-[var(--acade-text-faint)] text-center">
                    No options found
                  </li>
                ) : (
                  filtered.map((option, index) => (
                    <li
                      key={option.value}
                      id={optionId(option.value)}
                      role="option"
                      aria-selected={option.value === value}
                      onClick={() => handleSelect(option.value)}
                      className={cn(
                        'flex items-center justify-between px-4 h-12 cursor-pointer',
                        'text-[length:var(--text-sm)] font-[family-name:var(--font-dm-sans)]',
                        'transition-colors duration-75',
                        option.value === value
                          ? 'text-[var(--acade-primary)] bg-[var(--acade-primary)]/5'
                          : 'text-[var(--acade-text)] hover:bg-[var(--acade-overlay)]',
                        index === highlightIndex && 'bg-[var(--acade-overlay)]'
                      )}
                    >
                      <span className="min-w-0 whitespace-normal text-left leading-5">{option.label}</span>
                      {option.value === value && (
                        <Check size={16} className="shrink-0 text-[var(--acade-primary)]" />
                      )}
                    </li>
                  ))
                )}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            role="alert"
            className="text-[length:var(--text-xs)] text-[var(--acade-danger)] font-[family-name:var(--font-dm-sans)] overflow-hidden"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export { Select };
export type { SelectProps, SelectOption };
```

## Switch

- Path: `components/ui/Switch.tsx`
- Description: Binary preference control with disabled and accessible-label support.
- Key props: checked, onChange, disabled, label.

```tsx
'use client';

import { motion } from 'motion/react';
import { cn } from '@/lib/utils/cn';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  pending?: boolean;
  id?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  className?: string;
}

export function Switch({
  checked,
  onCheckedChange,
  disabled = false,
  pending = false,
  id,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  className,
}: SwitchProps) {
  const unavailable = disabled || pending;

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-busy={pending || undefined}
      disabled={unavailable}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-12 w-14 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--acade-primary)] focus-visible:ring-offset-2',
        checked ? 'bg-[var(--acade-primary)]' : 'bg-[var(--acade-control-border)]',
        unavailable && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      {!ariaLabel && !ariaLabelledBy && <span className="sr-only">Toggle setting</span>}
      <motion.span
        initial={false}
        animate={{
          x: checked ? 24 : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30
        }}
        className={cn(
          'pointer-events-none ml-1 block h-6 w-6 rounded-full bg-[var(--acade-deep)] shadow-sm ring-0'
        )}
      />
    </button>
  );
}

export type { SwitchProps };
```

## Tabs

- Path: `components/ui/Tabs.tsx`
- Description: Keyboard-operable tabs, triggers, and linked panels.
- Key props: value, onValueChange, activationMode.

```tsx
'use client';

import {
  createContext,
  useContext,
  useId,
  type HTMLAttributes,
  type KeyboardEvent,
} from 'react';
import { cn } from '@/lib/utils/cn';

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
  baseId: string;
  activationMode: 'automatic' | 'manual';
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) throw new Error('Tabs components must be used inside <Tabs>.');
  return context;
}

export interface TabsProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
  onValueChange: (value: string) => void;
  activationMode?: 'automatic' | 'manual';
}

export function Tabs({
  value,
  onValueChange,
  activationMode = 'automatic',
  className,
  children,
  ...props
}: TabsProps) {
  const baseId = useId();
  return (
    <TabsContext.Provider value={{ value, onValueChange, baseId, activationMode }}>
      <div className={cn('w-full', className)} {...props}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex min-h-12 max-w-full items-stretch gap-1 overflow-x-auto rounded-[var(--radius-control)]',
        'border border-[var(--acade-border)] bg-[var(--acade-overlay)] p-1',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export function TabsTrigger({ value, className, children, ...props }: TabsTriggerProps) {
  const context = useTabsContext();
  const selected = context.value === value;
  const tabId = `${context.baseId}-tab-${value}`;
  const panelId = `${context.baseId}-panel-${value}`;

  function moveFocus(event: KeyboardEvent<HTMLButtonElement>) {
    const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
    if (!keys.includes(event.key)) return;

    event.preventDefault();
    const tabs = Array.from(
      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []
    ).filter((tab) => !tab.disabled);
    const index = tabs.indexOf(event.currentTarget);
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? tabs.length - 1
        : (index + (event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1) + tabs.length) % tabs.length;
    const nextTab = tabs[nextIndex];
    nextTab?.focus();
    if (context.activationMode === 'automatic') nextTab?.click();
  }

  return (
    <button
      type="button"
      role="tab"
      id={tabId}
      aria-selected={selected}
      aria-controls={panelId}
      tabIndex={selected ? 0 : -1}
      onClick={() => context.onValueChange(value)}
      onKeyDown={moveFocus}
      className={cn(
        'min-h-10 whitespace-nowrap rounded-lg px-4 text-sm font-semibold transition-colors duration-150',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]',
        selected
          ? 'bg-[var(--acade-deep)] text-[var(--acade-text)] shadow-[var(--shadow-card)]'
          : 'text-[var(--acade-text-muted)] hover:text-[var(--acade-text)]',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export interface TabsPanelProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
}

export function TabsPanel({ value, className, children, ...props }: TabsPanelProps) {
  const context = useTabsContext();
  if (context.value !== value) return null;

  return (
    <div
      role="tabpanel"
      id={`${context.baseId}-panel-${value}`}
      aria-labelledby={`${context.baseId}-tab-${value}`}
      tabIndex={0}
      className={cn('focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]', className)}
      {...props}
    >
      {children}
    </div>
  );
}
```

## SegmentedControl

- Path: `components/ui/SegmentedControl.tsx`
- Description: Compact single-choice control for metric and preference switching.
- Key props: options, value, onChange, ariaLabel.

```tsx
'use client';

import { cn } from '@/lib/utils/cn';

export interface SegmentedControlOption<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string = string> {
  value: T;
  onValueChange: (value: T) => void;
  options: SegmentedControlOption<T>[];
  className?: string;
  disabled?: boolean;
  'aria-label': string;
}

export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  className,
  disabled = false,
  'aria-label': ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'inline-grid min-h-12 max-w-full auto-cols-fr grid-flow-col rounded-[var(--radius-control)]',
        'border border-[var(--acade-border)] bg-[var(--acade-overlay)] p-1',
        className
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <label
            key={option.value}
            className={cn(
              'relative flex min-h-10 min-w-12 cursor-pointer items-center justify-center gap-2 rounded-lg px-3',
              'text-sm font-semibold transition-colors duration-150',
              selected
                ? 'bg-[var(--acade-deep)] text-[var(--acade-text)] shadow-[var(--shadow-card)]'
                : 'text-[var(--acade-text-muted)] hover:text-[var(--acade-text)]',
              (disabled || option.disabled) && 'cursor-not-allowed opacity-50'
            )}
          >
            <input
              type="radio"
              name={ariaLabel}
              value={option.value}
              checked={selected}
              disabled={disabled || option.disabled}
              onChange={() => onValueChange(option.value)}
              className="peer absolute inset-0 opacity-0 focus-visible:outline-none"
            />
            <span className="pointer-events-none absolute inset-0 rounded-lg peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--acade-primary)]" />
            {option.icon && <span aria-hidden="true">{option.icon}</span>}
            <span>{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}
```

## Modal

- Path: `components/ui/Modal.tsx`
- Description: Portal-based dialog core with focus, dismissal, sizing, and confirm behavior.
- Key props: isOpen, onClose, title, description, size, confirm.

```tsx
'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { Input } from './Input';

let bodyLockCount = 0;
let previousBodyOverflow = '';

function lockBodyScroll() {
  if (bodyLockCount === 0) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  bodyLockCount += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    bodyLockCount = Math.max(0, bodyLockCount - 1);
    if (bodyLockCount === 0) document.body.style.overflow = previousBodyOverflow;
  };
}

function getFocusable(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )).filter((element) => element.getAttribute('aria-hidden') !== 'true');
}

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  confirm?: {
    label: string;
    onConfirm: () => void;
    loading?: boolean;
    requireText?: string;
  };
  className?: string;
  size?: 'confirm' | 'form' | 'review';
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  presentation?: 'dialog' | 'sheet';
}

const sizeStyles = {
  confirm: 'max-w-[440px]',
  form: 'max-w-[560px]',
  review: 'max-w-[880px]',
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  confirm,
  className,
  size = confirm ? 'confirm' : 'form',
  initialFocusRef,
  presentation = 'dialog',
}: ModalProps) {
  const shouldReduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [confirmationText, setConfirmationText] = useState('');
  const reactId = useId();
  const titleId = `${reactId}-title`;
  const descriptionId = `${reactId}-description`;

  const dismiss = useCallback(() => {
    setConfirmationText('');
    onClose();
  }, [onClose]);

  useEffect(() => {
    let root = document.getElementById('acadegrade-overlay-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'acadegrade-overlay-root';
      document.body.appendChild(root);
    }
    setPortalRoot(root);
  }, []);

  useEffect(() => {
    if (!open || !portalRoot) return;

    previousActiveElement.current = document.activeElement as HTMLElement | null;
    const unlock = lockBodyScroll();
    const background = Array.from(document.body.children).filter(
      (element) => element !== portalRoot
    ) as HTMLElement[];
    const previousAriaHidden = background.map((element) => element.getAttribute('aria-hidden'));
    background.forEach((element) => {
      element.inert = true;
      element.setAttribute('aria-hidden', 'true');
    });

    const focusTimer = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const preferred = initialFocusRef?.current
        ?? panel.querySelector<HTMLElement>('[data-autofocus], input:not([disabled]), textarea:not([disabled]), select:not([disabled])')
        ?? getFocusable(panel)[0]
        ?? panel;
      preferred.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (!panelRef.current) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        dismiss();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = getFocusable(panelRef.current);
      if (focusable.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelAnimationFrame(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      unlock();
      background.forEach((element, index) => {
        element.inert = false;
        const oldValue = previousAriaHidden[index];
        if (oldValue === null) element.removeAttribute('aria-hidden');
        else element.setAttribute('aria-hidden', oldValue);
      });
      requestAnimationFrame(() => previousActiveElement.current?.focus());
    };
  }, [dismiss, initialFocusRef, open, portalRoot]);

  if (!portalRoot) return null;

  const confirmationMatches = !confirm?.requireText
    || confirmationText.trim() === confirm.requireText;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0" style={{ zIndex: 'var(--z-modal)' }}>
          <motion.button
            type="button"
            tabIndex={-1}
            data-overlay-backdrop
            aria-label={`Close ${title}`}
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.16 }}
            className="absolute inset-0 cursor-default bg-[var(--acade-scrim)]"
            onClick={dismiss}
          />

          <div className={cn(
            'pointer-events-none flex min-h-full justify-center',
            presentation === 'sheet' ? 'items-end p-0 sm:items-center sm:p-4' : 'items-center p-4'
          )}>
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={description ? descriptionId : undefined}
              tabIndex={-1}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.99 }}
              transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 360, damping: 32 }}
              className={cn(
                'pointer-events-auto relative flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden',
                'rounded-[var(--radius-dialog)] border border-[var(--acade-border)] bg-[var(--acade-surface)] shadow-[var(--shadow-popover)]',
                'focus:outline-none',
                sizeStyles[size],
                presentation === 'sheet' && 'max-w-none rounded-b-none border-b-0 sm:max-w-[560px] sm:rounded-[var(--radius-dialog)] sm:border-b',
                className
              )}
            >
              <header className="flex shrink-0 items-start gap-4 border-b border-[var(--acade-border-subtle)] px-5 py-4 md:px-6">
                <div className="min-w-0 flex-1">
                  <h2 id={titleId} className="text-xl font-semibold text-[var(--acade-text)] text-balance">
                    {title}
                  </h2>
                  {description && (
                    <p id={descriptionId} className="mt-1 text-sm leading-6 text-[var(--acade-text-muted)] text-pretty">
                      {description}
                    </p>
                  )}
                </div>
                <IconButton aria-label="Close modal" onClick={dismiss} className="-mr-2 -mt-2">
                  <X className="size-5" aria-hidden="true" />
                </IconButton>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
                {children}
                {confirm?.requireText && (
                  <div className="mt-5">
                    <Input
                      label={`Type ${confirm.requireText} to confirm`}
                      value={confirmationText}
                      onChange={(event) => setConfirmationText(event.target.value)}
                      autoComplete="off"
                    />
                  </div>
                )}
              </div>

              {confirm && (
                <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-[var(--acade-border-subtle)] px-5 py-4 sm:flex-row sm:justify-end md:px-6">
                  <Button variant="ghost" onClick={dismiss}>Cancel</Button>
                  <Button
                    variant="danger"
                    onClick={confirm.onConfirm}
                    loading={confirm.loading}
                    loadingLabel={`${confirm.label}…`}
                    disabled={!confirmationMatches}
                  >
                    {confirm.label}
                  </Button>
                </footer>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    portalRoot
  );
}
```

## Sheet

- Path: `components/ui/Sheet.tsx`
- Description: Mobile/edge sheet presentation backed by the Modal interaction core.
- Key props: isOpen, onClose, side, title.

```tsx
'use client';

import { useRef, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { Modal, type ModalProps } from './Modal';

export interface SheetProps extends Omit<ModalProps, 'presentation' | 'size'> {
  dismissDistance?: number;
}

export function Sheet({
  children,
  onClose,
  dismissDistance = 96,
  className,
  ...props
}: SheetProps) {
  const startY = useRef<number | null>(null);
  const offsetRef = useRef(0);
  const [offset, setOffset] = useState(0);

  function finishDrag() {
    if (offsetRef.current >= dismissDistance) onClose();
    startY.current = null;
    offsetRef.current = 0;
    setOffset(0);
  }

  return (
    <Modal
      {...props}
      onClose={onClose}
      presentation="sheet"
      className={cn('max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)]', className)}
    >
      <div
        style={{ transform: `translateY(${offset}px)` }}
        className="transition-transform duration-150"
      >
        <button
          type="button"
          aria-label="Swipe down to close"
          onPointerDown={(event) => {
            startY.current = event.clientY;
            offsetRef.current = 0;
            setOffset(0);
          }}
          onPointerMove={(event) => {
            if (startY.current === null) return;
            const nextOffset = Math.max(0, event.clientY - startY.current);
            offsetRef.current = nextOffset;
            setOffset(nextOffset);
          }}
          onPointerUp={finishDrag}
          onPointerCancel={() => {
            startY.current = null;
            offsetRef.current = 0;
            setOffset(0);
          }}
          className="-mt-3 mb-3 flex h-8 w-full touch-none items-center justify-center rounded-lg"
        >
          <span className="h-1.5 w-12 rounded-full bg-[var(--acade-control-border)]" aria-hidden="true" />
        </button>
        {children}
      </div>
    </Modal>
  );
}
```

## DataTable

- Path: `components/ui/DataTable.tsx`
- Description: Semantic read-only table with sortable columns and loading/empty states.
- Key props: columns, data, caption, sort.

```tsx
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface DataTableColumn<Row> {
  key: string;
  header: string;
  render: (row: Row) => React.ReactNode;
  align?: 'start' | 'center' | 'numeric';
  sortable?: boolean;
  className?: string;
}

export interface DataTableProps<Row> {
  caption: string;
  description?: string;
  columns: DataTableColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row) => React.Key;
  sort?: { key: string; direction: 'ascending' | 'descending' };
  onSort?: (key: string) => void;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<Row>({
  caption,
  description,
  columns,
  rows,
  rowKey,
  sort,
  onSort,
  emptyMessage = 'No records match this view.',
  className,
}: DataTableProps<Row>) {
  return (
    <div
      className={cn(
        'overflow-x-auto rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-surface)]',
        className
      )}
      role="region"
      aria-label={`${caption} table`}
      tabIndex={0}
    >
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <caption className="sr-only">
          {caption}{description ? `. ${description}` : ''}
        </caption>
        <thead className="bg-[var(--acade-overlay)] text-[var(--acade-text-muted)]">
          <tr>
            {columns.map((column) => {
              const activeSort = sort?.key === column.key ? sort.direction : undefined;
              const Icon = activeSort === 'ascending'
                ? ArrowUp
                : activeSort === 'descending'
                  ? ArrowDown
                  : ArrowUpDown;
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={column.sortable ? activeSort ?? 'none' : undefined}
                  className={cn(
                    'h-12 border-b border-[var(--acade-border)] px-4 font-semibold',
                    column.align === 'numeric' && 'text-right tabular-nums',
                    column.align === 'center' && 'text-center',
                    column.className
                  )}
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => onSort?.(column.key)}
                      className={cn(
                        'inline-flex min-h-12 items-center gap-2 rounded-lg text-left transition-colors hover:text-[var(--acade-text)]',
                        column.align === 'numeric' && 'ml-auto'
                      )}
                      aria-label={`Sort by ${column.header}`}
                    >
                      {column.header}
                      <Icon className="size-4" aria-hidden="true" />
                    </button>
                  ) : column.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="h-28 px-4 text-center text-[var(--acade-text-muted)]">
                {emptyMessage}
              </td>
            </tr>
          ) : rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-[var(--acade-border-subtle)] last:border-0 hover:bg-[var(--acade-overlay)]/55">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    'h-14 px-4 text-[var(--acade-text)]',
                    column.align === 'numeric' && 'text-right font-mono tabular-nums',
                    column.align === 'center' && 'text-center',
                    column.className
                  )}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

## Pagination

- Path: `components/ui/Pagination.tsx`
- Description: Previous/next pagination control with truthful shown-count text.
- Key props: hasPrevious, hasNext, onPrevious, onNext, shownCount.

```tsx
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/utils/cn';

export interface PaginationProps {
  shown: number;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  loading?: boolean;
  className?: string;
}

export function Pagination({
  shown,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  loading = false,
  className,
}: PaginationProps) {
  return (
    <nav aria-label="Table pagination" className={cn('flex flex-wrap items-center justify-between gap-3', className)}>
      <p role="status" aria-label={`${shown} shown`} className="text-sm text-[var(--acade-text-muted)]">
        <span className="font-mono tabular-nums text-[var(--acade-text)]">{shown}</span> shown
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onPrevious} disabled={!hasPrevious || loading} aria-label="Previous page">
          <ChevronLeft className="size-4" aria-hidden="true" />
          Previous
        </Button>
        <Button variant="outline" size="sm" onClick={onNext} disabled={!hasNext || loading} aria-label="Next page">
          Next
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
```

## Disclosure

- Path: `components/ui/Disclosure.tsx`
- Description: Accessible expandable content trigger and panel.
- Key props: open, onOpenChange, title.

```tsx
'use client';

import { useId, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export interface DisclosureProps {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function Disclosure({ label, children, defaultOpen = false, className }: DisclosureProps) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className={cn('border-b border-[var(--acade-border-subtle)]', className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg text-left font-medium text-[var(--acade-text)]"
      >
        <span>{label}</span>
        <ChevronDown className={cn('size-4 transition-transform duration-150', open && 'rotate-180')} aria-hidden="true" />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            initial={shouldReduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 360, damping: 34 }}
            className="overflow-hidden"
          >
            <div className="pb-4 text-sm leading-6 text-[var(--acade-text-muted)]">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

## Skeleton

- Path: `components/ui/Skeleton.tsx`
- Description: Shape-aware reserved loading geometry.
- Key props: shape, width, height.

```tsx
import { cn } from '@/lib/utils/cn';

type SkeletonShape = 'rect' | 'circle' | 'text';

interface SkeletonProps {
  shape?: SkeletonShape;
  className?: string;
  width?: string | number;
  height?: string | number;
  lines?: number;
}

/**
 * Skeleton loader — uses the shimmer CSS animation from globals.css.
 *
 * Shapes:
 * - rect: rectangular block (default)
 * - circle: circular avatar/icon placeholder
 * - text: multiple lines of text with varying widths
 */
function Skeleton({
  shape = 'rect',
  className,
  width,
  height,
  lines = 3,
}: SkeletonProps) {
  const style: React.CSSProperties = {
    width: width ?? undefined,
    height: height ?? undefined,
  };

  if (shape === 'circle') {
    return (
      <div
        className={cn('skeleton rounded-full', className)}
        style={{
          width: width ?? 48,
          height: height ?? 48,
        }}
        aria-hidden="true"
      />
    );
  }

  if (shape === 'text') {
    const lineWidths = ['100%', '92%', '78%', '85%', '60%'];
    return (
      <div className={cn('flex flex-col gap-2', className)} aria-hidden="true">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="skeleton"
            style={{
              width: lineWidths[i % lineWidths.length],
              height: height ?? 14,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn('skeleton', className)}
      style={style}
      aria-hidden="true"
    />
  );
}

export { Skeleton };
export type { SkeletonProps, SkeletonShape };
```

## ThemeControl

- Path: `components/ui/ThemeControl.tsx`
- Description: Light/dark/system chooser using next-themes.
- Key props: compact, className.

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Laptop, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils/cn';

const themeChoices = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Laptop },
] as const;

export interface ThemeControlProps {
  className?: string;
  compact?: boolean;
  'aria-label'?: string;
}

export function ThemeControl({
  className,
  compact = false,
  'aria-label': ariaLabel = 'Choose colour theme',
}: ThemeControlProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const selectedTheme = mounted ? theme ?? 'system' : 'system';

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      aria-busy={!mounted}
      className={cn(
        'inline-grid min-h-12 grid-cols-3 items-stretch rounded-[var(--radius-control)]',
        'border border-[var(--acade-border)] bg-[var(--acade-overlay)] p-1',
        compact ? 'w-[9.75rem]' : 'w-[16.5rem]',
        className
      )}
    >
      {themeChoices.map(({ value, label, icon: Icon }) => {
        const selected = selectedTheme === value;

        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={compact ? label : undefined}
            disabled={!mounted}
            onClick={() => setTheme(value)}
            className={cn(
              'flex min-h-10 min-w-10 items-center justify-center gap-1.5 rounded-lg px-2',
              'text-xs font-semibold transition-[background-color,color,box-shadow] duration-150',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]',
              selected
                ? 'bg-[var(--acade-deep)] text-[var(--acade-text)] shadow-[var(--shadow-card)]'
                : 'text-[var(--acade-text-muted)] hover:text-[var(--acade-text)]',
              !mounted && 'cursor-default'
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {!compact && <span>{label}</span>}
          </button>
        );
      })}
    </div>
  );
}
```

## Logo

- Path: `components/ui/Logo.tsx`
- Description: Canonical AcadeGrade brand mark and destination link.
- Key props: href, size, className, onClick.

```tsx
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils/cn';

interface LogoProps {
  className?: string;
  href?: string;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ className, href = '/dashboard', onClick, size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl'
  };

  const iconSizes = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-12 h-12 text-lg'
  };

  const imageSizes = {
    sm: '24px',
    md: '32px',
    lg: '48px',
  };

  const content = (
    <span className={cn('group flex items-center gap-2.5', className)}>
      <div className={cn(
        'relative flex shrink-0 items-center justify-center rounded-lg',
        iconSizes[size]
      )}>
        <Image 
          src="/logo.png" 
          alt="" 
          fill 
          sizes={imageSizes[size]}
          className="object-contain" 
          priority 
        />
      </div>

      <span className="flex flex-col justify-center">
        <span 
          className={cn(
            'font-[family-name:var(--font-bricolage)] font-extrabold leading-none tracking-tight text-[var(--acade-text)]',
            sizeClasses[size]
          )}
        >
          AcadeGrade
        </span>
      </span>
    </span>
  );

  if (href) {
    return (
      <Link
        href={href}
        onClick={onClick}
        aria-label="AcadeGrade home"
        className="inline-flex rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--acade-primary)]"
      >
        {content}
      </Link>
    );
  }

  return onClick ? (
    <button type="button" onClick={onClick} className="rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--acade-primary)]">
      {content}
    </button>
  ) : content;
}
```

## PageHeader

- Path: `components/shared/PageHeader.tsx`
- Description: Shared route heading with sticky seam behavior and action slot.
- Key props: title, description, eyebrow, actions, sticky.

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils/cn';

export interface PageHeaderProps {
  title: string;
  eyebrow?: string;
  description?: string;
  actions?: React.ReactNode;
  seam?: 'none' | 'fade' | 'curved';
  sticky?: boolean;
  className?: string;
}

function seamOpacity(scrollTop: number) {
  if (scrollTop <= 4) return { line: 0, fade: 0 };
  if (scrollTop <= 16) return { line: ((scrollTop - 4) / 12) * 0.35, fade: 0 };
  if (scrollTop < 48) {
    const progress = (scrollTop - 16) / 32;
    return { line: (1 - progress) * 0.35, fade: progress * 0.7 };
  }
  return { line: 0, fade: 0.7 };
}

export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
  seam = 'fade',
  sticky = true,
  className,
}: PageHeaderProps) {
  const seamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (seam === 'none') return;
    const update = () => {
      const opacity = seamOpacity(window.scrollY);
      seamRef.current?.style.setProperty('--seam-line-opacity', opacity.line.toFixed(3));
      seamRef.current?.style.setProperty('--seam-fade-opacity', opacity.fade.toFixed(3));
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, [seam]);

  return (
    <header
      className={cn(
        'relative bg-[var(--acade-void)]',
        sticky && 'sticky top-0',
        className
      )}
      style={{ zIndex: 'var(--z-sticky)' }}
    >
      <div className="mx-auto flex min-h-[var(--shell-header-height)] max-w-[1200px] flex-wrap items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="min-w-0 flex-1">
          {eyebrow && <p className="mb-1 text-xs font-semibold text-[var(--acade-primary)]">{eyebrow}</p>}
          <h1 tabIndex={-1} className="font-[family-name:var(--font-bricolage)] text-2xl font-semibold text-[var(--acade-text)] text-balance">
            {title}
          </h1>
          {description && <p className="mt-1 text-sm leading-6 text-[var(--acade-text-muted)] text-pretty">{description}</p>}
        </div>
        {actions && <div className="flex min-h-12 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {seam !== 'none' && (
        <div
          ref={seamRef}
          data-testid="page-header-seam"
          aria-hidden="true"
          className={cn('page-header-seam pointer-events-none absolute inset-x-0 top-full h-4', seam === 'curved' && 'page-header-seam--curved')}
          style={{ '--seam-line-opacity': '0', '--seam-fade-opacity': '0' } as React.CSSProperties}
        />
      )}
    </header>
  );
}
```

## EmptyState

- Path: `components/shared/EmptyState.tsx`
- Description: Shared empty-data explanation with primary and optional secondary action.
- Key props: icon, title, description, action, secondaryAction.

```tsx
'use client';

import { motion } from 'motion/react';
import { cn } from '@/lib/utils/cn';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Button } from '../ui/Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

/**
 * EmptyState — shown when a list or section has no data.
 * Always includes one clear next-action CTA.
 */
function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'flex flex-col items-center justify-center text-center py-16 px-6',
        className
      )}
    >
      {icon && (
        <div className="mb-4 text-[var(--acade-text-faint)]">
          {icon}
        </div>
      )}
      <h3 className="text-[length:var(--text-lg)] font-semibold text-[var(--acade-text)] font-[family-name:var(--font-dm-sans)] mb-2 text-balance">
        {title}
      </h3>
      <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] max-w-sm mb-6 text-pretty">
        {description}
      </p>
      {action && (
        <Button variant="primary" size="md" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </motion.div>
  );
}

export { EmptyState };
export type { EmptyStateProps };
```

## ErrorState

- Path: `components/shared/ErrorState.tsx`
- Description: Shared error presentation with optional retry action.
- Key props: title, description, onRetry, retryLabel.

```tsx
import { AlertCircle, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/Button';

export interface ErrorStateProps {
  title: string;
  description: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel = 'Try again',
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center rounded-[var(--radius-surface)] border border-[var(--acade-danger)]/35',
        'bg-[var(--acade-danger-dim)] px-6 py-10 text-center',
        className
      )}
    >
      <AlertCircle className="mb-3 size-6 text-[var(--acade-danger)]" aria-hidden="true" />
      <h3 className="text-lg font-semibold text-[var(--acade-text)]">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--acade-text-muted)]">{description}</p>
      {onRetry && (
        <Button variant="outline" className="mt-5" onClick={onRetry}>
          <RotateCcw className="size-4" aria-hidden="true" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
```

