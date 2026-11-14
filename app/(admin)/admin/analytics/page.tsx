'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Download, Info } from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { ErrorState } from '@/components/shared';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { DEGREE_CLASS_BANDS, formatCgpa } from '@/lib/cgpa/academicRules';
import { bucketKeyFor } from '@/lib/admin/metrics';
import toast from 'react-hot-toast';

interface AnalyticsData {
  totalUsers: number;
  avgCGPA: number;
  avgPI: number;
  cgpaBuckets: Record<string, number>;
  degreeClassCounts: Record<string, number>;
  departmentBreakdown: { department: string; count: number; avgCGPA: number }[];
}

const DEGREE_COLORS: Record<string, string> = {
  'First Class': '#22C55E',
  'Second Class Upper': '#6366F1',
  'Second Class Lower': '#F59E0B',
  'Third Class': '#F97316',
  'Pass': '#EF4444',
  'Fail': '#6B7280',
};

// Reference lines sit in the histogram bucket that holds each class minimum.
const CLASS_LINE_COLORS: Record<string, string> = { '1st': '#22C55E', '2:1': '#6366F1', '2:2': '#F59E0B', '3rd': '#F97316' };
const DEGREE_THRESHOLDS = DEGREE_CLASS_BANDS
  .filter((band) => band.shortLabel in CLASS_LINE_COLORS)
  .map((band) => ({
    key: band.shortLabel,
    label: band.shortLabel === '1st' ? 'First Class' : band.shortLabel === '3rd' ? 'Third' : band.shortLabel,
    color: CLASS_LINE_COLORS[band.shortLabel],
    bucket: bucketKeyFor(band.minCGPA),
  }));

export default function AdminAnalyticsPage() {
  const { user } = useAuth();
  const shouldReduceMotion = useReducedMotion();
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
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-80" />)}
        </div>
      </div>
    );
  }

  // CGPA distribution with reference lines
  const histogramData = data?.cgpaBuckets
    ? Object.entries(data.cgpaBuckets).map(([range, count]) => ({ range, count }))
    : [];

  // Degree class pie data
  const pieData = data?.degreeClassCounts
    ? Object.entries(data.degreeClassCounts).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }))
    : [];

  // Department leaderboard (sorted by avg CGPA desc)
  const leaderboard = [...(data?.departmentBreakdown || [])].sort((a, b) => b.avgCGPA - a.avgCGPA);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Academic analytics"
        description="How students are doing overall: CGPA spread, degree classes and department averages. Completed semesters only."
        helpId="admin.analytics"
        actions={<Button variant="outline" size="sm" onClick={handleExportCSV}><Download size={16} aria-hidden="true" />Export CSV</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CGPA Distribution Curve with Reference Lines */}
        <motion.div initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card variant="glass" padding="lg">
            <h2 className="text-[length:var(--text-lg)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)] mb-1">CGPA Distribution</h2>
            <p className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)] mb-4">With degree class thresholds</p>
            <div className="h-[300px] text-[length:var(--text-xs)] font-[family-name:var(--font-geist-mono)]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={histogramData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--acade-border-subtle)" />
                  <XAxis dataKey="range" tick={{ fill: 'var(--acade-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--acade-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--acade-surface)', borderColor: 'var(--acade-border)', borderRadius: '8px', color: 'var(--acade-text)' }} />
                  <Bar dataKey="count" fill="var(--acade-primary)" radius={[4, 4, 0, 0]} />
                  {DEGREE_THRESHOLDS.map(t => (
                    <ReferenceLine key={t.key} x={t.bucket} stroke={t.color} strokeDasharray="4 4" label={{ value: t.label, fill: t.color, fontSize: 9, position: 'top' }} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        {/* Platform metric averages — only values returned by the server are shown. */}
        <motion.div initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card variant="glass" padding="lg">
            <h2 className="text-[length:var(--text-lg)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)] mb-1">Platform Metric Averages</h2>
            <p className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)] mb-6">Calculated from completed semesters with recorded credits.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { label: 'Average CGPA', value: data?.avgCGPA ?? 0, color: 'var(--acade-primary)' },
                { label: 'Average PI', value: data?.avgPI ?? 0, color: 'var(--acade-gold)' },
              ].map((metric) => (
                <div key={metric.label} className="rounded-2xl border border-[var(--acade-border)] bg-[var(--acade-deep)] p-5">
                  <p className="text-xs font-semibold text-[var(--acade-text-muted)]">{metric.label}</p>
                  <p className="mt-2 font-[family-name:var(--font-geist-mono)] text-4xl font-bold text-[var(--acade-text)]">{formatCgpa(metric.value)}</p>
                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-[var(--acade-overlay)]">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.min(Math.max(metric.value / 5, 0), 1) * 100}%`, backgroundColor: metric.color }}
                    />
                  </div>
                  <p className="mt-2 text-right font-[family-name:var(--font-geist-mono)] text-xs text-[var(--acade-text-faint)]">out of 5.00</p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex gap-3 rounded-xl bg-[var(--acade-info-dim)] p-4 text-sm leading-6 text-[var(--acade-text-muted)]">
              <Info className="mt-0.5 size-4 shrink-0 text-[var(--acade-info)]" aria-hidden="true" />
              <p>PI is shown only from stored semester calculations. AcadeGrade does not estimate missing PI values.</p>
            </div>
          </Card>
        </motion.div>

        {/* Degree Class Pie Chart */}
        <motion.div initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card variant="glass" padding="lg">
            <h2 className="text-[length:var(--text-lg)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)] mb-1">Degree Class Distribution</h2>
            <p className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)] mb-4">Breakdown by projected degree class</p>
            <div className="h-[300px]">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" nameKey="name"
                      label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                      labelLine={{ stroke: 'var(--acade-text-muted)', strokeWidth: 1 }}
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={DEGREE_COLORS[entry.name] || 'var(--acade-primary)'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'var(--acade-surface)', borderColor: 'var(--acade-border)', borderRadius: '8px', color: 'var(--acade-text)' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-[var(--acade-text-muted)]">No data yet.</div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Department Leaderboard */}
        <motion.div initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card variant="glass" padding="lg">
            <h2 className="text-[length:var(--text-lg)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)] mb-4">Department Leaderboard</h2>
            <div className="space-y-2">
              {leaderboard.length === 0 && <p className="text-center text-[var(--acade-text-muted)] py-6">No data.</p>}
              {leaderboard.map((dept, idx) => (
                <div key={dept.department} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--acade-overlay)]/10 hover:bg-[var(--acade-overlay)]/20 transition-colors">
                  <span className={`font-bold text-[length:var(--text-lg)] w-8 text-center font-[family-name:var(--font-geist-mono)] ${idx === 0 ? 'text-[var(--acade-gold)]' : idx === 1 ? 'text-[var(--acade-text-muted)]' : idx === 2 ? 'text-[#CD7F32]' : 'text-[var(--acade-text-faint)]'}`}>
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[length:var(--text-sm)] font-bold text-[var(--acade-text)] truncate block">{dept.department}</span>
                    <span className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)]">{dept.count} student{dept.count !== 1 ? 's' : ''}</span>
                  </div>
                  <span className="text-[length:var(--text-base)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-geist-mono)]">
                    {formatCgpa(dept.avgCGPA)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
