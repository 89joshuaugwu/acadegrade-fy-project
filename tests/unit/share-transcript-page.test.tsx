import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { pdfPages, pdfText, pdfFonts, pdfFills, tableCalls } = vi.hoisted(() => ({
  pdfPages: { count: 2, current: 1 },
  pdfText: [] as Array<{ page: number; text: string }>,
  pdfFonts: [] as string[],
  pdfFills: [] as number[][],
  tableCalls: [] as Array<Record<string, any>>,
}));

vi.mock('next/navigation', () => ({ useParams: () => ({ shareId: 'abc123' }) }));
vi.mock('jspdf-autotable', () => ({
  default: vi.fn((doc: { lastAutoTable?: { finalY: number } }, options: Record<string, any>) => {
    tableCalls.push(options);
    doc.lastAutoTable = { finalY: 120 };
  }),
}));
vi.mock('jspdf', () => {
  class FakePdf {
    internal = {
      pageSize: { width: 210, height: 297 },
      getNumberOfPages: () => pdfPages.count,
    };
    lastAutoTable = { finalY: 120 };
    text(value: string | string[]) {
      for (const line of Array.isArray(value) ? value : [value]) pdfText.push({ page: pdfPages.current, text: line });
    }
    setPage(page: number) { pdfPages.current = page; }
    addPage() { pdfPages.current += 1; }
    save() {}
    addImage() {}
    setFont() {}
    setFontSize() {}
    setTextColor() {}
    setDrawColor() {}
    setFillColor(...rgb: number[]) { pdfFills.push(rgb); }
    setLineWidth() {}
    rect() {}
    line() {}
    circle() {}
    addFileToVFS() {}
    addFont(_file: string, family: string, style: string) { pdfFonts.push(`${family}:${style}`); }
  }
  return { default: FakePdf };
});

import { readFileSync } from 'node:fs';
import path from 'node:path';
import ShareTranscriptPage from '@/app/(public)/share/[shareId]/page';
import { shareMetadataFor } from '@/app/(public)/share/[shareId]/metadata';
import { computeCourseMetrics, computeCumulativeCGPA, computeSemesterGPA, formatCgpa, type AcademicCourseInput } from '@/lib/cgpa/academicRules';
import {
  SELF_REPORTED_NOTICE,
  UNOFFICIAL_RECORD_HEADING,
  UNSPECIFIED_UNIVERSITY,
  resolveUniversityName,
} from '@/app/(public)/share/[shareId]/record-labels';

function sharedRecord(overrides: Record<string, unknown> = {}) {
  return {
    studentName: 'Ada Example',
    matric: '2022/000001',
    department: 'Computer Science',
    programme: 'B.Sc. Computer Science',
    currentLevel: '300',
    showPhoto: false,
    createdAt: null,
    semesters: [
      {
        id: 's1',
        label: '100L First Semester',
        session: '2022/2023',
        level: 100,
        semester: 1,
        gpa: 4,
        pi: 3.4,
        creditLoaded: 4,
        courses: [{ id: 'c1', code: 'GST 111', title: 'Communication in English', units: 4, totalScore: 68, grade: 'B', gradePoint: 4 }],
      },
    ],
    ...overrides,
  };
}

function mockShare(record: Record<string, unknown>) {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    if (String(input).startsWith('/api/transcript/share')) {
      return { ok: true, json: async () => ({ transcript: record }) } as Response;
    }
    return { ok: false } as Response;
  }));
}

beforeEach(() => {
  pdfText.length = 0;
  pdfFonts.length = 0;
  pdfFills.length = 0;
  tableCalls.length = 0;
  pdfPages.current = 1;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('resolveUniversityName', () => {
  it('uses the student-entered university as plain text and falls back neutrally', () => {
    expect(resolveUniversityName({ university: '  University of Lagos ' })).toBe('University of Lagos');
    expect(resolveUniversityName({ institution: 'Covenant University' })).toBe('Covenant University');
    expect(resolveUniversityName({ university: '   ' })).toBe(UNSPECIFIED_UNIVERSITY);
    expect(resolveUniversityName(null)).toBe('University not specified');
  });
});

describe('Shared academic record page', () => {
  it('labels the record as unofficial and self-reported, using the student’s own university', async () => {
    mockShare(sharedRecord({ university: 'University of Lagos' }));
    const { container } = render(<ShareTranscriptPage />);

    expect(await screen.findByRole('heading', { name: UNOFFICIAL_RECORD_HEADING })).toBeInTheDocument();
    expect(screen.getByText('University of Lagos')).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent(SELF_REPORTED_NOTICE);
    expect(container).not.toHaveTextContent(/enugu state university|agbani/i);
    expect(container.querySelector('.holographic-seal')).not.toBeInTheDocument();
    expect(document.head.innerHTML + container.innerHTML).not.toMatch(/holographic/i);
  });

  it('never names an institution when the share data has none', async () => {
    mockShare(sharedRecord());
    const { container } = render(<ShareTranscriptPage />);

    expect(await screen.findByText(UNSPECIFIED_UNIVERSITY)).toBeInTheDocument();
    expect(container).not.toHaveTextContent(/enugu|esut/i);
  });

  it('prints the self-reported notice on every PDF page and no hard-coded institution', async () => {
    const user = userEvent.setup();
    mockShare(sharedRecord({ university: 'University of Lagos' }));
    render(<ShareTranscriptPage />);

    await user.click(await screen.findByRole('button', { name: /download pdf/i }));

    await waitFor(() => expect(pdfText.some(({ text }) => text === UNOFFICIAL_RECORD_HEADING)).toBe(true));
    const allText = pdfText.map(({ text }) => text).join('\n');
    expect(allText).not.toMatch(/enugu|agbani/i);
    expect(allText).toContain('University of Lagos');
    for (let page = 1; page <= pdfPages.count; page += 1) {
      expect(pdfText.some((entry) => entry.page === page && entry.text === SELF_REPORTED_NOTICE)).toBe(true);
    }
  });
});

describe('Shared record degree class', () => {
  function recordWithCgpa(gpa: number) {
    return sharedRecord({
      semesters: [{ id: 's1', label: '100L First Semester', session: '2022/2023', level: 100, semester: 1, gpa, pi: gpa, creditLoaded: 10, courses: [] }],
    });
  }

  it.each([
    [1.2, 'Pass'],
    [0.99, 'Fail'],
    [1.495, 'Third Class Honours'],
    [4.495, 'First Class Honours'],
  ])('classifies a CGPA of %s with the shared rules as %s', async (gpa, label) => {
    mockShare(recordWithCgpa(gpa));
    render(<ShareTranscriptPage />);

    expect(await screen.findByText(label)).toBeInTheDocument();
  });

  it('displays and classifies the server snapshot CGPA instead of recomputing it', async () => {
    // Semesters alone would give 2.00 (Third Class); the server's figure wins.
    mockShare({ ...recordWithCgpa(2), cgpa: 3.495, pi: 3.1, totalCredits: 48, university: 'University of Lagos' });
    render(<ShareTranscriptPage />);

    expect(await screen.findByText('Second Class Honours (Upper Division)')).toBeInTheDocument();
    expect(screen.getByText('3.50')).toBeInTheDocument();
    expect(screen.getByText('3.10')).toBeInTheDocument();
    expect(screen.getByText('48')).toBeInTheDocument();
  });

  it('recomputes with the shared cumulative rule for old snapshots without a CGPA', async () => {
    mockShare(sharedRecord({
      semesters: [
        { id: 's1', label: '100L First Semester', session: '2022/2023', level: 100, semester: 1, gpa: 4, pi: 3, creditLoaded: 10, courses: [] },
        { id: 's2', label: '100L Second Semester', session: '2022/2023', level: 100, semester: 2, gpa: 3, pi: 2, creditLoaded: 0, courses: [] },
        { id: 's3', label: '200L First Semester', session: '2023/2024', level: 200, semester: 1, gpa: 2.99, pi: 2.5, creditLoaded: 10, courses: [] },
      ],
    }));
    render(<ShareTranscriptPage />);

    // (4 × 10 + 2.99 × 10) / 20 = 3.495 → 3.50 → 2:1; the zero-credit semester is ignored.
    expect(await screen.findByText('Second Class Honours (Upper Division)')).toBeInTheDocument();
    expect(screen.getAllByText('3.50').length).toBeGreaterThan(0);
  });

  it('shows the CGPA rounded half-up exactly as the dashboard does', async () => {
    mockShare(recordWithCgpa(4.495));
    render(<ShareTranscriptPage />);

    expect((await screen.findAllByText('4.50')).length).toBeGreaterThan(0);
    expect(screen.queryByText('4.49')).not.toBeInTheDocument();
  });
});

/**
 * SAMPLE fixture from share-transcript.md §12 (an invented student; tests and
 * screenshots only). The semester figures come from the real engine.
 */
const SAMPLE_SEMESTERS: Array<{ label: string; courses: Array<[string, string, number, number, number]> }> = [
  {
    label: '100L First Semester',
    courses: [
      ['GST 111', 'Use of English', 2, 22, 52],
      ['MTH 101', 'Elementary Mathematics I', 3, 20, 44],
      ['PHY 101', 'General Physics I', 3, 18, 35],
      ['CSC 101', 'Introduction to Computer Science', 3, 25, 53],
      ['CHM 101', 'General Chemistry I', 3, 21, 41],
    ],
  },
  {
    label: '100L Second Semester',
    courses: [
      ['GST 112', 'Philosophy and Logic', 2, 19, 43],
      ['MTH 102', 'Elementary Mathematics II', 3, 26, 48],
      ['PHY 102', 'General Physics II', 3, 10, 22],
      ['CSC 102', 'Introduction to Programming', 3, 27, 50],
      ['STA 112', 'Descriptive Statistics', 2, 17, 36],
    ],
  },
];

function sampleRecord() {
  const semesters = SAMPLE_SEMESTERS.map((semester, index) => {
    const metrics = semester.courses.map(([code, title, units, caScore, examScore]) =>
      computeCourseMetrics({ code, title, units, caScore, examScore } satisfies AcademicCourseInput),
    );
    const result = computeSemesterGPA(metrics);
    return {
      id: `s${index + 1}`,
      label: semester.label,
      session: '2022/2023',
      level: 100,
      semester: index + 1,
      gpa: result.gpa,
      pi: result.pi,
      creditLoaded: result.creditLoaded,
      courses: metrics.map((course, row) => ({ id: `c${index}-${row}`, ...course })),
    };
  });
  const cumulative = computeCumulativeCGPA(semesters);
  return {
    studentName: 'Chiamaka Eze',
    matric: '2022/245118',
    department: 'Computer Science',
    programme: 'B.Sc. Computer Science',
    currentLevel: '200',
    university: 'Example University',
    showPhoto: false,
    cgpa: cumulative.cgpa,
    pi: cumulative.pi,
    totalCredits: cumulative.totalCredits,
    semesters,
  };
}

describe('SAMPLE record (pinned against the engine)', () => {
  it('adds up exactly as the plan says', () => {
    const record = sampleRecord();
    const [first, second] = record.semesters;
    expect([first.creditLoaded, formatCgpa(first.gpa), formatCgpa(first.pi)]).toEqual([14, '4.14', '3.28']);
    expect([second.creditLoaded, formatCgpa(second.gpa), formatCgpa(second.pi)]).toEqual([13, '3.38', '3.00']);
    expect([formatCgpa(record.cgpa), formatCgpa(record.pi), record.totalCredits]).toEqual(['3.78', '3.14', 27]);
  });

  it('renders the semester totals, points, the F in examiner red and the cumulative bar', async () => {
    mockShare(sampleRecord());
    const { container } = render(<ShareTranscriptPage />);

    expect(await screen.findByRole('heading', { level: 2, name: '100L First Semester 2022/2023' })).toBeInTheDocument();
    expect(screen.getByText('58 points')).toBeInTheDocument();
    expect(screen.getByText('44 points')).toBeInTheDocument();
    expect(screen.getByText('GPA 4.14')).toBeInTheDocument();
    expect(screen.getByText('PI 3.28')).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader', { name: 'Points' })).toHaveLength(2);
    expect(screen.queryByRole('columnheader', { name: 'PI' })).not.toBeInTheDocument();
    expect(screen.getByText('3.78')).toBeInTheDocument();
    expect(screen.getByText('Total units')).toBeInTheDocument();
    expect(screen.queryByText(/credits earned/i)).not.toBeInTheDocument();
    expect(screen.getByText('Second Class Honours (Upper Division)')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'CGPA 3.78 of 5.00, Second Class Honours (Upper Division)' })).toBeInTheDocument();

    const phy = screen.getByText('PHY 102').closest('tr') as HTMLElement;
    const failCells = phy.querySelectorAll('td[data-fail="true"]');
    expect([...failCells].map((cell) => cell.textContent)).toEqual(['F', '0']);
    expect(container.querySelectorAll('td[data-fail="true"]')).toHaveLength(2);
    expect(screen.getByText('Matric number')).toBeInTheDocument();
    expect(screen.getByText('200L')).toBeInTheDocument();
  });

  it('draws the PDF in ink with a Points column, F in red and no blue heads', async () => {
    const user = userEvent.setup();
    mockShare(sampleRecord());
    render(<ShareTranscriptPage />);
    await user.click(await screen.findByRole('button', { name: /download pdf/i }));

    await waitFor(() => expect(tableCalls).toHaveLength(2));
    expect(tableCalls[0].head[1]).toEqual(['Code', 'Course title', 'Units', 'CA', 'Exam', 'Total', 'Grade', 'Point', 'Points']);
    expect(tableCalls[0].headStyles.fillColor).toEqual([24, 21, 61]);
    expect(JSON.stringify(tableCalls)).not.toContain('[41,128,185]');
    expect(pdfFills).not.toContainEqual([41, 128, 185]);
    await waitFor(() => expect(pdfText.some(({ text }) => text === 'Page 1 of 2')).toBe(true));
    const allText = pdfText.map(({ text }) => text).join('\n');
    expect(allText).toContain('Total units');
    expect(allText).not.toMatch(/credits earned/i);
    // Helvetica fallback when the font files cannot be fetched.
    expect(pdfFonts).toEqual([]);
  });

  it('embeds Hanken Grotesk 400 and 500 when the font files load', async () => {
    const user = userEvent.setup();
    const record = sampleRecord();
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('/api/transcript/share')) return { ok: true, json: async () => ({ transcript: record }) } as Response;
      if (url.startsWith('/fonts/')) return { ok: true, arrayBuffer: async () => new Uint8Array([0, 1, 0, 0]).buffer } as Response;
      return { ok: false } as Response;
    }));
    render(<ShareTranscriptPage />);
    await user.click(await screen.findByRole('button', { name: /download pdf/i }));
    await waitFor(() => expect(pdfFonts).toEqual(['HankenGrotesk:normal', 'HankenGrotesk:bold']));
    await waitFor(() => expect(tableCalls.length).toBeGreaterThan(0));
    expect(tableCalls[0].styles.font).toBe('HankenGrotesk');
  });
});

describe('Shared record loading and errors', () => {
  it('does not import the PDF library until Download PDF is pressed', () => {
    const source = readFileSync(path.resolve('app/(public)/share/[shareId]/page.tsx'), 'utf8');
    expect(source).not.toMatch(/from ['"]jspdf/);
    expect(source).toContain("import('./transcript-pdf')");
  });

  it('says it could not open the record on a network error, and tries again', async () => {
    const user = userEvent.setup();
    let calls = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      calls += 1;
      if (calls === 1) throw new Error('offline');
      return { ok: true, status: 200, json: async () => ({ transcript: sharedRecord() }) } as Response;
    }));
    render(<ShareTranscriptPage />);

    expect(await screen.findByRole('heading', { name: /couldn.t open this record/i })).toBeInTheDocument();
    expect(screen.queryByText(/not found/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByRole('heading', { name: UNOFFICIAL_RECORD_HEADING })).toBeInTheDocument();
  });

  it('shows the end date in the action row and a visitor stub', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ transcript: sharedRecord(), expiresAt: '2026-11-30T12:00:00.000Z' }) }) as Response));
    render(<ShareTranscriptPage />);
    expect(await screen.findByText('Shared with you through AcadeGrade')).toBeInTheDocument();
    expect(screen.getByText('This link works until 30 November 2026')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'What is AcadeGrade?' })).toHaveAttribute('href', '/');
  });
});

describe('share metadata', () => {
  it('is generic for every link and never names the student', () => {
    const meta = shareMetadataFor('abc123');
    expect(meta.title).toBe('Shared transcript');
    expect(meta.robots).toMatchObject({ index: false, follow: false });
    expect(JSON.stringify(meta)).not.toMatch(/Ada|Alice|logo\.png/);
  });
});
