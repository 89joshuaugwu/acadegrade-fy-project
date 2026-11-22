'use client';

import { useEffect, useRef, useState } from 'react';
import { serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

import { updateDocument } from '@/lib/firebase/firestore';
import { useGradingScale } from '@/hooks/useGradingScale';
import {
  describeMilestone,
  detectMilestones,
  milestoneUpdate,
  planMilestoneWrites,
  type MilestoneSemester,
} from '@/lib/planning/milestones';

interface UseMilestonesInput {
  uid: string | null | undefined;
  /** users/{uid}.milestones; undefined when the field was never written. */
  stored: Record<string, unknown> | undefined;
  /** Chronological semesters with courses, or null until everything has loaded. */
  semesters: readonly MilestoneSemester[] | null;
  isGraduated: boolean;
  /** False while the profile, semesters or courses are still loading or failed. */
  ready: boolean;
}

/**
 * C1: detects milestones once all inputs have loaded, records new ones with
 * dot-path merges and returns the ones to celebrate. Never runs on partial
 * data, so a slow load can't seed silently and then celebrate a burst.
 */
export function useMilestones({ uid, stored, semesters, isGraduated, ready }: UseMilestonesInput) {
  const [celebrate, setCelebrate] = useState<string[]>([]);
  const written = useRef<Set<string>>(new Set());
  const seeded = useRef(false);
  const { scale } = useGradingScale();

  useEffect(() => {
    if (!uid || !ready || !semesters) return;
    const detected = detectMilestones({ semesters, isGraduated, scale });
    const plan = planMilestoneWrites(detected, stored);
    const record = plan.record.filter((id) => !written.current.has(id));
    const isSeed = stored === undefined;
    if (isSeed && seeded.current && record.length === 0) return;
    const update = milestoneUpdate(record, stored, serverTimestamp());
    if (!update) return;

    record.forEach((id) => written.current.add(id));
    if (isSeed) seeded.current = true;
    const fresh = plan.celebrate.filter((id) => record.includes(id));
    // Fail open: a failed write only means the milestone is offered again next time.
    updateDocument(`users/${uid}`, update)
      .then(() => {
        if (fresh.length === 0) return;
        setCelebrate((previous) => [...previous, ...fresh.filter((id) => !previous.includes(id))]);
        toast.success(fresh.length === 1 ? `New milestone: ${describeMilestone(fresh[0], scale).title}` : `${fresh.length} new milestones`);
      })
      .catch((error: unknown) => {
        record.forEach((id) => written.current.delete(id));
        if (isSeed) seeded.current = false;
        console.warn('Milestones not recorded', error);
      });
  }, [uid, ready, semesters, isGraduated, stored, scale]);

  return { celebrate, dismiss: (id: string) => setCelebrate((previous) => previous.filter((item) => item !== id)) };
}
