'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Panel } from '@/components/admin/ui/Panel';
import { StatGrid, StatTile } from '@/components/admin/ui/StatTile';
import { TableFrame, tableClass } from '@/components/admin/ui/TableFrame';
import { Notice } from '@/components/admin/ui/Notice';
import { ErrorState } from '@/components/shared';
import { DEGREE_CLASS_BANDS, formatCgpa } from '@/lib/cgpa/academicRules';
import { bucketKeyFor, type FunnelRow } from '@/lib/admin/metrics';
import { MetricsFreshness } from '@/components/admin/overview/MetricsFreshness';
import { cn } from '@/lib/utils/cn';
import toast from 'react-hot-toast';

interface AnalyticsData {
  totalUsers: number;
  avgCGPA: number;
  avgPI: number;
  cgpaBuckets: Record<string, number>;
  degreeClassCounts: Record<string, number>;
  departmentBreakdown: { department: string; count: number; avgCGPA: number }[];
  funnel?: FunnelRow[];
  generatedAt?: string | null;
  stale?: boolean;
}

const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : '–');

/** Degree class colours come from the app's class tokens, so both themes stay readable. */
const DEGREE_COLORS: Record<string, string> = {
  'First Class': 'var(--class-first-fill, #FFB23F)',
  'Second Class Upper': 'var(--class-2upper-fill, #6B4EFF)',
  'Second Class Lower': 'var(--class-2lower-fill, #12A4B0)',
  'Third Class': 'var(--class-third-fill, #F2762E)',
  'Pass': 'var(--class-pass-fill, #E0457B)',
  'Fail': 'var(--class-fail-fill, #E5484D)',
};

/** The class fill for a CGPA (product-wide class colours; labels always name the class too). */
function classFillFor(cgpa: number): string {
  if (cgpa >= 4.5) return DEGREE_COLORS['First Class'];
  if (cgpa >= 3.5) return DEGREE_COLORS['Second Class Upper'];
  if (cgpa >= 2.4) return DEGREE_COLORS['Second Class Lower'];
  if (cgpa >= 1.5) return DEGREE_COLORS['Third Class'];
  if (cgpa >= 1.0) return DEGREE_COLORS.Pass;
  return DEGREE_COLORS.Fail;
}

// Reference lines sit in the histogram bucket that holds each class minimum.
const CLASS_LINE_COLORS: Record<string, string> = { '1st': 'var(--class-first)', '2:1': 'var(--class-2upper)', '2:2': 'var(--class-2lower)', '3rd': 'var(--class-third)' };
const DEGREE_THRESHOLDS = DEGREE_CLASS_BANDS
  .filter((band) => band.shortLabel in CLASS_LINE_COLORS)
  .map((band) => ({
    key: band.shortLabel,
    label: band.shortLabel === '1st' ? 'First Class' : band.shortLabel === '3rd' ? 'Third' : band.shortLabel,
    color: CLASS_LINE_COLORS[band.shortLabel],
    bucket: bucketKeyFor(band.minCGPA),
  }));

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

const PAGE_DESCRIPTION = 'How students are doing overall: CGPA spread, degree classes and department averages. Every semester with graded courses counts.';

export default function AdminAnalyticsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Analytics request failed.');
      setData(await res.json());
    } catch (err) {
      console.error(err);
      // Empty charts would read as "no students"; say the data is missing instead.
      setError('The stats service did not respond, so these charts would be incomplete.');
    } finally { setLoading(false); }
  }, [user]);

  const [refreshing, setRefreshing] = useState(false);
  const refreshData = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/stats?refresh=1', { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof body.error === 'string' ? body.error : 'The numbers could not be refreshed.');
      setData(body);
      toast.success('Numbers refreshed.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'The numbers could not be refreshed.');
    } finally {
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { void loadData(); }, [loadData]);

  const handleExportCSV = () => {
    if (!data?.departmentBreakdown) return;
    const headers = 'Department,Users,Avg CGPA\n';
    const rows = data.departmentBreakdown.map(d => `"${d.department}",${d.count},${formatCgpa(d.avgCGPA)}`).join('\n');
    const csv = headers + rows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AcadeGrade_Analytics_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported!');
  };

  if (error) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Academic analytics" description="How students are doing overall: CGPA spread, degree classes and department averages." helpId="admin.analytics" />
        <ErrorState title="Analytics are unavailable" description={error} onRetry={() => { void loadData(); }} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Academic analytics" description={PAGE_DESCRIPTION} helpId="admin.analytics" />
        <div role="status" aria-label="Loading academic analytics" aria-busy="true" className="space-y-6">
          <Skeleton className="h-28 rounded-[20px]" />
          <div className="grid gap-6 lg:grid-cols-5">
            <Skeleton className="h-80 rounded-[20px] lg:col-span-3" />
            <Skeleton className="h-80 rounded-[20px] lg:col-span-2" />
          </div>
        </div>
      </div>
    );
  }

  // CGPA distribution with reference lines
  const histogramData = data?.cgpaBuckets
    ? Object.entries(data.cgpaBuckets).map(([range, count]) => ({ range, count }))
    : [];

  // Degree classes, in the order the server sends them (First Class first)
  const classRows = data?.degreeClassCounts ? Object.entries(data.degreeClassCounts).map(([name, value]) => ({ name, value })) : [];
  const classTotal = classRows.reduce((sum, row) => sum + row.value, 0);
  const firstClass = data?.degreeClassCounts?.['First Class'] ?? 0;

  // Department leaderboard (sorted by avg CGPA desc)
  const leaderboard = [...(data?.departmentBreakdown || [])].sort((a, b) => b.avgCGPA - a.avgCGPA);
  const funnel = [...(data?.funnel ?? [])].reverse();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Academic analytics"
        description={PAGE_DESCRIPTION}
        helpId="admin.analytics"
        actions={<Button variant="outline" size="sm" onClick={handleExportCSV}><Download size={16} aria-hidden="true" />Export CSV</Button>}
      >
        {data ? <MetricsFreshness generatedAt={data.generatedAt} stale={data.stale} refreshing={refreshing} onRefresh={() => { void refreshData(); }} /> : null}
      </AdminPageHeader>

      <div className="space-y-3">
        <StatGrid aria-label="Platform averages">
          <StatTile label="Students counted" value={formatCount(data?.totalUsers ?? 0)} detail="Every account with a profile" />
          <StatTile label="Average CGPA" value={formatCgpa(data?.avgCGPA ?? 0)} detail="Out of 5.00" />
          <StatTile label="Average PI" value={formatCgpa(data?.avgPI ?? 0)} detail="From stored semester results" />
          <StatTile label="On First Class" value={formatCount(firstClass)} detail={classTotal > 0 ? `${pct(firstClass, classTotal)} of students with a class` : 'No classes yet'} />
        </StatGrid>
        <Notice tone="info">PI is shown only from stored semester calculations. AcadeGrade does not estimate missing PI values.</Notice>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* CGPA distribution with class thresholds */}
        <Panel className="lg:col-span-3" title="CGPA distribution" description="Students in each half-point band, with the degree class lines">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histogramData} margin={{ top: 22, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--acade-border-subtle)" />
                <XAxis dataKey="range" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(value: string) => value.split('-')[0]} interval={0} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} width={44} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  cursor={{ fill: 'var(--acade-overlay)' }}
                  labelFormatter={(label) => `CGPA ${String(label).replace('-', ' to ')}`}
                  formatter={(value) => [`${formatCount(Number(value))} students`, 'In this band']}
                />
                <Bar dataKey="count" fill="var(--chart-cgpa)" radius={[6, 6, 0, 0]} maxBarSize={44}>
                  {histogramData.map((bucket) => (
                    <Cell key={bucket.range} fill={classFillFor(Number.parseFloat(bucket.range))} />
                  ))}
                </Bar>
                {DEGREE_THRESHOLDS.map(t => (
                  <ReferenceLine key={t.key} x={t.bucket} stroke={t.color} strokeDasharray="4 4" label={{ value: t.label, fill: t.color, fontSize: 11, position: 'top' }} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Degree classes */}
        <Panel className="lg:col-span-2" title="Degree classes" description="Students by projected degree class">
          {classTotal > 0 ? (
            <ul className="space-y-4">
              {classRows.map(row => (
                <li key={row.name}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2 font-medium text-[var(--acade-text)]">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: DEGREE_COLORS[row.name] || 'var(--acade-primary)' }} aria-hidden="true" />
                      <span className="truncate">{row.name}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-[var(--acade-text-muted)]">
                      <span className="font-semibold text-[var(--acade-text)]">{formatCount(row.value)}</span> ({pct(row.value, classTotal)})
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--acade-overlay)]" aria-hidden="true">
                    <div className="h-full rounded-full" style={{ width: `${(row.value / classTotal) * 100}%`, backgroundColor: DEGREE_COLORS[row.name] || 'var(--acade-primary)' }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-10 text-center text-sm text-[var(--acade-text-muted)]">No data yet.</p>
          )}
        </Panel>
      </div>

      {/* Department leaderboard */}
      <Panel title="Department leaderboard" description="Average CGPA by department, highest first">
        {leaderboard.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--acade-text-muted)]">No data.</p>
        ) : (
          <TableFrame label="Department leaderboard" minWidth="28rem">
            <table className={tableClass}>
              <thead>
                <tr>
                  <th scope="col" className="w-12">Rank</th>
                  <th scope="col">Department</th>
                  <th scope="col" className="ag-right">Students</th>
                  <th scope="col" className="ag-right">Average CGPA</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((dept, idx) => (
                  <tr key={dept.department}>
                    <td className={cn('font-semibold', idx === 0 ? 'text-[var(--acade-gold)]' : 'text-[var(--acade-text-faint)]')}>{idx + 1}</td>
                    <td className="font-medium">{dept.department}</td>
                    <td className="ag-right text-[var(--acade-text-muted)]">{formatCount(dept.count)} student{dept.count !== 1 ? 's' : ''}</td>
                    <td className="ag-right">
                      <span className="inline-flex items-center justify-end gap-3">
                        <span className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-[var(--acade-overlay)] sm:block" aria-hidden="true">
                          <span className="block h-full rounded-full" style={{ width: `${Math.min(Math.max(dept.avgCGPA / 5, 0), 1) * 100}%`, background: classFillFor(dept.avgCGPA) }} />
                        </span>
                        <span className="ag-admin-display text-base font-bold">{formatCgpa(dept.avgCGPA)}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableFrame>
        )}
      </Panel>

      {/* Sign-up funnel */}
      <Panel
        headingId="funnel-title"
        title="Sign-up funnel"
        description={<>Students grouped by the week they signed up (UTC). &quot;Came back&quot; means they were last seen at least 7 or 30 days after signing up.</>}
      >
        {funnel.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--acade-text-muted)]">No funnel yet. It appears after the next daily run, or press Refresh now.</p>
        ) : (
          <TableFrame label="Sign-up funnel" minWidth="40rem">
            <table className={tableClass}>
              <thead>
                <tr>
                  <th scope="col">Week</th>
                  <th scope="col" className="ag-right">Signed up</th>
                  <th scope="col" className="ag-right">Added a semester</th>
                  <th scope="col" className="ag-right">Used AI</th>
                  <th scope="col" className="ag-right">Came back 7d</th>
                  <th scope="col" className="ag-right">Came back 30d</th>
                </tr>
              </thead>
              <tbody>
                {funnel.map((row) => (
                  <tr key={row.week}>
                    <th scope="row" className="whitespace-nowrap border-b border-[var(--acade-border-subtle)] px-4 py-3 text-left font-medium text-[var(--acade-text)] [tr:last-child>&]:border-b-0">{row.week}</th>
                    <td className="ag-right font-semibold">{formatCount(row.registered)}</td>
                    <td className="ag-right">{formatCount(row.firstSemester)} <span className="text-[var(--acade-text-faint)]">{pct(row.firstSemester, row.registered)}</span></td>
                    <td className="ag-right">{formatCount(row.usedAi)} <span className="text-[var(--acade-text-faint)]">{pct(row.usedAi, row.registered)}</span></td>
                    <td className="ag-right">{formatCount(row.returned7d)} <span className="text-[var(--acade-text-faint)]">{pct(row.returned7d, row.registered)}</span></td>
                    <td className="ag-right">{formatCount(row.returned30d)} <span className="text-[var(--acade-text-faint)]">{pct(row.returned30d, row.registered)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableFrame>
        )}
      </Panel>
    </div>
  );
}
