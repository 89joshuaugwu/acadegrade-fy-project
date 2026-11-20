'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { RefreshCw, ShieldCheck, TriangleAlert } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Panel } from '@/components/admin/ui/Panel';
import { StatGrid, StatTile } from '@/components/admin/ui/StatTile';
import { TableFrame, tableClass } from '@/components/admin/ui/TableFrame';
import { AdminSelect } from '@/components/admin/ui/AdminSelect';
import { Notice } from '@/components/admin/ui/Notice';
import { ErrorState } from '@/components/shared';
import { cn } from '@/lib/utils/cn';

/* ─── Types ─── */
interface CategoryData {
  count: number;
  errors: number;
  avgMs: number;
}

interface TopUser {
  uid: string;
  name: string;
  email: string;
  count: number;
  errors: number;
  lastEndpoint: string;
}

interface RecentError {
  endpoint: string;
  status: number;
  error: string;
  uid: string;
  timestamp: string;
}

interface AnalyticsResponse {
  totalCalls: number;
  errorCalls: number;
  errorRate: string;
  avgDuration: number;
  byCategory: Record<string, CategoryData>;
  byEndpoint: Record<string, { count: number; errors: number }>;
  byProvider: Record<string, number>;
  topUsers: TopUser[];
  timelineData: { label: string; calls: number }[];
  recentErrors: RecentError[];
  range: string;
}

/* ─── Constants ─── */
const CATEGORY_LABELS: Record<string, string> = {
  ai: 'AI features',
  email: 'Email',
  otp: 'Sign-in codes (OTP)',
  notification: 'Push notifications',
  transcript: 'Transcripts',
  extract: 'Result scanning',
  auth: 'Sign-up and sign-in',
  admin: 'Admin',
  unknown: 'Other',
};

const PROVIDER_LABELS: Record<string, string> = {
  gemini: 'Gemini', groq: 'Groq', openrouter: 'OpenRouter', openai: 'OpenAI', mistral: 'Mistral', anthropic: 'Anthropic', deepseek: 'DeepSeek',
};

/** Chart series from the app tokens, so both themes stay readable. */
const SERIES = ['var(--acade-primary)', 'var(--acade-gold)', 'var(--acade-info)', 'var(--acade-success)', 'var(--grade-e)', 'var(--grade-d)', 'var(--acade-text-faint)'];

const RANGE_OPTIONS = [
  { value: 'day', label: 'Last 24 hours' },
  { value: 'week', label: 'Last 7 days' },
  { value: 'month', label: 'Last 30 days' },
];

const TOOLTIP_STYLE = {
  backgroundColor: 'var(--acade-surface)',
  border: '1px solid var(--acade-border)',
  borderRadius: '12px',
  color: 'var(--acade-text)',
  fontSize: '13px',
  boxShadow: 'none',
};

const AXIS_TICK = { fill: 'var(--acade-text-muted)', fontSize: 12 };

const formatCount = (value: number) => value.toLocaleString('en-GB');

const pillClass = 'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold leading-5';

/* ─── Page ─── */
export default function ApiAnalyticsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState('week');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async (showToast = false) => {
    if (!user) return;
    if (showToast) setRefreshing(true);
    else if (!data) setLoading(true); // only show skeleton on first load

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/api-analytics?range=${range}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date());
      setLoadError(null);
      if (showToast) toast.success('Refreshed');
    } catch {
      // Keep any figures already shown, but say they are stale.
      setLoadError(data
        ? 'The latest refresh failed. Figures below are from the last successful update.'
        : 'The analytics service did not respond, so no figures can be shown.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, range, data]);

  // Initial fetch + re-fetch on range change
  useEffect(() => {
    if (user) fetchData();
  }, [user, range]);

  // Auto-polling every 30 seconds
  useEffect(() => {
    if (autoRefresh && user) {
      intervalRef.current = setInterval(() => {
        fetchData(false);
      }, 30_000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, user, range]);

  /* ─── Derived Data ─── */
  const categoryRows = useMemo(() => {
    if (!data?.byCategory) return [];
    return Object.entries(data.byCategory)
      .map(([key, val]) => ({
        key,
        name: CATEGORY_LABELS[key] || key,
        calls: val.count,
        errors: val.errors,
        avgMs: val.avgMs,
      }))
      .sort((a, b) => b.calls - a.calls);
  }, [data]);

  const providerRows = useMemo(() => {
    if (!data?.byProvider) return [];
    const rows = Object.entries(data.byProvider).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    const total = rows.reduce((sum, row) => sum + row.value, 0);
    return rows.map((row, idx) => ({ ...row, label: PROVIDER_LABELS[row.name] ?? row.name, share: total > 0 ? row.value / total : 0, color: SERIES[idx % SERIES.length] }));
  }, [data]);

  const endpointTableData = useMemo(() => {
    if (!data?.byEndpoint) return [];
    return Object.entries(data.byEndpoint)
      .map(([endpoint, val]) => ({ endpoint, ...val }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [data]);

  const rangeLabel = RANGE_OPTIONS.find(r => r.value === range)?.label ?? 'Last 7 days';
  const header = (extras?: { actions?: React.ReactNode; children?: React.ReactNode }) => (
    <AdminPageHeader
      title="API health"
      description="API traffic, errors and response times from server logs."
      helpId="admin.api-health"
      actions={extras?.actions}
    >
      {extras?.children}
    </AdminPageHeader>
  );

  /* ─── Error State (nothing loaded yet) ─── */
  if (!data && loadError && !loading) {
    return (
      <div className="space-y-6">
        {header()}
        <ErrorState title="API health is unavailable" description={loadError} onRetry={() => { void fetchData(); }} />
      </div>
    );
  }

  /* ─── Loading State ─── */
  if (loading) {
    return (
      <div className="space-y-6">
        {header()}
        <div role="status" aria-label="Loading API health" aria-busy="true" className="space-y-6">
          <Skeleton className="h-28 rounded-[20px]" />
          <div className="grid gap-6 lg:grid-cols-5">
            <Skeleton className="h-80 rounded-[20px] lg:col-span-3" />
            <Skeleton className="h-80 rounded-[20px] lg:col-span-2" />
          </div>
        </div>
      </div>
    );
  }

  const errorRate = parseFloat(data?.errorRate || '0');
  const avgDuration = data?.avgDuration || 0;
  const maxCategoryCalls = Math.max(1, ...categoryRows.map(row => row.calls));
  const timeline = data?.timelineData ?? [];
  const topUsers = data?.topUsers ?? [];
  const recentErrors = data?.recentErrors ?? [];

  return (
    <div className="space-y-6">
      {header({
        actions: (
          <div className="contents">
            {/* `contents`: these controls wrap together with the header's Help button. */}
            {/* Auto-refresh toggle */}
            <button
              type="button"
              aria-pressed={autoRefresh}
              aria-label="Auto-refresh every 30 seconds"
              onClick={() => setAutoRefresh(prev => !prev)}
              className={cn(
                'inline-flex h-12 items-center gap-2 rounded-[12px] border px-4 text-sm font-semibold transition-colors',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]',
                autoRefresh
                  ? 'border-[color-mix(in_srgb,var(--acade-success)_40%,transparent)] bg-[var(--acade-success-dim)] text-[var(--acade-success)]'
                  : 'border-[var(--acade-border)] bg-[var(--acade-surface)] text-[var(--acade-text-muted)] hover:text-[var(--acade-text)]'
              )}
              title={autoRefresh ? 'Auto-refresh is on (every 30 seconds)' : 'Auto-refresh is off'}
            >
              <span className="relative flex size-2" aria-hidden="true">
                {autoRefresh ? <span className="absolute inline-flex size-full rounded-full bg-[var(--acade-success)] opacity-60 motion-safe:animate-ping" /> : null}
                <span className={cn('relative inline-flex size-2 rounded-full', autoRefresh ? 'bg-[var(--acade-success)]' : 'bg-[var(--acade-text-faint)]')} />
              </span>
              {autoRefresh ? 'Live' : 'Paused'}
            </button>
            {/* Range selector (custom listbox) */}
            <div className="w-[11.5rem]">
              <AdminSelect label="Time range" hideLabel options={RANGE_OPTIONS} value={range} onChange={setRange} />
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchData(true)} disabled={refreshing}>
              <RefreshCw size={16} aria-hidden="true" className={cn(refreshing && 'motion-safe:animate-spin')} />
              Refresh
            </Button>
          </div>
        ),
        children: lastUpdated ? (
          <p className="mt-2 text-sm tabular-nums text-[var(--acade-text-muted)]">
            Updated {lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            {autoRefresh ? ', refreshing every 30 seconds' : ', auto-refresh paused'}
          </p>
        ) : null,
      })}

      {loadError && (
        <Notice tone="warning" role="status">{loadError}</Notice>
      )}

      {/* Key numbers */}
      <StatGrid aria-label={`API health, ${rangeLabel.toLowerCase()}`}>
        <StatTile label="Total calls" value={formatCount(data?.totalCalls || 0)} detail={rangeLabel} />
        <StatTile
          label="Error rate"
          value={`${data?.errorRate || '0'}%`}
          tone={errorRate > 5 ? 'bad' : 'good'}
          detail={errorRate > 5 ? 'Above the 5% alert line' : 'Under the 5% alert line'}
        />
        <StatTile
          label="Average response"
          value={<>{formatCount(avgDuration)}<span className="ml-1 text-base font-semibold text-[var(--acade-text-muted)]">ms</span></>}
          tone={avgDuration > 3000 ? 'warn' : 'good'}
          detail={avgDuration > 3000 ? 'Slower than 3 seconds' : 'Under 3 seconds'}
        />
        <StatTile label="Failed calls" value={formatCount(data?.errorCalls || 0)} detail="Status 400 and above" />
      </StatGrid>

      {/* Traffic over time + by type */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Panel
          className="flex flex-col lg:col-span-3"
          bodyClassName="flex flex-1 flex-col"
          title="Calls over time"
          description={range === 'day' ? `Calls per hour, ${rangeLabel.toLowerCase()}` : `Calls per day, ${rangeLabel.toLowerCase()}`}
        >
          {/* Grows with the "Calls by type" panel beside it on wide screens, so the card has no empty floor. */}
          <div className="h-[260px] lg:h-auto lg:min-h-[260px] lg:flex-1">
            {timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="api-calls-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--acade-primary)" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="var(--acade-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--acade-border-subtle)" />
                  <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
                  <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} width={44} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: 'var(--acade-border)' }} formatter={(value) => [`${formatCount(Number(value))} calls`, 'Traffic']} />
                  <Area type="monotone" dataKey="calls" stroke="var(--acade-primary)" strokeWidth={2.5} fill="url(#api-calls-fill)" dot={false} activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-[var(--acade-text-muted)]">No data in this range.</div>
            )}
          </div>
        </Panel>

        <Panel className="lg:col-span-2" title="Calls by type" description="Grouped by what the call was for">
          {categoryRows.length > 0 ? (
            <ul className="space-y-4">
              {categoryRows.map(row => (
                <li key={row.key}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate font-medium text-[var(--acade-text)]">{row.name}</span>
                    <span className="shrink-0 tabular-nums text-[var(--acade-text-muted)]"><span className="font-semibold text-[var(--acade-text)]">{formatCount(row.calls)}</span> calls</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--acade-overlay)]" aria-hidden="true">
                    <div className="h-full rounded-full bg-[var(--acade-primary)]" style={{ width: `${Math.max(2, (row.calls / maxCategoryCalls) * 100)}%` }} />
                  </div>
                  <p className="mt-1 text-[0.8125rem] tabular-nums text-[var(--acade-text-muted)]">
                    <span className={row.errors > 0 ? 'text-[var(--acade-danger)]' : undefined}>{formatCount(row.errors)} failed</span>, {formatCount(row.avgMs)} ms on average
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-10 text-center text-sm text-[var(--acade-text-muted)]">No data yet.</p>
          )}
        </Panel>
      </div>

      {/* Endpoints + providers */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Panel className="lg:col-span-3" title="Busiest endpoints" description="The 12 routes with the most calls in this range">
          {endpointTableData.length > 0 ? (
            <TableFrame label="Busiest endpoints" minWidth="30rem">
              <table className={tableClass}>
                <thead>
                  <tr>
                    <th scope="col" className="w-10">#</th>
                    <th scope="col">Endpoint</th>
                    <th scope="col" className="ag-right">Calls</th>
                    <th scope="col" className="ag-right">Failed</th>
                    <th scope="col" className="ag-right">Failure rate</th>
                  </tr>
                </thead>
                <tbody>
                  {endpointTableData.map((ep, idx) => {
                    const rate = ep.count > 0 ? (ep.errors / ep.count) * 100 : 0;
                    return (
                      <tr key={ep.endpoint}>
                        <td className="text-[var(--acade-text-faint)]">{idx + 1}</td>
                        <td className="max-w-[16rem] break-all font-medium">{ep.endpoint}</td>
                        <td className="ag-right font-semibold">{formatCount(ep.count)}</td>
                        <td className={cn('ag-right', ep.errors > 0 ? 'text-[var(--acade-danger)]' : 'text-[var(--acade-text-muted)]')}>{formatCount(ep.errors)}</td>
                        <td className={cn('ag-right', rate > 5 ? 'font-semibold text-[var(--acade-danger)]' : 'text-[var(--acade-text-muted)]')}>{rate.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableFrame>
          ) : (
            <p className="py-10 text-center text-sm text-[var(--acade-text-muted)]">No endpoint data yet.</p>
          )}
        </Panel>

        <Panel className="lg:col-span-2" title="AI providers used" description="Which provider answered each AI call">
          {providerRows.length > 0 ? (
            <div className="space-y-5">
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-[var(--acade-overlay)]" aria-hidden="true">
                {providerRows.map(row => (
                  <div key={row.name} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${row.share * 100}%`, backgroundColor: row.color }} />
                ))}
              </div>
              <ul className="divide-y divide-[var(--acade-border-subtle)]">
                {providerRows.map(row => (
                  <li key={row.name} className="flex items-center gap-3 py-2.5 text-sm">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.color }} aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate font-medium text-[var(--acade-text)]">{row.label}</span>
                    <span className="tabular-nums text-[var(--acade-text-muted)]">{formatCount(row.value)} calls</span>
                    <span className="w-12 text-right font-semibold tabular-nums text-[var(--acade-text)]">{Math.round(row.share * 100)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-[var(--acade-text-muted)]">No provider data yet.</p>
          )}
        </Panel>
      </div>

      {/* Bottom Row: Top Users + Recent Errors */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Top API consumers"
          description="The accounts making the most calls. This shows names and emails; keep it out of public channels."
        >
          {topUsers.length > 0 ? (
            <ol className="divide-y divide-[var(--acade-border-subtle)]">
              {topUsers.map((u, idx) => {
                const isAbusive = u.count > 50;
                return (
                  <li key={u.uid} className="flex items-center gap-3 py-3">
                    <span className={cn('w-6 shrink-0 text-right text-sm font-semibold tabular-nums', idx === 0 ? 'text-[var(--acade-gold)]' : 'text-[var(--acade-text-faint)]')}>{idx + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="min-w-0 truncate text-sm font-semibold text-[var(--acade-text)]">{u.name}</span>
                        {isAbusive && (
                          <span className={cn(pillClass, 'bg-[var(--acade-danger-dim)] text-[var(--acade-danger)]')}>
                            <TriangleAlert className="size-3" aria-hidden="true" />
                            High usage
                          </span>
                        )}
                      </div>
                      <span className="block truncate text-[0.8125rem] text-[var(--acade-text-muted)]">{u.email || u.uid}</span>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="ag-admin-display block text-lg font-bold leading-6 text-[var(--acade-text)]">{formatCount(u.count)}</span>
                      {u.errors > 0 && (
                        <span className="block text-[0.8125rem] tabular-nums text-[var(--acade-danger)]">{formatCount(u.errors)} {u.errors === 1 ? 'error' : 'errors'}</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="py-10 text-center text-sm text-[var(--acade-text-muted)]">No user data yet.</p>
          )}
        </Panel>

        <Panel title="Recent errors" description="The latest failed API calls">
          {recentErrors.length > 0 ? (
            <ul aria-label="Recent errors" tabIndex={0} className="divide-y divide-[var(--acade-border-subtle)] pr-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)] lg:max-h-[34rem] lg:overflow-y-auto">
              {recentErrors.map((err, idx) => (
                <li key={idx} className="flex items-start gap-3 py-3">
                  <span
                    className={cn(pillClass, 'mt-0.5 tabular-nums', err.status >= 500 ? 'bg-[var(--acade-danger-dim)] text-[var(--acade-danger)]' : 'bg-[var(--acade-gold-dim)] text-[var(--acade-warning)]')}
                    title={err.status >= 500 ? 'Server error' : 'Request error'}
                  >
                    <span className="sr-only">Status </span>{err.status}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="break-all text-sm font-medium text-[var(--acade-text)]">{err.endpoint}</p>
                    <p className="mt-0.5 text-[0.8125rem] leading-5 text-[var(--acade-text-muted)]">{err.error}</p>
                    <p className="mt-1 text-[0.8125rem] tabular-nums text-[var(--acade-text-faint)]">
                      {new Date(err.timestamp).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center py-10 text-center">
              <ShieldCheck size={28} className="mb-2 text-[var(--acade-success)]" aria-hidden="true" />
              <p className="text-sm text-[var(--acade-text-muted)]">No failed calls in this period.</p>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
