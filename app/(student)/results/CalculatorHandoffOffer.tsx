'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calculator } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/Button';
import { getAcademicPlan } from '@/lib/academic/timeline';
import { saveDraft } from '@/lib/drafts';
import {
  clearCalculatorHandoff,
  handoffOfferLabel,
  handoffToCourseInputs,
  readCalculatorHandoff,
  type CalculatorHandoff,
} from '@/lib/handoff/calculator';
import type { SemesterWithId } from '@/types/semester';
import { semesterForHandoff } from './create-semester';

/**
 * Offers the rows a visitor entered in the public calculator before signing
 * up. Renders nothing when there are none. Accepting creates (or reuses) the
 * first empty semester and opens it with the rows as an unsaved draft to review.
 */
export function CalculatorHandoffOffer({ semesters }: { semesters: SemesterWithId[] }) {
  // Student pages render only on the client, after sign-in.
  const [handoff, setHandoff] = useState<CalculatorHandoff | null>(() => (typeof window === 'undefined' ? null : readCalculatorHandoff()));
  if (!handoff) return null;
  return <HandoffCard handoff={handoff} semesters={semesters} onDone={() => setHandoff(null)} />;
}

function HandoffCard({ handoff, semesters, onDone }: { handoff: CalculatorHandoff; semesters: SemesterWithId[]; onDone: () => void }) {
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextSlot = useMemo(() => getAcademicPlan(profile, semesters).remainingSlots[0] ?? null, [profile, semesters]);
  const count = handoff.courses.length;

  const accept = async () => {
    if (!user || busy) return;
    setBusy(true);
    setError(null);
    try {
      const target = await semesterForHandoff(user.uid, semesters, nextSlot);
      if ('error' in target) {
        setError(target.error);
        return;
      }
      // The rows stay unsaved on this device until the student reviews and saves them.
      saveDraft(user.uid, target.id, handoffToCourseInputs(handoff));
      clearCalculatorHandoff();
      onDone();
      toast.success(count === 1 ? 'Course added for review' : `${count} courses added for review`);
      router.push(`/results/${target.id}?from=calculator`);
    } catch {
      setError('The semester could not be created. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const dismiss = () => {
    clearCalculatorHandoff();
    onDone();
  };

  return (
    <section
      aria-labelledby="calculator-handoff-title"
      className="mb-6 flex flex-col gap-4 rounded-[var(--radius-surface)] border border-[var(--acade-primary)]/30 bg-[var(--acade-primary-dim)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
    >
      <div className="flex min-w-0 items-start gap-3">
        <Calculator className="mt-0.5 size-5 shrink-0 text-[var(--acade-primary-glow)]" aria-hidden="true" />
        <div className="min-w-0">
          <h2 id="calculator-handoff-title" className="text-sm font-semibold text-[var(--acade-text)]">
            {count === 1 ? '1 course from the calculator' : `${count} courses from the calculator`}
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--acade-text-muted)]">
            {handoff.courses.map((course) => course.code || 'Untitled').join(', ')}. You will add titles and check scores before anything is saved.
          </p>
          {error && <p role="alert" className="mt-2 text-sm font-medium text-[var(--acade-danger)]">{error}</p>}
        </div>
      </div>
      <div className="flex shrink-0 flex-col-reverse gap-2 sm:flex-row">
        <Button variant="ghost" size="sm" onClick={dismiss} disabled={busy}>Dismiss</Button>
        <Button variant="primary" size="sm" onClick={() => void accept()} loading={busy}>{handoffOfferLabel(count)}</Button>
      </div>
    </section>
  );
}
