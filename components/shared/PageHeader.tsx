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
