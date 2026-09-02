import { cn } from '@/lib/utils/cn';
import { Skeleton } from '../ui/Skeleton';

type SkeletonVariant = 'stat' | 'arc-hero' | 'trend-chart' | 'insight' | 'course-row';

interface SkeletonCardProps {
  variant: SkeletonVariant;
  className?: string;
}

/**
 * SkeletonCard — pre-built skeleton layouts matching the shapes of real content.
 * Each variant mirrors the exact structure of the actual component it replaces.
 */
function SkeletonCard({ variant, className }: SkeletonCardProps) {
  switch (variant) {
    case 'stat':
      return (
        <div
          className={cn(
            'rounded-2xl border border-[var(--acade-border)] bg-[var(--acade-deep)] p-5',
            className
          )}
          aria-hidden="true"
        >
          <Skeleton shape="rect" className="w-20 h-3 mb-3" />
          <Skeleton shape="rect" className="w-16 h-8 mb-2" />
          <Skeleton shape="rect" className="w-24 h-3" />
        </div>
      );

    case 'arc-hero':
      return (
        <div
          className={cn(
            'rounded-2xl border border-[var(--acade-border)] bg-[var(--acade-deep)] p-6 flex flex-col items-center',
            className
          )}
          aria-hidden="true"
        >
          <Skeleton shape="rect" className="w-48 h-5 mb-6" />
          <Skeleton shape="circle" width={220} height={220} className="mb-4" />
          <Skeleton shape="rect" className="w-28 h-4 mb-2" />
          <Skeleton shape="rect" className="w-36 h-8 mt-2" />
        </div>
      );

    case 'trend-chart':
      return (
        <div
          className={cn(
            'rounded-2xl border border-[var(--acade-border)] bg-[var(--acade-deep)] p-5',
            className
          )}
          aria-hidden="true"
        >
          <div className="flex items-center justify-between mb-4">
            <Skeleton shape="rect" className="w-32 h-5" />
            <Skeleton shape="rect" className="w-20 h-4" />
          </div>
          <Skeleton shape="rect" className="w-full h-48 rounded-xl" />
        </div>
      );

    case 'insight':
      return (
        <div
          className={cn(
            'rounded-2xl border border-[var(--acade-border)] bg-[var(--acade-deep)] p-5',
            className
          )}
          aria-hidden="true"
        >
          <div className="flex items-center justify-between mb-4">
            <Skeleton shape="rect" className="w-36 h-5" />
            <Skeleton shape="circle" width={24} height={24} />
          </div>
          <Skeleton shape="text" lines={3} className="mb-3" />
          <Skeleton shape="rect" className="w-28 h-4" />
        </div>
      );

    case 'course-row':
      return (
        <div
          className={cn(
            'flex items-center gap-4 px-4 py-3 border-b border-[var(--acade-border-subtle)]',
            className
          )}
          aria-hidden="true"
        >
          <Skeleton shape="rect" className="w-6 h-4" />
          <Skeleton shape="rect" className="w-20 h-4" />
          <Skeleton shape="rect" className="flex-1 h-4" />
          <Skeleton shape="rect" className="w-8 h-4" />
          <Skeleton shape="rect" className="w-8 h-4" />
          <Skeleton shape="rect" className="w-8 h-4" />
          <Skeleton shape="rect" className="w-12 h-6 rounded-full" />
        </div>
      );

    default:
      return null;
  }
}

export { SkeletonCard };
export type { SkeletonCardProps, SkeletonVariant };
