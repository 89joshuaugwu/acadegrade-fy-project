'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAnalytics } from '@/hooks/useAnalytics';
import { useAuth } from '@/hooks/useAuth';
import { useCGPA } from '@/hooks/useCGPA';
import { useProfile } from '@/hooks/useProfile';
import { getDocument, queryCollection, updateDocument } from '@/lib/firebase/firestore';
import { getGreeting } from '@/lib/utils/format';
import {
  buildDashboardSummary,
  type DashboardCourseRecord,
  type DashboardCourseSource,
} from '@/lib/dashboard/summary';
import { getDashboardNextAction } from '@/lib/dashboard/next-action';
import { AdPlacement } from '@/components/ads/AdPlacement';
import { NextActionCard } from '@/components/dashboard/NextActionCard';
import { RecentResults } from '@/components/dashboard/RecentResults';
import { StandingOverview } from '@/components/dashboard/StandingOverview';
import { TrendChart } from '@/components/charts/TrendChart';
import { Card } from '@/components/ui/Card';
import { LandingMotion, ReplayTypingText } from '@/components/marketing/LandingMotion';

export default function DashboardPage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { cgpa, pi, degreeClass, semesterHistory, totalCredits, loading: cgpaLoading, error: cgpaError } = useCGPA();
  const { insightsStale } = useAnalytics();

  const [isPIMode, setIsPIMode] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(false);
  const [coursesDone, setCoursesDone] = useState(0);
  const [atRiskCount, setAtRiskCount] = useState(0);
  const [unknownCount, setUnknownCount] = useState(0);
  const [recentCourses, setRecentCourses] = useState<DashboardCourseRecord[]>([]);
  const [courseDataError, setCourseDataError] = useState(false);
  const [courseRefreshKey, setCourseRefreshKey] = useState(0);

  useEffect(() => {
    if (profile?.gradeMode) setIsPIMode(profile.gradeMode === 'pi');
  }, [profile?.gradeMode]);

  const handleModeChange = async (checked: boolean) => {
    const previous = isPIMode;
    setIsPIMode(checked);
    if (!user?.uid) return;

    try {
      await updateDocument(`users/${user.uid}`, { gradeMode: checked ? 'pi' : 'cgpa' });
    } catch (error) {
      setIsPIMode(previous);
      console.error('Failed to save academic metric preference', error);
      toast.error('Your metric preference could not be saved. Please try again.');
    }
  };

  const fetchAiSummary = useCallback(async () => {
    if (!user?.uid) return;
    setAiLoading(true);
    setAiError(false);
    try {
      const analyticsData = await getDocument<{ lastInsight?: { data?: { degreeOutlook?: string } } }>(`analytics/${user.uid}`);
      setAiSummary(
        analyticsData?.lastInsight?.data?.degreeOutlook
        || 'Visit the Insights Hub to generate your first personalized academic analysis.'
      );
    } catch (error) {
      console.error('Failed to load AI insight', error);
      setAiError(true);
      setAiSummary(null);
    } finally {
      setAiLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAiSummary();
  }, [fetchAiSummary]);

  useEffect(() => {
    if (!user?.uid || semesterHistory.length === 0) {
      setCoursesDone(0);
      setAtRiskCount(0);
      setUnknownCount(0);
      setRecentCourses([]);
      setCourseDataError(false);
      return;
    }

    let isMounted = true;
    const fetchCoursesData = async () => {
      setCourseDataError(false);
      try {
        const semesterCourses = await Promise.all(
          semesterHistory.map(async (semester, semesterIndex) => ({
            semesterId: semester.semesterId,
            semesterLabel: semester.label,
            session: semester.session,
            semesterIndex,
            courses: await queryCollection<DashboardCourseSource>(
              `users/${user.uid}/semesters/${semester.semesterId}/courses`
            ),
          }))
        );
        const summary = buildDashboardSummary(semesterCourses);
        if (!isMounted) return;
        setCoursesDone(summary.totalCourses);
        setAtRiskCount(summary.atRiskCount);
        setUnknownCount(summary.unknownCount);
        setRecentCourses(summary.recent);
      } catch (error) {
        console.error('Failed to load dashboard course summary', error);
        if (isMounted) setCourseDataError(true);
      }
    };

    fetchCoursesData();
    return () => {
      isMounted = false;
    };
  }, [courseRefreshKey, semesterHistory, user?.uid]);

  const latestSemester = semesterHistory[semesterHistory.length - 1];
  const hasAcademicData = totalCredits > 0 && semesterHistory.length > 0;
  const currentSemesterMetric = latestSemester
    ? (isPIMode ? latestSemester.pi : latestSemester.gpa)
    : 0;
  const firstName = profile?.fullName?.split(' ')[0] || user?.displayName?.split(' ')[0] || 'Student';
  const greeting = getGreeting();
  const nextAction = useMemo(() => getDashboardNextAction({
    hasAcademicData,
    atRiskCount,
    unknownCount,
    insightsStale,
  }), [atRiskCount, hasAcademicData, insightsStale, unknownCount]);

  if (cgpaLoading) return <DashboardSkeleton />;

  if (cgpaError) {
    return (
      <Card className="mx-auto max-w-2xl text-center" role="alert">
        <AlertTriangle className="mx-auto size-8 text-[var(--acade-warning)]" aria-hidden="true" />
        <h1 className="mt-4 font-[family-name:var(--font-bricolage)] text-[length:var(--text-2xl)] font-semibold text-[var(--acade-text)]">
          Your academic overview could not load
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--acade-text-muted)]">
          Check your connection and reload this page. Your saved records have not been changed.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-5 min-h-12 rounded-[var(--radius-control)] bg-[var(--acade-primary)] px-5 text-sm font-semibold text-[var(--acade-on-primary)] hover:bg-[var(--acade-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]"
        >
          Reload overview
        </button>
      </Card>
    );
  }

  return (
    <LandingMotion>
    <div className="flex w-full min-w-0 max-w-full flex-col gap-6 pb-10 sm:gap-7">
      <header data-landing-motion="section" id="tour-welcome" className="max-w-2xl py-1">

        {/* Status beacon row */}
        <div className="flex items-center gap-2">
          <span className="relative flex size-2" aria-hidden="true">
            <span
              className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60"
              style={{ animation: 'dashboard-ping 2.4s cubic-bezier(0,0,0.2,1) infinite' }}
            />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.17em] text-[var(--acade-primary)]">
            Academic overview
          </p>
        </div>
        {/* Greeting with waving hand */}
        <h1 className="mt-2 flex items-center gap-3 font-[family-name:var(--font-bricolage)] text-[clamp(1.85rem,4vw,3rem)] font-semibold leading-tight tracking-[-0.035em] text-[var(--acade-text)]">
          {greeting}, {firstName}.
          <span
            aria-hidden="true"
            className="inline-block select-none"
            style={{
              transformOrigin: '70% 70%',
              animation: 'hand-wave 1.8s ease-in-out 0.6s 1 both',
            }}
          >
            👋
          </span>
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--acade-text-muted)] sm:text-base">
          {hasAcademicData
            ? 'See your current standing, the records that changed most recently, and the clearest next step.'
            : 'Start with one semester. AcadeGrade will build the picture as your record grows.'}
        </p>
        {/* Shimmer line — bottom separator under the header */}
      </header>


      <section data-landing-motion="card" aria-label="Academic standing and next action" className="grid min-w-0 items-stretch gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(18rem,0.75fr)]">
        <StandingOverview
          hasAcademicData={hasAcademicData}
          isPIMode={isPIMode}
          onModeChange={handleModeChange}
          cgpa={cgpa}
          pi={pi}
          degreeClassLabel={degreeClass.label}
          latestSemesterLabel={latestSemester?.label || null}
          currentSemesterMetric={currentSemesterMetric}
          totalCredits={totalCredits}
          coursesDone={coursesDone}
          atRiskCount={atRiskCount}
          unknownCount={unknownCount}
        />
        <NextActionCard action={nextAction} />
      </section>

      {courseDataError ? (
        <Card role="alert" className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-[family-name:var(--font-bricolage)] text-lg font-semibold text-[var(--acade-text)]">Recent course updates are unavailable</h2>
            <p className="mt-1 text-sm text-[var(--acade-text-muted)]">Your standing is still visible, but this section needs another connection attempt.</p>
          </div>
          <button
            type="button"
            onClick={() => setCourseRefreshKey((key) => key + 1)}
            className="inline-flex min-h-12 items-center gap-2 rounded-[var(--radius-control)] border border-[var(--acade-border)] px-4 text-sm font-semibold text-[var(--acade-text)] hover:bg-[var(--acade-overlay)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]"
          >
            <RefreshCw className="size-4" aria-hidden="true" /> Retry
          </button>
        </Card>
      ) : (
        <RecentResults courses={recentCourses} />
      )}

      <section data-landing-motion="card" aria-label="Academic trend and AI insight" className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.8fr)]">
        <Card>
          <div className="mb-5">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--acade-primary)]">Trajectory</p>
            <h2 className="mt-1 font-[family-name:var(--font-bricolage)] text-[length:var(--text-xl)] font-semibold text-[var(--acade-text)]">Semester GPA and PI</h2>
            <p className="mt-1 text-sm text-[var(--acade-text-muted)]">Compare your official semester GPA with score-sensitive performance.</p>
          </div>
          {hasAcademicData ? (
            <TrendChart semesters={semesterHistory} metric="both" showForecast={false} />
          ) : (
            <div className="flex min-h-64 items-center justify-center rounded-[var(--radius-surface)] border border-dashed border-[var(--acade-border)] bg-[var(--acade-surface)] px-5 text-center text-sm text-[var(--acade-text-muted)]">
              Your trend will appear after the first semester is recorded.
            </div>
          )}
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px dashboard-ai-sweep" aria-hidden="true" />
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="dashboard-ai-icon-glow flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-[var(--acade-primary-dim)]">
                <Image src="/acadegradeailogo.png" alt="" width={26} height={26} className="object-contain" />
              </span>
              <div className="min-w-0">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--acade-gold)]">AcadeMind</p>
                <h2 className="truncate font-[family-name:var(--font-bricolage)] text-lg font-semibold text-[var(--acade-text)]">AI insight</h2>
              </div>
            </div>
            {insightsStale && <span className="rounded-full bg-[var(--acade-warning)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--acade-warning)]">Update ready</span>}
          </div>

          <div className="mt-6 min-h-28" aria-live="polite">
            {aiLoading ? (
              <div aria-label="Loading AI insight" className="space-y-2">
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-5/6" />
                <div className="skeleton h-4 w-3/5" />
              </div>
            ) : aiError ? (
              <div role="alert">
                <p className="text-sm leading-6 text-[var(--acade-text-muted)]">The saved insight could not be loaded.</p>
                <button type="button" onClick={fetchAiSummary} className="mt-3 inline-flex min-h-12 items-center gap-2 rounded-[var(--radius-control)] px-3 text-sm font-semibold text-[var(--acade-primary)] hover:bg-[var(--acade-primary-dim)]">
                  <RefreshCw className="size-4" aria-hidden="true" /> Retry insight
                </button>
              </div>
            ) : (
              <ReplayTypingText text={aiSummary || ''} className="text-sm leading-6 text-[var(--acade-text)]" />
            )}
          </div>

          <div className="mt-5 flex items-center justify-between gap-3 border-t border-[var(--acade-border-subtle)] pt-4">
            <span className="inline-flex items-center gap-1.5 text-xs text-[var(--acade-text-faint)]">
              <Image src="/acadegradeailogo.png" alt="" width={14} height={14} className="size-3.5 object-contain opacity-75" /> Personalized to your record
            </span>
            <Link href="/insights" className="inline-flex min-h-12 shrink-0 items-center gap-1 rounded-[var(--radius-control)] px-3 text-sm font-semibold text-[var(--acade-primary)] hover:bg-[var(--acade-primary-dim)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]">
              Open insights <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </Card>
      </section>

      <AdPlacement placement="dashboard.overview" seed={user?.uid} />
    </div>
    </LandingMotion>
  );
}

function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard" className="space-y-6 pb-10">
      <div className="space-y-3 py-2">
        <div className="skeleton h-4 w-32" />
        <div className="skeleton h-10 w-64 max-w-full" />
        <div className="skeleton h-4 w-full max-w-xl" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(18rem,0.75fr)]">
        <div className="skeleton min-h-[28rem]" />
        <div className="skeleton min-h-72" />
      </div>
      <div className="skeleton h-72" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="skeleton h-96" />
        <div className="skeleton h-72" />
      </div>
    </div>
  );
}
