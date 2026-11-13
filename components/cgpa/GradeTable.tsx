'use client';

import { useState, useEffect, useId, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, CheckCircle2, History } from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

import { MAX_CA_SCORE, MAX_EXAM_SCORE } from '@/lib/utils/constants';
import { computeSemesterGPA, formatCgpa, gradeFromScore } from '@/lib/cgpa/academicRules';
import { DiscreetRevealButton, DiscreetScope, DiscreetValue, useDiscreetMode } from '@/lib/discreet';
import { DRAFT_DEBOUNCE_MS, clearDraft, draftDiffers, loadDraft, saveDraft, type SemesterDraft } from '@/lib/drafts/semester-drafts';
import type { CourseInput, Grade } from '@/types/course';
import { Badge, getGradeBadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { findByCode, findByTitle, type CatalogSuggestion } from './courseCatalog';
import { ExamGuidance } from './ExamGuidance';

interface LocalCourse extends CourseInput {
  localId: string;
}

interface GradeTableProps {
  initialCourses?: CourseInput[];
  editable?: boolean;
  onSave?: (courses: CourseInput[]) => Promise<void>;
  isSaving?: boolean;
  /** Course catalogue suggestions (A10). Fills code, title and units only. */
  catalog?: readonly CatalogSuggestion[];
  /** Enables unsaved-entry drafts on this device (D3). */
  draft?: { uid: string; semesterId: string };
  /** Apply a stored draft straight away for review (rows handed over from the calculator). */
  restoreDraftOnMount?: boolean;
}

const newId = () => Math.random().toString(36).slice(2, 11);
const withIds = (courses: CourseInput[]): LocalCourse[] => courses.map((course) => ({ ...course, localId: newId() }));
const stripIds = (courses: LocalCourse[]): CourseInput[] => courses.map((course) => {
  const copy: CourseInput = { ...course };
  delete copy.localId;
  return copy;
});

function computeRow(ca: number | null, exam: number | null, isAR?: boolean) {
  if (isAR) return { totalScore: null, grade: 'AR' as const, gradePoint: 0, piPoint: 0 };
  if (ca !== null && exam !== null) {
    const totalScore = ca + exam;
    const { grade, gradePoint } = gradeFromScore(totalScore);
    return { totalScore, grade, gradePoint, piPoint: (totalScore / 100) * 5 };
  }
  return { totalScore: null, grade: null, gradePoint: 0, piPoint: 0 };
}

function draftTimeLabel(savedAt: number) {
  const minutes = Math.round((Date.now() - savedAt) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const date = new Date(savedAt);
  return date.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

const inputBase = 'min-h-11 rounded-md border border-[var(--acade-border)] bg-[var(--acade-deep)] text-[var(--acade-text)] focus:border-[var(--acade-primary)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50';
const headerCell = 'text-xs font-semibold text-[var(--acade-text-muted)]';

export function GradeTable({ initialCourses = [], editable = false, onSave, isSaving = false, catalog, draft, restoreDraftOnMount = false }: GradeTableProps) {
  const shouldReduceMotion = useReducedMotion();
  const { enabled: discreet } = useDiscreetMode();
  const previousInitialCourses = useRef(initialCourses);
  const listId = useId();
  const titleListId = useId();
  const hasCatalog = editable && !!catalog && catalog.length > 0;

  // Rows handed over from the calculator are applied at once (still unsaved) for review.
  const [handedOver] = useState<SemesterDraft | null>(() => (
    editable && draft && restoreDraftOnMount ? loadDraft(draft.uid, draft.semesterId) : null
  ));
  const [courses, setCourses] = useState<LocalCourse[]>(() => withIds(handedOver?.courses.length ? handedOver.courses : initialCourses));
  const [shakeId, setShakeId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(() => !!handedOver);
  const [pendingDraft, setPendingDraft] = useState<SemesterDraft | null>(() => {
    if (!editable || !draft || handedOver) return null;
    const stored = loadDraft(draft.uid, draft.semesterId);
    return stored && draftDiffers(stored.courses, initialCourses) ? stored : null;
  });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const draftUid = draft?.uid;
  const draftSemester = draft?.semesterId;

  // A stored draft identical to the saved record is stale: remove it.
  useEffect(() => {
    if (!editable || !draftUid || !draftSemester || pendingDraft) return;
    const stored = loadDraft(draftUid, draftSemester);
    if (stored && !draftDiffers(stored.courses, initialCourses)) clearDraft(draftUid, draftSemester);
    // Only on mount for this semester.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftUid, draftSemester]);

  // Sync courses if initialCourses changes (e.g. from an import). Imported rows are unsaved.
  useEffect(() => {
    if (previousInitialCourses.current === initialCourses) return;
    previousInitialCourses.current = initialCourses;
    if (initialCourses.length > 0) {
      setCourses(withIds(initialCourses));
      setDirty(true);
    }
  }, [initialCourses]);

  // Auto-add an empty row if empty and editable
  useEffect(() => {
    if (courses.length === 0 && editable) {
      setCourses([{ localId: newId(), code: '', title: '', units: 3, caScore: null, examScore: null }]);
    }
    // Only when editing starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editable]);

  // D3: autosave unsaved rows after a pause. Drafts stay on this device.
  useEffect(() => {
    if (!dirty || !draftUid || !draftSemester || pendingDraft) return;
    saveTimer.current = setTimeout(() => {
      saveDraft(draftUid, draftSemester, stripIds(courses).filter((course) => (
        course.code.trim() || course.title.trim() || course.caScore !== null || course.examScore !== null || course.grade
      )));
      saveTimer.current = null;
    }, DRAFT_DEBOUNCE_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = null;
    };
  }, [courses, dirty, draftSemester, draftUid, pendingDraft]);

  const triggerShake = (id: string) => {
    setShakeId(id);
    setTimeout(() => setShakeId(null), 500);
  };

  const handleAddRow = () => {
    setDirty(true);
    setCourses((previous) => [...previous, { localId: newId(), code: '', title: '', units: 3, caScore: null, examScore: null }]);
  };

  const handleRemoveRow = (id: string) => {
    setDirty(true);
    setCourses((previous) => previous.filter((course) => course.localId !== id));
  };

  const updateCourse = (id: string, field: keyof LocalCourse, value: unknown) => {
    setDirty(true);
    let shake = false;
    setCourses((previous) => previous.map((course) => {
      if (course.localId !== id) return course;
      const updated = { ...course, [field]: value } as LocalCourse;
      if ((field === 'caScore' || field === 'examScore') && value !== null) updated.grade = undefined;

      if (field === 'caScore' && typeof value === 'number' && value > MAX_CA_SCORE) { updated.caScore = MAX_CA_SCORE; shake = true; }
      if (field === 'examScore' && typeof value === 'number' && value > MAX_EXAM_SCORE) { updated.examScore = MAX_EXAM_SCORE; shake = true; }
      if (field === 'units' && typeof value === 'number') {
        if (value < 1) updated.units = 1;
        if (value > 6) updated.units = 6;
      }

      // A10: a catalogue match fills code, title and units. Scores are never touched.
      if (catalog && field === 'code' && typeof value === 'string') {
        const match = findByCode(catalog, value);
        if (match) {
          updated.code = match.code;
          if (!course.title.trim()) {
            updated.title = match.title;
            updated.units = match.units;
          }
        }
      }
      if (catalog && field === 'title' && typeof value === 'string' && !course.code.trim()) {
        const match = findByTitle(catalog, value);
        if (match) {
          updated.code = match.code;
          updated.title = match.title;
          updated.units = match.units;
        }
      }
      return updated;
    }));
    if (shake) triggerShake(id);
  };

  const toggleAwaitingResult = (id: string) => {
    setDirty(true);
    setCourses((previous) => previous.map((course) => {
      if (course.localId !== id) return course;
      const isAR = !course.isAR;
      return { ...course, isAR, grade: undefined, examScore: isAR ? null : course.examScore };
    }));
  };

  const summary = useMemo(() => {
    // Only rows with a grade count; awaiting-result and unscored rows are left out.
    const graded = courses.flatMap((course) => {
      const { grade, gradePoint, piPoint } = computeRow(course.caScore, course.examScore, course.isAR);
      return grade && grade !== 'AR' ? [{ units: course.units, grade: grade as Grade, gradePoint, piPoint }] : [];
    });
    const result = computeSemesterGPA(graded);
    return { totalUnits: result.creditLoaded, gpa: result.gpa, pi: result.pi, gradeCount: result.gradeDistribution };
  }, [courses]);

  const handleSaveClick = async () => {
    if (!onSave) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    await onSave(stripIds(courses).filter((course) => course.code.trim() !== ''));
  };

  const restoreDraft = () => {
    if (!pendingDraft) return;
    const restored = pendingDraft.courses.length ? pendingDraft.courses : [{ code: '', title: '', units: 3, caScore: null, examScore: null }];
    // Keep row identities by position so rows update in place instead of animating out and in.
    setCourses((previous) => restored.map((course, index) => ({ ...course, localId: previous[index]?.localId ?? newId() })));
    setPendingDraft(null);
    setDirty(true);
  };

  const discardDraft = () => {
    if (draftUid && draftSemester) clearDraft(draftUid, draftSemester);
    setPendingDraft(null);
  };

  const courseName = (course: LocalCourse, index: number) => course.code || `Course ${index + 1}`;
  const showGuidance = (course: LocalCourse) => !!course.isAR && typeof course.caScore === 'number';

  const scoreInput = (course: LocalCourse, index: number, field: 'caScore' | 'examScore', className: string) => {
    const max = field === 'caScore' ? MAX_CA_SCORE : MAX_EXAM_SCORE;
    const label = field === 'caScore' ? `Course ${index + 1} CA score out of 30` : `Course ${index + 1} exam score out of 70`;
    const value = course[field];
    return (
      <input
        aria-label={label}
        type="number"
        value={value === null ? '' : value}
        onChange={(event) => updateCourse(course.localId, field, event.target.value ? Number(event.target.value) : null)}
        min="0"
        max={max}
        step="any"
        inputMode="decimal"
        placeholder="–"
        disabled={field === 'examScore' && course.isAR}
        title={field === 'examScore' && course.isAR ? 'Awaiting result: add the exam score when it is released' : undefined}
        className={className}
      />
    );
  };

  const awaitingToggle = (course: LocalCourse, index: number, className?: string) => (
    <label className={`flex min-h-11 cursor-pointer items-center gap-2 text-xs font-medium text-[var(--acade-text-muted)] ${className ?? ''}`}>
      <input
        type="checkbox"
        aria-label={`Course ${index + 1} awaiting result`}
        checked={!!course.isAR}
        onChange={() => toggleAwaitingResult(course.localId)}
        className="size-4 shrink-0 accent-[var(--acade-primary)]"
      />
      Awaiting result
    </label>
  );

  const gradeDisplay = (course: LocalCourse, grade: string | null, compact: boolean) => {
    if (course.isAR) return <Badge variant="ongoing">AR</Badge>;
    if (!grade && course.grade) {
      return (
        <span title="Grade from the calculator. Enter CA and exam scores to calculate it here." className="inline-flex items-center gap-1 text-xs text-[var(--acade-text-muted)]">
          <span aria-hidden="true" className="rounded-full border border-dashed border-[var(--acade-border)] px-2 py-0.5 font-semibold">{course.grade}?</span>
          <span className="sr-only">Calculator grade {course.grade}: enter scores</span>
        </span>
      );
    }
    if (!grade) return <span className="text-[var(--acade-text-faint)]">—</span>;
    return (
      <DiscreetValue label="Grade">
        {compact ? <span className="text-sm font-bold text-[var(--acade-text)]">{grade}</span> : <Badge variant={getGradeBadgeVariant(grade)}>{grade}</Badge>}
      </DiscreetValue>
    );
  };

  const readOnlyScore = (value: number | null) => (
    value === null || value === undefined
      ? <span className="text-sm text-[var(--acade-text-faint)]">—</span>
      : <DiscreetValue label="Score"><span className="text-sm text-[var(--acade-text-muted)]">{value}</span></DiscreetValue>
  );

  return (
    <DiscreetScope>
    <div className="flex flex-col gap-4">
      {pendingDraft && (
        <section
          role="region"
          aria-label="Restore unsaved changes?"
          className="flex flex-col gap-3 rounded-[var(--radius-surface)] border border-[var(--acade-gold)]/35 bg-[var(--acade-gold-dim)] p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 items-start gap-3">
            <History className="mt-0.5 size-5 shrink-0 text-[var(--acade-gold)]" aria-hidden="true" />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-[var(--acade-text)]">Restore unsaved changes?</h2>
              <p className="mt-0.5 text-sm leading-6 text-[var(--acade-text-muted)]">
                {pendingDraft.courses.length} {pendingDraft.courses.length === 1 ? 'course' : 'courses'} from {draftTimeLabel(pendingDraft.savedAt)} were not saved. They are kept on this device only.
              </p>
            </div>
          </div>
          <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
            <Button variant="ghost" size="sm" onClick={discardDraft}>Discard</Button>
            <Button variant="primary" size="sm" onClick={restoreDraft}>Restore</Button>
          </div>
        </section>
      )}

      {discreet && (
        <div className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] bg-[var(--acade-deep)] px-3 py-1">
          <p className="text-xs text-[var(--acade-text-muted)]">Discreet mode is on. Grades and GPA are hidden.</p>
          <DiscreetRevealButton label="Grades" />
        </div>
      )}

      {hasCatalog && (
        <>
          <datalist id={listId}>
            {catalog!.map((course) => <option key={course.code} value={course.code} label={`${course.title} · ${course.units} units`} />)}
          </datalist>
          <datalist id={titleListId}>
            {catalog!.map((course) => <option key={course.code} value={course.title} label={`${course.code} · ${course.units} units`} />)}
          </datalist>
        </>
      )}

      <section
        role="region"
        aria-label="Mobile course editor"
        aria-describedby="mobile-course-editor-help"
        tabIndex={0}
        className="w-full overflow-x-auto overscroll-x-contain rounded-xl border border-[var(--acade-border)] custom-scrollbar focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)] md:hidden"
      >
        <p id="mobile-course-editor-help" className="sticky left-0 z-30 w-[9.25rem] border-b border-r border-[var(--acade-border)] bg-[var(--acade-deep)] px-3 py-2 text-xs leading-5 text-[var(--acade-text-muted)] shadow-[8px_0_16px_-14px_rgba(0,0,0,0.9)]">
          Swipe sideways to edit every result field.
        </p>
        <table aria-label={editable ? 'Editable course results' : 'Course results'} className="w-[690px] table-fixed border-collapse text-left">
          <colgroup>
            <col className="w-[9.25rem]" />
            <col className="w-[4.5rem]" />
            <col className="w-[4.75rem]" />
            <col className="w-[4.75rem]" />
            <col className="w-[4.25rem]" />
            <col className="w-[4.5rem]" />
            <col className="w-[3.75rem]" />
            <col className="w-[4.25rem]" />
          </colgroup>
          <thead>
            <tr className={`border-b border-[var(--acade-border)] bg-[var(--acade-deep)] ${headerCell}`}>
              <th scope="col" className="sticky left-0 z-30 border-r border-[var(--acade-border)] bg-[var(--acade-deep)] px-3 py-2 shadow-[8px_0_16px_-14px_rgba(0,0,0,0.9)]">Course</th>
              <th scope="col" className="px-2 py-2 text-center">Units</th>
              <th scope="col" className="px-2 py-2 text-center">CA /30</th>
              <th scope="col" className="px-2 py-2 text-center">Exam /70</th>
              <th scope="col" className="px-2 py-2 text-center">Total</th>
              <th scope="col" className="px-2 py-2 text-center">Grade</th>
              <th scope="col" className="px-2 py-2 text-center">GP</th>
              <th scope="col" className="px-2 py-2 text-center">PI</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {courses.flatMap((course, idx) => {
                const { totalScore, grade, gradePoint, piPoint } = computeRow(course.caScore, course.examScore, course.isAR);
                const name = courseName(course, idx);
                const rows = [
                  <motion.tr
                    key={course.localId}
                    initial={shouldReduceMotion ? {} : { opacity: 0, y: -6 }}
                    animate={shakeId === course.localId ? { x: [-5, 5, -5, 5, 0], transition: { duration: 0.4 } } : { opacity: 1, y: 0, x: 0 }}
                    exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
                    className={showGuidance(course) ? '' : 'border-b border-[var(--acade-border-subtle)] last:border-b-0'}
                  >
                    <td aria-label={`Course ${idx + 1}: ${course.code || `course ${idx + 1}`}`} className="sticky left-0 z-20 overflow-hidden border-r border-[var(--acade-border)] bg-[var(--acade-surface)] p-2 align-top shadow-[8px_0_16px_-14px_rgba(0,0,0,0.9)]">
                      {editable ? (
                        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_40px] gap-1.5">
                          <input
                            aria-label={`Course ${idx + 1} code`}
                            type="text"
                            list={hasCatalog ? listId : undefined}
                            autoComplete="off"
                            value={course.code}
                            onChange={(event) => updateCourse(course.localId, 'code', event.target.value.toUpperCase())}
                            placeholder="CSC 401"
                            className={`${inputBase} min-w-0 max-w-full px-2 text-base font-bold uppercase`}
                          />
                          <button type="button" onClick={() => handleRemoveRow(course.localId)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-[var(--acade-danger)]/25 text-[var(--acade-danger)] transition-colors hover:bg-[var(--acade-danger-dim)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-danger)]" aria-label={`Remove ${course.code || `course ${idx + 1}`}`}>
                            <Trash2 size={17} aria-hidden="true" />
                          </button>
                          <input
                            aria-label={`Course ${idx + 1} title`}
                            type="text"
                            list={hasCatalog ? titleListId : undefined}
                            autoComplete="off"
                            value={course.title}
                            onChange={(event) => updateCourse(course.localId, 'title', event.target.value)}
                            placeholder="Course title"
                            className={`${inputBase} col-span-2 min-w-0 max-w-full px-2 text-base`}
                          />
                          {awaitingToggle(course, idx, 'col-span-2')}
                        </div>
                      ) : (
                        <div className="min-w-0 py-1">
                          <p className="truncate text-sm font-bold text-[var(--acade-text)]">{course.code || 'Untitled course'}</p>
                          <p className="mt-1 line-clamp-2 text-xs leading-4 text-[var(--acade-text-muted)]">{course.title}</p>
                        </div>
                      )}
                    </td>
                    <td className="p-2 text-center align-middle">
                      {editable ? <input aria-label={`Course ${idx + 1} units`} type="number" value={course.units || ''} onChange={(event) => updateCourse(course.localId, 'units', parseInt(event.target.value) || 0)} min="1" max="6" inputMode="numeric" className={`${inputBase} w-full px-1 text-center font-[family-name:var(--font-geist-mono)] text-base`} /> : <span className="text-sm text-[var(--acade-text)]">{course.units}</span>}
                    </td>
                    <td className="p-2 text-center align-middle">
                      {editable ? scoreInput(course, idx, 'caScore', `${inputBase} w-full px-1 text-center font-[family-name:var(--font-geist-mono)] text-base`) : readOnlyScore(course.caScore)}
                    </td>
                    <td className="p-2 text-center align-middle">
                      {editable ? scoreInput(course, idx, 'examScore', `${inputBase} w-full px-1 text-center font-[family-name:var(--font-geist-mono)] text-base`) : readOnlyScore(course.examScore)}
                    </td>
                    <td className="px-2 py-3 text-center align-middle font-[family-name:var(--font-geist-mono)] text-sm font-bold text-[var(--acade-text)]">
                      {totalScore === null ? '—' : <DiscreetValue label="Total">{totalScore}</DiscreetValue>}
                    </td>
                    <td className="p-2 text-center align-middle">{gradeDisplay(course, grade, true)}</td>
                    <td className="px-2 py-3 text-center align-middle font-[family-name:var(--font-geist-mono)] text-sm font-bold text-[var(--acade-text-muted)]">
                      {!grade || grade === 'AR' ? '—' : <DiscreetValue label="Grade point">{gradePoint.toFixed(1)}</DiscreetValue>}
                    </td>
                    <td className="px-2 py-3 text-center align-middle font-[family-name:var(--font-geist-mono)] text-sm font-bold text-[var(--acade-gold)]">
                      {!grade || grade === 'AR' ? '—' : <DiscreetValue label="PI">{piPoint.toFixed(2)}</DiscreetValue>}
                    </td>
                  </motion.tr>,
                ];
                if (showGuidance(course)) {
                  rows.push(
                    <motion.tr key={`${course.localId}-guidance`} initial={false} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="border-b border-[var(--acade-border-subtle)]">
                      <td colSpan={8} className="p-0 pb-2">
                        <div className="sticky left-0 w-[calc(100vw-2.5rem)] max-w-[690px] px-2">
                          <ExamGuidance courseName={name} caScore={course.caScore as number} />
                        </div>
                      </td>
                    </motion.tr>
                  );
                }
                return rows;
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </section>

      <div
        role="region"
        aria-label="Desktop course editor"
        className="hidden w-full overflow-x-auto pb-4 custom-scrollbar md:block"
      >
        <table className="w-full min-w-[800px] border-collapse text-left">
          <thead>
            <tr className={`border-b border-[var(--acade-border)] ${headerCell}`}>
              <th className="w-10 p-3">#</th>
              <th className="w-32 p-3">Code</th>
              <th className="p-3">Title</th>
              <th className="w-20 p-3 text-center">Units</th>
              <th className="w-24 p-3 text-center">CA /30</th>
              <th className="w-24 p-3 text-center">Exam /70</th>
              <th className="w-20 p-3 text-center">Total</th>
              <th className="w-20 p-3 text-center">Grade</th>
              <th className="w-16 p-3 text-center">GP</th>
              <th className="w-16 p-3 text-center">PI</th>
              {editable && <th className="w-16 p-3"><span className="sr-only">Actions</span></th>}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {courses.flatMap((course, idx) => {
                const { totalScore, grade, gradePoint, piPoint } = computeRow(course.caScore, course.examScore, course.isAR);
                const isShaking = shakeId === course.localId;
                const name = courseName(course, idx);
                const rows = [
                  <motion.tr
                    key={course.localId}
                    initial={shouldReduceMotion ? {} : { opacity: 0, y: -10 }}
                    animate={isShaking ? { x: [-5, 5, -5, 5, 0], transition: { duration: 0.4 } } : { opacity: 1, y: 0, x: 0 }}
                    exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className={`group transition-colors duration-200 hover:bg-[var(--acade-primary)]/5 ${showGuidance(course) ? '' : 'border-b border-[var(--acade-border-subtle)]'}`}
                  >
                    <td className="p-3 align-top font-[family-name:var(--font-geist-mono)] text-[length:var(--text-sm)] text-[var(--acade-text-faint)]">
                      <span className="inline-flex min-h-11 items-center">{idx + 1}</span>
                    </td>

                    <td className="p-2 align-top">
                      {editable ? (
                        <input
                          aria-label={`Course ${idx + 1} code`}
                          type="text"
                          list={hasCatalog ? listId : undefined}
                          autoComplete="off"
                          value={course.code}
                          onChange={(event) => updateCourse(course.localId, 'code', event.target.value.toUpperCase())}
                          placeholder="CSC 401"
                          className={`${inputBase} w-full px-2 py-1.5 font-[family-name:var(--font-dm-sans)] text-[length:var(--text-sm)] font-bold uppercase`}
                        />
                      ) : (
                        <span className="font-[family-name:var(--font-dm-sans)] font-bold text-[var(--acade-text)]">{course.code}</span>
                      )}
                    </td>

                    <td className="p-2 align-top">
                      {editable ? (
                        <>
                          <input
                            aria-label={`Course ${idx + 1} title`}
                            type="text"
                            list={hasCatalog ? titleListId : undefined}
                            autoComplete="off"
                            value={course.title}
                            onChange={(event) => updateCourse(course.localId, 'title', event.target.value)}
                            placeholder="Software Engineering"
                            className={`${inputBase} w-full px-2 py-1.5 font-[family-name:var(--font-dm-sans)] text-[length:var(--text-sm)]`}
                          />
                          {awaitingToggle(course, idx)}
                        </>
                      ) : (
                        <span className="line-clamp-1 text-[length:var(--text-sm)] text-[var(--acade-text-muted)]">{course.title}</span>
                      )}
                    </td>

                    <td className="p-2 text-center align-top">
                      {editable ? (
                        <input
                          aria-label={`Course ${idx + 1} units`}
                          type="number"
                          value={course.units || ''}
                          onChange={(event) => updateCourse(course.localId, 'units', parseInt(event.target.value) || 0)}
                          min="1"
                          max="6"
                          className={`${inputBase} w-full px-2 py-1.5 text-center font-[family-name:var(--font-geist-mono)] text-[length:var(--text-sm)]`}
                        />
                      ) : (
                        <span className="font-[family-name:var(--font-geist-mono)] text-[length:var(--text-sm)] text-[var(--acade-text)]">{course.units}</span>
                      )}
                    </td>

                    <td className="p-2 text-center align-top">
                      {editable ? scoreInput(course, idx, 'caScore', `${inputBase} w-full px-2 py-1.5 text-center font-[family-name:var(--font-geist-mono)] text-[length:var(--text-sm)]`) : readOnlyScore(course.caScore)}
                    </td>

                    <td className="p-2 text-center align-top">
                      {editable ? scoreInput(course, idx, 'examScore', `${inputBase} w-full px-2 py-1.5 text-center font-[family-name:var(--font-geist-mono)] text-[length:var(--text-sm)]`) : readOnlyScore(course.examScore)}
                    </td>

                    <td className="p-3 text-center align-top">
                      <span className="inline-flex min-h-11 items-center font-[family-name:var(--font-geist-mono)] text-[length:var(--text-base)] font-bold text-[var(--acade-text)]">
                        {totalScore === null ? '—' : <DiscreetValue label="Total">{totalScore}</DiscreetValue>}
                      </span>
                    </td>

                    <td className="p-3 text-center align-top">
                      <span className="inline-flex min-h-11 items-center">{gradeDisplay(course, grade, false)}</span>
                    </td>

                    <td className="p-3 text-center align-top">
                      <span className="inline-flex min-h-11 items-center font-[family-name:var(--font-geist-mono)] text-[length:var(--text-sm)] font-bold text-[var(--acade-text-muted)]">
                        {!grade || grade === 'AR' ? '—' : <DiscreetValue label="Grade point">{gradePoint.toFixed(1)}</DiscreetValue>}
                      </span>
                    </td>

                    <td className="p-3 text-center align-top">
                      <span className="inline-flex min-h-11 items-center font-[family-name:var(--font-geist-mono)] text-[length:var(--text-sm)] font-bold text-[var(--acade-gold)]">
                        {!grade || grade === 'AR' ? '—' : <DiscreetValue label="PI">{piPoint.toFixed(2)}</DiscreetValue>}
                      </span>
                    </td>

                    {editable && (
                      <td className="p-3 text-center align-top">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(course.localId)}
                          className="inline-flex size-11 items-center justify-center rounded-lg text-[var(--acade-danger)] opacity-0 transition-all hover:bg-[var(--acade-danger-dim)] focus:opacity-100 group-hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-danger)]"
                          aria-label={`Remove ${course.code || `course ${idx + 1}`}`}
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </td>
                    )}
                  </motion.tr>,
                ];
                if (showGuidance(course)) {
                  rows.push(
                    <motion.tr key={`${course.localId}-guidance`} initial={false} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="border-b border-[var(--acade-border-subtle)]">
                      <td />
                      <td colSpan={editable ? 10 : 9} className="px-2 pb-3">
                        <ExamGuidance courseName={name} caScore={course.caScore as number} />
                      </td>
                    </motion.tr>
                  );
                }
                return rows;
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {editable && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleAddRow}
            className="flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-[var(--acade-border)] px-4 py-2 text-[length:var(--text-sm)] font-medium text-[var(--acade-text-muted)] transition-colors hover:border-[var(--acade-primary)] hover:text-[var(--acade-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]"
          >
            <Plus size={16} aria-hidden="true" /> Add Course
          </button>
        </div>
      )}

      {/* SUMMARY ROW */}
      <div className="flex flex-col items-stretch justify-between gap-6 rounded-xl border border-[var(--acade-border)] bg-[var(--acade-deep)] p-4 md:flex-row md:items-center md:p-6">
        <dl className="flex w-full gap-8 md:w-auto">
          <div className="flex flex-col">
            <dt className="mb-1 text-xs font-medium text-[var(--acade-text-muted)]">GPA</dt>
            <dd data-testid="grade-table-gpa" className="font-[family-name:var(--font-geist-mono)] text-[length:var(--text-2xl)] font-bold tabular-nums text-[var(--acade-primary)]">
              <DiscreetValue label="GPA">{formatCgpa(summary.gpa)}</DiscreetValue>
            </dd>
          </div>
          <div className="flex flex-col">
            <dt className="mb-1 text-xs font-medium text-[var(--acade-text-muted)]">PI</dt>
            <dd className="font-[family-name:var(--font-geist-mono)] text-[length:var(--text-2xl)] font-bold tabular-nums text-[var(--acade-gold)]">
              <DiscreetValue label="PI">{summary.pi.toFixed(2)}</DiscreetValue>
            </dd>
          </div>
          <div className="flex flex-col">
            <dt className="mb-1 text-xs font-medium text-[var(--acade-text-muted)]">Graded units</dt>
            <dd data-testid="grade-table-units" className="font-[family-name:var(--font-geist-mono)] text-[length:var(--text-2xl)] font-bold tabular-nums text-[var(--acade-text)]">
              {summary.totalUnits}
            </dd>
          </div>
        </dl>

        {/* Mini Grade Distribution Bar */}
        <DiscreetValue label="Grade distribution" block className="flex w-full max-w-sm flex-1 flex-col gap-2">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-xs font-medium text-[var(--acade-text-muted)]">
              {(['A', 'B', 'C', 'D', 'E', 'F'] as Grade[]).map((letter) => <span key={letter}>{letter}: {summary.gradeCount[letter]}</span>)}
            </div>
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-[var(--acade-surface)]" aria-hidden="true">
              {(['A', 'B', 'C', 'D', 'E', 'F'] as Grade[]).map((letter) => {
                const gradedCount = Object.values(summary.gradeCount).reduce((total, count) => total + count, 0);
                const colors: Record<Grade, string> = { A: 'var(--acade-success)', B: 'var(--acade-primary)', C: 'var(--acade-warning)', D: 'var(--grade-d)', E: 'var(--grade-e)', F: 'var(--acade-danger)' };
                return <div key={letter} style={{ width: `${(summary.gradeCount[letter] / Math.max(1, gradedCount)) * 100}%`, backgroundColor: colors[letter] }} className="h-full transition-all duration-500" />;
              })}
            </div>
          </div>
        </DiscreetValue>

        {editable && onSave && (
          <Button variant="primary" size="md" className="w-full md:w-auto" onClick={handleSaveClick} disabled={isSaving}>
            {isSaving ? (
              <div className="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <>
                <CheckCircle2 size={18} className="mr-2" /> Save Semester
              </>
            )}
          </Button>
        )}
      </div>
    </div>
    </DiscreetScope>
  );
}
