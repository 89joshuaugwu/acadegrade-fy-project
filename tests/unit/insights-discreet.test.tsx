import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import InsightsPage from '@/app/(student)/insights/page';
import { setDiscreetMode } from '@/lib/discreet';

const mocks = vi.hoisted(() => ({
  getDocument: vi.fn(),
  queryCollection: vi.fn(),
  user: { uid: 'student-1', getIdToken: vi.fn(async () => 'token') },
  profile: { fullName: 'Ada', gradeMode: 'cgpa', entrySession: '2022/2023', currentSession: '2022/2023', courseDuration: 4, currentLevel: 200, targetClass: '2:1' },
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mocks.user, loading: false }) }));
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => ({ profile: mocks.profile }) }));
vi.mock('@/hooks/usePlatformSettings', () => ({ usePlatformSettings: () => ({ isFeatureDisabled: () => false }) }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
vi.mock('@/lib/firebase/firestore', () => ({ getDocument: mocks.getDocument, queryCollection: mocks.queryCollection, setDocument: vi.fn(), updateDocument: vi.fn() }));
vi.mock('@/components/charts/ForecastChart', () => ({ ForecastChart: () => <div>Forecast chart body</div> }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/components/requirements', () => ({ openRequirements: vi.fn() }));

vi.setConfig({ testTimeout: 15000 });

const FORECAST = { projected: [4.1, 4.2], projectedPi: [4.1, 4.2], projectedCgpa: [3.97, 4.1], riskScore: 2, trendLabel: 'Steady', trendDirection: 'improving' };
const hidden = (element: Element) => element.closest('[aria-hidden="true"]') !== null;
const holdsHidden = (element: Element) => element.querySelector('[aria-hidden="true"]') !== null;

beforeEach(() => {
  mocks.getDocument.mockReset().mockResolvedValue({ forecast: FORECAST, lastInsight: { data: { strengths: [], concerns: [], recommendations: [], degreeOutlook: '' }, timestamp: new Date() } });
  mocks.queryCollection.mockReset().mockImplementation((path: string) => {
    if (path.endsWith('/semesters')) return Promise.resolve([{ id: 's1', label: '100L First Semester', level: 100, semester: 1, gpa: 3.2, pi: 3.2, creditLoaded: 20, isComplete: true }]);
    return Promise.resolve([{ code: 'MTH101', title: 'Maths', units: 3, caScore: 0, examScore: 30, totalScore: 30, grade: null }]);
  });
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify({ features: [] }), { status: 200 }))));
});
afterEach(() => { act(() => setDiscreetMode(false)); vi.unstubAllGlobals(); });

describe('discreet mode on Insights', () => {
  it('hides figures, charts, goal numbers and course lists until the one reveal button is used', async () => {
    act(() => setDiscreetMode(true));
    const user = userEvent.setup();
    render(<InsightsPage />);

    expect(hidden(await screen.findByText('3.97'))).toBe(true);
    expect(hidden(screen.getByText('Forecast chart body'))).toBe(true);

    await user.click(screen.getByRole('tab', { name: 'Risk Analysis' }));
    expect(hidden(screen.getAllByText('MTH101')[0])).toBe(true);

    await user.click(screen.getByRole('tab', { name: 'What-If' }));
    const figures = screen.getAllByRole('definition');
    expect(figures.length).toBe(3);
    for (const figure of figures) expect(holdsHidden(figure)).toBe(true);
    expect(holdsHidden(screen.getByText(/^Current:/))).toBe(true);

    const reveal = screen.getByRole('button', { name: /academic figures hidden, activate to reveal/i });
    await user.click(reveal);
    expect(screen.getByRole('button', { name: /hide academic figures/i })).toBeInTheDocument();
    expect(holdsHidden(screen.getByText(/^Current:/))).toBe(false);
    expect(holdsHidden(screen.getAllByRole('definition')[1])).toBe(false);
  });

  it('shows everything and no reveal button when discreet mode is off', async () => {
    render(<InsightsPage />);
    expect(hidden(await screen.findByText('3.97'))).toBe(false);
    expect(screen.queryByRole('button', { name: /academic figures/i })).not.toBeInTheDocument();
  });
});
