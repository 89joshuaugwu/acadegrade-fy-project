'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { LinkButton } from '@/components/ui/LinkButton';
import { useRecordType } from '@/hooks/useRecordType';
import { pageRecordType, RECORD_TYPE_COPY } from '@/lib/records/navigation';
import type { RecordType } from '@/types/records';

const MESSAGE: Record<RecordType, string> = {
  tertiary: 'This page is for university, polytechnic and college results, semester by semester.',
  olevel: 'This page is for WAEC and NECO grades.',
  admission: 'This page works out a JAMB admission aggregate.',
};

/**
 * A page for another record type (a bookmark, an old link) shows a short note
 * instead of an empty or broken screen. Nothing is redirected or changed.
 */
export function RecordTypeGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/';
  const recordType = useRecordType();
  const pageType = pageRecordType(pathname, recordType);
  if (!pageType) return <>{children}</>;

  return (
    <section
      aria-labelledby="record-type-gate-title"
      className="mx-auto flex max-w-xl flex-col items-start gap-4 rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-deep)] p-6 sm:p-8"
    >
      <h1 id="record-type-gate-title" className="font-[family-name:var(--font-bricolage)] text-[1.5rem] font-bold tracking-[-0.02em] text-[var(--acade-text)]">
        Not part of your record
      </h1>
      <p className="text-[0.9375rem] leading-relaxed text-[var(--acade-text-muted)]">
        {MESSAGE[pageType]} Your account tracks {RECORD_TYPE_COPY[recordType].phrase}.
        To use this page, change what you track in Settings. Nothing you have saved is deleted.
      </p>
      <div className="flex flex-wrap gap-3">
        <LinkButton href="/dashboard">Open your dashboard</LinkButton>
        <LinkButton href="/settings#section-record-type" variant="outline">Change in Settings</LinkButton>
      </div>
    </section>
  );
}
