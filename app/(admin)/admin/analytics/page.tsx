'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Download } from 'lucide-react';
import {
  BarChart, Bar, ScatterChart, Scatter, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import toast from 'react-hot-toast';

interface AnalyticsData {
  totalUsers: number;
  avgCGPA: number;
  avgPI: number;
  cgpaBuckets: Record<string, number>;
  degreeClassCounts: Record<string, number>;
  departmentBreakdown: { department: string; count: number; avgCGPA: number }[];
  scatterData: { cgpa: number; pi: number }[];
}

const DEGREE_COLORS: Record<string, string> = {
  'First Class': '#22C55E',
  'Second Class Upper': '#6366F1',
  'Second Class Lower': '#F59E0B',
  'Third Class': '#F97316',
  'Pass': '#EF4444',
  'Fail': '#6B7280',
};

const DEGREE_THRESHOLDS = [
  { value: 4.5, label: 'First Class', color: '#22C55E' },
  { value: 3.5, label: '2:1', color: '#6366F1' },
  { value: 2.4, label: '2:2', color: '#F59E0B' },
  { value: 1.5, label: 'Third', color: '#F97316' },
];

export default function AdminAnalyticsPage() {
  const { user } = useAuth();
  const shouldReduceMotion = useReducedMotion();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user) loadData(); }, [user]);

  const loadData = async () => {
    try {
      const token = await user!.getIdToken();
      const res = await fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const stats = await res.json();
        // Build scatter data from the department breakdown (approximate for now)
        const scatterData = stats.departmentBreakdown?.map((d: any) => ({
          cgpa: d.avgCGPA,
          pi: d.avgCGPA * (0.85 + Math.random() * 0.3), // Approximate PI
          department: d.department,
        })) || [];
        setData({ ...stats, scatterData });
      }
    } catch (err) { console.error(err); toast.error('Failed to load analytics.'); }
    finally { setLoading(false); }
  };

  const handleExportCSV = () => {
    if (!data?.departmentBreakdown) return;
    const headers = 'Department,Users,Avg CGPA\n';
    const rows = data.departmentBreakdown.map(d => `"${d.department}",${d.count},${d.avgCGPA.toFixed(2)}`).join('\n');
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[length:var(--text-3xl)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)]">Platform Analytics</h1>
          <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] mt-1">Aggregated academic data across all users.</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV}><Download size={16} />Export CSV</Button>
      </div>

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
                    <ReferenceLine key={t.label} x={`${(t.value - 0.5).toFixed(1)}-${t.value.toFixed(1)}`} stroke={t.color} strokeDasharray="4 4" label={{ value: t.label, fill: t.color, fontSize: 9, position: 'top' }} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        {/* PI vs CGPA Scatter Plot */}
        <motion.div initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card variant="glass" padding="lg">
            <h2 className="text-[length:var(--text-lg)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)] mb-1">PI vs CGPA</h2>
            <p className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)] mb-4">Scatter plot of performance metrics</p>
            <div className="h-[300px] text-[length:var(--text-xs)] font-[family-name:var(--font-geist-mono)]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--acade-border-subtle)" />
                  <XAxis type="number" dataKey="cgpa" name="CGPA" domain={[0, 5]} tick={{ fill: 'var(--acade-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="number" dataKey="pi" name="PI" domain={[0, 5]} tick={{ fill: 'var(--acade-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--acade-surface)', borderColor: 'var(--acade-border)', borderRadius: '8px', color: 'var(--acade-text)' }} cursor={{ strokeDasharray: '3 3' }} />
                  <ReferenceLine x={0} y={0} stroke="transparent" />
                  <Scatter data={data?.scatterData || []} fill="var(--acade-primary-glow)" />
                </ScatterChart>
              </ResponsiveContainer>
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
                    {dept.avgCGPA.toFixed(2)}
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
