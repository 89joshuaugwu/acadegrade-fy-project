'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ButtonLink, ClosingBand } from '@/components/site/ui';

/**
 * The gold close for the tools pages. Signed out: the page's sentence with
 * its one action (Start your free record, or the calculator's Save). Signed
 * in: "Your record is waiting." with Open dashboard.
 */
export function ToolClosing({
  title,
  action,
  secondary,
  id = 'closing-title',
}: {
  title: ReactNode;
  action?: ReactNode;
  secondary?: { href: string; label: string } | null;
  id?: string;
}) {
  const { user } = useAuth();
  return (
    <ClosingBand
      id={id}
      title={user ? 'Your record is waiting.' : title}
      actions={
        <>
          {user ? (
            <ButtonLink href="/dashboard" variant="night" size="lg">
              Open dashboard
            </ButtonLink>
          ) : (
            (action ?? (
              <ButtonLink href="/register" variant="night" size="lg">
                Start your free record
              </ButtonLink>
            ))
          )}
          {secondary && !(user && secondary.href === '/login') ? (
            <Link
              href={secondary.href}
              className="ag-focus rounded text-[1rem] font-semibold text-ag-night underline decoration-ag-night/30 underline-offset-[6px] hover:decoration-ag-night"
            >
              {secondary.label}
            </Link>
          ) : null}
        </>
      }
    />
  );
}
