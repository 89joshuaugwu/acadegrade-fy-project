'use client';

import { RotateCcw } from 'lucide-react';
import { Button, Skeleton } from '@/components/ui';
import type { DiagnosisOutcome, PlacementDiagnosis, ProviderDiagnosis } from '@/lib/ads/diagnostics';
import { cn } from '@/lib/utils/cn';
import { PreviewDisclosure } from './PlacementPreview';

type Diagnosis = PlacementDiagnosis & { providers?: ProviderDiagnosis[] };

const OUTCOME: Record<DiagnosisOutcome, { label: string; className: string }> = {
  house: { label: 'House campaign', className: 'border-[var(--acade-success)]/30 bg-[var(--acade-success-dim)] text-[var(--acade-success)]' },
  legacy: { label: 'Legacy fallback', className: 'border-[var(--acade-warning)]/30 bg-[var(--acade-warning)]/10 text-[var(--acade-warning)]' },
  none: { label: 'Nothing to serve', className: 'border-[var(--acade-border)] text-[var(--acade-text-muted)]' },
  unknown: { label: 'Status unknown', className: 'border-[var(--acade-border)] text-[var(--acade-text-muted)]' },
};

const PROVIDER_STATE: Record<ProviderDiagnosis['state'], string> = {
  requested: 'Requested',
  incomplete: 'Incomplete',
  off: 'Off',
  unavailable: 'Unknown',
};

const formatTime = (value: number | string) => new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

interface DeliveryDiagnosticsProps {
  title: string;
  /** `null` while saved settings are still loading. */
  diagnoses: Diagnosis[] | null;
  checkedAt: number;
  onRecheck?: () => void;
  description?: string;
  /** Only the title and slot cards; the caller shows the disclaimer and one Recheck. */
  compact?: boolean;
}

/**
 * "What should serve right now and why", computed from saved settings only.
 * It never requests ads or records views, so it is not proof of delivery.
 */
export function DeliveryDiagnostics({ title, diagnoses, checkedAt, onRecheck, description, compact = false }: DeliveryDiagnosticsProps) {
  const headingId = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-status`;
  return (
    <section aria-labelledby={headingId} className="space-y-4">
      {compact ? (
        <h2 id={headingId} className="font-[family-name:var(--font-bricolage)] text-lg font-semibold text-[var(--acade-text)]">{title}</h2>
      ) : <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <h2 id={headingId} className="font-[family-name:var(--font-bricolage)] text-xl font-semibold text-[var(--acade-text)]">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--acade-text-muted)]">
            {description ?? 'Configuration status from saved settings: what should serve right now and why.'} It is not proof that anything rendered, was approved or filled, and unsaved edits are not included.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <p className="text-xs text-[var(--acade-text-muted)]">Checked {formatTime(checkedAt)}</p>
          {onRecheck && (
            <Button variant="ghost" size="sm" onClick={onRecheck}>
              <RotateCcw className="size-4" aria-hidden="true" /> Recheck now
            </Button>
          )}
        </div>
      </div>}

      {diagnoses === null ? (
        <div role="status" aria-label="Checking saved settings" aria-busy="true" className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {diagnoses.map((diagnosis) => <PlacementStatus key={diagnosis.key} diagnosis={diagnosis} />)}
        </div>
      )}
    </section>
  );
}

function PlacementStatus({ diagnosis }: { diagnosis: Diagnosis }) {
  const headingId = `${diagnosis.key.replace(/[^a-z0-9]+/gi, '-')}-heading`;
  const outcome = OUTCOME[diagnosis.outcome];
  return (
    <section aria-labelledby={headingId} className="min-w-0 space-y-4 rounded-2xl border border-[var(--acade-border)] bg-[var(--acade-deep)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={headingId} className="text-base font-semibold text-[var(--acade-text)]">{diagnosis.label}</h3>
        <span className={cn('whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium', outcome.className)}>{outcome.label}</span>
      </div>
      <p className="text-sm leading-6 text-[var(--acade-text)]">{diagnosis.summary}</p>

      {diagnosis.reasons.length > 0 && <List label="Why" items={diagnosis.reasons} />}
      {diagnosis.warnings.length > 0 && <List label="Needs attention" items={diagnosis.warnings} tone="warning" />}

      {diagnosis.candidates.some((candidate) => candidate.warnings.length > 0) && (
        <List
          label="Creative checks"
          tone="warning"
          items={diagnosis.candidates.flatMap((candidate) => candidate.warnings.map((warning) => `${candidate.name}: ${warning}`))}
        />
      )}
      {diagnosis.notes.length > 0 && <List label="How it behaves" items={diagnosis.notes} />}
      {diagnosis.nextChangeAt && (
        <p className="text-sm text-[var(--acade-text-muted)]">Schedule changes next at {formatTime(diagnosis.nextChangeAt)}.</p>
      )}

      {diagnosis.providers && diagnosis.providers.length > 0 && (
        <div className="space-y-2 border-t border-[var(--acade-border-subtle)] pt-4">
          <h4 className="text-sm font-medium text-[var(--acade-text-muted)]">Ad networks on this placement</h4>
          <ul className="space-y-3">
            {diagnosis.providers.map((provider) => (
              <li key={provider.provider} className="text-sm leading-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-[var(--acade-text)]">{provider.label}</span>
                  <span className="whitespace-nowrap text-xs text-[var(--acade-text-muted)]">{PROVIDER_STATE[provider.state]}</span>
                </div>
                <p className="text-[var(--acade-text)]">{provider.summary}</p>
                <p className="text-[var(--acade-text-muted)]">{provider.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {diagnosis.candidates.length > 0 && (
        <div className="space-y-2 border-t border-[var(--acade-border-subtle)] pt-4">
          {diagnosis.candidates.map((candidate) => (
            <PreviewDisclosure key={candidate.id} label={`Preview ${candidate.name}`} campaign={candidate.campaign} placements={[diagnosis.label]} />
          ))}
        </div>
      )}
    </section>
  );
}

function List({ label, items, tone }: { label: string; items: string[]; tone?: 'warning' }) {
  return (
    <div>
      <h4 className="text-sm font-medium text-[var(--acade-text-muted)]">{label}</h4>
      <ul className={cn('mt-1 list-disc space-y-1 pl-5 text-sm leading-6', tone === 'warning' ? 'text-[var(--acade-warning)]' : 'text-[var(--acade-text)]')}>
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}
