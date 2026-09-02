'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Search, CheckCircle2 } from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

import { GRADE_SCALE, MAX_CA_SCORE, MAX_EXAM_SCORE, MAX_TOTAL_SCORE } from '@/lib/utils/constants';
import type { CourseInput, Grade } from '@/types/course';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

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
  
  const [courses, setCourses] = useState<LocalCourse[]>(() => 
    initialCourses.map(c => ({ ...c, localId: Math.random().toString(36).substr(2, 9) }))
  );
  const [shakeId, setShakeId] = useState<string | null>(null);

  // Sync courses if initialCourses changes (e.g. from an import)
  useEffect(() => {
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

  const computeRow = useCallback((ca: number | null, exam: number | null, isAR?: boolean) => {
    if (isAR) {
      return { totalScore: null, grade: 'AR', gradePoint: 0, piPoint: 0 };
    }
    const totalScore = (ca || 0) + (exam || 0);
    const scale = GRADE_SCALE.find(g => totalScore >= g.minScore && totalScore <= g.maxScore) || GRADE_SCALE[GRADE_SCALE.length - 1];
    return {
      totalScore,
      grade: scale.grade,
      gradePoint: scale.gradePoint,
      piPoint: (totalScore / 100) * 5,
    };
  }, []);

  // Summary calculation
  const summary = useMemo(() => {
    let totalUnits = 0;
    let totalGP = 0;
    let totalPI = 0;
    const gradeCount: Record<Grade, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };

    courses.forEach(c => {
      const { grade, gradePoint, piPoint } = computeRow(c.caScore, c.examScore, c.isAR);
      if (grade !== 'AR') {
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
      <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
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
                const { totalScore, grade, gradePoint, piPoint } = computeRow(course.caScore, course.examScore, course.isAR);
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
                          type="text"
                          value={course.code}
                          onChange={e => updateCourse(course.localId, 'code', e.target.value.toUpperCase())}
                          placeholder="CSC 401"
                          className="w-full bg-[var(--acade-deep)] border border-[var(--acade-border)] rounded-md px-2 py-1.5 text-[length:var(--text-sm)] font-bold text-[var(--acade-text)] font-[family-name:var(--font-dm-sans)] focus:outline-none focus:border-[var(--acade-primary)] uppercase"
                        />
                      ) : (
                        <span className="font-bold text-[var(--acade-text)] font-[family-name:var(--font-dm-sans)]">{course.code}</span>
                      )}
                    </td>

                    <td className="p-2">
                      {editable ? (
                        <input
                          type="text"
                          value={course.title}
                          onChange={e => updateCourse(course.localId, 'title', e.target.value)}
                          placeholder="Software Engineering"
                          className="w-full bg-[var(--acade-deep)] border border-[var(--acade-border)] rounded-md px-2 py-1.5 text-[length:var(--text-sm)] text-[var(--acade-text)] focus:outline-none focus:border-[var(--acade-primary)] font-[family-name:var(--font-dm-sans)]"
                        />
                      ) : (
                        <span className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] line-clamp-1">{course.title}</span>
                      )}
                    </td>

                    <td className="p-2 text-center">
                      {editable ? (
                        <input
                          type="number"
                          value={course.units || ''}
                          onChange={e => updateCourse(course.localId, 'units', parseInt(e.target.value) || 0)}
                          min="1"
                          max="6"
                          className="w-full bg-[var(--acade-deep)] border border-[var(--acade-border)] rounded-md px-2 py-1.5 text-[length:var(--text-sm)] text-center text-[var(--acade-text)] focus:outline-none focus:border-[var(--acade-primary)] font-[family-name:var(--font-geist-mono)]"
                        />
                      ) : (
                        <span className="text-[length:var(--text-sm)] text-[var(--acade-text)] font-[family-name:var(--font-geist-mono)]">{course.units}</span>
                      )}
                    </td>

                    <td className="p-2 text-center">
                      {editable ? (
                        <input
                          type="number"
                          value={course.caScore === null ? '' : course.caScore}
                          onChange={e => updateCourse(course.localId, 'caScore', e.target.value ? parseInt(e.target.value) : null)}
                          placeholder="-"
                          disabled={course.isAR}
                          className="w-full bg-[var(--acade-deep)] border border-[var(--acade-border)] rounded-md px-2 py-1.5 text-[length:var(--text-sm)] text-center text-[var(--acade-text)] focus:outline-none focus:border-[var(--acade-primary)] font-[family-name:var(--font-geist-mono)] disabled:opacity-50"
                        />
                      ) : (
                        <span className="text-[length:var(--text-sm)] text-[var(--acade-text-muted)] font-[family-name:var(--font-geist-mono)]">{course.caScore ?? '-'}</span>
                      )}
                    </td>

                    <td className="p-2 text-center">
                      {editable ? (
                        <input
                          type="number"
                          value={course.examScore === null ? '' : course.examScore}
                          onChange={e => updateCourse(course.localId, 'examScore', e.target.value ? parseInt(e.target.value) : null)}
                          placeholder="-"
                          disabled={course.isAR}
                          className="w-full bg-[var(--acade-deep)] border border-[var(--acade-border)] rounded-md px-2 py-1.5 text-[length:var(--text-sm)] text-center text-[var(--acade-text)] focus:outline-none focus:border-[var(--acade-primary)] font-[family-name:var(--font-geist-mono)] disabled:opacity-50"
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
                      {grade === 'AR' ? (
                        <Badge variant="ongoing">AR</Badge>
                      ) : (
                        <Badge variant={`grade-${grade.toLowerCase()}` as any}>
                          {grade}
                        </Badge>
                      )}
                    </td>

                    <td className="p-3 text-center">
                      <span className="text-[length:var(--text-sm)] font-bold text-[var(--acade-text-muted)] font-[family-name:var(--font-geist-mono)]">
                        {grade === 'AR' ? '-' : gradePoint.toFixed(1)}
                      </span>
                    </td>

                    <td className="p-3 text-center">
                      <span className="text-[length:var(--text-sm)] font-bold text-[var(--acade-gold)] font-[family-name:var(--font-geist-mono)]">
                        {grade === 'AR' ? '-' : piPoint.toFixed(2)}
                      </span>
                    </td>

                    {editable && (
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleRemoveRow(course.localId)}
                          className="p-1.5 rounded-lg text-[var(--acade-danger)] opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-[var(--acade-danger-dim)] transition-all"
                          aria-label="Remove course"
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

        {editable && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={handleAddRow}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--acade-border)] text-[length:var(--text-sm)] font-medium text-[var(--acade-text-muted)] hover:text-[var(--acade-primary)] hover:border-[var(--acade-primary)] transition-colors border-dashed"
            >
              <Plus size={16} /> Add Course
            </button>
          </div>
        )}
      </div>

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
            <div style={{ width: `${(summary.gradeCount.A / Math.max(1, courses.length)) * 100}%` }} className="h-full bg-[var(--acade-success)] transition-all duration-500" />
            <div style={{ width: `${(summary.gradeCount.B / Math.max(1, courses.length)) * 100}%` }} className="h-full bg-[var(--acade-primary)] transition-all duration-500" />
            <div style={{ width: `${(summary.gradeCount.C / Math.max(1, courses.length)) * 100}%` }} className="h-full bg-[var(--acade-warning)] transition-all duration-500" />
            <div style={{ width: `${(summary.gradeCount.D / Math.max(1, courses.length)) * 100}%` }} className="h-full bg-[var(--acade-danger)]/70 transition-all duration-500" />
            <div style={{ width: `${(summary.gradeCount.E / Math.max(1, courses.length)) * 100}%` }} className="h-full bg-[var(--acade-danger)]/90 transition-all duration-500" />
            <div style={{ width: `${(summary.gradeCount.F / Math.max(1, courses.length)) * 100}%` }} className="h-full bg-[var(--acade-danger)] transition-all duration-500" />
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
