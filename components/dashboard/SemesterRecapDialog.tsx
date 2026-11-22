'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';
import { serverTimestamp } from 'firebase/firestore';

import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { queryCollection, updateDocument } from '@/lib/firebase/firestore';
import { formatCgpa } from '@/lib/cgpa/academicRules';
import { DiscreetRevealButton, DiscreetScope, DiscreetValue } from '@/lib/discreet';
import { fetchAiEligibility, readPrivacyState, type AiEligibilityView } from '@/lib/consent/requirements';
import type { PlanningCourse } from '@/lib/planning/carryOvers';
import { useGradingScale } from '@/hooks/useGradingScale';
import { buildSemesterRecap, canOfferWrittenAnalysis, shouldShowRecap, type SemesterRecap } from '@/lib/planning/semesterRecap';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type { SemesterWithId } from '@/types/semester';

type RecapSemesterDoc = SemesterWithId & { recapShownAt?: unknown };

const RECAP_PARAM = 'recap';

function readRecapParam(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(RECAP_PARAM);
}

function clearRecapParam() {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has(RECAP_PARAM)) return;
  url.searchParams.delete(RECAP_PARAM);
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

/**
 * C3: opens the recap once, after a semester is completed (/results?recap=<id>).
 * Closing it writes users/{uid}/semesters/{id}.recapShownAt so it never reopens.
 * Semesters must be in chronological order (useSemesters sorts them).
 */
export function SemesterRecapLauncher({ semesters }: { semesters: readonly SemesterWithId[] }) {
  // Read once on the client; without the parameter nothing else runs.
  const [recapId] = useState(readRecapParam);
  return recapId ? <RecapLoader recapId={recapId} semesters={semesters} /> : null;
}

function RecapLoader({ recapId, semesters }: { recapId: string; semesters: readonly SemesterWithId[] }) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { scale } = useGradingScale();
  const { isFeatureDisabled } = usePlatformSettings();
  const [recap, setRecap] = useState<SemesterRecap | null>(null);
  const [eligibility, setEligibility] = useState<AiEligibilityView | null>(null);
  const started = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (started.current || !recapId || !user) return;
    const target = semesters.find((semester) => semester.id === recapId) as RecapSemesterDoc | undefined;
    if (!target) return; // The list may still be catching up with the save.
    started.current = true;
    if (!shouldShowRecap(target)) {
      clearRecapParam();
      return;
    }
    // Runs once per mount; later semester snapshots must not cancel it.
    const cancelled = () => !mounted.current;
    // Courses for every semester (carry-overs look back). A failure just skips the recap.
    void Promise.all(semesters.map(async (semester) => [
      semester.id,
      await queryCollection<PlanningCourse>(`users/${user.uid}/semesters/${semester.id}/courses`),
    ] as const))
      .then((entries) => {
        if (cancelled()) return;
        setRecap(buildSemesterRecap({ semesters, coursesBySemester: Object.fromEntries(entries), semesterId: target.id, scale }));
      })
      .catch((error: unknown) => {
        console.warn('Semester recap unavailable', error);
        clearRecapParam();
      });
    void Promise.resolve()
      .then(() => user.getIdToken())
      .then((token) => fetchAiEligibility(token))
      .then((result) => { if (!cancelled()) setEligibility(result); })
      .catch(() => undefined);
  }, [recapId, semesters, user, scale]);

  const close = () => {
    const shown = recap;
    setRecap(null);
    clearRecapParam();
    if (!shown || !user) return;
    updateDocument(`users/${user.uid}/semesters/${shown.semesterId}`, { recapShownAt: serverTimestamp() })
      .catch((error: unknown) => console.warn('Recap not marked as shown', error));
  };

  if (!recap) return null;
  const showAnalysisLink = canOfferWrittenAnalysis({
    eligibility,
    privacy: readPrivacyState(profile),
    featureDisabled: isFeatureDisabled('ai_insights'),
  });
  return <SemesterRecapDialog recap={recap} showAnalysisLink={showAnalysisLink} onClose={close} />;
}

export function SemesterRecapDialog({ recap, showAnalysisLink, onClose }: {
  recap: SemesterRecap;
  showAnalysisLink: boolean;
  onClose: () => void;
}) {
  const up = recap.delta !== null && recap.delta > 0;
  const down = recap.delta !== null && recap.delta < 0;
  const classChanged = recap.classBefore !== null && recap.classBefore.shortLabel !== recap.classAfter.shortLabel;
  return (
    <Modal open onClose={onClose} title="Semester recap" description={recap.label || undefined}>
      <DiscreetScope>
        <div className="flex flex-col gap-4">
          <div className="flex justify-end empty:hidden">
            <DiscreetRevealButton label="Recap values" className="border border-[var(--acade-border)]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Semester GPA">
              <DiscreetValue label="GPA">{formatCgpa(recap.gpa)}</DiscreetValue>
              {recap.delta !== null && (
                <span className={`ml-2 inline-flex items-center gap-1 text-xs font-semibold ${up ? 'text-[var(--acade-success)]' : down ? 'text-[var(--acade-warning)]' : 'text-[var(--acade-text-muted)]'}`}>
                  {up && <TrendingUp className="size-3.5" aria-hidden="true" />}
                  {down && <TrendingDown className="size-3.5" aria-hidden="true" />}
                  <DiscreetValue label="GPA change">{`${up ? '+' : ''}${recap.delta.toFixed(2)}`}</DiscreetValue>
                </span>
              )}
            </Stat>
            <Stat label="Units earned">{recap.unitsEarned}</Stat>
          </div>

          <ul className="flex flex-col gap-2 text-sm leading-6 text-[var(--acade-text)]">
            {recap.previousGpa === null && <li>Your first graded semester is in your record.</li>}
            {recap.strongest && (
              <li>
                Strongest course: <span className="font-semibold">{recap.strongest.code}</span>
                {recap.strongest.title ? ` (${recap.strongest.title})` : ''}, grade <DiscreetValue label="Grade">{recap.strongest.grade}</DiscreetValue>.
              </li>
            )}
            {classChanged ? (
              <li>
                Your class moved from <DiscreetValue label="Previous class">{recap.classBefore!.label}</DiscreetValue> to{' '}
                <DiscreetValue label="Current class">{recap.classAfter.label}</DiscreetValue>.
              </li>
            ) : (
              <li>Current class: <DiscreetValue label="Current class">{recap.classAfter.label}</DiscreetValue>.</li>
            )}
            {recap.carryOversCleared.length > 0 && (
              <li>Carry-overs cleared: <span className="font-semibold">{recap.carryOversCleared.join(', ')}</span>.</li>
            )}
          </ul>

          <div className="flex flex-col-reverse gap-2 border-t border-[var(--acade-border-subtle)] pt-4 sm:flex-row sm:justify-end">
            {showAnalysisLink && (
              <Link
                href="/insights?tab=analysis"
                onClick={onClose}
                className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-[var(--radius-control)] px-4 text-sm font-semibold text-[var(--acade-primary)] hover:bg-[var(--acade-primary-dim)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]"
              >
                Get a Written Analysis <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            )}
            <Button variant="primary" onClick={onClose}>Done</Button>
          </div>
        </div>
      </DiscreetScope>
    </Modal>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--acade-border-subtle)] bg-[var(--acade-deep)] p-3">
      <p className="text-xs font-medium text-[var(--acade-text-muted)]">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-[length:var(--text-xl)] font-bold tabular-nums text-[var(--acade-text)]">{children}</p>
    </div>
  );
}
