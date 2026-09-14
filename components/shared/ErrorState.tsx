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
