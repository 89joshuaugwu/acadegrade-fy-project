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
