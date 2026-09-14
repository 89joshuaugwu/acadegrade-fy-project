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
