import type { ReactNode } from 'react';
import { HelpButton } from '@/components/help/HelpDrawer';
import { adminHelp, type AdminHelpId } from '@/lib/help/admin-help';

/**
 * The admin page title block: one h1, one plain description, the page's Help
 * button and optional actions that wrap under the title on narrow screens.
 * Every admin page opens with it, so every page gets the same Help entry point.
 */
export function AdminPageHeader({ title, description, helpId, actions, children }: {
  title: string;
  description: ReactNode;
  /** The help entry for this page, or for its active tab. */
  helpId: AdminHelpId;
  actions?: ReactNode;
  /** Extra status lines under the description (freshness, counts). */
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-[var(--acade-border-subtle)] pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 tabIndex={-1} className="ag-admin-display text-[1.875rem] font-bold leading-[1.1] text-[var(--acade-text)] text-balance outline-none sm:text-[2.25rem]">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-[0.9375rem] leading-6 text-[var(--acade-text-muted)] text-pretty">{description}</p>
        {children}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {actions}
        <HelpButton entryId={helpId} source={adminHelp} />
      </div>
    </header>
  );
}
