'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, ChevronDown, Trash2, Edit2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '@/hooks/useAuth';
import { useSemesters } from '@/hooks/useSemesters';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { deleteDocument, queryCollection } from '@/lib/firebase/firestore';
import type { SemesterWithId } from '@/types/semester';
import type { CourseInput } from '@/types/course';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';

import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { GradeTable } from '@/components/cgpa/GradeTable';
import { ResultsTour } from '@/components/onboarding/ResultsTour';
import { Modal } from '@/components/ui/Modal';

function SemesterAccordionItem({ semester }: { semester: SemesterWithId }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [courses, setCourses] = useState<CourseInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const { user } = useAuth();
  const shouldReduceMotion = useReducedMotion();

  // Fetch courses only when expanded
  useEffect(() => {
    if (isExpanded && user?.uid && courses.length === 0) {
      setLoading(true);
      queryCollection<CourseInput>(`users/${user.uid}/semesters/${semester.id}/courses`)
        .then(data => setCourses(data))
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [isExpanded, user?.uid, semester.id, courses.length]);

  const handleDelete = async () => {
    if (!user) return;
    try {
      await deleteDocument(`users/${user.uid}/semesters/${semester.id}`);
      toast.success('Semester deleted successfully');
      setIsDeleteModalOpen(false);
    } catch (error) {
      toast.error('Failed to delete semester');
    }
  };

  return (
    <div className="relative bg-[var(--acade-surface)] border border-[var(--acade-border)] rounded-[16px] shadow-[0_4px_20px_rgba(0,0,0,0.2)] mb-4 overflow-hidden transition-all duration-300 hover:border-[var(--acade-primary)]/30 hover:shadow-[0_0_30px_rgba(99,102,241,0.1)] group">
      {/* Header (Clickable) */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 md:p-5 flex items-center justify-between hover:bg-[var(--acade-overlay)] transition-colors text-left"
      >
        <div className="flex items-center gap-3 md:gap-4 flex-wrap">
          <Badge variant="status" className="font-[family-name:var(--font-geist-mono)]">
            {semester.level}L S{semester.semester}
          </Badge>
          <span className="text-[length:var(--text-base)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)]">
            {semester.label}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] font-[family-name:var(--font-geist-mono)] hidden md:inline-block">
              GPA:
            </span>
            <span className="text-[length:var(--text-base)] font-bold text-[var(--acade-primary)] font-[family-name:var(--font-geist-mono)]">
              {semester.gpa.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] font-[family-name:var(--font-geist-mono)] hidden md:inline-block">
              CU:
            </span>
            <span className="text-[length:var(--text-base)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-geist-mono)]">
              {semester.creditLoaded}
            </span>
          </div>
          {!semester.isComplete && (
            <div className="ml-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--acade-warning)]/10 border border-[var(--acade-warning)]/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--acade-warning)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--acade-warning)]"></span>
              </span>
              <span className="text-[10px] font-bold text-[var(--acade-warning)] uppercase tracking-wider">Ongoing</span>
            </div>
          )}
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-[var(--acade-text-muted)]"
        >
          <ChevronDown size={20} />
        </motion.div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="overflow-hidden"
          >
            <div className="p-4 md:p-5 border-t border-[var(--acade-border-subtle)] bg-[var(--acade-deep)]/50">
              <div className="flex justify-end gap-3 mb-4">
                <Button variant="ghost" size="sm" onClick={() => setIsDeleteModalOpen(true)} className="text-[var(--acade-danger)] hover:bg-[var(--acade-danger-dim)] hover:border-transparent">
                  <Trash2 size={16} className="mr-2" /> Delete
                </Button>
                <Link href={`/results/${semester.id}`}>
                  <Button variant="primary" size="sm">
                    <Edit2 size={16} className="mr-2" /> Edit Semester
                  </Button>
                </Link>
              </div>

              {loading ? (
                <div className="h-32 flex items-center justify-center">
                  <div className="size-6 rounded-full border-2 border-[var(--acade-primary)] border-t-transparent animate-spin" />
                </div>
              ) : (
                <GradeTable initialCourses={courses} editable={false} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Semester"
        description="Are you sure you want to delete this semester? This action cannot be undone and will affect your overall CGPA."
      >
        <div className="flex gap-3 justify-end mt-6">
          <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Yes, Delete</Button>
        </div>
      </Modal>
    </div>
  );
}

export default function ResultsListPage() {
  const { semesters, loading } = useSemesters();
  const { isFeatureDisabled } = usePlatformSettings();
  const shouldReduceMotion = useReducedMotion();
  const disableAddSemester = isFeatureDisabled('add_semester');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="size-12 border-4 border-[var(--acade-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <ResultsTour />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[length:var(--text-3xl)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)]">
            My Results
          </h1>
          <p className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] font-[family-name:var(--font-dm-sans)] mt-1">
            Manage your academic records by semester.
          </p>
        </div>
        <Link href={disableAddSemester ? '#' : `/results/new`} onClick={(e) => disableAddSemester && e.preventDefault()}>
          <Button id="tour-new-semester" variant="primary" size="lg" className="w-full md:w-auto" disabled={disableAddSemester} title={disableAddSemester ? "This feature is temporarily under maintenance." : ""}>
            <Plus size={18} className="mr-2" /> New Semester
          </Button>
        </Link>
      </div>

      {semesters.length === 0 ? (
        <motion.div 
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center text-center p-12 bg-[var(--acade-surface)] border border-[var(--acade-border)] rounded-2xl border-dashed"
        >
          <div className="bg-[var(--acade-deep)] p-4 rounded-full mb-4">
            <AlertCircle size={32} className="text-[var(--acade-primary)]" />
          </div>
          <h2 className="text-[length:var(--text-xl)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-bricolage)] mb-2">
            No Results Yet
          </h2>
          <p className="text-[length:var(--text-base)] text-[var(--acade-text-muted)] mb-6 max-w-sm">
            Add your first semester to start tracking your progress and unlocking AI insights.
          </p>
          <Link href={disableAddSemester ? '#' : `/results/new`} onClick={(e) => disableAddSemester && e.preventDefault()}>
            <Button id="tour-new-semester" variant="primary" size="lg" disabled={disableAddSemester} title={disableAddSemester ? "This feature is temporarily under maintenance." : ""}>
              <Plus size={18} className="mr-2" /> Add Semester
            </Button>
          </Link>
        </motion.div>
      ) : (
        <div className="flex flex-col">
          {semesters.map((semester) => (
            <SemesterAccordionItem key={semester.id} semester={semester} />
          ))}
        </div>
      )}
    </div>
  );
}
