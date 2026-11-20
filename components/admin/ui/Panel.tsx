'use client';

import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

/** The card surface every admin section sits on: 20px radius, soft border, no shadow. */
export const panelClass = 'min-w-0 rounded-[20px] border border-[var(--acade-border-subtle)] bg-[var(--acade-surface)]';

/** Heading style for a panel or section title (Bricolage, 18px). */
export const panelTitleClass = 'ag-admin-h2';

type PanelTone = 'default' | 'danger' | 'muted';

const TONES: Record<PanelTone, string> = {
  default: '',
  danger: 'border-[color-mix(in_srgb,var(--acade-danger)_35%,transparent)]',
  muted: 'bg-[var(--acade-overlay)] border-transparent',
};

/**
 * A titled admin section. Title is an h2 (or `headingLevel` 3), the description is one plain line,
 * actions sit top-right and wrap under the title on narrow screens.
 */
export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
  headingId,
  headingLevel = 2,
  as: Tag = 'section',
  padded = true,
  tone = 'default',
  ...rest
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  bodyClassName?: string;
  headingId?: string;
  headingLevel?: 2 | 3;
  as?: 'section' | 'div' | 'article';
  padded?: boolean;
  tone?: PanelTone;
  'aria-label'?: string;
  'data-testid'?: string;
}) {
  const autoId = useId();
  const id = headingId ?? `panel-${autoId.replace(/:/g, '')}`;
  const Heading = headingLevel === 3 ? 'h3' : 'h2';
  const hasHeader = Boolean(title || description || actions);
  return (
    <Tag
      aria-labelledby={title && !rest['aria-label'] ? id : undefined}
      className={cn(panelClass, TONES[tone], className)}
      {...rest}
    >
      {hasHeader ? (
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 px-5 pt-5 sm:px-6">
          <div className="min-w-0 flex-1 basis-64">
            {title ? <Heading id={id} className={panelTitleClass}>{title}</Heading> : null}
            {description ? <div className="mt-1 max-w-3xl text-sm leading-6 text-[var(--acade-text-muted)] text-pretty">{description}</div> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children !== undefined && children !== null ? (
        <div className={cn(padded && 'px-5 pb-5 sm:px-6 sm:pb-6', padded && (hasHeader ? 'pt-4' : 'pt-5 sm:pt-6'), bodyClassName)}>
          {children}
        </div>
      ) : hasHeader ? <div className="pb-5" /> : null}
    </Tag>
  );
}
