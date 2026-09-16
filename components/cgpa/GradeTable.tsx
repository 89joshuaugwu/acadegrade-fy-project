'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

import { GRADE_SCALE, MAX_CA_SCORE, MAX_EXAM_SCORE, MAX_TOTAL_SCORE } from '@/lib/utils/constants';
import type { CourseInput, Grade } from '@/types/course';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface LocalCourse extends CourseInput {
  localId: string;
}

interface GradeTableProps {
  initialCourses?: CourseInput[];
  editable?: boolean;
  onSave?: (courses: CourseInput[]) => Promise<void>;
  isSaving?: boolean;
}

export function GradeTable({ initialCourses = [], editable = false, onSave, isSaving = false }: GradeTableProps) {
  const shouldReduceMotion = useReducedMotion();
  const previousInitialCourses = useRef(initialCourses);
  
  const [courses, setCourses] = useState<LocalCourse[]>(() => 
    initialCourses.map(c => ({ ...c, localId: Math.random().toString(36).substr(2, 9) }))
  );
  const [shakeId, setShakeId] = useState<string | null>(null);

  // Sync courses if initialCourses changes (e.g. from an import)
  useEffect(() => {
    if (previousInitialCourses.current === initialCourses) return;
    previousInitialCourses.current = initialCourses;
    if (initialCourses.length > 0) {
      setCourses(initialCourses.map(c => ({ ...c, localId: Math.random().toString(36).substr(2, 9) })));
    }
  }, [initialCourses]);

  // Auto-add an empty row if empty and editable
  useEffect(() => {
    if (courses.length === 0 && editable) {
      handleAddRow();
    }
  }, [editable]);

  const handleAddRow = () => {
    setCourses([...courses, {
      localId: Math.random().toString(36).substr(2, 9),
      code: '',
      title: '',
      units: 3,
      caScore: null,
      examScore: null,
    }]);
  };

  const handleRemoveRow = (id: string) => {
    setCourses(courses.filter(c => c.localId !== id));
  };

  const updateCourse = (id: string, field: keyof LocalCourse, value: any) => {
    setCourses(courses.map(c => {
      if (c.localId === id) {
        const updated = { ...c, [field]: value };
        if ((field === 'caScore' || field === 'examScore') && value !== null) {
          updated.grade = undefined;
        }
        
        // Validate scores
        if (field === 'caScore' && value !== null && value > MAX_CA_SCORE) {
          updated.caScore = MAX_CA_SCORE;
          triggerShake(id);
        }
        if (field === 'examScore' && value !== null && value > MAX_EXAM_SCORE) {
          updated.examScore = MAX_EXAM_SCORE;
          triggerShake(id);
        }
        if (field === 'units' && value !== null) {
          if (value < 1) updated.units = 1;
          if (value > 6) updated.units = 6;
        }

        return updated;
      }
      return c;
    }));
  };

  const triggerShake = (id: string) => {
    setShakeId(id);
    setTimeout(() => setShakeId(null), 500);
  };

  const computeRow = useCallback((ca: number | null, exam: number | null, letterGrade?: Grade, isAR?: boolean) => {
    if (isAR) {
      return { totalScore: null, grade: 'AR', gradePoint: 0, piPoint: 0 };
    }
    if (ca !== null && exam !== null) {
      const totalScore = ca + exam;
      const scale = GRADE_SCALE.find(g => totalScore >= g.minScore && totalScore <= g.maxScore) || GRADE_SCALE[GRADE_SCALE.length - 1];
      return { totalScore, grade: scale.grade, gradePoint: scale.gradePoint, piPoint: (totalScore / 100) * 5 };
    }
    if (letterGrade) {
      const gradePoint = { A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 }[letterGrade];
      return { totalScore: null, grade: letterGrade, gradePoint, piPoint: gradePoint };
    }
    return { totalScore: null, grade: null, gradePoint: 0, piPoint: 0 };
  }, []);

  // Summary calculation
  const summary = useMemo(() => {
    let totalUnits = 0;
    let totalGP = 0;
    let totalPI = 0;
    const gradeCount: Record<Grade, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };

    courses.forEach(c => {
      const { grade, gradePoint, piPoint } = computeRow(c.caScore, c.examScore, c.grade, c.isAR);
      if (grade && grade !== 'AR') {
        totalUnits += c.units;
        totalGP += gradePoint * c.units;
        totalPI += piPoint * c.units;
        if (grade in gradeCount) {
          gradeCount[grade as Grade]++;
        }
      }
    });

    const gpa = totalUnits > 0 ? totalGP / totalUnits : 0;
    const pi = totalUnits > 0 ? totalPI / totalUnits : 0;

    return { totalUnits, gpa, pi, gradeCount };
  }, [courses, computeRow]);

  const handleSaveClick = async () => {
    if (onSave) {
      // Clean up localId
      const cleanCourses = courses.map(({ localId, ...rest }) => rest).filter(c => c.code.trim() !== '');
      await onSave(cleanCourses);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <section
        role="region"
        aria-label="Mobile course editor"
        aria-describedby="mobile-course-editor-help"
        tabIndex={0}
        className="w-full overflow-x-auto rounded-xl border border-[var(--acade-border)] custom-scrollbar focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)] md:hidden"
      >
        <p id="mobile-course-editor-help" className="sticky left-0 z-30 w-44 border-b border-[var(--acade-border)] bg-[var(--acade-deep)] px-3 py-2 text-xs leading-5 text-[var(--acade-text-muted)]">
          Swipe sideways to edit every result field.
        </p>
        <table aria-label={editable ? 'Editable course results' : 'Course results'} className="min-w-[680px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--acade-border)] bg-[var(--acade-deep)] text-[10px] font-bold uppercase tracking-wide text-[var(--acade-text-muted)]">
              <th scope="col" className="sticky left-0 z-30 w-44 bg-[var(--acade-deep)] px-3 py-2 shadow-[6px_0_12px_-10px_rgba(0,0,0,0.8)]">Course</th>
              <th scope="col" className="w-[70px] px-2 py-2 text-center">Units</th>
              <th scope="col" className="w-[74px] px-2 py-2 text-center">CA /30</th>
              <th scope="col" className="w-[74px] px-2 py-2 text-center">Exam /70</th>
              <th scope="col" className="w-16 px-2 py-2 text-center">Total</th>
              <th scope="col" className="w-[70px] px-2 py-2 text-center">Grade</th>
              <th scope="col" className="w-14 px-2 py-2 text-center">GP</th>
              <th scope="col" className="w-16 px-2 py-2 text-center">PI</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {courses.map((course, idx) => {
                const { totalScore, grade, gradePoint, piPoint } = computeRow(course.caScore, course.examScore, course.grade, course.isAR);
                const courseName = course.code || `course ${idx + 1}`;

                return (
                  <motion.tr
                    key={course.localId}
                    initial={shouldReduceMotion ? {} : { opacity: 0, y: -6 }}
                    animate={shakeId === course.localId ? { x: [-5, 5, -5, 5, 0], transition: { duration: 0.4 } } : { opacity: 1, y: 0, x: 0 }}
                    exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
                    className="border-b border-[var(--acade-border-subtle)] last:border-b-0"
                  >
                    <td aria-label={`Course ${idx + 1}: ${courseName}`} className="sticky left-0 z-20 w-44 bg-[var(--acade-surface)] p-2 align-top shadow-[6px_0_12px_-10px_rgba(0,0,0,0.8)]">
                      {editable ? (
                        <div className="grid grid-cols-[1fr_44px] gap-1.5">
                          <input
                            aria-label={`Course ${idx + 1} code`}
                            type="text"
                            value={course.code}
                            onChange={event => updateCourse(course.localId, 'code', event.target.value.toUpperCase())}
                            placeholder="CSC 401"
                            className="min-h-11 min-w-0 rounded-md border border-[var(--acade-border)] bg-[var(--acade-deep)] px-2 text-base font-bold uppercase text-[var(--acade-text)] focus:border-[var(--acade-primary)] focus:outline-none"
                          />
                          <button type="button" onClick={() => handleRemoveRow(course.localId)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-[var(--acade-danger)]/25 text-[var(--acade-danger)] transition-colors hover:bg-[var(--acade-danger-dim)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-danger)]" aria-label={`Remove ${courseName}`}>
                            <Trash2 size={17} aria-hidden="true" />
                          </button>
                          <input
                            aria-label={`Course ${idx + 1} title`}
                            type="text"
                            value={course.title}
                            onChange={event => updateCourse(course.localId, 'title', event.target.value)}
                            placeholder="Course title"
                            className="col-span-2 min-h-11 min-w-0 rounded-md border border-[var(--acade-border)] bg-[var(--acade-deep)] px-2 text-base text-[var(--acade-text)] focus:border-[var(--acade-primary)] focus:outline-none"
                          />
                        </div>
                      ) : (
                        <div className="min-w-0 py-1">
                          <p className="truncate text-sm font-bold text-[var(--acade-text)]">{course.code || 'Untitled course'}</p>
                          <p className="mt-1 line-clamp-2 text-xs leading-4 text-[var(--acade-text-muted)]">{course.title}</p>
                        </div>
                      )}
                    </td>
                    <td className="p-2 text-center align-middle">
                      {editable ? <input aria-label={`Course ${idx + 1} units`} type="number" value={course.units || ''} onChange={event => updateCourse(course.localId, 'units', parseInt(event.target.value) || 0)} min="1" max="6" inputMode="numeric" className="min-h-11 w-full rounded-md border border-[var(--acade-border)] bg-[var(--acade-deep)] px-1 text-center font-[family-name:var(--font-geist-mono)] text-base text-[var(--acade-text)] focus:border-[var(--acade-primary)] focus:outline-none" /> : <span className="text-sm text-[var(--acade-text)]">{course.units}</span>}
                    </td>
                    <td className="p-2 text-center align-middle">
                      {editable ? <input aria-label={`Course ${idx + 1} CA score out of 30`} type="number" value={course.caScore === null ? '' : course.caScore} onChange={event => updateCourse(course.localId, 'caScore', event.target.value ? parseInt(event.target.value) : null)} min="0" max={MAX_CA_SCORE} inputMode="numeric" disabled={course.isAR} className="min-h-11 w-full rounded-md border border-[var(--acade-border)] bg-[var(--acade-deep)] px-1 text-center font-[family-name:var(--font-geist-mono)] text-base text-[var(--acade-text)] focus:border-[var(--acade-primary)] focus:outline-none disabled:opacity-50" /> : <span className="text-sm text-[var(--acade-text-muted)]">{course.caScore ?? '—'}</span>}
                    </td>
                    <td className="p-2 text-center align-middle">
                      {editable ? <input aria-label={`Course ${idx + 1} exam score out of 70`} type="number" value={course.examScore === null ? '' : course.examScore} onChange={event => updateCourse(course.localId, 'examScore', event.target.value ? parseInt(event.target.value) : null)} min="0" max={MAX_EXAM_SCORE} inputMode="numeric" disabled={course.isAR} className="min-h-11 w-full rounded-md border border-[var(--acade-border)] bg-[var(--acade-deep)] px-1 text-center font-[family-name:var(--font-geist-mono)] text-base text-[var(--acade-text)] focus:border-[var(--acade-primary)] focus:outline-none disabled:opacity-50" /> : <span className="text-sm text-[var(--acade-text-muted)]">{course.examScore ?? '—'}</span>}
                    </td>
                    <td className="px-2 py-3 text-center align-middle font-[family-name:var(--font-geist-mono)] text-sm font-bold text-[var(--acade-text)]">{totalScore ?? '—'}</td>
                    <td className="p-2 text-center align-middle">
                      {course.isAR ? <Badge variant="ongoing">AR</Badge> : <span className="text-sm font-bold text-[var(--acade-text)]">{grade ?? '—'}</span>}
                    </td>
                    <td className="px-2 py-3 text-center align-middle font-[family-name:var(--font-geist-mono)] text-sm font-bold text-[var(--acade-text-muted)]">{!grade || grade === 'AR' ? '—' : gradePoint.toFixed(1)}</td>
                    <td className="px-2 py-3 text-center align-middle font-[family-name:var(--font-geist-mono)] text-sm font-bold text-[var(--acade-gold)]">{!grade || grade === 'AR' ? '—' : piPoint.toFixed(2)}</td>
                  </motion.tr>
                );
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
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-[var(--acade-border)] text-[length:var(--text-xs)] text-[var(--acade-text-muted)] font-bold uppercase font-[family-name:var(--font-dm-sans)] bg-[var(--acade-deep)]/50">
              <th className="p-3 w-10">#</th>
              <th className="p-3 w-32">Code</th>
              <th className="p-3">Title</th>
              <th className="p-3 w-20 text-center">Units</th>
              <th className="p-3 w-24 text-center">CA (30)</th>
              <th className="p-3 w-24 text-center">Exam (70)</th>
              <th className="p-3 w-20 text-center">Total</th>
              <th className="p-3 w-20 text-center">Grade</th>
              <th className="p-3 w-16 text-center">GP</th>
              <th className="p-3 w-16 text-center">PI</th>
              {editable && <th className="p-3 w-16"></th>}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {courses.map((course, idx) => {
                const { totalScore, grade, gradePoint, piPoint } = computeRow(course.caScore, course.examScore, course.grade, course.isAR);
                const isShaking = shakeId === course.localId;

                return (
                  <motion.tr
                    key={course.localId}
                    initial={shouldReduceMotion ? {} : { opacity: 0, y: -10 }}
                    animate={
                      isShaking
                        ? { x: [-5, 5, -5, 5, 0], transition: { duration: 0.4 } }
                        : { opacity: 1, y: 0, x: 0 }
                    }
                    exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="border-b border-[var(--acade-border-subtle)] hover:bg-[var(--acade-primary)]/5 hover:shadow-[inset_0_0_20px_rgba(99,102,241,0.05)] transition-all duration-300 group"
                  >
                    <td className="p-3 text-[length:var(--text-sm)] text-[var(--acade-text-faint)] font-[family-name:var(--font-geist-mono)]">
                      {idx + 1}
                    </td>
                    
                    <td className="p-2">
                      {editable ? (
                        <input
                          aria-label={`Course ${idx + 1} code`}
                          type="text"
                          value={course.code}
                          onChange={e => updateCourse(course.localId, 'code', e.target.value.toUpperCase())}
                          placeholder="CSC 401"
                          className="min-h-11 w-full bg-[var(--acade-deep)] border border-[var(--acade-border)] rounded-md px-2 py-1.5 text-[length:var(--text-sm)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-dm-sans)] focus:outline-none focus:border-[var(--acade-primary)] uppercase"
                        />
                      ) : (
                        <span className="font-bold text-[var(--acade-text)] font-[family-name:var(--font-dm-sans)]">{course.code}</span>
                      )}
                    </td>

                    <td className="p-2">
                      {editable ? (
                        <input
                          aria-label={`Course ${idx + 1} title`}
                          type="text"
                          value={course.title}
                          onChange={e => updateCourse(course.localId, 'title', e.target.value)}
                          placeholder="Software Engineering"
                          className="min-h-11 w-full bg-[var(--acade-deep)] border border-[var(--acade-border)] rounded-md px-2 py-1.5 text-[length:var(--text-sm)] text-[var(--acade-text)] focus:outline-none focus:border-[var(--acade-primary)] font-[family-name:var(--font-dm-sans)]"
                        />
                      ) : (
                        <span className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] line-clamp-1">{course.title}</span>
                      )}
                    </td>

                    <td className="p-2 text-center">
                      {editable ? (
                        <input
                          aria-label={`Course ${idx + 1} units`}
                          type="number"
                          value={course.units || ''}
                          onChange={e => updateCourse(course.localId, 'units', parseInt(e.target.value) || 0)}
                          min="1"
                          max="6"
                          className="min-h-11 w-full bg-[var(--acade-deep)] border border-[var(--acade-border)] rounded-md px-2 py-1.5 text-[length:var(--text-sm)] text-center text-[var(--acade-text)] focus:outline-none focus:border-[var(--acade-primary)] font-[family-name:var(--font-geist-mono)]"
                        />
                      ) : (
                        <span className="text-[length:var(--text-sm)] text-[var(--acade-text)] font-[family-name:var(--font-geist-mono)]">{course.units}</span>
                      )}
                    </td>

                    <td className="p-2 text-center">
                      {editable ? (
                        <input
                          aria-label={`Course ${idx + 1} CA score out of 30`}
                          type="number"
                          value={course.caScore === null ? '' : course.caScore}
                          onChange={e => updateCourse(course.localId, 'caScore', e.target.value ? parseInt(e.target.value) : null)}
                          placeholder="-"
                          disabled={course.isAR}
                          className="min-h-11 w-full bg-[var(--acade-deep)] border border-[var(--acade-border)] rounded-md px-2 py-1.5 text-[length:var(--text-sm)] text-center text-[var(--acade-text)] focus:outline-none focus:border-[var(--acade-primary)] font-[family-name:var(--font-geist-mono)] disabled:opacity-50"
                        />
                      ) : (
                        <span className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] font-[family-name:var(--font-geist-mono)]">{course.caScore ?? '-'}</span>
                      )}
                    </td>

                    <td className="p-2 text-center">
                      {editable ? (
                        <input
                          aria-label={`Course ${idx + 1} exam score out of 70`}
                          type="number"
                          value={course.examScore === null ? '' : course.examScore}
                          onChange={e => updateCourse(course.localId, 'examScore', e.target.value ? parseInt(e.target.value) : null)}
                          placeholder="-"
                          disabled={course.isAR}
                          className="min-h-11 w-full bg-[var(--acade-deep)] border border-[var(--acade-border)] rounded-md px-2 py-1.5 text-[length:var(--text-sm)] text-center text-[var(--acade-text)] focus:outline-none focus:border-[var(--acade-primary)] font-[family-name:var(--font-geist-mono)] disabled:opacity-50"
                        />
                      ) : (
                        <span className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] font-[family-name:var(--font-geist-mono)]">{course.examScore ?? '-'}</span>
                      )}
                    </td>

                    <td className="p-3 text-center">
                      <span className="text-[length:var(--text-base)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-geist-mono)]">
                        {totalScore !== null ? totalScore : '-'}
                      </span>
                    </td>

                    <td className="p-3 text-center">
                      {course.isAR ? (
                        <Badge variant="ongoing">AR</Badge>
                      ) : grade ? (
                        <Badge variant={`grade-${grade.toLowerCase()}` as any}>
                          {grade}
                        </Badge>
                      ) : (
                        <span className="text-[var(--acade-text-faint)]">—</span>
                      )}
                    </td>

                    <td className="p-3 text-center">
                      <span className="text-[length:var(--text-sm)] font-bold text-[var(--acade-text-muted)] font-[family-name:var(--font-geist-mono)]">
                        {!grade || grade === 'AR' ? '-' : gradePoint.toFixed(1)}
                      </span>
                    </td>

                    <td className="p-3 text-center">
                      <span className="text-[length:var(--text-sm)] font-bold text-[var(--acade-gold)] font-[family-name:var(--font-geist-mono)]">
                        {!grade || grade === 'AR' ? '-' : piPoint.toFixed(2)}
                      </span>
                    </td>

                    {editable && (
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleRemoveRow(course.localId)}
                          className="p-1.5 rounded-lg text-[var(--acade-danger)] opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-[var(--acade-danger-dim)] transition-all"
                          aria-label={`Remove ${course.code || `course ${idx + 1}`}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </motion.tr>
                );
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
      <div className="bg-[var(--acade-deep)] border border-[var(--acade-border)] rounded-xl p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex gap-8 w-full md:w-auto">
          <div className="flex flex-col">
            <span className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)] font-bold uppercase mb-1">GPA</span>
            <span className="text-[length:var(--text-2xl)] font-bold text-[var(--acade-primary)] font-[family-name:var(--font-geist-mono)]">
              {summary.gpa.toFixed(2)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)] font-bold uppercase mb-1">PI</span>
            <span className="text-[length:var(--text-2xl)] font-bold text-[var(--acade-gold)] font-[family-name:var(--font-geist-mono)]">
              {summary.pi.toFixed(2)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)] font-bold uppercase mb-1">Units</span>
            <span className="text-[length:var(--text-2xl)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-geist-mono)]">
              {summary.totalUnits}
            </span>
          </div>
        </div>

        {/* Mini Grade Distribution Bar */}
        <div className="w-full flex-1 max-w-sm flex flex-col gap-2">
          <div className="flex justify-between text-[10px] text-[var(--acade-text-faint)] font-bold">
            <span>A: {summary.gradeCount.A}</span>
            <span>B: {summary.gradeCount.B}</span>
            <span>C: {summary.gradeCount.C}</span>
            <span>D: {summary.gradeCount.D}</span>
            <span>E: {summary.gradeCount.E}</span>
            <span>F: {summary.gradeCount.F}</span>
          </div>
          <div className="h-2 w-full bg-[var(--acade-surface)] rounded-full flex overflow-hidden">
            {(['A', 'B', 'C', 'D', 'E', 'F'] as Grade[]).map((grade) => {
              const gradedCount = Object.values(summary.gradeCount).reduce((total, count) => total + count, 0);
              const colors: Record<Grade, string> = { A: 'var(--acade-success)', B: 'var(--acade-primary)', C: 'var(--acade-warning)', D: 'var(--grade-d)', E: 'var(--grade-e)', F: 'var(--acade-danger)' };
              return <div key={grade} style={{ width: `${(summary.gradeCount[grade] / Math.max(1, gradedCount)) * 100}%`, backgroundColor: colors[grade] }} className="h-full transition-all duration-500" />;
            })}
          </div>
        </div>

        {editable && onSave && (
          <Button variant="primary" size="md" className="w-full md:w-auto" onClick={handleSaveClick} disabled={isSaving}>
            {isSaving ? (
              <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle2 size={18} className="mr-2" /> Save Semester
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
