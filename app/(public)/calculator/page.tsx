'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  BookOpenCheck,
  Calculator,
  LockKeyhole,
  Plus,
  Save,
  Share2,
  Sigma,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { Navbar } from '@/components/layout/Navbar';
import { PublicFooter } from '@/components/layout/PublicShell';
import { EmptyState } from '@/components/shared';
import {
  Button,
  IconButton,
  Input,
  LinkButton,
  Modal,
  SegmentedControl,
  Select,
} from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { computeCourseMetrics, computeSemesterGPA } from '@/lib/cgpa/calculator';
import type { CourseInput, Grade } from '@/types/course';

interface QuickCourse {
  id: string;
  code: string;
  units: number;
  grade?: Grade;
  score?: number;
}

type InputMode = 'grade' | 'score';

const GRADES: Grade[] = ['A', 'B', 'C', 'D', 'E', 'F'];
const UNITS = [1, 2, 3, 4, 5, 6];
const MODE_OPTIONS = [
  { value: 'grade', label: 'Letter grades' },
  { value: 'score', label: 'Scores out of 100' },
] satisfies { value: InputMode; label: string }[];

let idCounter = 0;
function nextId() {
  return `qc-${Date.now()}-${idCounter++}`;
}

function QuickCalculatorInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [courses, setCourses] = useState<QuickCourse[]>([]);
  const [inputMode, setInputMode] = useState<InputMode>('grade');
  const [isCopied, setIsCopied] = useState(false);
  const [initialised, setInitialised] = useState(false);
  const [showAuthAlert, setShowAuthAlert] = useState(false);

  useEffect(() => {
    const encoded = searchParams.get('c');
    const mode = searchParams.get('m');

    if (mode === 'score' || mode === 'grade') setInputMode(mode);

    if (encoded) {
      try {
        const decoded = JSON.parse(atob(encoded));
        if (Array.isArray(decoded)) {
          setCourses(decoded.map((course: { c?: string; u?: number; g?: Grade; s?: number }) => ({
            id: nextId(),
            code: course.c || '',
            units: course.u || 3,
            grade: course.g,
            score: course.s,
          })));
          setInitialised(true);
          return;
        }
      } catch (error) {
        console.error('Failed to parse courses from URL', error);
      }
    }

    setCourses([
      { id: nextId(), code: '', units: 3, grade: 'A' },
      { id: nextId(), code: '', units: 3, grade: 'B' },
      { id: nextId(), code: '', units: 2, grade: 'C' },
    ]);
    setInitialised(true);
    // URL hydration intentionally happens once when this route mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateUrl = useCallback((newCourses: QuickCourse[], newMode: InputMode) => {
    try {
      const minimalCourses = newCourses.map((course) => ({
        c: course.code,
        u: course.units,
        g: course.grade,
        s: course.score,
      }));
      const encoded = btoa(JSON.stringify(minimalCourses));
      router.replace(`${pathname}?m=${newMode}&c=${encoded}`, { scroll: false });
    } catch {
      // The calculation remains usable if URL encoding is unavailable.
    }
  }, [pathname, router]);

  const handleAddCourse = () => {
    const newCourse: QuickCourse = {
      id: nextId(),
      code: '',
      units: 3,
      grade: inputMode === 'grade' ? 'A' : undefined,
      score: inputMode === 'score' ? 70 : undefined,
    };
    const newCourses = [...courses, newCourse];
    setCourses(newCourses);
    updateUrl(newCourses, inputMode);
  };

  const handleUpdateCourse = (id: string, updates: Partial<QuickCourse>) => {
    const newCourses = courses.map((course) => (
      course.id === id ? { ...course, ...updates } : course
    ));
    setCourses(newCourses);
    updateUrl(newCourses, inputMode);
  };

  const handleRemoveCourse = (id: string) => {
    const newCourses = courses.filter((course) => course.id !== id);
    setCourses(newCourses);
    updateUrl(newCourses, inputMode);
  };

  const handleClearAll = () => {
    setCourses([]);
    router.replace(pathname, { scroll: false });
  };

  const handleInputModeChange = (newMode: InputMode) => {
    if (newMode === inputMode) return;

    setInputMode(newMode);
    const newCourses = courses.map((course) => ({
      ...course,
      grade: newMode === 'grade' ? (course.grade || ('C' as Grade)) : undefined,
      score: newMode === 'score' ? (course.score ?? 50) : undefined,
    }));
    setCourses(newCourses);
    updateUrl(newCourses, newMode);
  };

  const handleShare = async () => {
    if (!user) {
      setShowAuthAlert(true);
      return;
    }

    const url = window.location.href;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy', error);
      toast.error('Could not copy the link. You can copy it directly from the browser address bar.');
    }
  };

  const metrics = useMemo(() => {
    const validCourses = courses.filter((course) => (
      inputMode === 'grade'
        ? Boolean(course.grade)
        : course.score !== undefined && course.score !== null
    ));

    const courseInputs: CourseInput[] = validCourses.map((course) => ({
      code: course.code || 'VAR',
      title: '',
      units: course.units,
      grade: inputMode === 'grade' ? course.grade : undefined,
      caScore: inputMode === 'score' && course.score !== undefined
        ? Math.min(30, course.score * 0.3)
        : null,
      examScore: inputMode === 'score' && course.score !== undefined
        ? Math.max(0, course.score * 0.7)
        : null,
    }));

    return computeSemesterGPA(courseInputs.map(computeCourseMetrics));
  }, [courses, inputMode]);

  if (!initialised) return null;

  return (
    <>
      <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-12 md:gap-6 lg:gap-8">
        <section
          aria-labelledby="course-record-title"
          className="overflow-hidden rounded-[var(--radius-dialog)] border border-[var(--acade-border)] bg-[var(--acade-surface)] shadow-[var(--shadow-card)] md:col-span-7 lg:col-span-8"
        >
          <header className="border-b border-[var(--acade-border-subtle)] px-4 py-5 sm:px-6 sm:py-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h2 id="course-record-title" className="font-[family-name:var(--font-bricolage)] text-xl font-semibold text-[var(--acade-text)] sm:text-2xl">
                    Semester record
                  </h2>
                  <span className="rounded-full bg-[var(--acade-overlay)] px-2.5 py-1 font-[family-name:var(--font-geist-mono)] text-xs font-semibold text-[var(--acade-text-muted)]">
                    {courses.length}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--acade-text-muted)]">
                  Add each course once, then choose the result format you have.
                </p>
              </div>

              <SegmentedControl
                aria-label="Result entry mode"
                value={inputMode}
                onValueChange={handleInputModeChange}
                options={MODE_OPTIONS}
                className="w-full lg:w-auto"
              />
            </div>
          </header>

          <div className="p-4 sm:p-6">
            {courses.length === 0 ? (
              <EmptyState
                icon={<BookOpenCheck className="size-7" aria-hidden="true" />}
                title="No courses in this calculation"
                description="Add a course to start calculating your semester GPA and performance index."
                action={{ label: 'Add a course', onClick: handleAddCourse }}
                className="rounded-[var(--radius-surface)] border border-dashed border-[var(--acade-border)] bg-[var(--acade-deep)] py-12"
              />
            ) : (
              <div className="space-y-4">
                {courses.map((course, index) => (
                  <fieldset
                    key={course.id}
                    className="relative rounded-[var(--radius-surface)] border border-[var(--acade-border-subtle)] bg-[var(--acade-deep)] p-4 sm:p-5 lg:grid lg:grid-cols-12 lg:items-end lg:gap-4"
                  >
                    <legend className="sr-only">Course {index + 1}</legend>
                    <span className="mb-4 inline-flex size-8 items-center justify-center rounded-lg bg-[var(--acade-primary-dim)] font-[family-name:var(--font-geist-mono)] text-xs font-bold text-[var(--acade-primary)] lg:mb-2">
                      {String(index + 1).padStart(2, '0')}
                    </span>

                    <div className="grid grid-cols-2 gap-4 lg:col-span-10 lg:grid-cols-10">
                      <div className="col-span-2 lg:col-span-4">
                        <Input
                          label={`Course code ${index + 1}`}
                          placeholder={`e.g. CSC ${411 + index}`}
                          value={course.code}
                          autoComplete="off"
                          onChange={(event) => handleUpdateCourse(course.id, { code: event.target.value })}
                        />
                      </div>

                      <div className="col-span-1 lg:col-span-3">
                        <Select
                          label={`Credit units ${index + 1}`}
                          options={UNITS.map((unit) => ({
                            label: `${unit} unit${unit > 1 ? 's' : ''}`,
                            value: String(unit),
                          }))}
                          value={String(course.units)}
                          onChange={(value) => handleUpdateCourse(course.id, { units: Number(value) })}
                        />
                      </div>

                      <div className="col-span-1 lg:col-span-3">
                        {inputMode === 'grade' ? (
                          <Select
                            label={`Grade ${index + 1}`}
                            options={GRADES.map((grade) => ({ label: `Grade ${grade}`, value: grade }))}
                            value={course.grade || 'A'}
                            onChange={(value) => handleUpdateCourse(course.id, { grade: value as Grade })}
                          />
                        ) : (
                          <Input
                            label={`Score for course ${index + 1}`}
                            type="number"
                            min="0"
                            max="100"
                            placeholder="0–100"
                            value={course.score ?? ''}
                            variant="score"
                            onChange={(event) => handleUpdateCourse(course.id, {
                              score: event.target.value ? Number(event.target.value) : undefined,
                            })}
                          />
                        )}
                      </div>
                    </div>

                    <div className="absolute right-3 top-3 lg:static lg:col-span-1 lg:flex lg:justify-end">
                      <IconButton
                        aria-label={`Remove course ${index + 1}`}
                        variant="danger"
                        onClick={() => handleRemoveCourse(course.id)}
                      >
                        <Trash2 className="size-5" aria-hidden="true" />
                      </IconButton>
                    </div>
                  </fieldset>
                ))}
              </div>
            )}

            {courses.length > 0 && (
              <div className="mt-6 flex flex-col gap-3 border-t border-[var(--acade-border-subtle)] pt-6 sm:flex-row sm:items-center">
                <Button onClick={handleAddCourse} className="sm:min-w-40">
                  <Plus className="size-4" aria-hidden="true" />
                  Add a course
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleClearAll}
                  aria-label="Clear all courses"
                  className="sm:ml-auto"
                >
                  Clear all
                </Button>
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-4 md:col-span-5 md:sticky md:top-24 lg:col-span-4">
          <section
            role="status"
            aria-label="Current calculation"
            aria-live="polite"
            className="overflow-hidden rounded-[var(--radius-dialog)] border border-[var(--acade-border)] bg-[var(--acade-surface)] shadow-[var(--shadow-card)]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--acade-border-subtle)] px-5 py-5 sm:px-6">
              <div>
                <p className="text-xs font-semibold text-[var(--acade-primary)]">Live calculation</p>
                <h2 className="mt-1 font-[family-name:var(--font-bricolage)] text-xl font-semibold text-[var(--acade-text)]">
                  Current result
                </h2>
              </div>
              <div className="flex size-10 items-center justify-center rounded-[var(--radius-control)] bg-[var(--acade-primary-dim)] text-[var(--acade-primary)]">
                <Sigma className="size-5" aria-hidden="true" />
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-[var(--acade-border-subtle)] border-b border-[var(--acade-border-subtle)]">
              <div className="p-5 sm:p-6">
                <p className="text-xs font-semibold text-[var(--acade-text-faint)]">Semester GPA</p>
                <p className="mt-2 font-[family-name:var(--font-geist-mono)] text-[clamp(2rem,7vw,3rem)] font-semibold leading-none tracking-[-0.04em] text-[var(--acade-text)]">
                  {metrics.gpa.toFixed(2)}
                </p>
                <p className="mt-2 text-xs text-[var(--acade-text-muted)]">Letter-grade result</p>
              </div>
              <div className="p-5 sm:p-6">
                <p className="text-xs font-semibold text-[var(--acade-text-faint)]">PI</p>
                <p className="mt-2 font-[family-name:var(--font-geist-mono)] text-[clamp(2rem,7vw,3rem)] font-semibold leading-none tracking-[-0.04em] text-[var(--acade-gold)]">
                  {metrics.pi.toFixed(2)}
                </p>
                <p className="mt-2 text-xs text-[var(--acade-text-muted)]">Performance signal</p>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-px bg-[var(--acade-border-subtle)]">
              <div className="bg-[var(--acade-deep)] px-5 py-4 sm:px-6">
                <dt className="text-xs font-semibold text-[var(--acade-text-faint)]">Total credits</dt>
                <dd className="mt-1 font-[family-name:var(--font-geist-mono)] text-xl font-semibold text-[var(--acade-text)]">{metrics.creditLoaded}</dd>
              </div>
              <div className="bg-[var(--acade-deep)] px-5 py-4 sm:px-6">
                <dt className="text-xs font-semibold text-[var(--acade-text-faint)]">Courses</dt>
                <dd className="mt-1 font-[family-name:var(--font-geist-mono)] text-xl font-semibold text-[var(--acade-text)]">{metrics.courseCount}</dd>
              </div>
            </dl>

            <p className="border-t border-[var(--acade-border-subtle)] px-5 py-4 text-xs leading-5 text-[var(--acade-text-muted)] sm:px-6">
              Calculated from the courses currently included. Use your institution’s official result for formal verification.
            </p>
          </section>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-1">
            <Button variant="outline" fullWidth onClick={handleShare}>
              <Share2 className="size-4 text-[var(--acade-primary)]" aria-hidden="true" />
              {isCopied ? 'Link copied' : 'Share calculation'}
            </Button>
            <Button
              variant="primary"
              fullWidth
              onClick={() => {
                if (!user) setShowAuthAlert(true);
                else router.push('/dashboard');
              }}
            >
              <Save className="size-4" aria-hidden="true" />
              Save to profile
              <ArrowRight className="size-4 opacity-70" aria-hidden="true" />
            </Button>
          </div>
        </aside>
      </div>

      <Modal
        open={showAuthAlert}
        onClose={() => setShowAuthAlert(false)}
        title="Create an account to continue"
        description="Sign in or create an account before sharing this calculation or saving it to your academic record."
        size="confirm"
        presentation="sheet"
      >
        <div className="space-y-3">
          <LinkButton href="/register" fullWidth onClick={() => setShowAuthAlert(false)}>
            Create account
          </LinkButton>
          <LinkButton href="/login" variant="outline" fullWidth onClick={() => setShowAuthAlert(false)}>
            Sign in
          </LinkButton>
          <Button variant="ghost" fullWidth onClick={() => setShowAuthAlert(false)}>
            Not now
          </Button>
        </div>
      </Modal>
    </>
  );
}

export default function QuickCalculatorPage() {
  return (
    <>
      <Navbar />
      <main
        aria-labelledby="calculator-title"
        className="min-h-screen bg-[var(--acade-void)] px-4 pb-20 pt-10 sm:px-6 sm:pt-14 lg:px-8"
      >
        <div className="mx-auto max-w-[1200px]">
          <header className="grid grid-cols-1 gap-7 border-b border-[var(--acade-border)] pb-10 md:grid-cols-12 md:items-end">
            <div className="md:col-span-8">
              <div className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--acade-primary)]">
                <span className="flex size-9 items-center justify-center rounded-[var(--radius-control)] bg-[var(--acade-primary-dim)]">
                  <Calculator className="size-4" aria-hidden="true" />
                </span>
                Academic calculation desk
              </div>
              <h1
                id="calculator-title"
                className="max-w-[14ch] font-[family-name:var(--font-bricolage)] text-[clamp(2.25rem,6vw,4rem)] font-bold leading-[1.05] tracking-[-0.04em] text-[var(--acade-text)]"
              >
                Quick CGPA calculator
              </h1>
              <p className="mt-5 max-w-[62ch] text-base leading-7 text-[var(--acade-text-muted)] sm:text-lg">
                Build a semester result from letter grades or raw scores and inspect the GPA, PI, and credit basis as you work. No account is required to calculate.
              </p>
            </div>

            <div className="flex gap-3 rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-deep)] p-4 md:col-span-4 md:p-5">
              <LockKeyhole className="mt-0.5 size-5 shrink-0 text-[var(--acade-success)]" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-[var(--acade-text)]">Calculate privately</p>
                <p className="mt-1 text-xs leading-5 text-[var(--acade-text-muted)]">
                  Your current entries stay in this browser link until you choose to save or share.
                </p>
              </div>
            </div>
          </header>

          <div className="mt-8">
            <Suspense
              fallback={
                <div role="status" aria-label="Preparing calculator" className="flex min-h-64 items-center justify-center rounded-[var(--radius-dialog)] border border-[var(--acade-border)] bg-[var(--acade-surface)] p-8 text-sm font-medium text-[var(--acade-text-muted)]">
                  Preparing calculator…
                </div>
              }
            >
              <QuickCalculatorInner />
            </Suspense>
          </div>
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
