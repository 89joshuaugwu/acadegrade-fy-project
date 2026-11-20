'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui';
import { panelClass } from '@/components/admin/ui/Panel';
import { StatGrid, StatTile } from '@/components/admin/ui/StatTile';
import { cn } from '@/lib/utils/cn';

interface Counts { helpful: number; notHelpful: number; reports: number }
interface FeedbackStats {
  days: number;
  total: number;
  truncated: boolean;
  byFeature: Record<string, Counts>;
  byModel: Array<Counts & { providerId: string; modelId: string; helpfulRate: number | null }>;
  notHelpfulReasons: Record<string, number>;
  reports: Array<{ feature: string; reason: string | null; note: string | null; platform: string; modelId: string | null; createdAt: string }>;
}

const FEATURE_LABELS: Record<string, string> = { insights: 'Written Analysis', forecast: 'Forecast', whatif: 'What-If guidance', ocr: 'Result scanning' };
const REASON_LABELS: Record<string, string> = { inaccurate: 'Inaccurate', offensive: 'Offensive', unsafe: 'Unsafe', other: 'Other' };
const PLATFORM_LABELS: Record<string, string> = { android: 'Android', web: 'Website', ios: 'iOS' };
const RANGES = [7, 30, 90] as const;

const isStats = (value: unknown): value is FeedbackStats => {
  const stats = value as FeedbackStats | null;
  return !!stats && typeof stats.total === 'number' && !!stats.byFeature && Array.isArray(stats.byModel) && Array.isArray(stats.reports);
};
const percent = (rate: number | null) => (rate === null ? 'No ratings' : `${Math.round(rate * 100)}% helpful`);
const cardClass = cn(panelClass, 'min-w-0 space-y-3 p-5 sm:p-6');
const cardTitleClass = 'text-[0.9375rem] font-semibold text-[var(--acade-text)]';

/** A hairline bar for a share (0 to 1). Decorative: the number beside it carries the meaning. */
function ShareBar({ value, tone = 'good' }: { value: number; tone?: 'good' | 'warn' }) {
  return (
    <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-[var(--acade-overlay)]">
      <div className={cn('h-full rounded-full', tone === 'good' ? 'bg-[var(--acade-success)]' : 'bg-[var(--acade-warning)]')} style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  );
}

/** Admin > AI: what students said about AI answers (G8). Reads GET /api/admin/ai/feedback. */
export function AiFeedbackStats() {
  const { user } = useAuth();
  const [days, setDays] = useState<number>(30);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setState('loading');
    (async () => {
      try {
        const response = await fetch(`/api/admin/ai/feedback?days=${days}`, { headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
        const body: unknown = response.ok ? await response.json() : null;
        if (cancelled) return;
        if (isStats(body)) { setStats(body); setState('ready'); } else setState('error');
      } catch {
        if (!cancelled) setState('error');
      }
    })();
    return () => { cancelled = true; };
  }, [user?.uid, days]);

  const totals = stats ? Object.values(stats.byFeature).reduce((sum, c) => ({ helpful: sum.helpful + c.helpful, notHelpful: sum.notHelpful + c.notHelpful, reports: sum.reports + c.reports }), { helpful: 0, notHelpful: 0, reports: 0 }) : null;
  const rated = totals ? totals.helpful + totals.notHelpful : 0;
  const reasonTotal = stats ? Object.values(stats.notHelpfulReasons).reduce((sum, count) => sum + count, 0) : 0;

  return (
    <section aria-labelledby="ai-feedback-title" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id="ai-feedback-title" className="ag-admin-h2 text-[1.25rem] leading-7">Student feedback on AI answers</h2>
          <p className="mt-1 text-sm text-[var(--acade-text-muted)]">Ratings and reports from the website and Android app. Student notes show only on reports.</p>
        </div>
        <div role="group" aria-label="Feedback period" className="inline-flex rounded-[12px] border border-[var(--acade-border-subtle)] bg-[var(--acade-overlay)] p-1">
          {RANGES.map((range) => (
            <button
              key={range}
              type="button"
              aria-pressed={days === range}
              onClick={() => setDays(range)}
              className="min-h-10 rounded-[9px] px-3.5 text-sm font-medium tabular-nums text-[var(--acade-text-muted)] transition-colors hover:text-[var(--acade-text)] aria-pressed:bg-[var(--acade-surface)] aria-pressed:text-[var(--acade-text)] aria-pressed:shadow-[var(--shadow-card)] focus-visible:outline-2 focus-visible:outline-[var(--acade-primary)]"
            >
              {range} days
            </button>
          ))}
        </div>
      </div>

      {state === 'loading' && <Skeleton aria-label="Loading feedback" className="h-40 rounded-[20px]" />}
      {state === 'error' && <p role="status" className={cn(panelClass, 'p-5 text-sm text-[var(--acade-text-muted)]')}>Feedback stats could not be loaded. Try again later.</p>}
      {state === 'ready' && stats && totals && (stats.total === 0 && Object.keys(stats.notHelpfulReasons).length === 0 ? (
        <div className={cn(panelClass, 'p-6')}><p className="text-sm text-[var(--acade-text-muted)]">No feedback in the last {stats.days} days.</p></div>
      ) : (
        <div className="space-y-4">
          <StatGrid columns={3} aria-label="Feedback totals">
            <StatTile label="Ratings and reports" value={stats.total.toLocaleString()} detail={`Last ${stats.days} days`} />
            <StatTile label="Rated helpful" value={rated ? `${Math.round((totals.helpful / rated) * 100)}%` : 'None yet'} detail={`${totals.helpful.toLocaleString()} of ${rated.toLocaleString()} ratings`} tone={rated && totals.helpful / rated < 0.6 ? 'warn' : 'good'} />
            <StatTile label="Reports" value={totals.reports.toLocaleString()} detail="Answers a student flagged" tone={totals.reports > 0 ? 'warn' : 'default'} />
          </StatGrid>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className={cardClass}>
              <h3 className={cardTitleClass}>By feature</h3>
              <div className="-mx-5 overflow-x-auto sm:-mx-6">
                <table className="ag-table min-w-[22rem]">
                  <caption className="sr-only">Ratings and reports per feature</caption>
                  <thead>
                    <tr>
                      <th scope="col">Feature</th>
                      <th scope="col" className="ag-right">Helpful</th>
                      <th scope="col" className="ag-right">Not helpful</th>
                      <th scope="col" className="ag-right">Reports</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(stats.byFeature).map(([feature, c]) => (
                      <tr key={feature}>
                        <th scope="row" className="px-4 py-3 text-left font-medium text-[var(--acade-text)]">{FEATURE_LABELS[feature] ?? feature}</th>
                        <td className="ag-right">{c.helpful}</td>
                        <td className="ag-right">{c.notHelpful}</td>
                        <td className="ag-right">{c.reports}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className={cardClass}>
              <h3 className={cardTitleClass}>By model</h3>
              {stats.byModel.length === 0 ? <p className="text-sm text-[var(--acade-text-muted)]">Model is recorded for Written Analysis and Forecast only.</p> : (
                <ul className="space-y-3 text-sm">
                  {stats.byModel.map((m) => (
                    <li key={`${m.providerId}/${m.modelId}`} className="space-y-1.5">
                      <p className="break-all font-medium text-[var(--acade-text)]">{m.providerId} / {m.modelId}</p>
                      <ShareBar value={m.helpfulRate ?? 0} tone={(m.helpfulRate ?? 1) < 0.6 ? 'warn' : 'good'} />
                      <p className="tabular-nums text-[var(--acade-text-muted)]">{percent(m.helpfulRate)} ({m.helpful + m.notHelpful} ratings), {m.reports} reports</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className={cardClass}>
              <h3 className={cardTitleClass}>Why answers were not helpful</h3>
              {Object.keys(stats.notHelpfulReasons).length === 0 ? <p className="text-sm text-[var(--acade-text-muted)]">No reasons given yet.</p> : (
                <ul className="space-y-3 text-sm">
                  {Object.entries(stats.notHelpfulReasons).map(([reason, count]) => (
                    <li key={reason} className="space-y-1.5">
                      <p className="tabular-nums text-[var(--acade-text)]">{REASON_LABELS[reason] ?? reason}: {count}</p>
                      <ShareBar value={reasonTotal ? count / reasonTotal : 0} tone="warn" />
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className={cardClass}>
              <h3 className={cardTitleClass}>Latest reports</h3>
              {stats.reports.length === 0 ? <p className="text-sm text-[var(--acade-text-muted)]">No reports.</p> : (
                <ul className="divide-y divide-[var(--acade-border-subtle)] text-sm">
                  {stats.reports.slice(0, 10).map((r, index) => (
                    <li key={`${r.createdAt}-${index}`} className="py-3 first:pt-0 last:pb-0">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-medium text-[var(--acade-text)]">{FEATURE_LABELS[r.feature] ?? r.feature}</span>
                        <span className="rounded-full bg-[var(--acade-danger-dim)] px-2 py-0.5 text-xs font-medium text-[var(--acade-danger)]">{REASON_LABELS[r.reason ?? ''] ?? 'No reason'}</span>
                        <span className="text-xs text-[var(--acade-text-muted)]">{PLATFORM_LABELS[r.platform] ?? r.platform}</span>
                        <span className="text-xs tabular-nums text-[var(--acade-text-muted)]">{new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                      </p>
                      {r.note && <p className="mt-1 break-words text-[var(--acade-text-muted)]">{r.note}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          {stats.truncated && <p className="text-xs text-[var(--acade-text-muted)]">Showing the first 5,000 entries in this period.</p>}
        </div>
      ))}
    </section>
  );
}
