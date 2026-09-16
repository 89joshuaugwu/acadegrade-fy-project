'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { ArrowLeft, CalendarRange, Check, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useSemesters } from '@/hooks/useSemesters';
import { queryCollection, setDocument } from '@/lib/firebase/firestore';
import { getAcademicPlan, slotKey } from '@/lib/academic/timeline';
import type { SemesterWithId } from '@/types/semester';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ResultsTour } from '@/components/onboarding/ResultsTour';

export default function NewSemesterPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { semesters, loading: semestersLoading } = useSemesters();
  const [creating, setCreating] = useState(false);
  const plan = useMemo(() => getAcademicPlan(profile, semesters), [profile, semesters]);
  const nextSlot = plan.remainingSlots[0] ?? null;

  const handleCreate = async () => {
    if (!user || !nextSlot || creating) return;
    setCreating(true);
    
    try {
      const collectionPath = `users/${user.uid}/semesters`;
      const latest = await queryCollection<SemesterWithId>(collectionPath);
      const duplicate = latest.some(
        (semester) => slotKey(Number(semester.level), Number(semester.semester)) === nextSlot.key
      );
      if (duplicate) {
        toast('Semester already exists. Your timeline will refresh to the next available slot.');
        return;
      }

      const id = `slot_${nextSlot.level}_${nextSlot.semester}`;
      await setDocument(`${collectionPath}/${id}`, {
        label: nextSlot.label,
        session: nextSlot.session,
        level: nextSlot.level,
        semester: nextSlot.semester,
        gpa: 0,
        pi: 0,
        creditLoaded: 0,
        isComplete: false,
      });

      toast.success('Semester created');
      router.replace(`/results/${id}`);
    } catch (err) {
      toast.error('Failed to create semester');
    } finally {
      setCreating(false);
    }
  };

  const loading = profileLoading || semestersLoading;

  return (
    <div className="max-w-2xl mx-auto pb-10">
      <ResultsTour />
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="px-2">
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-[length:var(--text-2xl)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)]">
          Add New Semester
        </h1>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card variant="default" padding="lg">
          {loading ? (
            <p className="text-sm text-[var(--acade-text-muted)]">Checking your academic timeline…</p>
          ) : !plan.slots.length ? (
            <div className="text-center">
              <CalendarRange className="mx-auto size-8 text-[var(--acade-warning)]" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-bold text-[var(--acade-text)]">Academic timeline needed</h2>
              <p className="mt-2 text-sm text-[var(--acade-text-muted)]">Add a valid entry session and programme duration in Settings before creating semesters.</p>
            </div>
          ) : nextSlot ? (
            <div className="flex flex-col gap-6">
              <div className="flex items-start gap-4 rounded-xl border border-[var(--acade-primary)] bg-[var(--acade-primary)]/5 p-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--acade-primary)]/10 text-[var(--acade-primary)]">
                  <Check className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--acade-text-muted)]">Next available semester</p>
                  <h2 className="mt-1 text-lg font-bold text-[var(--acade-text)]">{nextSlot.level}L {nextSlot.semester === 1 ? 'First' : 'Second'} Semester</h2>
                  <p className="mt-1 text-sm text-[var(--acade-text-muted)]">{nextSlot.session} · {plan.duration}-year programme ending {plan.graduationSession}</p>
                </div>
              </div>

              <p className="text-sm leading-6 text-[var(--acade-text-muted)]">
                AcadeGrade suggests the earliest valid semester missing from your record and prevents an existing level and semester from being added twice.
              </p>

              <Button id="tour-create-semester" variant="primary" size="lg" onClick={handleCreate} disabled={creating}>
                {creating ? 'Creating…' : `Create ${nextSlot.level}L ${nextSlot.semester === 1 ? 'First' : 'Second'} Semester`}
              </Button>
            </div>
          ) : (
            <div className="text-center">
              <GraduationCap className="mx-auto size-9 text-[var(--acade-success)]" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-bold text-[var(--acade-text)]">Your full timeline is ready</h2>
              <p className="mt-2 text-sm text-[var(--acade-text-muted)]">All {plan.slots.length} semester slots through {plan.graduationSession} already exist.</p>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
