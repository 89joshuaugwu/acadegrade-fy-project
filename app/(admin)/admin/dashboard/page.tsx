'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { formatCgpa } from '@/lib/cgpa/academicRules';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/shared';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { NeedsAttention } from '@/components/admin/overview/NeedsAttention';

interface AdminStats {
  totalUsers: number;
  avgCGPA: number;
  avgPI: number;
  activeThisWeek: number;
  signupChartData: { date: string; label: string; count: number }[];
}

const SHORTCUTS = [
  { href: '/admin/analytics', label: 'Academic analytics', detail: 'CGPA spread, degree classes and departments' },
  { href: '/admin/api-analytics', label: 'API health', detail: 'Traffic, errors and response times' },
];

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getToken = useCallback(async () => {
    if (!user) throw new Error('Your admin session is unavailable.');
    return user.getIdToken();
  }, [user]);

  const loadStats = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Admin stats request failed.');
      setStats(await res.json());
    } catch (err) {
      console.error(err);
      // Never show zeros as if they were real platform metrics.
      setError('The stats service did not respond. Your data has not changed.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void loadStats(); }, [loadStats]);

  const header = (
    <AdminPageHeader
      title="Overview"
      description="Users, activity and average results at a glance, and anything that needs your attention."
      helpId="admin.overview"
    />
  );

  if (error) {
    return (
      <div className="space-y-8">
        {header}
        <ErrorState title="Dashboard metrics are unavailable" description={error} onRetry={() => { void loadStats(); }} />
      </div>
    );
  }

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        {header}
        <div role="status" aria-label="Loading overview" aria-busy="true" className="space-y-6">
          <Skeleton className="h-28" />
          <div className="grid gap-6 lg:grid-cols-3">
            <Skeleton className="h-80 lg:col-span-2" />
            <Skeleton className="h-80" />
          </div>
        </div>
      </div>
    );
  }

  const kpis = [
    { label: 'Total users', value: stats.totalUsers.toLocaleString() },
    { label: 'Active this week', value: stats.activeThisWeek.toLocaleString() },
    { label: 'Average CGPA', value: formatCgpa(stats.avgCGPA) },
    { label: 'Average PI', value: formatCgpa(stats.avgPI) },
  ];
  const signups = stats.signupChartData ?? [];
  const signupTotal = signups.reduce((sum, day) => sum + day.count, 0);

  return (
    <div className="space-y-6">
      {header}

      <dl className="grid grid-cols-2 overflow-hidden rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-surface)] md:grid-cols-4">
        {kpis.map((kpi, index) => (
          <div
            key={kpi.label}
            className={[
              'flex flex-col-reverse gap-1 p-5',
              index % 2 === 1 ? 'border-l border-[var(--acade-border-subtle)]' : '',
              index >= 2 ? 'border-t border-[var(--acade-border-subtle)] md:border-t-0' : '',
              index === 2 ? 'md:border-l' : '',
            ].join(' ')}
          >
            <dt className="text-sm text-[var(--acade-text-muted)]">{kpi.label}</dt>
            <dd className="font-[family-name:var(--font-bricolage)] text-[length:var(--text-2xl)] font-bold tabular-nums text-[var(--acade-text)] md:text-[length:var(--text-3xl)]">{kpi.value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-6 lg:grid-cols-3">
        <section aria-labelledby="signups-title" className="rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-surface)] p-5 lg:col-span-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="signups-title" className="text-base font-semibold text-[var(--acade-text)]">New signups</h2>
            <p className="text-sm tabular-nums text-[var(--acade-text-muted)]">{signupTotal.toLocaleString()} in the last 30 days</p>
          </div>
          <div className="mt-4 h-[260px] text-[length:var(--text-xs)]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={signups} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--acade-border-subtle)" />
                <XAxis dataKey="label" tick={{ fill: 'var(--acade-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: 'var(--acade-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--acade-surface)', borderColor: 'var(--acade-border)', borderRadius: '8px', color: 'var(--acade-text)' }}
                  formatter={(value) => [`${value} users`, 'Signups']}
                />
                <Line type="monotone" dataKey="count" stroke="var(--acade-primary)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <NeedsAttention getToken={getToken} />
      </div>

      <nav aria-label="More detail" className="grid gap-3 sm:grid-cols-2">
        {SHORTCUTS.map((shortcut) => (
          <Link
            key={shortcut.href}
            href={shortcut.href}
            className="group flex items-center justify-between gap-4 rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-surface)] px-5 py-4 transition-colors hover:border-[var(--acade-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]"
          >
            <span>
              <span className="block text-sm font-semibold text-[var(--acade-text)]">{shortcut.label}</span>
              <span className="block text-sm text-[var(--acade-text-muted)]">{shortcut.detail}</span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-[var(--acade-text-muted)] transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
          </Link>
        ))}
      </nav>
    </div>
  );
}
