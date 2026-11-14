import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { examNeededForGrades } from '@/components/cgpa/examNeeded';
import { GradeTable } from '@/components/cgpa/GradeTable';
import { CATALOG_CACHE_PREFIX, loadCourseCatalog, type CatalogCourseDoc } from '@/components/cgpa/courseCatalog';
import { setDiscreetMode } from '@/lib/discreet';
import { prepareSemesterSave, SemesterSaveValidationError } from '@/lib/results/semester-save';
import type { CourseInput } from '@/types/course';

describe('examNeededForGrades (A2)', () => {
  it('gives the exam score needed out of 70 for each passing grade', () => {
    const rows = examNeededForGrades(25);
    expect(rows.map((row) => row.grade)).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(rows.find((row) => row.grade === 'A')).toEqual({ grade: 'A', minScore: 70, needed: 45, status: 'needed' });
    expect(rows.find((row) => row.grade === 'E')).toMatchObject({ needed: 15, status: 'needed' });
  });

  it('marks grades above 70 as not reachable and those at or below 0 as secured', () => {
    expect(examNeededForGrades(0).find((row) => row.grade === 'A')).toMatchObject({ needed: 70, status: 'needed' });
    expect(examNeededForGrades(-1).find((row) => row.grade === 'A')).toMatchObject({ status: 'not-reachable' });
    expect(examNeededForGrades(30).find((row) => row.grade === 'A')).toMatchObject({ needed: 40, status: 'needed' });
    // Hypothetical CA above the D minimum: D and E are secured.
    const high = examNeededForGrades(45);
    expect(high.find((row) => row.grade === 'D')).toMatchObject({ needed: 0, status: 'secured' });
    expect(high.find((row) => row.grade === 'E')).toMatchObject({ status: 'secured' });
  });

  it('keeps decimal CA scores exact', () => {
    expect(examNeededForGrades(19.5).find((row) => row.grade === 'B')).toMatchObject({ needed: 40.5 });
  });
});

describe('awaiting-result rows', () => {
  const arRow: CourseInput = { code: 'CSC 499', title: 'Project', units: 6, caScore: 24, examScore: null, isAR: true };
  const graded: CourseInput = { code: 'CSC 401', title: 'Compilers', units: 3, caScore: 20, examScore: 45 };

  it('keep a CA score and show exam guidance without counting in GPA', () => {
    render(<GradeTable editable initialCourses={[graded, arRow]} />);
    const caInputs = screen.getAllByLabelText('Course 2 CA score out of 30');
    caInputs.forEach((input) => expect(input).toBeEnabled());
    screen.getAllByLabelText('Course 2 exam score out of 70').forEach((input) => expect(input).toBeDisabled());

    const guidance = screen.getAllByRole('region', { name: 'CSC 499: exam score needed' })[0];
    expect(within(guidance).getByText(/guidance/i)).toBeInTheDocument();
    expect(within(guidance).getByText('46')).toBeInTheDocument(); // A: 70 - 24
    // Only the graded course counts: GPA 4.00 (B), 3 units.
    expect(screen.getByTestId('grade-table-gpa')).toHaveTextContent('4.00');
    expect(screen.getByTestId('grade-table-units')).toHaveTextContent('3');
  });

  it('can be marked and unmarked as awaiting result while editing', () => {
    render(<GradeTable editable initialCourses={[graded]} />);
    const toggle = screen.getAllByRole('checkbox', { name: 'Course 1 awaiting result' })[0];
    fireEvent.click(toggle);
    screen.getAllByLabelText('Course 1 exam score out of 70').forEach((input) => {
      expect(input).toBeDisabled();
      expect(input).toHaveValue(null);
    });
    expect(screen.getAllByLabelText('Course 1 CA score out of 30')[0]).toHaveValue(20);
    expect(screen.getAllByRole('region', { name: 'CSC 401: exam score needed' }).length).toBeGreaterThan(0);
  });

  it('are saved with their CA and no exam score, outside the GPA', () => {
    const prepared = prepareSemesterSave([graded, arRow]);
    expect(prepared.courses[1]).toMatchObject({ code: 'CSC 499', caScore: 24, examScore: null, totalScore: null, grade: null, isAR: true });
    expect(prepared.summary).toMatchObject({ gpa: 4, creditLoaded: 3 });
  });

  it('still reject an out-of-range CA on an awaiting-result row', () => {
    expect(() => prepareSemesterSave([graded, { ...arRow, caScore: 31 }])).toThrow(SemesterSaveValidationError);
  });

  it('save a blank CA as null', () => {
    const prepared = prepareSemesterSave([graded, { ...arRow, caScore: null }]);
    expect(prepared.courses[1]).toMatchObject({ caScore: null, examScore: null });
  });
});

describe('course-code autocomplete (A10)', () => {
  const catalog = [
    { code: 'CSC 401', title: 'Compiler Construction', units: 3 },
    { code: 'GST 401', title: 'Entrepreneurship', units: 2 },
  ];

  it('offers catalogue codes and titles and fills title and units, never scores', () => {
    render(<GradeTable editable initialCourses={[{ code: '', title: '', units: 3, caScore: null, examScore: null }]} catalog={catalog} />);
    const code = screen.getAllByLabelText('Course 1 code')[0];
    const listId = code.getAttribute('list');
    expect(listId).toBeTruthy();
    const options = document.getElementById(listId!)!.querySelectorAll('option');
    expect(Array.from(options).map((option) => option.value)).toEqual(['CSC 401', 'GST 401']);

    fireEvent.change(code, { target: { value: 'gst401' } });
    expect(screen.getAllByLabelText('Course 1 code')[0]).toHaveValue('GST 401');
    expect(screen.getAllByLabelText('Course 1 title')[0]).toHaveValue('Entrepreneurship');
    expect(screen.getAllByLabelText('Course 1 units')[0]).toHaveValue(2);
    expect(screen.getAllByLabelText('Course 1 CA score out of 30')[0]).toHaveValue(null);
    expect(screen.getAllByLabelText('Course 1 exam score out of 70')[0]).toHaveValue(null);
  });

  it('does not overwrite a title the student already typed', () => {
    render(<GradeTable editable initialCourses={[{ code: '', title: 'My own title', units: 4, caScore: 10, examScore: 40 }]} catalog={catalog} />);
    fireEvent.change(screen.getAllByLabelText('Course 1 code')[0], { target: { value: 'CSC 401' } });
    expect(screen.getAllByLabelText('Course 1 title')[0]).toHaveValue('My own title');
    expect(screen.getAllByLabelText('Course 1 units')[0]).toHaveValue(4);
    expect(screen.getAllByLabelText('Course 1 CA score out of 30')[0]).toHaveValue(10);
  });

  it('fills code and units from a chosen catalogue title', () => {
    render(<GradeTable editable initialCourses={[{ code: '', title: '', units: 3, caScore: null, examScore: null }]} catalog={catalog} />);
    fireEvent.change(screen.getAllByLabelText('Course 1 title')[0], { target: { value: 'entrepreneurship' } });
    expect(screen.getAllByLabelText('Course 1 code')[0]).toHaveValue('GST 401');
    expect(screen.getAllByLabelText('Course 1 units')[0]).toHaveValue(2);
  });
});

describe('loadCourseCatalog', () => {
  beforeEach(() => sessionStorage.clear());

  const docs: CatalogCourseDoc[] = [
    { code: 'mth 401', title: 'Real Analysis', units: 3, department: 'Mathematics', level: 400, semester: 1 },
    { code: 'CSC 401', title: 'Compilers', units: 3, department: 'Computer Science', level: 400, semester: 1, updatedAt: { toMillis: () => 5 } },
    { code: 'BAD', title: '', units: 0, department: 'Computer Science', level: 400, semester: 1 },
  ];

  it('queries once per department, level and semester, then reads the session cache', async () => {
    const query = vi.fn().mockResolvedValue(docs);
    const first = await loadCourseCatalog({ department: 'Computer Science', level: 400, semester: 1 }, query);
    expect(first.map((course) => course.code)).toEqual(['CSC 401', 'MTH 401']);
    expect(query).toHaveBeenCalledWith(400, 1);

    const second = await loadCourseCatalog({ department: 'computer science ', level: 400, semester: 1 }, query);
    expect(second).toEqual(first);
    expect(query).toHaveBeenCalledTimes(1);
    const cached = JSON.parse(sessionStorage.getItem(Object.keys(sessionStorage).find((key) => key.startsWith(CATALOG_CACHE_PREFIX))!)!);
    expect(cached.revision).toBe(5);
  });

  it('returns an empty list when the catalogue cannot be read', async () => {
    const query = vi.fn().mockRejectedValue(new Error('permission-denied'));
    await expect(loadCourseCatalog({ department: 'X', level: 100, semester: 2 }, query)).resolves.toEqual([]);
  });
});

describe('GradeTable discreet mode', () => {
  afterEach(() => act(() => setDiscreetMode(false)));

  it('hides GPA and grades until the student reveals them', () => {
    act(() => setDiscreetMode(true));
    render(<GradeTable initialCourses={[{ code: 'CSC 401', title: 'Compilers', units: 3, caScore: 20, examScore: 45 }]} />);
    expect(screen.getByText('GPA hidden')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Grades hidden, activate to reveal' }));
    expect(screen.queryByText('GPA hidden')).not.toBeInTheDocument();
    expect(screen.getByTestId('grade-table-gpa')).toHaveTextContent('4.00');
  });
});

describe('import requests (R1.2)', () => {
  const csc201: CourseInput = { code: 'CSC 201', title: 'Programming', units: 3, caScore: 20, examScore: 50 };
  const mth202: CourseInput = { code: 'MTH 202', title: 'Calculus', units: 3, caScore: null, examScore: null };

  it('merges rows, skips codes already present (normalised) and reports counts', () => {
    const onImportResult = vi.fn();
    const { rerender } = render(<GradeTable editable initialCourses={[csc201]} />);
    expect(screen.getAllByLabelText(/Course \d+ CA score out of 30/).length).toBeGreaterThan(0);

    rerender(
      <GradeTable
        editable
        initialCourses={[csc201]}
        importRequest={{ id: 1, rows: [{ ...csc201, code: 'csc201' }, mth202] }}
        onImportResult={onImportResult}
      />,
    );

    expect(onImportResult).toHaveBeenCalledTimes(1);
    expect(onImportResult).toHaveBeenCalledWith({ added: 1, skipped: 1 });
    expect(screen.getAllByLabelText('Course 2 CA score out of 30').length).toBeGreaterThan(0);
    expect(screen.queryAllByLabelText('Course 3 CA score out of 30')).toHaveLength(0);
  });

  it('does not run on first mount and runs once per request id', () => {
    const onImportResult = vi.fn();
    const request = { id: 7, rows: [mth202] };
    const { rerender } = render(<GradeTable editable initialCourses={[csc201]} importRequest={request} onImportResult={onImportResult} />);
    expect(onImportResult).not.toHaveBeenCalled();

    rerender(<GradeTable editable initialCourses={[csc201]} importRequest={{ id: 8, rows: [mth202] }} onImportResult={onImportResult} />);
    rerender(<GradeTable editable initialCourses={[csc201]} importRequest={{ id: 8, rows: [mth202] }} onImportResult={onImportResult} />);
    expect(onImportResult).toHaveBeenCalledTimes(1);
  });

  it('replaces a single blank placeholder row instead of keeping it', () => {
    const onImportResult = vi.fn();
    const blank: CourseInput = { code: '', title: '', units: 3, caScore: null, examScore: null };
    const { rerender } = render(<GradeTable editable initialCourses={[blank]} />);
    rerender(<GradeTable editable initialCourses={[blank]} importRequest={{ id: 1, rows: [mth202] }} onImportResult={onImportResult} />);
    expect(onImportResult).toHaveBeenCalledWith({ added: 1, skipped: 0 });
    expect(screen.queryAllByLabelText('Course 2 CA score out of 30')).toHaveLength(0);
  });
});