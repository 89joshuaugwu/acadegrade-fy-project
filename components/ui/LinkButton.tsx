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
