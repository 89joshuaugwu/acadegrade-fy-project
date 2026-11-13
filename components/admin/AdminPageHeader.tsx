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
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 tabIndex={-1} className="font-[family-name:var(--font-bricolage)] text-[length:var(--text-3xl)] font-bold text-[var(--acade-text)] text-balance">
          {title}
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--acade-text-muted)] text-pretty">{description}</p>
        {children}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {actions}
        <HelpButton entryId={helpId} source={adminHelp} />
      </div>
    </header>
  );
}
