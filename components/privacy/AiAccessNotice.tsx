'use client';

import { Info } from 'lucide-react';
import { MINOR_NOTICE, openRequirements, type AiEligibilityView } from '@/lib/consent/requirements';

/**
 * Shown in place of an AI feature (such as result scanning) when the account
 * may not use AI: an under-18 notice, or a prompt to finish setting up.
 */
export function AiAccessNotice({ eligibility, feature = 'Result scanning' }: { eligibility: AiEligibilityView; feature?: string }) {
  if (eligibility.status === 'minor') {
    return (
      <div className="flex items-start gap-3 rounded-[var(--radius-control)] border border-[var(--acade-info)]/30 bg-[var(--acade-info)]/10 p-4">
        <Info className="mt-0.5 size-5 shrink-0 text-[var(--acade-info)]" aria-hidden="true" />
        <p className="text-sm leading-6 text-[var(--acade-text)]">{MINOR_NOTICE}</p>
      </div>
    );
  }
  const needsConsentOnly = eligibility.status === 'adult';
  return (
    <div className="rounded-[var(--radius-control)] border border-[var(--acade-border)] bg-[var(--acade-deep)] p-4">
      <p className="text-sm font-semibold text-[var(--acade-text)]">{feature} needs one more step</p>
      <p className="mt-1 text-sm leading-6 text-[var(--acade-text-muted)]">
        {needsConsentOnly
          ? 'Allow AcadeGrade to send scanned slips to its AI providers, or enter your courses by hand.'
          : 'Confirm your age and choose whether AcadeGrade may use AI providers. You can still enter your courses by hand.'}
      </p>
      <button
        type="button"
        onClick={() => openRequirements('ai')}
        className="mt-3 inline-flex min-h-11 items-center rounded-[var(--radius-control)] bg-[var(--acade-primary)] px-4 text-sm font-semibold text-[var(--acade-on-primary)] transition-colors hover:bg-[var(--acade-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]"
      >
        Finish setting up
      </button>
    </div>
  );
}
