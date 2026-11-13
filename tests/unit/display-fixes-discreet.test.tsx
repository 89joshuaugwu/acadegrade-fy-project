import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  semesters: [] as Array<Record<string, unknown>>,
  queryCollection: vi.fn(),
  profile: {} as Record<string, unknown>,
}));

vi.mock('@/components/cgpa/CGPAArc', () => ({ CGPAArc: () => <div>Academic metric arc</div> }));
vi.mock('@/hooks/useSemesters', () => ({
  useSemesters: () => ({ semesters: mocks.semesters, loading: false, error: null, retry: vi.fn() }),
}));
vi.mock('@/hooks/usePlatformSettings', () => ({ usePlatformSettings: () => ({ isFeatureDisabled: () => false }) }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
const authValue = { user: { uid: 'student-1', photoURL: null, getIdToken: vi.fn() }, loading: false };
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => authValue }));
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => ({ profile: mocks.profile }) }));
vi.mock('@/lib/firebase/firestore', () => ({
  deleteDocument: vi.fn(),
  queryCollection: mocks.queryCollection,
  getDocument: vi.fn().mockResolvedValue(null),
  where: vi.fn(),
}));
vi.mock('@/components/onboarding/ResultsTour', () => ({ ResultsTour: () => null }));
vi.mock('@/components/ads/AdPlacement', () => ({ AdPlacement: () => null }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn(), loading: vi.fn() } }));

import { StandingOverview } from '@/components/dashboard/StandingOverview';
import { RecentResults } from '@/components/dashboard/RecentResults';
import ResultsListPage from '@/app/(student)/results/page';
import TranscriptPage from '@/app/(student)/transcript/page';
import { setDiscreetMode } from '@/lib/discreet';

const standing = (overrides: Partial<React.ComponentProps<typeof StandingOverview>> = {}) => (
  <StandingOverview
    hasAcademicData
    isPIMode={false}
    onModeChange={() => undefined}
    cgpa={1.005}
    pi={3.2}
    degreeClassLabel="Second Class Upper"
    latestSemesterLabel="Year 2 First Semester"
    currentSemesterMetric={2.675}
    totalCredits={40}
    coursesDone={14}
    atRiskCount={0}
    unknownCount={0}
    {...overrides}
  />
);

afterEach(() => act(() => setDiscreetMode(false)));

describe('formatCgpa display fixes', () => {
  it('dashboard standing rounds the CGPA the way the shared rules classify it', () => {
    render(standing());
    expect(screen.getByText('1.01')).toBeInTheDocument();
    expect(screen.queryByText('1.00')).not.toBeInTheDocument();
    expect(screen.getByText('2.68')).toBeInTheDocument();
  });

  it('results list shows each semester GPA with formatCgpa', () => {
    mocks.semesters = [{ id: 's1', label: 'Year 1 First Semester', level: 100, semester: 1, gpa: 1.005, creditLoaded: 18, isComplete: true }];
    render(<ResultsListPage />);
    expect(screen.getByText('1.01')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Help:/ })).toBeInTheDocument();
  });
});

describe('transcript', () => {
  it('notes that the transcript CGPA covers completed semesters only', async () => {
    mocks.profile = { fullName: 'Ada', university: 'UNILAG' };
    mocks.queryCollection.mockImplementation(async (path: string) => (path.endsWith('/semesters')
      ? [{ id: 's1', label: 'Year 1 First Semester', session: '2024/2025', level: 100, semester: 1, gpa: 4, pi: 3.5, creditLoaded: 18, isComplete: true }]
      : []));
    render(<TranscriptPage />);
    expect(await screen.findByText('Transcript CGPA covers completed semesters only.', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Help:/ })).toBeInTheDocument();
  });

  it('hides the cumulative CGPA in discreet mode until revealed', async () => {
    act(() => setDiscreetMode(true));
    mocks.profile = { fullName: 'Ada', university: 'UNILAG' };
    mocks.queryCollection.mockImplementation(async (path: string) => (path.endsWith('/semesters')
      ? [{ id: 's1', label: 'Year 1 First Semester', session: '2024/2025', level: 100, semester: 1, gpa: 4, pi: 3.5, creditLoaded: 18, isComplete: true }]
      : []));
    render(<TranscriptPage />);
    const reveal = await screen.findByRole('button', { name: 'Transcript values hidden, activate to reveal' }, { timeout: 5000 });
    expect(screen.getAllByText('CGPA hidden').length).toBeGreaterThan(0);
    fireEvent.click(reveal);
    expect(screen.queryByText('CGPA hidden')).not.toBeInTheDocument();
  });
});

describe('discreet mode on the dashboard', () => {
  it('hides the standing figures behind one reveal control', () => {
    act(() => setDiscreetMode(true));
    render(standing());
    expect(screen.getByText('Cumulative GPA hidden')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Standing hidden, activate to reveal' }));
    expect(screen.queryByText('Cumulative GPA hidden')).not.toBeInTheDocument();
    expect(screen.getByText('1.01')).toBeInTheDocument();
  });

  it('keeps recent results as links and hides their grades', () => {
    act(() => setDiscreetMode(true));
    render(<RecentResults courses={[{ id: 'c1', code: 'CSC 201', title: 'Data Structures', units: 3, grade: 'A', totalScore: 72, semesterId: 's1', semesterLabel: 'Year 2', session: '2024/2025', semesterIndex: 0 }]} />);
    const link = screen.getByRole('link', { name: /CSC 201/ });
    expect(within(link).queryByRole('button')).not.toBeInTheDocument();
    expect(within(link).getByText('Grade hidden')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Grades hidden, activate to reveal' }));
    expect(within(link).queryByText('Grade hidden')).not.toBeInTheDocument();
  });
});
