'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Activity, Zap, AlertTriangle, Clock, TrendingUp, Users, Server,
  RefreshCw, ChevronDown, Shield, ExternalLink
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import toast from 'react-hot-toast';

import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils/cn';
import { useReducedMotion } from '@/hooks/useReducedMotion';

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
const CATEGORY_COLORS: Record<string, string> = {
  ai: '#8B5CF6',
  email: '#3B82F6',
  otp: '#F59E0B',
  notification: '#10B981',
  transcript: '#6366F1',
  extract: '#EC4899',
  auth: '#14B8A6',
  admin: '#EF4444',
  unknown: '#6B7280',
};

const CATEGORY_LABELS: Record<string, string> = {
  ai: 'AI Models',
  email: 'Email / SMTP',
  otp: 'OTP Verification',
  notification: 'Push Notifications',
  transcript: 'Transcript',
  extract: 'Result Extraction',
  auth: 'Authentication',
  admin: 'Admin',
};

const RANGE_OPTIONS = [
  { value: 'day', label: 'Last 24h' },
  { value: 'week', label: 'Last 7 Days' },
  { value: 'month', label: 'Last 30 Days' },
];

/* ─── Page ─── */
export default function ApiAnalyticsPage() {
  const { user } = useAuth();
  const shouldReduceMotion = useReducedMotion();
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState('week');

  const fetchData = async (showToast = false) => {
    if (!user) return;
    if (showToast) setRefreshing(true);
    else setLoading(true);

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/api-analytics?range=${range}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      setData(json);
      if (showToast) toast.success('Refreshed');
    } catch {
      toast.error('Failed to load API analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) fetchData();
  }, [user, range]);

  /* ─── Derived Data ─── */
  const categoryChartData = useMemo(() => {
    if (!data?.byCategory) return [];
    return Object.entries(data.byCategory)
      .map(([key, val]) => ({
        name: CATEGORY_LABELS[key] || key,
        calls: val.count,
        errors: val.errors,
        avgMs: val.avgMs,
        fill: CATEGORY_COLORS[key] || CATEGORY_COLORS.unknown,
      }))
      .sort((a, b) => b.calls - a.calls);
  }, [data]);

  const providerPieData = useMemo(() => {
    if (!data?.byProvider) return [];
    return Object.entries(data.byProvider).map(([name, value]) => ({ name, value }));
  }, [data]);

  const endpointTableData = useMemo(() => {
    if (!data?.byEndpoint) return [];
    return Object.entries(data.byEndpoint)
      .map(([endpoint, val]) => ({ endpoint, ...val }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [data]);

  const PROVIDER_COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#EF4444', '#14B8A6', '#6366F1'];

  /* ─── Loading State ─── */
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-80" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[length:var(--text-3xl)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)] flex items-center gap-3">
            <Server size={28} className="text-[var(--acade-danger)]" />
            API Analytics
          </h1>
          <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] mt-1">
            Monitor API usage, quotas, and detect abuse across all endpoints.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Range Selector */}
          <div className="relative">
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="appearance-none bg-[var(--acade-surface)] border border-[var(--acade-border)] rounded-xl px-4 py-2 pr-8 text-[length:var(--text-sm)] text-[var(--acade-text)] focus:outline-none focus:border-[var(--acade-primary)] cursor-pointer"
            >
              {RANGE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--acade-text-muted)] pointer-events-none" />
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchData(true)} disabled={refreshing}>
            <RefreshCw size={14} className={cn("mr-1.5", refreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Total API Calls',
            value: data?.totalCalls?.toLocaleString() || '0',
            icon: Activity,
            color: 'var(--acade-primary)',
            bg: 'var(--acade-primary)',
          },
          {
            label: 'Error Rate',
            value: `${data?.errorRate || '0'}%`,
            icon: AlertTriangle,
            color: parseFloat(data?.errorRate || '0') > 5 ? 'var(--acade-danger)' : 'var(--acade-success)',
            bg: parseFloat(data?.errorRate || '0') > 5 ? 'var(--acade-danger)' : 'var(--acade-success)',
          },
          {
            label: 'Avg Response Time',
            value: `${data?.avgDuration || 0}ms`,
            icon: Clock,
            color: (data?.avgDuration || 0) > 3000 ? 'var(--acade-gold)' : 'var(--acade-success)',
            bg: (data?.avgDuration || 0) > 3000 ? 'var(--acade-gold)' : 'var(--acade-success)',
          },
          {
            label: 'Failed Calls',
            value: data?.errorCalls?.toLocaleString() || '0',
            icon: Zap,
            color: (data?.errorCalls || 0) > 0 ? 'var(--acade-danger)' : 'var(--acade-text-muted)',
            bg: (data?.errorCalls || 0) > 0 ? 'var(--acade-danger)' : 'var(--acade-text-muted)',
          },
        ].map((kpi, idx) => (
          <motion.div
            key={kpi.label}
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card variant="glass" padding="md">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)] mb-1">{kpi.label}</p>
                  <p className="text-[length:var(--text-2xl)] font-bold font-[family-name:var(--font-geist-mono)]" style={{ color: kpi.color }}>
                    {kpi.value}
                  </p>
                </div>
                <div className="size-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `color-mix(in srgb, ${kpi.bg} 10%, transparent)` }}>
                  <kpi.icon size={20} style={{ color: kpi.color }} />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeline Chart */}
        <motion.div initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card variant="glass" padding="lg">
            <h2 className="text-[length:var(--text-lg)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)] mb-1">
              <TrendingUp size={18} className="inline mr-2 text-[var(--acade-primary)]" />
              Usage Timeline
            </h2>
            <p className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)] mb-4">
              API calls over {RANGE_OPTIONS.find(r => r.value === range)?.label.toLowerCase()}
            </p>
            <div className="h-[280px] text-[length:var(--text-xs)] font-[family-name:var(--font-geist-mono)]">
              {(data?.timelineData?.length || 0) > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data!.timelineData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--acade-border-subtle)" />
                    <XAxis dataKey="label" tick={{ fill: 'var(--acade-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--acade-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--acade-surface)', borderColor: 'var(--acade-border)', borderRadius: '12px', color: 'var(--acade-text)', fontSize: '12px' }} />
                    <Line type="monotone" dataKey="calls" stroke="var(--acade-primary)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--acade-primary)' }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-[var(--acade-text-muted)]">No data in this range.</div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Category Breakdown */}
        <motion.div initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card variant="glass" padding="lg">
            <h2 className="text-[length:var(--text-lg)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)] mb-1">
              <Activity size={18} className="inline mr-2 text-[var(--acade-primary)]" />
              By Category
            </h2>
            <p className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)] mb-4">Calls grouped by API type</p>
            <div className="h-[280px] text-[length:var(--text-xs)] font-[family-name:var(--font-geist-mono)]">
              {categoryChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--acade-border-subtle)" />
                    <XAxis type="number" tick={{ fill: 'var(--acade-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: 'var(--acade-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={110} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--acade-surface)', borderColor: 'var(--acade-border)', borderRadius: '12px', color: 'var(--acade-text)', fontSize: '12px' }} />
                    <Bar dataKey="calls" radius={[0, 6, 6, 0]}>
                      {categoryChartData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-[var(--acade-text-muted)]">No data yet.</div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Provider Pie */}
        <motion.div initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card variant="glass" padding="lg">
            <h2 className="text-[length:var(--text-lg)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)] mb-1">
              <Zap size={18} className="inline mr-2 text-[var(--acade-gold)]" />
              AI Provider Distribution
            </h2>
            <p className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)] mb-4">Which AI providers are being used</p>
            <div className="h-[280px]">
              {providerPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={providerPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={95}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                      labelLine={{ stroke: 'var(--acade-text-muted)', strokeWidth: 1 }}
                    >
                      {providerPieData.map((_, idx) => (
                        <Cell key={idx} fill={PROVIDER_COLORS[idx % PROVIDER_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'var(--acade-surface)', borderColor: 'var(--acade-border)', borderRadius: '12px', color: 'var(--acade-text)', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-[var(--acade-text-muted)]">No provider data yet.</div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Endpoint Breakdown Table */}
        <motion.div initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card variant="glass" padding="lg">
            <h2 className="text-[length:var(--text-lg)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)] mb-4">
              <ExternalLink size={18} className="inline mr-2 text-[var(--acade-primary)]" />
              Top Endpoints
            </h2>
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
              {endpointTableData.length > 0 ? endpointTableData.map((ep, idx) => (
                <div key={ep.endpoint} className="flex items-center gap-3 p-2.5 rounded-xl bg-[var(--acade-overlay)]/10 hover:bg-[var(--acade-overlay)]/20 transition-colors">
                  <span className="text-[length:var(--text-xs)] font-bold text-[var(--acade-text-faint)] w-6 text-center font-[family-name:var(--font-geist-mono)]">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[length:var(--text-xs)] font-[family-name:var(--font-geist-mono)] text-[var(--acade-text)] block truncate">
                      {ep.endpoint}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[length:var(--text-xs)] font-bold text-[var(--acade-primary)] font-[family-name:var(--font-geist-mono)]">
                      {ep.count}
                    </span>
                    {ep.errors > 0 && (
                      <span className="text-[length:var(--text-xs)] font-bold text-[var(--acade-danger)] font-[family-name:var(--font-geist-mono)]">
                        {ep.errors} err
                      </span>
                    )}
                  </div>
                </div>
              )) : (
                <p className="text-center text-[var(--acade-text-muted)] py-8">No endpoint data yet.</p>
              )}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Bottom Row: Top Users + Recent Errors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Users */}
        <motion.div initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card variant="glass" padding="lg">
            <h2 className="text-[length:var(--text-lg)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)] mb-1">
              <Users size={18} className="inline mr-2 text-[var(--acade-gold)]" />
              Top API Consumers
            </h2>
            <p className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)] mb-4">Users making the most API calls — check for abuse</p>
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {(data?.topUsers?.length || 0) > 0 ? data!.topUsers.map((u, idx) => {
                const isAbusive = u.count > 50;
                return (
                  <div
                    key={u.uid}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl transition-colors",
                      isAbusive
                        ? "bg-[var(--acade-danger)]/5 border border-[var(--acade-danger)]/20"
                        : "bg-[var(--acade-overlay)]/10 hover:bg-[var(--acade-overlay)]/20"
                    )}
                  >
                    <span className={cn(
                      "text-[length:var(--text-lg)] font-bold w-8 text-center font-[family-name:var(--font-geist-mono)]",
                      idx === 0 ? "text-[var(--acade-gold)]" : "text-[var(--acade-text-faint)]"
                    )}>
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[length:var(--text-sm)] font-bold text-[var(--acade-text)] truncate">{u.name}</span>
                        {isAbusive && (
                          <span className="text-[length:var(--text-xs)] px-2 py-0.5 rounded-full bg-[var(--acade-danger)]/10 text-[var(--acade-danger)] font-bold shrink-0">
                            ⚠ High Usage
                          </span>
                        )}
                      </div>
                      <span className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)] block truncate">
                        {u.email || u.uid}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[length:var(--text-base)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-geist-mono)] block">
                        {u.count}
                      </span>
                      {u.errors > 0 && (
                        <span className="text-[length:var(--text-xs)] text-[var(--acade-danger)]">{u.errors} errors</span>
                      )}
                    </div>
                  </div>
                );
              }) : (
                <p className="text-center text-[var(--acade-text-muted)] py-8">No user data yet.</p>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Recent Errors */}
        <motion.div initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card variant="glass" padding="lg">
            <h2 className="text-[length:var(--text-lg)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)] mb-1">
              <AlertTriangle size={18} className="inline mr-2 text-[var(--acade-danger)]" />
              Recent Errors
            </h2>
            <p className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)] mb-4">Latest failed API calls</p>
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {(data?.recentErrors?.length || 0) > 0 ? data!.recentErrors.map((err, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-[var(--acade-danger)]/5 border border-[var(--acade-danger)]/10">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[length:var(--text-xs)] font-[family-name:var(--font-geist-mono)] text-[var(--acade-text)] font-bold truncate max-w-[60%]">
                      {err.endpoint}
                    </span>
                    <span className={cn(
                      "text-[length:var(--text-xs)] font-bold font-[family-name:var(--font-geist-mono)] px-2 py-0.5 rounded-full",
                      err.status >= 500 ? "bg-[var(--acade-danger)]/15 text-[var(--acade-danger)]" : "bg-[var(--acade-gold)]/15 text-[var(--acade-gold)]"
                    )}>
                      {err.status}
                    </span>
                  </div>
                  <p className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)] truncate">{err.error}</p>
                  <p className="text-[length:var(--text-xs)] text-[var(--acade-text-faint)] mt-1">
                    {new Date(err.timestamp).toLocaleString()}
                  </p>
                </div>
              )) : (
                <div className="text-center py-8">
                  <Shield size={32} className="mx-auto text-[var(--acade-success)] mb-2" />
                  <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)]">No errors in this period 🎉</p>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
