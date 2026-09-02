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
