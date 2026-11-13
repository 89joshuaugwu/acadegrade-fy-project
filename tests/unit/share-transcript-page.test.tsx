import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { pdfPages, pdfText } = vi.hoisted(() => ({
  pdfPages: { count: 2, current: 1 },
  pdfText: [] as Array<{ page: number; text: string }>,
}));

vi.mock('next/navigation', () => ({ useParams: () => ({ shareId: 'abc123' }) }));
vi.mock('@/components/layout/Navbar', () => ({ Navbar: () => <header /> }));
vi.mock('@/components/layout/PublicShell', () => ({ PublicFooter: () => <footer /> }));
vi.mock('@/components/cgpa/CGPAArc', () => ({ CGPAArc: () => <div data-testid="cgpa-arc" /> }));
vi.mock('jspdf-autotable', () => ({ default: vi.fn((doc: { lastAutoTable?: { finalY: number } }) => { doc.lastAutoTable = { finalY: 120 }; }) }));
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
    setFillColor() {}
    setLineWidth() {}
    rect() {}
    line() {}
  }
  return { default: FakePdf };
});

import ShareTranscriptPage from '@/app/(public)/share/[shareId]/page';
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
