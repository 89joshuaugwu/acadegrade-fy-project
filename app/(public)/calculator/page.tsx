'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Calculator, Plus, Trash2, Share2, Save, ArrowRight, Settings2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { CGPAArc } from '@/components/cgpa/CGPAArc';
import { computeCourseMetrics, computeSemesterGPA } from '@/lib/cgpa/calculator';
import type { CourseInput, Grade } from '@/types/course';
import { cn } from '@/lib/utils/cn';

interface QuickCourse {
  id: string;
  code: string;
  units: number;
  grade?: Grade;
  score?: number;
}

const GRADES: Grade[] = ['A', 'B', 'C', 'D', 'E', 'F'];
const UNITS = [1, 2, 3, 4, 5, 6];

export default function QuickCalculatorPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [courses, setCourses] = useState<QuickCourse[]>([]);
  const [inputMode, setInputMode] = useState<'grade' | 'score'>('grade');
  const [isCopied, setIsCopied] = useState(false);

  // Initialize from URL search params if present
  useEffect(() => {
    const encoded = searchParams.get('c');
    const mode = searchParams.get('m');
    
    if (mode === 'score' || mode === 'grade') {
      setInputMode(mode);
    }
    
    if (encoded) {
      try {
        const decoded = JSON.parse(atob(encoded));
        if (Array.isArray(decoded)) {
          setCourses(decoded);
        }
      } catch (e) {
        console.error('Failed to parse courses from URL', e);
      }
    } else if (courses.length === 0) {
      // Start with 3 empty courses
      setCourses([
        { id: uuidv4(), code: '', units: 3, grade: 'A' },
        { id: uuidv4(), code: '', units: 3, grade: 'B' },
        { id: uuidv4(), code: '', units: 2, grade: 'C' },
      ]);
    }
  }, []); // Run once on mount

  // Update URL whenever courses change (debounced implicitly by user interaction speed)
  const updateUrl = (newCourses: QuickCourse[], newMode: 'grade' | 'score') => {
    try {
      // strip out IDs and empty codes for shorter URL
      const minimalCourses = newCourses.map(c => ({
        c: c.code,
        u: c.units,
        g: c.grade,
        s: c.score
      }));
      const encoded = btoa(JSON.stringify(minimalCourses));
      router.replace(`${pathname}?m=${newMode}&c=${encoded}`, { scroll: false });
    } catch (e) {
      // Ignore encoding errors
    }
  };

  const handleAddCourse = () => {
    const newCourse: QuickCourse = { 
      id: uuidv4(), 
      code: '', 
      units: 3, 
      grade: inputMode === 'grade' ? 'A' : undefined,
      score: inputMode === 'score' ? 70 : undefined
    };
    const newCourses = [...courses, newCourse];
    setCourses(newCourses);
    updateUrl(newCourses, inputMode);
  };

  const handleUpdateCourse = (id: string, updates: Partial<QuickCourse>) => {
    const newCourses = courses.map(c => c.id === id ? { ...c, ...updates } : c);
    setCourses(newCourses);
    updateUrl(newCourses, inputMode);
  };

  const handleRemoveCourse = (id: string) => {
    const newCourses = courses.filter(c => c.id !== id);
    setCourses(newCourses);
    updateUrl(newCourses, inputMode);
  };

  const handleClearAll = () => {
    setCourses([]);
    router.replace(pathname, { scroll: false });
  };

  const toggleInputMode = () => {
    const newMode = inputMode === 'grade' ? 'score' : 'grade';
    setInputMode(newMode);
    
    // Convert grades/scores or set defaults
    const newCourses = courses.map(c => ({
      ...c,
      grade: newMode === 'grade' ? (c.grade || 'C') : undefined,
      score: newMode === 'score' ? (c.score || 50) : undefined
    }));
    
    setCourses(newCourses);
    updateUrl(newCourses, newMode);
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  // Compute live GPA/PI
  const metrics = useMemo(() => {
    // Only count courses that have either a grade or a score set
    const validCourses = courses.filter(c => 
      inputMode === 'grade' ? !!c.grade : (c.score !== undefined && c.score !== null)
    );
    
    const courseInputs: CourseInput[] = validCourses.map(c => ({
      code: c.code || 'VAR',
      title: '',
      units: c.units,
      grade: inputMode === 'grade' ? c.grade : undefined,
      caScore: inputMode === 'score' && c.score !== undefined ? Math.min(30, c.score * 0.3) : null,
      examScore: inputMode === 'score' && c.score !== undefined ? Math.max(0, c.score * 0.7) : null,
    }));

    const computedCourses = courseInputs.map(computeCourseMetrics);
    return computeSemesterGPA(computedCourses);
  }, [courses, inputMode]);

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-16 h-16 bg-[var(--acade-primary-dim)] rounded-2xl flex items-center justify-center mx-auto mb-6"
          >
            <Calculator size={32} className="text-[var(--acade-primary)]" />
          </motion.div>
          <h1 className="text-[length:var(--text-4xl)] md:text-[length:var(--text-5xl)] font-bold font-[family-name:var(--font-bricolage)]">
            Quick Calculator
          </h1>
          <p className="text-[var(--acade-text-muted)] text-[length:var(--text-lg)] max-w-2xl mx-auto">
            Instantly calculate your CGPA and Performance Index. No account required.
            Share your results or save them for later.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Calculator Form */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-8 bg-[var(--acade-surface)] border border-[var(--acade-border)] rounded-3xl p-4 sm:p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[length:var(--text-xl)] font-bold flex items-center gap-2">
                Courses
                <span className="bg-[var(--acade-deep)] text-[length:var(--text-xs)] px-2 py-1 rounded-full text-[var(--acade-text-muted)]">
                  {courses.length}
                </span>
              </h2>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={toggleInputMode}
                className="gap-2"
              >
                <Settings2 size={16} />
                Use {inputMode === 'grade' ? 'Scores (0-100)' : 'Grades (A-F)'}
              </Button>
            </div>

            <div className="space-y-3">
              {/* Table Header (Hidden on small mobile) */}
              <div className="hidden sm:grid grid-cols-12 gap-4 px-4 text-[length:var(--text-sm)] font-medium text-[var(--acade-text-muted)]">
                <div className="col-span-4">Course Code</div>
                <div className="col-span-3">Units</div>
                <div className="col-span-4">{inputMode === 'grade' ? 'Grade' : 'Score'}</div>
                <div className="col-span-1"></div>
              </div>

              <AnimatePresence initial={false}>
                {courses.map((course, index) => (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 p-4 sm:p-2 bg-[var(--acade-deep)] sm:bg-transparent rounded-2xl sm:rounded-none border sm:border-0 border-[var(--acade-border-subtle)] items-center"
                  >
                    <div className="sm:col-span-4">
                      <label className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)] sm:hidden mb-1 block">Course Code</label>
                      <Input
                        placeholder={`Course ${index + 1}`}
                        value={course.code}
                        onChange={(e) => handleUpdateCourse(course.id, { code: e.target.value })}
                        className="bg-[var(--acade-surface)]"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-12 sm:col-span-7 gap-3 sm:gap-4">
                      <div className="sm:col-span-5">
                        <label className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)] sm:hidden mb-1 block">Units</label>
                        <Select
                          options={UNITS.map(u => ({ label: `${u} Unit${u > 1 ? 's' : ''}`, value: String(u) }))}
                          value={String(course.units)}
                          onChange={(v) => handleUpdateCourse(course.id, { units: Number(v) })}
                          className="bg-[var(--acade-surface)] w-full"
                        />
                      </div>
                      
                      <div className="sm:col-span-7">
                        <label className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)] sm:hidden mb-1 block">
                          {inputMode === 'grade' ? 'Grade' : 'Score'}
                        </label>
                        {inputMode === 'grade' ? (
                          <Select
                            options={GRADES.map(g => ({ label: `Grade ${g}`, value: g }))}
                            value={course.grade || 'A'}
                            onChange={(v) => handleUpdateCourse(course.id, { grade: v as Grade })}
                            className="bg-[var(--acade-surface)] w-full"
                          />
                        ) : (
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="Score (0-100)"
                            value={course.score ?? ''}
                            onChange={(e) => handleUpdateCourse(course.id, { score: e.target.value ? Number(e.target.value) : undefined })}
                            className="bg-[var(--acade-surface)] w-full"
                          />
                        )}
                      </div>
                    </div>

                    <div className="sm:col-span-1 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveCourse(course.id)}
                        className="text-[var(--acade-danger)] hover:bg-[var(--acade-danger)]/10 px-2"
                        title="Remove course"
                      >
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-6 border-t border-[var(--acade-border-subtle)]">
              <Button onClick={handleAddCourse} className="gap-2 flex-1 sm:flex-none">
                <Plus size={18} /> Add Course
              </Button>
              <Button variant="ghost" onClick={handleClearAll} className="text-[var(--acade-text-muted)] flex-1 sm:flex-none">
                Clear All
              </Button>
            </div>
          </motion.div>

          {/* Results Sticky Sidebar */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-4 lg:sticky lg:top-24 space-y-4"
          >
            <div className="bg-[var(--acade-surface)] border border-[var(--acade-border)] rounded-3xl p-6 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--acade-primary)]/5 rounded-bl-full pointer-events-none" />
              
              <h3 className="text-[length:var(--text-lg)] font-bold mb-6">Live Result</h3>
              
              <CGPAArc
                cgpa={metrics.gpa}
                pi={metrics.pi}
                size="md"
                animateOnMount={false}
              />

              <div className="grid grid-cols-2 gap-4 w-full mt-6">
                <div className="bg-[var(--acade-deep)] rounded-xl p-3 border border-[var(--acade-border-subtle)]">
                  <div className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)] uppercase tracking-wider mb-1">Total Units</div>
                  <div className="text-[length:var(--text-xl)] font-bold">{metrics.creditLoaded}</div>
                </div>
                <div className="bg-[var(--acade-deep)] rounded-xl p-3 border border-[var(--acade-border-subtle)]">
                  <div className="text-[length:var(--text-xs)] text-[var(--acade-text-muted)] uppercase tracking-wider mb-1">Courses</div>
                  <div className="text-[length:var(--text-xl)] font-bold">{metrics.courseCount}</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button 
                variant="outline" 
                className="w-full gap-2 py-6 rounded-2xl bg-[var(--acade-surface)] border-[var(--acade-primary)]/20 hover:border-[var(--acade-primary)]/50 transition-colors"
                onClick={handleShare}
              >
                <Share2 size={18} className="text-[var(--acade-primary)]" />
                {isCopied ? 'Link Copied!' : 'Share Results'}
              </Button>
              
              <Button 
                variant="primary" 
                className="w-full gap-2 py-6 rounded-2xl shadow-[0_0_20px_var(--acade-primary-glow)]"
                onClick={() => router.push('/login')}
              >
                <Save size={18} />
                Save to Profile
                <ArrowRight size={18} className="ml-2 opacity-50" />
              </Button>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
