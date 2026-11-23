'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { useOlevelRecord } from '@/hooks/useRecordData';
import { Button } from '@/components/ui/Button';
import { HelpButton } from '@/components/help/HelpDrawer';
import { STUDENT_HELP, studentHelpSource } from '@/lib/help/student-help';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { OLEVEL_EXAMS, OLEVEL_GRADES, OLEVEL_MAX_SITTINGS, OLEVEL_MAX_SUBJECTS, OLEVEL_MIN_YEAR, TARGET_COURSE_NAME_MAX, TARGET_COURSE_REQUIRED_MAX, type OlevelEntryGrade, type OlevelExam } from '@/lib/records/olevelRules';
import { ENGLISH_ID, MATHEMATICS_ID } from '@/lib/records/olevelSubjects';
import { draftFromRecord, emptySitting, newRow, recordFromDraft, type DraftProblem, type DraftSitting, type OlevelDraft } from '@/lib/records/draft';
import { newSittingId, RecordSaveError, saveOlevelRecord } from '@/lib/records/store';
import { subjectLabel } from '@/lib/records/summary';
import { OlevelResult } from './OlevelResult';
import { SubjectPicker } from './SubjectPicker';

const GRADE_OPTIONS = [
  ...OLEVEL_GRADES.map((band) => ({ value: band.grade, label: band.grade })),
  { value: 'AR', label: 'Awaiting' },
];
const EXAM_OPTIONS = OLEVEL_EXAMS.map((exam) => ({ value: exam.id, label: exam.name }));
const SITTING_NAMES = ['First sitting', 'Second sitting'];

const PANEL = 'min-w-0 rounded-[var(--radius-surface)] border border-[var(--acade-border)] bg-[var(--acade-deep)] p-4 sm:p-6';

export function OlevelWorkspace() {
  const { uid } = useAuth();
  const { data, loading, error } = useOlevelRecord();
  const currentYear = new Date().getFullYear();
  const [draft, setDraft] = useState<OlevelDraft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [showProblems, setShowProblems] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load the saved record once; later snapshots (this device's own save) never overwrite edits.
  useEffect(() => {
    if (loading || error) return;
    if (!draft || !dirty) setDraft(draftFromRecord(data, currentYear));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, loading, error]);

  const computed = useMemo(() => (draft ? recordFromDraft(draft) : null), [draft]);
  const problems = showProblems && computed ? computed.problems : [];

  const yearOptions = useMemo(
    () => Array.from({ length: currentYear - OLEVEL_MIN_YEAR + 1 }, (_, index) => {
      const year = String(currentYear - index);
      return { value: year, label: year };
    }),
    [currentYear],
  );

  if (error) {
    return (
      <section className={PANEL} role="alert">
        <h1 className="font-[family-name:var(--font-bricolage)] text-[1.5rem] font-bold text-[var(--acade-text)]">Your O-level results could not load</h1>
        <p className="mt-2 text-[0.9375rem] text-[var(--acade-text-muted)]">Check your connection and try again. Nothing you saved has changed.</p>
        <Button className="mt-4" variant="outline" onClick={() => window.location.reload()}>
          <RefreshCw size={16} className="mr-2" aria-hidden="true" /> Try again
        </Button>
      </section>
    );
  }

  if (loading || !draft || !computed) {
    return (
      <div className="grid gap-6 lg:grid-cols-12" aria-busy="true" aria-label="Loading your O-level results">
        <Skeleton className="h-[28rem] lg:col-span-7" />
        <Skeleton className="h-72 lg:col-span-5" />
      </div>
    );
  }

  const update = (next: OlevelDraft) => {
    setDraft(next);
    setDirty(true);
  };
  const updateSitting = (index: number, change: Partial<DraftSitting>) => {
    update({ ...draft, sittings: draft.sittings.map((sitting, i) => (i === index ? { ...sitting, ...change } : sitting)) });
  };
  const problemFor = (sitting: number, row: number | undefined, field: DraftProblem['field']) =>
    problems.find((problem) => problem.sitting === sitting && problem.row === row && problem.field === field)?.message;

  const save = async () => {
    if (!uid) return;
    if (computed.problems.length > 0) {
      setShowProblems(true);
      requestAnimationFrame(() => {
        const target = document.querySelector<HTMLElement>('[data-olevel-problem="true"] input, [data-olevel-problem="true"] button');
        target?.focus();
        target?.scrollIntoView({ block: 'center' });
      });
      return;
    }
    setSaving(true);
    try {
      await saveOlevelRecord(uid, computed.record, currentYear);
      setDirty(false);
      setShowProblems(false);
      toast.success('Your O-level results are saved');
    } catch (saveError) {
      toast.error(saveError instanceof RecordSaveError ? 'Some rows need checking before they can be saved.' : "Couldn't save. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const courseIds = draft.required;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-[family-name:var(--font-bricolage)] text-[1.75rem] font-bold tracking-[-0.03em] text-[var(--acade-text)] sm:text-[2rem]">
            WAEC and NECO results
          </h1>
          <p className="mt-1 max-w-[60ch] text-[0.9375rem] text-[var(--acade-text-muted)]">
            Up to two sittings. We take your best grade in each subject and check it against the usual admission rule.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:shrink-0">
          <HelpButton entryId={STUDENT_HELP.olevel} source={studentHelpSource} />
          <Button variant={dirty ? 'primary' : 'outline'} onClick={() => void save()} loading={saving} loadingLabel="Saving…">
            {dirty ? 'Save results' : 'Saved'}
          </Button>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-6 lg:order-2 lg:col-span-5 lg:sticky lg:top-24">
          <section aria-labelledby="olevel-result-title" className={PANEL}>
            <h2 id="olevel-result-title" className="sr-only">Your result</h2>
            <OlevelResult record={computed.record} headingLevel={3} />
          </section>

          <section aria-labelledby="olevel-course-title" className={PANEL}>
            <h2 id="olevel-course-title" className="text-[1.0625rem] font-semibold text-[var(--acade-text)]">Your course (optional)</h2>
            <p className="mt-1 text-[0.875rem] text-[var(--acade-text-muted)]">
              Add the subjects your course asks for on top of English and Maths, for example Biology, Chemistry and Physics for Medicine.
            </p>
            <div className="mt-4 flex flex-col gap-4">
              <Input
                label="Course"
                placeholder="e.g. Medicine and Surgery"
                maxLength={TARGET_COURSE_NAME_MAX}
                value={draft.courseName}
                onChange={(event) => update({ ...draft, courseName: event.target.value })}
              />
              {courseIds.length > 0 ? (
                <ul className="flex flex-wrap gap-2" aria-label="Subjects your course needs">
                  {courseIds.map((id) => (
                    <li key={id} className="flex items-center gap-1 rounded-full bg-[var(--acade-overlay)] py-1 pl-3 pr-1 text-[0.875rem] font-medium text-[var(--acade-text)]">
                      {subjectLabel(id, draft.sittings.flatMap((s) => s.rows).find((row) => row.subjectId === id)?.name)}
                      <button
                        type="button"
                        aria-label={`Remove ${subjectLabel(id)}`}
                        onClick={() => update({ ...draft, required: courseIds.filter((item) => item !== id) })}
                        className="grid size-8 place-items-center rounded-full text-[var(--acade-text-muted)] hover:bg-[var(--acade-deep)] hover:text-[var(--acade-text)] focus-visible:outline-2 focus-visible:outline-[var(--acade-primary)]"
                      >
                        <X size={14} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {courseIds.length < TARGET_COURSE_REQUIRED_MAX ? (
                <SubjectPicker
                  key={courseIds.join('|')}
                  label="Add a subject your course needs"
                  value={null}
                  excludeIds={[ENGLISH_ID, MATHEMATICS_ID, ...courseIds]}
                  onChange={(picked) => {
                    if (picked && !courseIds.includes(picked.subjectId)) update({ ...draft, required: [...courseIds, picked.subjectId] });
                  }}
                />
              ) : null}
            </div>
          </section>
        </div>

        <div id="sittings" className="flex min-w-0 scroll-mt-24 flex-col gap-6 lg:order-1 lg:col-span-7">
          {draft.sittings.map((sitting, sittingIndex) => {
            const usedIds = sitting.rows.map((row) => row.subjectId).filter(Boolean);
            const yearError = problemFor(sittingIndex, undefined, 'year');
            return (
              <section key={sitting.id} aria-labelledby={`${sitting.id}-title`} className={PANEL}>
                <div className="flex items-center justify-between gap-3">
                  <h2 id={`${sitting.id}-title`} className="font-[family-name:var(--font-bricolage)] text-[1.25rem] font-bold tracking-[-0.02em] text-[var(--acade-text)]">
                    {SITTING_NAMES[sittingIndex]}
                  </h2>
                  {draft.sittings.length > 1 ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => update({ ...draft, sittings: draft.sittings.filter((_, i) => i !== sittingIndex) })}
                    >
                      <Trash2 size={16} className="mr-2" aria-hidden="true" /> Remove sitting
                    </Button>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
                  <Select
                    label="Exam"
                    options={EXAM_OPTIONS}
                    value={sitting.exam}
                    onChange={(value) => updateSitting(sittingIndex, { exam: value as OlevelExam })}
                  />
                  <div data-olevel-problem={yearError ? 'true' : undefined}>
                    <Select
                      label="Year"
                      searchable
                      placeholder="Pick a year"
                      options={yearOptions}
                      value={sitting.year === null ? '' : String(sitting.year)}
                      error={yearError}
                      onChange={(value) => updateSitting(sittingIndex, { year: Number(value) })}
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <div className="hidden grid-cols-[minmax(0,1fr)_6.5rem_3rem] gap-3 pb-2 text-[0.8125rem] font-medium text-[var(--acade-text-muted)] sm:grid" aria-hidden="true">
                    <span>Subject</span>
                    <span>Grade</span>
                    <span />
                  </div>
                  <ul className="flex flex-col gap-3">
                    {sitting.rows.map((row, rowIndex) => {
                      const subjectError = problemFor(sittingIndex, rowIndex, 'subject');
                      const gradeError = problemFor(sittingIndex, rowIndex, 'grade');
                      const rowName = row.name || subjectLabel(row.subjectId) || `subject ${rowIndex + 1}`;
                      return (
                        <li
                          key={row.key}
                          data-olevel-problem={subjectError || gradeError ? 'true' : undefined}
                          className="grid grid-cols-[minmax(0,1fr)_5.25rem_2.75rem] items-start gap-2 sm:grid-cols-[minmax(0,1fr)_6.5rem_3rem] sm:gap-3"
                        >
                          <SubjectPicker
                            label={`Subject ${rowIndex + 1}`}
                            hideLabel
                            value={row.subjectId ? { subjectId: row.subjectId, name: row.name || subjectLabel(row.subjectId) } : null}
                            excludeIds={usedIds.filter((id) => id !== row.subjectId)}
                            error={subjectError}
                            onChange={(picked) => updateSitting(sittingIndex, {
                              rows: sitting.rows.map((item, i) => (i === rowIndex ? { ...item, subjectId: picked?.subjectId ?? '', name: picked?.name ?? '' } : item)),
                            })}
                          />
                          <div className="min-w-0">
                            <Select
                              placeholder="Grade"
                              options={GRADE_OPTIONS}
                              value={row.grade}
                              error={gradeError ? 'Pick a grade' : undefined}
                              onChange={(value) => updateSitting(sittingIndex, {
                                rows: sitting.rows.map((item, i) => (i === rowIndex ? { ...item, grade: value as OlevelEntryGrade } : item)),
                              })}
                            />
                          </div>
                          <IconButton
                            className="size-11 sm:size-12"
                            aria-label={`Remove ${rowName}`}
                            onClick={() => updateSitting(sittingIndex, { rows: sitting.rows.filter((_, i) => i !== rowIndex) })}
                          >
                            <Trash2 size={18} aria-hidden="true" />
                          </IconButton>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    {sitting.rows.length < OLEVEL_MAX_SUBJECTS ? (
                      <Button variant="outline" size="sm" onClick={() => updateSitting(sittingIndex, { rows: [...sitting.rows, newRow()] })}>
                        <Plus size={16} className="mr-2" aria-hidden="true" /> Add subject
                      </Button>
                    ) : (
                      <p className="text-[0.875rem] text-[var(--acade-text-muted)]">Nine subjects is the most one sitting can have.</p>
                    )}
                    <p className="text-[0.8125rem] text-[var(--acade-text-muted)]">
                      A1 to C6 are credits. D7 and E8 are passes. F9 is a fail.
                    </p>
                  </div>
                </div>
              </section>
            );
          })}

          {draft.sittings.length < OLEVEL_MAX_SITTINGS ? (
            <button
              type="button"
              onClick={() => update({ ...draft, sittings: [...draft.sittings, emptySitting(newSittingId(), null)] })}
              className="flex min-h-14 items-center justify-center gap-2 rounded-[var(--radius-surface)] border border-dashed border-[var(--acade-control-border)] px-4 text-[0.9375rem] font-semibold text-[var(--acade-primary)] transition-colors hover:border-[var(--acade-primary)] hover:bg-[var(--acade-primary-dim)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-primary)]"
            >
              <Plus size={18} aria-hidden="true" /> Add a second sitting
            </button>
          ) : null}

          {problems.length > 0 ? (
            <div role="alert" className="rounded-xl bg-[var(--acade-danger-dim)] px-4 py-3 text-[0.9375rem] text-[var(--acade-text)]">
              {problems.length === 1 ? problems[0].message : `${problems.length} rows need checking. ${problems[0].message}`}
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button variant={dirty ? 'primary' : 'outline'} onClick={() => void save()} loading={saving} loadingLabel="Saving…">
              {dirty ? 'Save results' : 'Saved'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
