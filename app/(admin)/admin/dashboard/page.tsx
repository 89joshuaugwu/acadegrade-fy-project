'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Users, TrendingUp, Activity, BarChart3 } from 'lucide-react';
import CountUp from 'react-countup';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import toast from 'react-hot-toast';

interface AdminStats {
  totalUsers: number;
  avgCGPA: number;
  avgPI: number;
  activeThisWeek: number;
  cgpaBuckets: Record<string, number>;
  departmentBreakdown: { department: string; count: number; avgCGPA: number }[];
  signupChartData: { date: string; label: string; count: number }[];
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const shouldReduceMotion = useReducedMotion();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [resettingTour, setResettingTour] = useState(false);

  useEffect(() => {
    if (user) loadStats();
  }, [user]);

  const loadStats = async () => {
    try {
      const token = await user!.getIdToken();
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setStats(await res.json());
      } else {
        toast.error('Failed to load admin stats.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error loading dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetAllOnboarding = async () => {
    setResettingTour(true);
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      const updatePromises = snapshot.docs.map(userDoc => 
        updateDoc(doc(db, 'users', userDoc.id), { 
          tourCompleted: false,
          resultsTourCompleted: false 
        })
      );
      await Promise.all(updatePromises);
      toast.success(`Reset onboarding for ${snapshot.size} users.`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to reset onboarding. Check console or Firestore rules.');
    } finally {
      setResettingTour(false);
    }
  };

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers || 0, icon: Users, color: 'var(--acade-primary)', decimals: 0 },
    { label: 'Avg CGPA', value: stats?.avgCGPA || 0, icon: TrendingUp, color: 'var(--acade-success)', decimals: 2 },
    { label: 'Avg PI', value: stats?.avgPI || 0, icon: BarChart3, color: 'var(--acade-gold)', decimals: 2 },
    { label: 'Active This Week', value: stats?.activeThisWeek || 0, icon: Activity, color: 'var(--acade-info)', decimals: 0 },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  // CGPA histogram data
  const histogramData = stats?.cgpaBuckets
    ? Object.entries(stats.cgpaBuckets).map(([range, count]) => ({ range, count }))
    : [];

  const histogramColors = [
    '#6B7280', '#6B7280', // 0-1 (grey)
    '#EF4444', '#EF4444', // 1-2 (red)
    '#F97316', // 2-2.5 (orange)
    '#F59E0B', '#F59E0B', // 2.5-3.5 (gold)
    '#6366F1', '#6366F1', // 3.5-4.5 (indigo)
    '#22C55E',             // 4.5-5 (green)
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-[length:var(--text-3xl)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)] tracking-tight">
            Admin Dashboard
          </h1>
          <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] mt-1 font-[family-name:var(--font-dm-sans)]">
            Platform overview and performance metrics.
          </p>
        </div>
        
        <Button 
          variant="danger" 
          onClick={handleResetAllOnboarding} 
          disabled={resettingTour}
        >
          {resettingTour ? 'Resetting...' : 'Reset All Onboarding (Test)'}
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
            >
              <Card variant="default" padding="md" className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 rounded-full blur-2xl pointer-events-none" style={{ backgroundColor: stat.color, opacity: 0.08 }} />
                <div className="flex items-center gap-3 mb-3">
                  <div className="size-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${stat.color}15` }}>
                    <Icon size={18} style={{ color: stat.color }} />
                  </div>
                </div>
                <div className="text-[length:var(--text-2xl)] md:text-[length:var(--text-3xl)] font-bold font-[family-name:var(--font-geist-mono)] text-[var(--acade-text)]">
                  <CountUp end={stat.value} decimals={stat.decimals} duration={shouldReduceMotion ? 0 : 1.5} />
                </div>
                <span className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)] font-[family-name:var(--font-dm-sans)]">
                  {stat.label}
                </span>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CGPA Distribution Histogram */}
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <Card variant="glass" padding="lg">
            <h2 className="text-[length:var(--text-lg)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)] mb-1">
              CGPA Distribution
            </h2>
            <p className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)] mb-4">
              Students grouped by 0.5-point CGPA ranges
            </p>
            <div className="h-[280px] text-[length:var(--text-xs)] font-[family-name:var(--font-geist-mono)]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={histogramData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--acade-border-subtle)" />
                  <XAxis dataKey="range" tick={{ fill: 'var(--acade-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--acade-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--acade-surface)', borderColor: 'var(--acade-border)', borderRadius: '8px', color: 'var(--acade-text)' }}
                    formatter={(value: any) => [`${value} students`, 'Count']}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {histogramData.map((_, idx) => (
                      <Cell key={idx} fill={histogramColors[idx] || 'var(--acade-primary)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        {/* New Signups Line Chart */}
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <Card variant="glass" padding="lg">
            <h2 className="text-[length:var(--text-lg)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)] mb-1">
              New Signups
            </h2>
            <p className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)] mb-4">
              User registrations over the last 30 days
            </p>
            <div className="h-[280px] text-[length:var(--text-xs)] font-[family-name:var(--font-geist-mono)]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats?.signupChartData || []} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--acade-border-subtle)" />
                  <XAxis dataKey="label" tick={{ fill: 'var(--acade-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: 'var(--acade-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--acade-surface)', borderColor: 'var(--acade-border)', borderRadius: '8px', color: 'var(--acade-text)' }}
                    formatter={(value: any) => [`${value} users`, 'Signups']}
                  />
                  <Line type="monotone" dataKey="count" stroke="var(--acade-primary)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--acade-primary)' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Department Breakdown */}
      <motion.div
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.6 }}
      >
        <Card variant="glass" padding="lg">
          <h2 className="text-[length:var(--text-lg)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)] mb-4">
            Department Breakdown
          </h2>
          <div className="space-y-3">
            {(stats?.departmentBreakdown || []).slice(0, 10).map((dept) => {
              const maxCount = Math.max(...(stats?.departmentBreakdown || []).map(d => d.count), 1);
              const pct = (dept.count / maxCount) * 100;
              return (
                <div key={dept.department} className="flex items-center gap-4">
                  <span className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] font-[family-name:var(--font-dm-sans)] w-40 truncate shrink-0">
                    {dept.department}
                  </span>
                  <div className="flex-1 h-7 bg-[var(--acade-overlay)] rounded-lg overflow-hidden relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full bg-[var(--acade-primary)] rounded-lg"
                    />
                    <span className="absolute inset-0 flex items-center px-3 text-[length:var(--text-xs)] font-bold text-white font-[family-name:var(--font-geist-mono)]">
                      {dept.count} users · Avg {dept.avgCGPA.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
            {(!stats?.departmentBreakdown || stats.departmentBreakdown.length === 0) && (
              <p className="text-center text-[var(--acade-text-muted)] py-8">No department data available yet.</p>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
