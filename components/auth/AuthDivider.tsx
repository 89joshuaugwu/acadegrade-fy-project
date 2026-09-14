import { cn } from '@/lib/utils/cn';

export interface AuthDividerProps {
  children?: React.ReactNode;
  className?: string;
}

export function AuthDivider({
  children = 'Or continue with',
  className,
}: AuthDividerProps) {
  const label = typeof children === 'string' ? children : 'Alternative sign-in option';

  return (
    <div
      role="separator"
      aria-label={label}
      className={cn('flex items-center gap-3 py-1', className)}
    >
      <span aria-hidden="true" className="h-px flex-1 bg-[var(--acade-border-subtle)]" />
      <span className="text-center text-[length:var(--text-xs)] font-medium text-[var(--acade-text-muted)]">
        {children}
      </span>
      <span aria-hidden="true" className="h-px flex-1 bg-[var(--acade-border-subtle)]" />
    </div>
  );
}

