import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  semesters: [] as Array<Record<string, unknown>>,
  profile: { entrySession: '2024/2025', courseDuration: 4, currentLevel: 100 } as Record<string, unknown>,
  queryCollection: vi.fn(),
  setDocument: vi.fn(),
  push: vi.fn(),
  router: null as null | { push: unknown },
}));
mocks.router = { push: mocks.push };

vi.mock('next/navigation', () => ({ useRouter: () => mocks.router }));
vi.mock('@/hooks/useSemesters', () => ({
  useSemesters: () => ({ semesters: mocks.semesters, loading: false, error: null, retry: vi.fn() }),
}));
vi.mock('@/hooks/usePlatformSettings', () => ({ usePlatformSettings: () => ({ isFeatureDisabled: () => false }) }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
const authValue = { user: { uid: 'student-1' } };
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => authValue }));
const profileValue = { get profile() { return mocks.profile; }, loading: false };
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => profileValue }));
vi.mock('@/lib/firebase/firestore', () => ({
  deleteDocument: vi.fn(),
  queryCollection: mocks.queryCollection,
  setDocument: mocks.setDocument,
}));
vi.mock('@/components/onboarding/ResultsTour', () => ({ ResultsTour: () => null }));
vi.mock('@/components/ads/AdPlacement', () => ({ AdPlacement: () => null }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));

import ResultsListPage from '@/app/(student)/results/page';
import { CalculatorHandoffBanner } from '@/components/dashboard/CalculatorHandoffBanner';
import { GradeTable } from '@/components/cgpa/GradeTable';
import { readCalculatorHandoff, saveCalculatorHandoff } from '@/lib/handoff/calculator';
import { loadDraft, saveDraft } from '@/lib/drafts';

function seedHandoff() {
  saveCalculatorHandoff({ mode: 'score', courses: [{ code: 'MTH 101', units: 3, score: 70 }, { code: 'PHY 101', units: 2, score: 55 }] });
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  mocks.semesters = [];
  mocks.push.mockReset();
  mocks.setDocument.mockReset().mockResolvedValue(undefined);
  mocks.queryCollection.mockReset().mockResolvedValue([]);
});

describe('calculator handoff on /results', () => {
  it('shows no offer without saved calculator rows', () => {
    render(<ResultsListPage />);
    expect(screen.queryByRole('button', { name: /as my first semester/ })).not.toBeInTheDocument();
  });

  it('creates the first semester, keeps the rows as an unsaved draft for review, and clears the handoff', async () => {
    seedHandoff();
    render(<ResultsListPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Add these 2 courses as my first semester' }));

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/results/slot_100_1?from=calculator'));
    expect(mocks.setDocument).toHaveBeenCalledWith('users/student-1/semesters/slot_100_1', expect.objectContaining({ level: 100, semester: 1, isComplete: false }));
    const draft = loadDraft('student-1', 'slot_100_1');
    expect(draft?.courses.map((course) => course.code)).toEqual(['MTH 101', 'PHY 101']);
    expect(draft?.courses[0]).toMatchObject({ units: 3, caScore: 21, examScore: 49 });
    expect(readCalculatorHandoff()).toBeNull();
  });

  it('uses an existing empty semester instead of creating another', async () => {
    seedHandoff();
    mocks.semesters = [{ id: 'slot_100_1', label: '100L First Semester', level: 100, semester: 1, gpa: 0, creditLoaded: 0, isComplete: false }];
    render(<ResultsListPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Add these 2 courses as my first semester' }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/results/slot_100_1?from=calculator'));
    expect(mocks.setDocument).not.toHaveBeenCalled();
  });

  it('keeps the rows when the semester cannot be created', async () => {
    seedHandoff();
    mocks.setDocument.mockRejectedValue(new Error('offline'));
    render(<ResultsListPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Add these 2 courses as my first semester' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not/i);
    expect(readCalculatorHandoff()).not.toBeNull();
  });

  it('dismiss clears the saved rows', () => {
    seedHandoff();
    render(<ResultsListPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(readCalculatorHandoff()).toBeNull();
    expect(screen.queryByRole('button', { name: /as my first semester/ })).not.toBeInTheDocument();
  });
});

describe('CalculatorHandoffBanner on /dashboard', () => {
  it('links to /results once when calculator rows are waiting', () => {
    seedHandoff();
    const first = render(<CalculatorHandoffBanner />);
    expect(screen.getByRole('link', { name: /review them in results/i })).toHaveAttribute('href', '/results');
    first.unmount();
    render(<CalculatorHandoffBanner />);
    expect(screen.queryByRole('link', { name: /review them in results/i })).not.toBeInTheDocument();
  });

  it('shows nothing without calculator rows', () => {
    const view = render(<CalculatorHandoffBanner />);
    expect(view.container).toBeEmptyDOMElement();
  });
});

describe('GradeTable with handed-off rows', () => {
  it('applies the draft straight away for review instead of asking to restore', () => {
    saveDraft('student-1', 'slot_100_1', [{ code: 'MTH 101', title: '', units: 3, caScore: null, examScore: null, grade: 'B' }]);
    act(() => {
      render(<GradeTable editable initialCourses={[]} draft={{ uid: 'student-1', semesterId: 'slot_100_1' }} restoreDraftOnMount />);
    });
    expect(screen.queryByRole('region', { name: 'Restore unsaved changes?' })).not.toBeInTheDocument();
    expect(screen.getAllByLabelText('Course 1 code')[0]).toHaveValue('MTH 101');
    expect(screen.getAllByText('Calculator grade B: enter scores').length).toBeGreaterThan(0);
  });
});
