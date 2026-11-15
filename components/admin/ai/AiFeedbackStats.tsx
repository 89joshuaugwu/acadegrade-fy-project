'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, Skeleton } from '@/components/ui';

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
const RANGES = [7, 30, 90] as const;

const isStats = (value: unknown): value is FeedbackStats => {
  const stats = value as FeedbackStats | null;
  return !!stats && typeof stats.total === 'number' && !!stats.byFeature && Array.isArray(stats.byModel) && Array.isArray(stats.reports);
};
const percent = (rate: number | null) => (rate === null ? 'No ratings' : `${Math.round(rate * 100)}% helpful`);

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

  return (
    <section aria-labelledby="ai-feedback-title" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="ai-feedback-title" className="text-xl font-bold text-[var(--acade-text)]">Student feedback on AI answers</h2>
          <p className="text-sm text-[var(--acade-text-muted)]">Ratings and reports from the website and Android app. Student notes show only on reports.</p>
        </div>
        <div role="group" aria-label="Feedback period" className="flex gap-1">
          {RANGES.map((range) => (
            <button
              key={range}
              type="button"
              aria-pressed={days === range}
              onClick={() => setDays(range)}
              className="min-h-11 rounded-xl px-3 text-sm font-medium text-[var(--acade-text-muted)] hover:bg-[var(--acade-overlay)] aria-pressed:bg-[var(--acade-overlay)] aria-pressed:text-[var(--acade-text)] focus-visible:outline-2 focus-visible:outline-[var(--acade-primary)]"
            >
              {range} days
            </button>
          ))}
        </div>
      </div>

      {state === 'loading' && <Skeleton aria-label="Loading feedback" className="h-40" />}
      {state === 'error' && <p role="status" className="text-sm text-[var(--acade-text-muted)]">Feedback stats could not be loaded. Try again later.</p>}
      {state === 'ready' && stats && (stats.total === 0 && Object.keys(stats.notHelpfulReasons).length === 0 ? (
        <Card padding="lg"><p className="text-sm text-[var(--acade-text-muted)]">No feedback in the last {stats.days} days.</p></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card padding="lg" className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--acade-text)]">By feature</h3>
            <ul className="space-y-2 text-sm">
              {Object.entries(stats.byFeature).map(([feature, c]) => (
                <li key={feature} className="flex flex-wrap justify-between gap-2 rounded-lg bg-[var(--acade-overlay)] px-3 py-2">
                  <span className="font-medium text-[var(--acade-text)]">{FEATURE_LABELS[feature] ?? feature}</span>
                  <span className="text-[var(--acade-text-muted)]">{c.helpful} helpful, {c.notHelpful} not helpful, {c.reports} reports</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card padding="lg" className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--acade-text)]">By model</h3>
            {stats.byModel.length === 0 ? <p className="text-sm text-[var(--acade-text-muted)]">Model is recorded for Written Analysis and Forecast only.</p> : (
              <ul className="space-y-2 text-sm">
                {stats.byModel.map((m) => (
                  <li key={`${m.providerId}/${m.modelId}`} className="rounded-lg bg-[var(--acade-overlay)] px-3 py-2">
                    <p className="break-all font-mono text-xs text-[var(--acade-text)]">{m.providerId} / {m.modelId}</p>
                    <p className="text-[var(--acade-text-muted)]">{percent(m.helpfulRate)} ({m.helpful + m.notHelpful} ratings), {m.reports} reports</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card padding="lg" className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--acade-text)]">Why answers were not helpful</h3>
            {Object.keys(stats.notHelpfulReasons).length === 0 ? <p className="text-sm text-[var(--acade-text-muted)]">No reasons given yet.</p> : (
              <ul className="space-y-1 text-sm text-[var(--acade-text-muted)]">
                {Object.entries(stats.notHelpfulReasons).map(([reason, count]) => <li key={reason}>{REASON_LABELS[reason] ?? reason}: {count}</li>)}
              </ul>
            )}
          </Card>
          <Card padding="lg" className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--acade-text)]">Latest reports</h3>
            {stats.reports.length === 0 ? <p className="text-sm text-[var(--acade-text-muted)]">No reports.</p> : (
              <ul className="space-y-2 text-sm">
                {stats.reports.slice(0, 10).map((r, index) => (
                  <li key={`${r.createdAt}-${index}`} className="rounded-lg bg-[var(--acade-overlay)] px-3 py-2">
                    <p className="text-[var(--acade-text)]">{FEATURE_LABELS[r.feature] ?? r.feature}, {REASON_LABELS[r.reason ?? ''] ?? 'No reason'}, {r.platform}</p>
                    {r.note && <p className="mt-1 break-words text-[var(--acade-text-muted)]">{r.note}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {stats.truncated && <p className="text-xs text-[var(--acade-text-muted)] lg:col-span-2">Showing the first 5,000 entries in this period.</p>}
        </div>
      ))}
    </section>
  );
}
