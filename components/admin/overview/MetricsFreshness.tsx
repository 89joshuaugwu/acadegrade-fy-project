'use client';

import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

/** "Updated 2 h ago" for a metrics timestamp. Absolute date after a day. */
export function metricsAgeText(generatedAt: string | null | undefined, now = Date.now()): string {
  const time = generatedAt ? Date.parse(generatedAt) : Number.NaN;
  if (!Number.isFinite(time)) return 'Not calculated yet';
  const minutes = Math.max(0, Math.round((now - time) / 60_000));
  if (minutes < 1) return 'Updated just now';
  if (minutes < 60) return `Updated ${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Updated ${hours} h ago`;
  return `Updated ${new Date(time).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
}

/**
 * Freshness line for pages that show the daily metrics roll-up: when the numbers
 * were calculated, a warning when they are over 36 hours old, and "Refresh now"
 * (limited to 3 an hour on the server).
 */
export function MetricsFreshness({ generatedAt, stale, refreshing, onRefresh }: Readonly<{
  generatedAt?: string | null;
  stale?: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}>) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--acade-text-muted)]">
      <span>
        {metricsAgeText(generatedAt)}
        {stale ? <span className="text-[var(--acade-warning)]">. Older than a day and a half; the daily job may have stopped</span> : null}
      </span>
      <Button variant="ghost" size="sm" onClick={onRefresh} loading={refreshing} loadingLabel="Refreshing numbers">
        <RefreshCw className="size-4" aria-hidden="true" />Refresh now
      </Button>
    </div>
  );
}
