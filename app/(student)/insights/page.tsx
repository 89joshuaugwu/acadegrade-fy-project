'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, AlertTriangle, TrendingUp, TrendingDown, Minus, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';

import { cn } from '@/lib/utils/cn';
import { useAuth } from '@/hooks/useAuth';
import { getDocument, queryCollection, setDocument } from '@/lib/firebase/firestore';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { InsightCard } from '@/components/ai/InsightCard';
import { WhatIfCalculator } from '@/components/ai/WhatIfCalculator';
import { ForecastChart } from '@/components/charts/ForecastChart';

import type { SemesterWithId } from '@/types/semester';
import type { Course } from '@/types/course';
import type { InsightResponse, ForecastResponse } from '@/types/ai';

type TabType = 'forecast' | 'whatif' | 'risk' | 'analysis';
const TABS: { id: TabType; label: string }[] = [
  { id: 'forecast', label: 'Forecast' },
  { id: 'whatif', label: 'What-If' },
  { id: 'risk', label: 'Risk Analysis' },
  { id: 'analysis', label: 'Written Analysis' }
];

interface AnalyticsDoc {
  forecast?: ForecastResponse & { lastUpdated: any; trendDirection: string; trendLabel: string };
  lastInsight?: { data: InsightResponse; timestamp: any };
  insightsStale?: boolean;
}

export default function InsightsPage() {
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<TabType>('forecast');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rateLimitError, setRateLimitError] = useState(false);
  const [rateLimitCooldown, setRateLimitCooldown] = useState(0);
  
  const [analytics, setAnalytics] = useState<AnalyticsDoc | null>(null);
  const [currentCGPA, setCurrentCGPA] = useState(0);
  const [totalCredits, setTotalCredits] = useState(0);
  const [flaggedCourses, setFlaggedCourses] = useState<Course[]>([]);
  const [piHistory, setPiHistory] = useState<number[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(100);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    if (rateLimitCooldown <= 0) return;
    const timer = setInterval(() => setRateLimitCooldown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [rateLimitCooldown]);

  const loadData = async (forceRefresh = false) => {
    if (!user) return;
    try {
      if (!forceRefresh) setLoading(true);
      setRateLimitError(false);

      // 1. Fetch semesters
      const semesters = await queryCollection<SemesterWithId>(`users/${user.uid}/semesters`);
      semesters.sort((a, b) => {
        if (a.level !== b.level) return a.level - b.level;
        return a.semester - b.semester;
      });

      const piHist = semesters
        .filter(s => s.isComplete && s.pi !== undefined && s.pi !== null)
        .map(s => s.pi!);
      setPiHistory(piHist);
      
      const maxLevel = semesters.length > 0 ? Math.max(...semesters.map(s => s.level || 100)) : 100;
      setCurrentLevel(maxLevel);

      // Compute CGPA
      let tPoints = 0;
      let tUnits = 0;
      semesters.filter(s => s.isComplete).forEach(s => {
        tUnits += s.creditLoaded || 0;
        tPoints += (s.gpa || 0) * (s.creditLoaded || 0);
      });
      setCurrentCGPA(tUnits > 0 ? tPoints / tUnits : 0);
      setTotalCredits(tUnits);

      // Flagged courses (score < 50) from last 2 completed semesters
      const recentSemesters = semesters.filter(s => s.isComplete).slice(-2);
      let flagged: Course[] = [];
      for (const sem of recentSemesters) {
        const courses = await queryCollection<Course>(
          `users/${user.uid}/semesters/${sem.id}/courses`
        );
        flagged.push(...courses.filter(c => (c.totalScore ?? 0) < 50));
      }
      setFlaggedCourses(flagged);

      // 2. Fetch existing analytics doc
      let analyticsData = await getDocument<AnalyticsDoc>(`analytics/${user.uid}`);

      // 3. Generate forecast if needed
      if (!analyticsData?.forecast || forceRefresh) {
        if (piHist.length > 0) {
          const authToken = await user.getIdToken();

          const res = await fetch('/api/ai/forecast', {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json',
               'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({ piHistory: piHist }),
          });

          if (res.ok) {
            const forecastData = await res.json();
            analyticsData = { ...analyticsData, forecast: forecastData };
          } else if (res.status === 429) {
            setRateLimitError(true);
            setRateLimitCooldown(59);
          } else {
            const errText = await res.text();
            console.error('Forecast failed:', res.status, errText);
            toast.error('Could not generate forecast. Please try again.');
          }
        }
      }

      // 4. Generate written insights if needed
      if (!analyticsData?.lastInsight || forceRefresh) {
        const authToken = await user.getIdToken();
        const res = await fetch('/api/ai/insights', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({ forceRegenerate: forceRefresh, semesterData: semesters }),
        });

        if (res.ok) {
          const insightData = await res.json();
          analyticsData = {
            ...analyticsData,
            lastInsight: { data: insightData, timestamp: new Date() },
            insightsStale: false,
          };
          if (forceRefresh) {
             await setDocument(`analytics/${user.uid}`, { insightsStale: false });
          }
        } else if (res.status === 429) {
          setRateLimitError(true);
          setRateLimitCooldown(59);
          if (forceRefresh) toast.error('AI quota reached. Serving cached insights.');
        } else {
          const errText = await res.text();
          console.error('Insights failed:', res.status, errText);
        }
      }

      setAnalytics(analyticsData || null);
    } catch (err) {
      console.error('loadData error:', err);
      toast.error('Failed to load insights.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="size-12 relative animate-pulse flex items-center justify-center">
          <Image src="/acadegradeailogo.png" alt="AcadeMind" width={40} height={40} className="object-contain" />
        </div>
        <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] font-bold animate-pulse">
          AcadeMind is analyzing your records...
        </p>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'forecast':
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-[var(--acade-surface)] border border-[var(--acade-border)] rounded-2xl p-6">
              <h2 className="text-[length:var(--text-lg)] font-bold text-[var(--acade-text)] mb-6 font-[family-name:var(--font-bricolage)]">
                Performance Index Projection
              </h2>
              {analytics?.forecast ? (
                <>
                  <ForecastChart
                    history={piHistory.length > 0 ? piHistory.slice(-3) : [0]}
                    projected={analytics.forecast.projected}
                    labels={[...piHistory.slice(-3).map((_, i) => i === piHistory.slice(-3).length - 1 ? 'Current' : `Past ${piHistory.slice(-3).length - 1 - i}`), 'Next Sem', currentLevel >= 400 ? 'Graduation' : 'Next Year']}
                  />
                  <div className="mt-6 p-4 bg-[var(--acade-deep)] rounded-xl border border-[var(--acade-border-subtle)] flex flex-col md:flex-row items-center gap-4 justify-between">
                    <div>
                      <span className="text-[length:var(--text-xs)] uppercase tracking-wider font-bold text-[var(--acade-text-faint)] block mb-1">
                        Projected Next Semester PI
                      </span>
                      <span className="text-[length:var(--text-2xl)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-geist-mono)] tabular-nums">
                        {analytics.forecast.projected[0]?.toFixed(2)}
                      </span>
                    </div>
                    <Badge variant="status" className="bg-[var(--acade-primary-dim)] text-[var(--acade-primary-glow)] border-[var(--acade-primary)]/30">
                      Trend: {analytics.forecast.trendLabel || 'Analyzing...'}
                    </Badge>
                  </div>
                </>
              ) : (
                <p className="text-[var(--acade-text-muted)] text-[length:var(--text-sm)]">
                  Not enough data to forecast. Add more completed semesters.
                </p>
              )}
            </div>
          </motion.div>
        );

      case 'whatif':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <WhatIfCalculator currentCGPA={currentCGPA} totalCredits={totalCredits} />
          </motion.div>
        );

      case 'risk':
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Risk Gauge */}
              <div className="bg-[var(--acade-surface)] border border-[var(--acade-border)] rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                <span className="text-[length:var(--text-xs)] font-bold text-[var(--acade-text-muted)] uppercase tracking-wider mb-4">Risk Level</span>
                <div className="relative size-32 flex items-center justify-center">
                  <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r="56" stroke="var(--acade-deep)" strokeWidth="12" fill="none" />
                    <circle
                      cx="64" cy="64" r="56"
                      stroke={
                        analytics?.forecast?.riskScore === 5 ? 'var(--acade-danger)' :
                        analytics?.forecast?.riskScore === 4 ? 'var(--acade-warning)' :
                        'var(--acade-success)'
                      }
                      strokeWidth="12"
                      strokeDasharray="351"
                      strokeDashoffset={351 - (351 * (analytics?.forecast?.riskScore || 1)) / 5}
                      strokeLinecap="round"
                      fill="none"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <span className="text-[length:var(--text-4xl)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-geist-mono)]">
                    {analytics?.forecast?.riskScore || 1}
                  </span>
                </div>
                <span className="text-[length:var(--text-xs)] text-[var(--acade-text-faint)] mt-4">1 = Safe, 5 = Critical</span>
              </div>

              {/* Trend Banner */}
              <div className="md:col-span-2 bg-[var(--acade-surface)] border border-[var(--acade-border)] rounded-2xl p-6 flex flex-col justify-center">
                <span className="text-[length:var(--text-xs)] font-bold text-[var(--acade-text-muted)] uppercase tracking-wider mb-2">Trend Analysis</span>
                <div className="flex items-center gap-4">
                  <div className={`p-4 rounded-full ${
                    analytics?.forecast?.trendDirection === 'improving' ? 'bg-[var(--acade-success-dim)] text-[var(--acade-success)]' :
                    analytics?.forecast?.trendDirection === 'declining' ? 'bg-[var(--acade-danger-dim)] text-[var(--acade-danger)]' :
                    'bg-[var(--acade-overlay)] text-[var(--acade-text-muted)]'
                  }`}>
                    {analytics?.forecast?.trendDirection === 'improving' ? <TrendingUp size={32} /> :
                     analytics?.forecast?.trendDirection === 'declining' ? <TrendingDown size={32} /> :
                     <Minus size={32} />}
                  </div>
                  <div>
                    <h3 className="text-[length:var(--text-xl)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)] capitalize">
                      {analytics?.forecast?.trendDirection || 'Stable'} Performance
                    </h3>
                    <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] mt-1">
                      {analytics?.forecast?.trendLabel || 'Keep up the consistent work.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Flagged Courses */}
            <div className="bg-[var(--acade-surface)] border border-[var(--acade-border)] rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-[var(--acade-border-subtle)] bg-[var(--acade-deep)]">
                <h3 className="text-[length:var(--text-base)] font-bold text-[var(--acade-text)] flex items-center gap-2">
                  <AlertTriangle size={18} className="text-[var(--acade-danger)]" />
                  Flagged Courses (Recent)
                </h3>
              </div>
              {flaggedCourses.length > 0 ? (
                <div className="divide-y divide-[var(--acade-border-subtle)]">
                  {flaggedCourses.map((c, i) => (
                    <div key={i} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[var(--acade-danger-dim)] text-[var(--acade-danger)] rounded-lg flex items-center justify-center font-bold font-[family-name:var(--font-geist-mono)] text-xs">
                          {c.code.split(' ')[0]}
                        </div>
                        <div>
                          <p className="font-bold text-[var(--acade-text)] text-[length:var(--text-sm)]">{c.code}</p>
                          <p className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)] line-clamp-1">{c.title}</p>
                        </div>
                      </div>
                      <Badge variant="grade-e">Score: {c.totalScore}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-[var(--acade-text-muted)]">
                  <div className="mx-auto w-12 h-12 bg-[var(--acade-success-dim)] text-[var(--acade-success)] rounded-full flex items-center justify-center mb-3">
                    <BookOpen size={20} />
                  </div>
                  <p className="text-[length:var(--text-sm)]">No flagged courses in recent semesters. Great job!</p>
                </div>
              )}
            </div>
          </motion.div>
        );

      case 'analysis':
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {analytics?.lastInsight?.data ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InsightCard title="Identified Strengths" content={analytics.lastInsight.data.strengths} type="success" />
                <InsightCard title="Areas of Concern" content={analytics.lastInsight.data.concerns} type="warning" />
                <InsightCard title="Actionable Recommendations" content={analytics.lastInsight.data.recommendations} type="info" />
                <InsightCard title="Degree Outlook" content={analytics.lastInsight.data.degreeOutlook} type="success" />
              </div>
            ) : (
              <div className="p-8 text-center text-[var(--acade-text-muted)] bg-[var(--acade-surface)] rounded-2xl border border-[var(--acade-border)]">
                No written analysis available. Click Refresh Insights to generate.
              </div>
            )}
          </motion.div>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <AnimatePresence>
        {rateLimitError && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 bg-[var(--acade-warning)]/10 border border-[var(--acade-warning)] text-[var(--acade-warning)] rounded-xl p-4 flex items-center gap-3"
          >
            <AlertTriangle size={20} />
            <div>
              <p className="font-bold text-[length:var(--text-sm)] font-[family-name:var(--font-bricolage)]">AI quota temporarily reached.</p>
              <p className="text-[length:var(--text-xs)]">
                We are serving your last cached insights. {rateLimitCooldown > 0 ? `Please try again in ${rateLimitCooldown} seconds.` : 'You can try refreshing again.'}
              </p>
            </div>
          </motion.div>
        )}
        {!rateLimitError && analytics?.insightsStale && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 bg-[var(--acade-primary)]/10 border border-[var(--acade-primary)] text-[var(--acade-primary)] rounded-xl p-4 flex items-center gap-3"
          >
            <RefreshCw size={20} className="animate-pulse" />
            <div>
              <p className="font-bold text-[length:var(--text-sm)] font-[family-name:var(--font-bricolage)]">Your results changed.</p>
              <p className="text-[length:var(--text-xs)]">Refresh your insights to get an updated AI analysis.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="text-[length:var(--text-3xl)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)] tracking-tight">
            AI Insights Hub
          </h1>
          <div className="flex items-center gap-2 mt-1 text-[length:var(--text-sm)] text-[var(--acade-text-muted)]">
            <Image src="/acadegradeailogo.png" alt="AcadeMind" width={20} height={20} className="rounded-md object-contain opacity-80" />
            <span>Powered by AcadeMind</span>
          </div>
        </div>

        <div className="relative self-start md:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing || rateLimitCooldown > 0}
            className="bg-[var(--acade-surface)]"
          >
            <RefreshCw size={16} className={cn("mr-2", refreshing && "animate-spin")} />
            {refreshing ? 'Analyzing...' : rateLimitCooldown > 0 ? `Wait ${rateLimitCooldown}s` : 'Refresh Insights'}
          </Button>
          {analytics?.insightsStale && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-[var(--acade-surface)]"></span>
            </span>
          )}
        </div>
      </div>

      {/* Animated Tabs */}
      <div className="flex overflow-x-auto hide-scrollbar border-b border-[var(--acade-border)] mb-8" role="tablist" aria-label="Insights Navigation">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative px-6 py-4 text-[length:var(--text-sm)] font-bold transition-colors whitespace-nowrap",
                isActive ? "text-[var(--acade-text)]" : "text-[var(--acade-text-faint)] hover:text-[var(--acade-text-muted)]"
              )}
            >
              {tab.label}
              {isActive && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--acade-primary)] shadow-[0_-2px_8px_rgba(99,102,241,0.5)]"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {renderTabContent()}
      </AnimatePresence>
    </div>
  );
}
