'use client';

import { useState, useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, AlertTriangle, TrendingUp, TrendingDown, Minus, Clock3 } from 'lucide-react';
import toast from 'react-hot-toast';

import { cn } from '@/lib/utils/cn';
import { getAcademicPlan } from '@/lib/academic/timeline';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { getDocument, queryCollection, setDocument, updateDocument } from '@/lib/firebase/firestore';
import { formatCgpa } from '@/lib/cgpa/academicRules';
import { buildAcademicSeries } from '@/lib/planning/academicSeries';
import { buildCarryOverReport, type CarryOverReport, type PlanningCourse } from '@/lib/planning/carryOvers';
import { planDegreeClassAlert } from '@/lib/planning/degreeClassAlert';
import { parseTargetClass, type TargetClass } from '@/lib/planning/degreeGoal';
import { insightsHelpId, studentHelpSource } from '@/lib/help/student-help';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { HelpButton } from '@/components/help/HelpDrawer';
import { DiscreetRevealButton, DiscreetScope, DiscreetValue } from '@/lib/discreet';
import { InsightCard } from '@/components/ai/InsightCard';
import { WhatIfCalculator } from '@/components/ai/WhatIfCalculator';
import { ForecastChart } from '@/components/charts/ForecastChart';
import { ErrorState } from '@/components/shared';

import type { SemesterWithId } from '@/types/semester';
import type { Course } from '@/types/course';
import type { InsightResponse, ForecastResponse } from '@/types/ai';
import { resolveInsightRefresh } from '@/lib/ai/insight-refresh-state';
import { FeatureCredits } from '@/components/ai/FeatureCredits';
import { AiDisclosure } from '@/components/ai/AiDisclosure';
import { AiAccessNotice } from '@/components/ai/AiAccessNotice';
import { blockFromUsage, classifyAiResponse, type AiBlock, type AiFeature } from '@/components/ai/aiAccess';
import { openRequirements } from '@/components/requirements';
import { CarryOverTracker } from './_components/CarryOverTracker';
import { DegreeGoalCard } from './_components/DegreeGoalCard';

type TabType = 'forecast' | 'whatif' | 'risk' | 'analysis';
const TABS: { id: TabType; label: string }[] = [
  { id: 'forecast', label: 'Forecast' },
  { id: 'whatif', label: 'What-If' },
  { id: 'risk', label: 'Risk Analysis' },
  { id: 'analysis', label: 'Written Analysis' }
];

const RATE_LIMIT_GUIDANCE: Record<TabType, string> = {
  forecast: 'Forecasts are cached for one hour. New forecasts allow up to 2 requests per hour; your current daily allowance is shown below.',
  whatif: 'Your goal and the calculator are instant and free. AI guidance allows up to 3 requests per 5 minutes, within your daily allowance.',
  risk: 'Risk Analysis and carry-overs read your saved forecast and results, so this tab never makes an AI request.',
  analysis: 'Written Analysis remains cached and readable. Free regeneration unlocks after 12 hours, within your daily allowance. Verified ad rewards are separate.',
};

const TAB_FEATURE: Record<TabType, AiFeature | null> = { forecast: 'forecast', whatif: 'whatif', risk: null, analysis: 'insights' };

interface AnalyticsDoc {
  forecast?: ForecastResponse & { lastUpdated: any; trendDirection: string; trendLabel: string; aiEnhanced?: boolean };
  lastInsight?: { data: InsightResponse; timestamp: any };
  insightsStale?: boolean;
  degreeClass?: string;
  cgpa?: number;
}

const EMPTY_REPORT: CarryOverReport = { outstanding: [], outstandingUnits: 0, atRisk: [] };

export default function InsightsPage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { isFeatureDisabled } = usePlatformSettings();
  const disableInsights = isFeatureDisabled('ai_insights');
  const shouldReduceMotion = useReducedMotion();

  const [activeTab, setActiveTab] = useState<TabType>('forecast');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // Bumped after Forecast/What-if requests settle so the credit display re-reads server counts.
  const [creditsRevision, setCreditsRevision] = useState(0);
  const [rateLimitError, setRateLimitError] = useState(false);
  const [rateLimitCooldown, setRateLimitCooldown] = useState(0);

  const [analytics, setAnalytics] = useState<AnalyticsDoc | null>(null);
  const [currentCGPA, setCurrentCGPA] = useState(0);
  const [gradedCredits, setGradedCredits] = useState(0);
  // Graded units in unfinished semesters: already in the CGPA, so not "remaining" (R3).
  const [gradedInProgressUnits, setGradedInProgressUnits] = useState(0);
  const [unitsPerSemester, setUnitsPerSemester] = useState(18);
  const [carryReport, setCarryReport] = useState<CarryOverReport>(EMPTY_REPORT);
  const [piHistory, setPiHistory] = useState<number[]>([]);
  const [cgpaHistory, setCgpaHistory] = useState<number[]>([]);
  const [semesterLabels, setSemesterLabels] = useState<string[]>([]);
  const [remainingAcademicSemesters, setRemainingAcademicSemesters] = useState(0);
  const [graduationSession, setGraduationSession] = useState('');
  const [isGraduated, setIsGraduated] = useState(false);
  const [projectionMode, setProjectionMode] = useState<'pi' | 'cgpa'>('pi');
  const [cooldownText, setCooldownText] = useState<string | null>(null);
  const [isCooldownActive, setIsCooldownActive] = useState(false);
  /** AI is not allowed for this account right now (age, consent or maintenance). */
  const [aiBlock, setAiBlock] = useState<AiBlock | null>(null);
  /** One AI feature switched off on the server. */
  const [featureBlocks, setFeatureBlocks] = useState<Partial<Record<AiFeature, AiBlock>>>({});
  const savedTarget = parseTargetClass((profile as { targetClass?: unknown } | null | undefined)?.targetClass);
  /** A goal picked on this page; until then the saved one is shown. */
  const [targetOverride, setTargetOverride] = useState<TargetClass | null>(null);
  const targetClass = targetOverride ?? savedTarget;
  const [savingGoal, setSavingGoal] = useState(false);
  const tabRefs = useRef<Record<TabType, HTMLButtonElement | null>>({
    forecast: null,
    whatif: null,
    risk: null,
    analysis: null,
  });

  const blockFor = (feature: AiFeature | null) => (feature ? aiBlock ?? featureBlocks[feature] ?? null : null);
  /** A gate code from an AI route. Setup-required answers open "Finish setting up" straight away. */
  const recordBlock = (feature: AiFeature, block: AiBlock) => {
    if (block.kind === 'feature-disabled') setFeatureBlocks(current => ({ ...current, [feature]: block }));
    else setAiBlock(block);
    if (block.kind === 'requirements') openRequirements('ai');
  };

  // Sync state with user preference on mount/update
  useEffect(() => {
    if (profile?.gradeMode) {
      setProjectionMode(profile.gradeMode as 'pi' | 'cgpa');
    }
  }, [profile?.gradeMode]);

  // Handle grade mode toggle sync
  const handleModeChange = async (mode: 'pi' | 'cgpa') => {
    setProjectionMode(mode);
    if (user?.uid) {
      try {
        await updateDocument(`users/${user.uid}`, { gradeMode: mode });
      } catch (e) {
        console.error('Failed to save preference', e);
      }
    }
  };

  // A6: the goal is saved on the student's own user document.
  const handleTargetChange = async (next: TargetClass) => {
    if (!user?.uid || savingGoal) return;
    const previous = targetOverride;
    setTargetOverride(next);
    setSavingGoal(true);
    try {
      await updateDocument(`users/${user.uid}`, { targetClass: next });
    } catch (e) {
      console.error('Failed to save degree-class goal', e);
      setTargetOverride(previous);
      toast.error('Could not save your goal. Please try again.');
    } finally {
      setSavingGoal(false);
    }
  };

  useEffect(() => {
    if (user && profile) {
      loadData();
    }
  }, [user, profile]);

  useEffect(() => {
    if (rateLimitCooldown <= 0) return;
    const timer = setInterval(() => setRateLimitCooldown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [rateLimitCooldown]);

  useEffect(() => {
    if (!analytics?.lastInsight?.timestamp) {
      setCooldownText(null);
      setIsCooldownActive(false);
      return;
    }

    const updateCooldown = () => {
      const timestamp = analytics.lastInsight!.timestamp;
      const lastCallTime = typeof timestamp.toDate === 'function'
        ? timestamp.toDate().getTime()
        : new Date(timestamp).getTime();

      const msIn12Hours = 12 * 60 * 60 * 1000;
      const timeRemaining = msIn12Hours - (Date.now() - lastCallTime);

      if (timeRemaining > 0) {
        setIsCooldownActive(true);
        const h = Math.floor(timeRemaining / (1000 * 60 * 60));
        const m = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        setCooldownText(`${h}h ${m}m`);
      } else {
        setIsCooldownActive(false);
        setCooldownText(null);
      }
    };

    updateCooldown();
    const interval = setInterval(updateCooldown, 60000);
    return () => clearInterval(interval);
  }, [analytics?.lastInsight?.timestamp]);

  const loadData = async (forceRefresh = false) => {
    if (!user) return;
    try {
      if (!forceRefresh) setLoading(true);
      setLoadError(false);
      setRateLimitError(false);

      // 1. Fetch semesters
      const semesters = await queryCollection<SemesterWithId>(`users/${user.uid}/semesters`);
      semesters.sort((a, b) => {
        if (a.level !== b.level) return a.level - b.level;
        return a.semester - b.semester;
      });
      const academicPlan = getAcademicPlan(profile, semesters);
      const academicContext = {
        remainingSemesters: academicPlan.remainingAcademicSemesters,
        graduationSession: academicPlan.graduationSession,
        isGraduated: academicPlan.isGraduated,
      };
      setRemainingAcademicSemesters(academicPlan.remainingAcademicSemesters);
      setGraduationSession(academicPlan.graduationSession);
      setIsGraduated(academicPlan.isGraduated);

      // Owner rule: every graded course counts, whether or not its semester is marked complete.
      const series = buildAcademicSeries(semesters);
      const piHist = series.piHistory;
      const cgpaHist = series.cgpaHistory;
      setPiHistory(piHist);
      setCgpaHistory(cgpaHist);
      setSemesterLabels(series.labels);
      setCurrentCGPA(series.currentCgpa);
      setGradedCredits(series.gradedCredits);
      setGradedInProgressUnits(semesters
        .filter((semester) => !semester.isComplete)
        .reduce((sum, semester) => sum + (Number(semester.creditLoaded) || 0), 0));
      setUnitsPerSemester(series.labels.length > 0
        ? Math.min(30, Math.max(1, Math.round(series.gradedCredits / series.labels.length)))
        : 18);

      // 2. Fetch existing analytics doc
      let analyticsData = await getDocument<AnalyticsDoc>(`analytics/${user.uid}`);

      // Degree class from the shared rules; alert only when the displayed CGPA's class really changes.
      const alertPlan = planDegreeClassAlert({ previous: analyticsData, currentCgpa: series.currentCgpa, gradedCredits: series.gradedCredits });
      const newDegreeClass = alertPlan.label;
      if (alertPlan.alert) {
        const token = await user.getIdToken();
        // Send Push
        fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            uid: user.uid,
            title: 'Degree Class Update! 🎓',
            message: `Your CGPA trajectory has shifted your degree class to: ${newDegreeClass}.`,
            type: 'achievement',
            event: 'degreeClass'
          })
        }).catch(console.error);

        // Send Email
        fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            uid: user.uid,
            type: 'email',
            event: 'degreeClass',
            data: { name: profile?.fullName || 'Student', degreeClass: newDegreeClass }
          })
        }).catch(console.error);
      }

      // Save new CGPA and degreeClass to analytics doc
      if (analyticsData) {
        await updateDocument(`analytics/${user.uid}`, {
          cgpa: series.currentCgpa,
          degreeClass: newDegreeClass
        });
        analyticsData.degreeClass = newDegreeClass;
        analyticsData.cgpa = series.currentCgpa;
      }

      // A4: carry-overs and low grades from every semester (awaiting-result and pending rows never count).
      const semesterCourses = await Promise.all(semesters.map(async sem => ({
        id: sem.id,
        label: sem.label || `${sem.level}L Semester ${sem.semester}`,
        courses: await queryCollection<Course & PlanningCourse>(`users/${user.uid}/semesters/${sem.id}/courses`),
      })));
      setCarryReport(buildCarryOverReport(semesterCourses));

      // AI access for this account (age and consent) from the usage summary.
      let block: AiBlock | null = null;
      if (!disableInsights) {
        try {
          const usageToken = await user.getIdToken();
          const usage = await fetch('/api/ai/usage', { headers: { Authorization: `Bearer ${usageToken}` }, cache: 'no-store' });
          if (usage.ok) block = blockFromUsage(await usage.json());
        } catch {
          // The AI routes enforce access themselves; an unreadable summary does not block.
        }
      }
      setAiBlock(block);
      setFeatureBlocks({});

      // 3. Generate forecast if needed (restricted accounts still get the maths-only forecast)
      if ((!analyticsData?.forecast || forceRefresh) && !disableInsights) {
        if (piHist.length > 0) {
          const authToken = await user.getIdToken();

          const res = await fetch('/api/ai/forecast', {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json',
               'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              piHistory: piHist,
              cgpaHistory: cgpaHist,
              forceRegenerate: forceRefresh,
              academicContext,
            }),
          });

          setCreditsRevision(value => value + 1);
          if (res.ok) {
            const forecastData = await res.json();
            analyticsData = { ...analyticsData, forecast: forecastData };
          } else if (res.status === 429) {
            const errorData = await res.json().catch(() => ({}));
            const retryAfter = Number(res.headers.get('Retry-After') || errorData.retryAfterSeconds || 59);
            setRateLimitError(true);
            setRateLimitCooldown(retryAfter);
            toast.error(errorData.error || `Forecast limit reached. Try again in ${retryAfter}s.`);
          } else {
            const { block: gate } = await classifyAiResponse(res);
            if (gate) {
              recordBlock('forecast', gate);
            } else {
              console.error('Forecast failed:', res.status);
              toast.error('Could not generate forecast. Please try again.');
            }
          }
        }
      }

      // 4. Generate written insights if needed (never when AI is not allowed)
      // Skip hitting the API if they are on a 12-hour cooldown and forced a refresh
      if ((!analyticsData?.lastInsight || (forceRefresh && !isCooldownActive)) && !disableInsights && !block) {
        const authToken = await user.getIdToken();
        const res = await fetch('/api/ai/insights', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({ forceRegenerate: forceRefresh, semesterData: semesters, academicContext }),
        });

        if (res.ok) {
          const insightData = await res.json() as InsightResponse & { stale?: boolean; staleMessage?: string };
          const refreshResult = resolveInsightRefresh(analyticsData?.lastInsight, insightData);
          analyticsData = {
            ...analyticsData,
            lastInsight: refreshResult.lastInsight,
            insightsStale: refreshResult.insightsStale,
          };
          if (!refreshResult.refreshed) {
            toast.error(insightData.staleMessage || 'Live analysis is unavailable. Showing the last saved insight.');
          } else if (forceRefresh) {
             await setDocument(`analytics/${user.uid}`, { insightsStale: false });
          }
        } else if (res.status === 429) {
          const errorData = await res.json().catch(() => ({}));
          const retryAfter = Number(res.headers.get('Retry-After') || errorData.retryAfterSeconds || 59);
          setRateLimitError(true);
          setRateLimitCooldown(retryAfter);
          if (forceRefresh) toast.error(errorData.error || 'AI quota reached. Serving cached insights.');
        } else {
          const { block: gate } = await classifyAiResponse(res);
          if (gate) recordBlock('insights', gate);
          else console.error('Insights failed:', res.status);
        }
      } else if (forceRefresh && isCooldownActive) {
        // They forced a refresh, but Written Analysis is on cooldown.
        // We still mark insights as not stale since the forecast was updated.
        analyticsData = { ...analyticsData, insightsStale: false };
        await setDocument(`analytics/${user.uid}`, { insightsStale: false });
        toast.success(`Forecast updated! Written Analysis unlocks in ${cooldownText}.`);
      }

      setAnalytics(analyticsData || null);
    } catch (err) {
      console.error('loadData error:', err);
      setLoadError(true);
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

  const handleTabKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, currentTab: TabType) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;

    event.preventDefault();
    const currentIndex = TABS.findIndex((tab) => tab.id === currentTab);
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? TABS.length - 1
        : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length;
    const nextTab = TABS[nextIndex].id;

    setActiveTab(nextTab);
    tabRefs.current[nextTab]?.focus();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 relative overflow-hidden rounded-3xl border border-[var(--acade-border)] bg-[var(--acade-surface)] shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]">
        {/* Futuristic Scanning Overlay */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            data-testid="insights-scanner"
            data-animated={!shouldReduceMotion}
            animate={shouldReduceMotion ? undefined : { y: ["-100%", "500%"] }}
            transition={shouldReduceMotion ? { duration: 0 } : { duration: 3, ease: "linear", repeat: Infinity }}
            className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-transparent via-[var(--acade-primary)]/5 to-[var(--acade-primary)]/20 border-b-2 border-[var(--acade-primary)]/80 shadow-[0_10px_30px_rgba(99,102,241,0.3)]"
          />
          {/* Subtle grid pattern background */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:30px_30px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]" />
        </div>

        <div className="relative z-10">
          <div
            data-testid="insights-loading-glow"
            className={cn(
              "absolute inset-0 rounded-full blur-2xl bg-[var(--acade-primary)]/30",
              !shouldReduceMotion && "animate-pulse"
            )}
          />
          <div className="size-24 relative flex items-center justify-center rounded-full bg-[var(--acade-deep)] border border-[var(--acade-primary)]/40 shadow-[0_0_40px_rgba(99,102,241,0.2)]">
            <Image
              src="/acadegradeailogo.png"
              alt="AcadeMind"
              width={60}
              height={60}
              className={cn("object-contain", !shouldReduceMotion && "animate-pulse")}
            />
          </div>
        </div>

        <div className="text-center z-10 mt-2" role="status">
          <h3 className="text-[length:var(--text-lg)] font-bold text-[var(--acade-primary-glow)] font-[family-name:var(--font-geist-mono)] tracking-widest uppercase">
            AcadeMind Synthesizing
          </h3>
          <p className={cn(
            "text-[length:var(--text-sm)] text-[var(--acade-text-muted)] font-medium mt-2 font-[family-name:var(--font-geist-mono)]",
            !shouldReduceMotion && "animate-pulse"
          )}>
            Analyzing academic records...
          </p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-3xl pb-10">
        <div className="mb-6">
          <p className="text-[length:var(--text-xs)] font-semibold uppercase tracking-[0.18em] text-[var(--acade-danger)]">
            Insights unavailable
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-bricolage)] text-[length:var(--text-2xl)] font-bold text-[var(--acade-text)]">
            Your analysis is paused
          </h1>
        </div>
        <ErrorState
          title="We couldn&apos;t load your insights"
          description="Forecasts, risk scoring, and written analysis are hidden until your academic data loads successfully. No result has been changed."
          retryLabel="Retry loading insights"
          onRetry={() => void loadData()}
        />
      </div>
    );
  }

  const forecast = analytics?.forecast;
  const forecastIsAi = Boolean(forecast) && forecast?.aiEnhanced !== false && !aiBlock;
  const activeFeature = TAB_FEATURE[activeTab];
  const activeBlock = blockFor(activeFeature);
  const showAiActions = !aiBlock && !disableInsights;

  const motionProps = {
    initial: shouldReduceMotion ? false : { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: shouldReduceMotion ? undefined : { opacity: 0, y: -10 },
  } as const;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'forecast': {
        const projectedSeries = forecast
          ? (projectionMode === 'pi' ? (forecast.projectedPi || forecast.projected) : (forecast.projectedCgpa || forecast.projected))
          : [];
        return (
          <motion.div {...motionProps} className="space-y-6">
            <div className="bg-[var(--acade-surface)] border border-[var(--acade-border)] rounded-[var(--radius-surface)] p-5 md:p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                <h2 className="text-[length:var(--text-lg)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)]">
                  {projectionMode === 'pi' ? 'Performance Index Projection' : 'Cumulative GPA Projection'}
                </h2>
                <SegmentedControl
                  aria-label="Projection metric"
                  value={projectionMode}
                  onValueChange={(mode) => void handleModeChange(mode)}
                  options={[{ value: 'pi', label: 'PI' }, { value: 'cgpa', label: 'CGPA' }]}
                  className="w-full md:w-auto"
                />
              </div>

              {forecast ? (
                <>
                  <DiscreetValue label="Forecast chart" block>
                  <ForecastChart
                    history={projectionMode === 'pi'
                      ? (piHistory.length > 0 ? piHistory.slice(-3) : [0])
                      : (cgpaHistory.length > 0 ? cgpaHistory.slice(-3) : [0])}
                    projected={projectedSeries.slice(0, Math.min(2, remainingAcademicSemesters))}
                    labels={semesterLabels.length > 0
                      ? [
                          ...semesterLabels.slice(-3),
                          ...(remainingAcademicSemesters > 0 ? [remainingAcademicSemesters === 1 ? 'Graduation' : 'Next Sem'] : []),
                          ...(remainingAcademicSemesters > 1 ? [remainingAcademicSemesters === 2 ? 'Graduation' : 'Next Year'] : []),
                        ]
                      : ['Past', 'Current']
                    }
                    metricName={projectionMode === 'pi' ? 'PI' : 'CGPA'}
                  />
                  </DiscreetValue>
                  <div className="mt-6 p-4 bg-[var(--acade-deep)] rounded-[var(--radius-control)] border border-[var(--acade-border-subtle)] flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                    <div>
                      <span className="text-sm font-medium text-[var(--acade-text-muted)] block mb-1">
                        Projected next semester {projectionMode === 'pi' ? 'PI' : 'CGPA'}
                      </span>
                      <span className="text-[length:var(--text-2xl)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-geist-mono)] tabular-nums">
                        <DiscreetValue label={`Projected ${projectionMode === 'pi' ? 'PI' : 'CGPA'}`}>
                          {projectedSeries[0] !== undefined ? formatCgpa(projectedSeries[0]) : '—'}
                        </DiscreetValue>
                      </span>
                    </div>
                    <Badge variant="status" className="self-start sm:self-auto bg-[var(--acade-primary-dim)] text-[var(--acade-primary-glow)] border-[var(--acade-primary)]/30">
                      Trend: {forecast.trendLabel || 'Analyzing...'}
                    </Badge>
                  </div>
                  {forecastIsAi && <AiDisclosure feature="forecast" className="mt-4" />}
                </>
              ) : (
                <p className="text-[var(--acade-text-muted)] text-[length:var(--text-sm)]">
                  Not enough data to forecast yet. Add graded results for at least one semester.
                </p>
              )}
            </div>
          </motion.div>
        );
      }

      case 'whatif':
        return (
          <motion.div {...motionProps} className="space-y-6">
            <DegreeGoalCard
              currentCgpa={currentCGPA}
              gradedCredits={gradedCredits}
              remainingSemesters={isGraduated ? 0 : remainingAcademicSemesters}
              unitsPerSemester={unitsPerSemester}
              gradedInProgressUnits={gradedInProgressUnits}
              targetClass={targetClass}
              onTargetChange={(next) => void handleTargetChange(next)}
              saving={savingGoal}
            />
            {isGraduated ? (
              <div className="rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-surface)] p-8 text-center">
                <h2 className="text-lg font-bold text-[var(--acade-text)]">Programme timeline complete</h2>
                <p className="mt-2 text-sm text-[var(--acade-text-muted)]">What-If projections stop at {graduationSession || 'graduation'} because no academic semesters remain.</p>
              </div>
            ) : (
              <WhatIfCalculator
                currentCGPA={currentCGPA}
                totalCredits={gradedCredits}
                initialRemainingSemesters={remainingAcademicSemesters}
                initialCreditLoad={unitsPerSemester}
                gradedInProgressUnits={gradedInProgressUnits}
                onRequestSettled={() => setCreditsRevision(value => value + 1)}
                aiBlock={blockFor('whatif') ?? (disableInsights ? { kind: 'feature-disabled', message: 'AI guidance is switched off for now. The numbers above still work.' } : null)}
                onAiBlocked={(block) => recordBlock('whatif', block)}
              />
            )}
          </motion.div>
        );

      case 'risk':
        return (
          <motion.div {...motionProps} className="space-y-6">
            <CarryOverTracker report={carryReport} />

            {!forecast ? (
              <div className="rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-surface)] px-6 py-8 text-center">
                <AlertTriangle className="mx-auto size-7 text-[var(--acade-warning)]" aria-hidden="true" />
                <h2 className="mt-4 font-[family-name:var(--font-bricolage)] text-[length:var(--text-lg)] font-bold text-[var(--acade-text)]">
                  Risk analysis unavailable
                </h2>
                <p className="mx-auto mt-2 max-w-lg text-[length:var(--text-sm)] leading-6 text-[var(--acade-text-muted)]">
                  AcadeMind does not have a verified forecast to assess yet. Add graded results or refresh later; no risk level has been assigned.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Risk Gauge */}
                <div className="bg-[var(--acade-surface)] border border-[var(--acade-border)] rounded-[var(--radius-surface)] p-6 flex flex-col items-center justify-center text-center">
                  <span className="text-sm font-medium text-[var(--acade-text-muted)] mb-4">Trend risk level</span>
                  <DiscreetValue label="Risk level" block>
                  <div className="relative size-32 flex items-center justify-center" role="img" aria-label={`Risk level ${forecast.riskScore || 1} of 5`}>
                    <svg className="absolute inset-0 w-full h-full transform -rotate-90" aria-hidden="true">
                      <circle cx="64" cy="64" r="56" stroke="var(--acade-deep)" strokeWidth="12" fill="none" />
                      <circle
                        cx="64" cy="64" r="56"
                        stroke={
                          forecast.riskScore === 5 ? 'var(--acade-danger)' :
                          forecast.riskScore === 4 ? 'var(--acade-warning)' :
                          'var(--acade-success)'
                        }
                        strokeWidth="12"
                        strokeDasharray="351"
                        strokeDashoffset={351 - (351 * (forecast.riskScore || 1)) / 5}
                        strokeLinecap="round"
                        fill="none"
                        className={cn(!shouldReduceMotion && "transition-all duration-1000 ease-out")}
                      />
                    </svg>
                    <span className="text-[length:var(--text-4xl)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-geist-mono)]">
                      {forecast.riskScore || 1}
                    </span>
                  </div>
                  </DiscreetValue>
                  <span className="text-xs text-[var(--acade-text-muted)] mt-4">1 = Safe, 5 = Critical</span>
                </div>

                {/* Trend Banner */}
                <div className="md:col-span-2 bg-[var(--acade-surface)] border border-[var(--acade-border)] rounded-[var(--radius-surface)] p-6 flex flex-col justify-center gap-4">
                  <span className="text-sm font-medium text-[var(--acade-text-muted)]">Trend analysis</span>
                  <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-full ${
                      forecast.trendDirection === 'improving' ? 'bg-[var(--acade-success-dim)] text-[var(--acade-success)]' :
                      forecast.trendDirection === 'declining' ? 'bg-[var(--acade-danger-dim)] text-[var(--acade-danger)]' :
                      'bg-[var(--acade-overlay)] text-[var(--acade-text-muted)]'
                    }`} aria-hidden="true">
                      {forecast.trendDirection === 'improving' ? <TrendingUp size={32} /> :
                       forecast.trendDirection === 'declining' ? <TrendingDown size={32} /> :
                       <Minus size={32} />}
                    </div>
                    <div>
                      <h3 className="text-[length:var(--text-xl)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)] capitalize">
                        {forecast.trendDirection || 'Stable'} Performance
                      </h3>
                      <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] mt-1">
                        {forecast.trendLabel || 'Keep up the consistent work.'}
                      </p>
                    </div>
                  </div>
                  {forecastIsAi && <AiDisclosure feature="forecast" ratings={false} />}
                </div>
              </div>
            )}
          </motion.div>
        );

      case 'analysis': {
        const insight = analytics?.lastInsight?.data;
        const hideCached = activeBlock?.kind === 'age-restricted';
        return (
          <motion.div {...motionProps} className="space-y-6">
            {showAiActions && isCooldownActive && (
              <div className="bg-[var(--acade-deep)] border border-[var(--acade-border-subtle)] rounded-[var(--radius-control)] p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm font-medium text-[var(--acade-text-muted)]">
                  Written Analysis regenerates at most every 12 hours.
                </span>
                <Badge variant="status" className="self-start sm:self-auto bg-[var(--acade-warning)]/10 text-[var(--acade-warning)] border-[var(--acade-warning)]/30 tabular-nums">
                  Updates unlock in {cooldownText}
                </Badge>
              </div>
            )}
            {insight && !hideCached ? (
              <>
                <DiscreetValue label="Written analysis" block>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InsightCard title="Identified Strengths" content={insight.strengths} type="success" animated={!shouldReduceMotion} />
                  <InsightCard title="Areas of Concern" content={insight.concerns} type="warning" animated={!shouldReduceMotion} />
                  <InsightCard title="Actionable Recommendations" content={insight.recommendations} type="info" animated={!shouldReduceMotion} />
                  <InsightCard title="Degree Outlook" content={insight.degreeOutlook} type="success" animated={!shouldReduceMotion} />
                </div>
                </DiscreetValue>
                <AiDisclosure feature="insights" className="rounded-[var(--radius-control)] border border-[var(--acade-border-subtle)] bg-[var(--acade-surface)] px-4 py-2" />
              </>
            ) : !activeBlock ? (
              <div className="p-8 text-center text-[var(--acade-text-muted)] bg-[var(--acade-surface)] rounded-[var(--radius-surface)] border border-[var(--acade-border)]">
                No written analysis yet. Choose Refresh Insights to generate one.
              </div>
            ) : null}
          </motion.div>
        );
      }
    }
  };

  return (
    <DiscreetScope>
    <div className="max-w-6xl mx-auto pb-10">
      <AnimatePresence initial={!shouldReduceMotion}>
        {rateLimitError && (
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, height: 0 }}
            role="status"
            className="mb-6 bg-[var(--acade-warning)]/10 border border-[var(--acade-warning)] text-[var(--acade-text)] rounded-[var(--radius-control)] p-4 flex items-center gap-3"
          >
            <AlertTriangle size={20} className="shrink-0 text-[var(--acade-warning)]" aria-hidden="true" />
            <div>
              <p className="font-bold text-[length:var(--text-sm)] font-[family-name:var(--font-bricolage)]">AI quota temporarily reached.</p>
              <p className="text-sm text-[var(--acade-text-muted)]">
                We are serving your last cached insights. {rateLimitCooldown > 0 ? `Please try again in ${rateLimitCooldown} seconds.` : 'You can try refreshing again.'}
              </p>
            </div>
          </motion.div>
        )}
        {!rateLimitError && showAiActions && analytics?.insightsStale && (
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, height: 0 }}
            role="status"
            className="mb-6 bg-[var(--acade-primary)]/10 border border-[var(--acade-primary)] text-[var(--acade-text)] rounded-[var(--radius-control)] p-4 flex items-center gap-3"
          >
            <RefreshCw size={20} className="shrink-0 text-[var(--acade-primary)]" aria-hidden="true" />
            <div>
              <p className="font-bold text-[length:var(--text-sm)] font-[family-name:var(--font-bricolage)]">Your results changed.</p>
              <p className="text-sm text-[var(--acade-text-muted)]">Refresh your insights to get an updated AI analysis.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div className="min-w-0">
          <h1 className="text-[length:var(--text-3xl)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)] tracking-tight">
            AI Insights Hub
          </h1>
          <div className="flex items-center gap-2 mt-1 text-[length:var(--text-sm)] text-[var(--acade-text-muted)]">
            <Image src="/acadegradeailogo.png" alt="" width={20} height={20} className="rounded-md object-contain opacity-80" />
            <span>Powered by AcadeMind</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <DiscreetRevealButton label="Academic figures" className="border border-[var(--acade-border)]" />
          <HelpButton entryId={insightsHelpId(activeTab)} source={studentHelpSource} />
          {showAiActions && (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing || rateLimitCooldown > 0 || !analytics?.insightsStale}
                className="bg-[var(--acade-surface)] disabled:opacity-50"
              >
                <RefreshCw size={16} className={cn("mr-2", refreshing && !shouldReduceMotion && "animate-spin")} aria-hidden="true" />
                {refreshing
                  ? 'Analyzing...'
                  : rateLimitCooldown > 0
                    ? `Wait ${rateLimitCooldown}s`
                    : !analytics?.insightsStale
                      ? 'Up to Date'
                      : 'Refresh Insights'}
              </Button>
              {analytics?.insightsStale && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3" aria-hidden="true">
                  {!shouldReduceMotion && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--acade-danger)] opacity-75" />
                  )}
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--acade-danger)] border-2 border-[var(--acade-surface)]"></span>
                </span>
              )}
            </div>
          )}
          {disableInsights && (
            <Button variant="outline" size="sm" disabled className="bg-[var(--acade-surface)] disabled:opacity-50" title="AI Insights are temporarily disabled for maintenance">
              <RefreshCw size={16} className="mr-2" aria-hidden="true" />
              Maintenance Mode
            </Button>
          )}
        </div>
      </div>

      {aiBlock && <AiAccessNotice block={aiBlock} className="mb-6" />}

      {/* Animated Tabs */}
      <div
        className="flex overflow-x-auto hide-scrollbar border-b border-[var(--acade-border)] mb-6"
        role="tablist"
        aria-label="Insights Navigation"
        aria-orientation="horizontal"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              ref={(element) => { tabRefs.current[tab.id] = element; }}
              type="button"
              role="tab"
              id={`insights-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`insights-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
              className={cn(
                "relative min-h-12 px-4 sm:px-6 py-3 text-[length:var(--text-sm)] font-bold transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--acade-primary)]",
                isActive ? "text-[var(--acade-text)]" : "text-[var(--acade-text-muted)] hover:text-[var(--acade-text)]"
              )}
            >
              {tab.label}
              {isActive && (
                shouldReduceMotion ? (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--acade-primary)]" />
                ) : (
                  <motion.div
                    layoutId="activeTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--acade-primary)]"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )
              )}
            </button>
          );
        })}
      </div>

      {!aiBlock && (
        <div className="mb-6 flex items-start gap-3 rounded-[var(--radius-control)] border border-[var(--acade-primary)]/25 bg-[var(--acade-primary)]/10 px-4 py-3">
          <Clock3 size={16} className="mt-0.5 shrink-0 text-[var(--acade-primary)]" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-[var(--acade-text-muted)]">{RATE_LIMIT_GUIDANCE[activeTab]}</p>
        </div>
      )}

      {/* Tab-specific switch-off (the account-wide notice is above) */}
      {!aiBlock && activeBlock && <AiAccessNotice block={activeBlock} className="mb-6" />}

      {/* Tab Content */}
      {showAiActions && activeFeature && !activeBlock && (
        <FeatureCredits feature={activeFeature} refreshKey={`${refreshing}-${creditsRevision}`} />
      )}
      <div
        key={activeTab}
        role="tabpanel"
        id={`insights-panel-${activeTab}`}
        aria-labelledby={`insights-tab-${activeTab}`}
        tabIndex={0}
        className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--acade-primary)]"
      >
        <AnimatePresence mode="wait" initial={!shouldReduceMotion}>
          {renderTabContent()}
        </AnimatePresence>
      </div>
    </div>
    </DiscreetScope>
  );
}
