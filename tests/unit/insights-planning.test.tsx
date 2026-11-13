import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import InsightsPage from '@/app/(student)/insights/page';

const mocks = vi.hoisted(() => ({
  getDocument: vi.fn(),
  queryCollection: vi.fn(),
  updateDocument: vi.fn(),
  setDocument: vi.fn(),
  insightsDisabled: false,
  profile: {
    fullName: 'Ada Student',
    gradeMode: 'cgpa',
    entrySession: '2022/2023',
    currentSession: '2022/2023',
    courseDuration: 4,
    currentLevel: 200,
  } as Record<string, unknown>,
  user: { uid: 'student-1', getIdToken: vi.fn(async () => 'token') },
}));

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mocks.user, loading: false }) }));
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => ({ profile: mocks.profile }) }));
vi.mock('@/hooks/usePlatformSettings', () => ({ usePlatformSettings: () => ({ isFeatureDisabled: () => mocks.insightsDisabled }) }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
vi.mock('@/lib/firebase/firestore', () => ({
  getDocument: mocks.getDocument,
  queryCollection: mocks.queryCollection,
  setDocument: mocks.setDocument,
  updateDocument: mocks.updateDocument,
}));
vi.mock('@/components/charts/ForecastChart', () => ({ ForecastChart: () => <div>Forecast chart</div> }));
vi.mock('@/components/ai/InsightCard', () => ({ InsightCard: ({ title }: { title: string }) => <div>{title}</div> }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));
const requirements = vi.hoisted(() => ({ openRequirements: vi.fn() }));
vi.mock('@/components/requirements', () => requirements);

type Json = Record<string, unknown>;
function respond(body: Json, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
}

const FORECAST = { projected: [4.1, 4.2], projectedPi: [4.1, 4.2], projectedCgpa: [4.0, 4.1], riskScore: 2, trendLabel: 'Steady & Upward', trendDirection: 'improving' };
const INSIGHT = { strengths: ['a'], concerns: ['b'], recommendations: ['c'], degreeOutlook: 'd' };

function semester(id: string, level: number, number: 1 | 2, gpa: number, creditLoaded: number, isComplete = true) {
  return { id, label: `${level}L ${number === 1 ? 'First' : 'Second'} Semester`, level, semester: number, gpa, pi: gpa, creditLoaded, isComplete };
}
const course = (code: string, total: number | null, units = 3, extra: Json = {}) => ({
  code, title: `${code} title`, units, caScore: total === null ? null : 0, examScore: total, totalScore: total, grade: null, ...extra,
});

let fetchMock: ReturnType<typeof vi.fn>;
let usageBody: Json;

beforeEach(() => {
  mocks.insightsDisabled = false;
  mocks.profile = { ...mocks.profile, targetClass: undefined };
  mocks.updateDocument.mockReset().mockResolvedValue(undefined);
  mocks.setDocument.mockReset().mockResolvedValue(undefined);
  mocks.getDocument.mockReset().mockResolvedValue(null);
  mocks.queryCollection.mockReset().mockResolvedValue([]);
  usageBody = { features: [] };
  fetchMock = vi.fn((url: string) => {
    if (url === '/api/ai/usage') return respond(usageBody);
    if (url === '/api/ai/forecast') return respond(FORECAST);
    if (url === '/api/ai/insights') return respond(INSIGHT);
    return respond({});
  });
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function withSemesters(semesters: ReturnType<typeof semester>[], courses: Record<string, Json[]> = {}) {
  mocks.queryCollection.mockImplementation((path: string) => {
    if (path.endsWith('/semesters')) return Promise.resolve(semesters);
    const id = path.split('/semesters/')[1]?.split('/')[0];
    return Promise.resolve(courses[id] ?? []);
  });
}

const sentDegreeAlert = () => fetchMock.mock.calls.some(([url]) => url === '/api/notifications/send');


// Full-page renders with many async steps; allow for a loaded machine.
vi.setConfig({ testTimeout: 15000 });

describe('degree-class alerts', () => {
  it('does not alert when CGPA moves from 4.48 to 4.4917 (still 2:1) and saves the right class', async () => {
    withSemesters([semester('s1', 100, 1, 539 / 120, 120)]);
    mocks.getDocument.mockResolvedValue({ cgpa: 4.48, degreeClass: 'Second Class Upper (2:1)', forecast: FORECAST, lastInsight: { data: INSIGHT, timestamp: new Date() } });

    render(<InsightsPage />);

    await waitFor(() => expect(mocks.updateDocument).toHaveBeenCalledWith('analytics/student-1', expect.objectContaining({ degreeClass: 'Second Class Upper (2:1)' })));
    expect(sentDegreeAlert()).toBe(false);
  });

  it('counts an in-progress semester with graded courses (owner rule) and alerts on a real class change', async () => {
    withSemesters([semester('s1', 100, 1, 4.5, 20), semester('s2', 100, 2, 3.5, 20, false)]);
    mocks.getDocument.mockResolvedValue({ cgpa: 4.5, degreeClass: 'First Class', forecast: FORECAST, lastInsight: { data: INSIGHT, timestamp: new Date() } });

    render(<InsightsPage />);

    await waitFor(() => expect(mocks.updateDocument).toHaveBeenCalledWith('analytics/student-1', { cgpa: 4, degreeClass: 'Second Class Upper (2:1)' }));
    await waitFor(() => expect(sentDegreeAlert()).toBe(true));
  });
});

describe('carry-over tracker (A4)', () => {
  it('lists outstanding F courses with units and keeps D/E/F in a separate list; AR rows and passing D/E are not carry-overs', async () => {
    const user = userEvent.setup();
    withSemesters(
      [semester('s1', 100, 1, 2.5, 12), semester('s2', 100, 2, 3, 9, false)],
      {
        s1: [course('MTH101', 30, 3), course('CSC101', 20, 2), course('PHY101', 46, 2), course('GST101', null, 2, { isAR: true })],
        s2: [course('CSC 101', 61, 2), course('CHM101', 41, 4)],
      }
    );

    render(<InsightsPage />);
    await user.click(await screen.findByRole('tab', { name: 'Risk Analysis' }));

    const carry = screen.getByRole('region', { name: /carry-overs/i });
    expect(within(carry).getByText('1 outstanding · 3 units')).toBeInTheDocument();
    expect(within(carry).getByText('MTH101')).toBeInTheDocument();
    expect(within(carry).queryByText('CSC101')).not.toBeInTheDocument();
    expect(within(carry).queryByText('PHY101')).not.toBeInTheDocument();
    expect(within(carry).queryByText('GST101')).not.toBeInTheDocument();

    const low = screen.getByRole('region', { name: /low grades/i });
    expect(within(low).getByText('PHY101')).toBeInTheDocument();
    expect(within(low).getByText('CHM101')).toBeInTheDocument();
    expect(within(low).queryByText('GST101')).not.toBeInTheDocument();
  });
});

describe('degree-class goal (A6)', () => {
  it('shows the three figures, says kindly when a goal is out of reach and suggests the next class', async () => {
    const user = userEvent.setup();
    mocks.profile = { ...mocks.profile, targetClass: '1st' };
    withSemesters([semester('s1', 100, 1, 3.2, 20), semester('s2', 100, 2, 3.2, 20), semester('s3', 200, 1, 3.2, 20)]);

    render(<InsightsPage />);
    await user.click(await screen.findByRole('tab', { name: 'What-If' }));

    const goal = screen.getByRole('region', { name: /degree-class goal/i });
    expect(within(goal).getByText(/needed each semester/i)).toBeInTheDocument();
    expect(within(goal).getByText(/highest cgpa still possible/i)).toBeInTheDocument();
    expect(within(goal).getAllByRole('term').some(term => /to keep your 2:2/i.test(term.textContent ?? ''))).toBe(true);
    expect(within(goal).getByText('Out of reach')).toBeInTheDocument();
    expect(within(goal).getByText(/even with straight As/i)).toBeInTheDocument();
    await user.click(within(goal).getByRole('button', { name: /aim for second class upper/i }));
    await waitFor(() => expect(mocks.updateDocument).toHaveBeenCalledWith('users/student-1', { targetClass: '2:1' }));
  });

  it('saves a chosen goal on the user document', async () => {
    const user = userEvent.setup();
    withSemesters([semester('s1', 100, 1, 3.2, 20)]);
    render(<InsightsPage />);
    await user.click(await screen.findByRole('tab', { name: 'What-If' }));
    await user.selectOptions(screen.getByLabelText(/aim for/i), '2:1');
    await waitFor(() => expect(mocks.updateDocument).toHaveBeenCalledWith('users/student-1', { targetClass: '2:1' }));
  });
});

describe('AI access, disclosure and help', () => {
  it('labels Written Analysis as AI-generated with a report action', async () => {
    const user = userEvent.setup();
    withSemesters([semester('s1', 100, 1, 3.2, 20)]);
    mocks.getDocument.mockResolvedValue({ forecast: FORECAST, lastInsight: { data: INSIGHT, timestamp: new Date() } });
    render(<InsightsPage />);
    await user.click(await screen.findByRole('tab', { name: 'Written Analysis' }));
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByText("AI-generated. It can be wrong and isn't official academic advice.")).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: /report/i })).toBeInTheDocument();
  });

  it('labels the AI forecast trend and omits the label for a maths-only forecast', async () => {
    withSemesters([semester('s1', 100, 1, 3.2, 20)]);
    mocks.getDocument.mockResolvedValue({ forecast: FORECAST, lastInsight: { data: INSIGHT, timestamp: new Date() } });
    const view = render(<InsightsPage />);
    expect(await screen.findByText("AI-generated. It can be wrong and isn't official academic advice.")).toBeInTheDocument();
    view.unmount();

    mocks.getDocument.mockResolvedValue({ forecast: { ...FORECAST, aiEnhanced: false }, lastInsight: { data: INSIGHT, timestamp: new Date() } });
    render(<InsightsPage />);
    expect(await screen.findByText('Forecast chart')).toBeInTheDocument();
    expect(screen.queryByText("AI-generated. It can be wrong and isn't official academic advice.")).not.toBeInTheDocument();
  });

  it('hides AI actions for under-18s, still shows the forecast maths, and makes no Written Analysis request', async () => {
    usageBody = { features: [], age: { status: 'minor', aiAllowed: false, aiConsent: null } };
    withSemesters([semester('s1', 100, 1, 3.2, 20), semester('s2', 100, 2, 3.4, 20)]);

    render(<InsightsPage />);

    expect(await screen.findByText('AI features and result scanning are for users 18 and over. You can still track your results.')).toBeInTheDocument();
    expect(screen.getByText('Forecast chart')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/ai/insights')).toBe(false);
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/ai/forecast')).toBe(true);
    expect(screen.queryByRole('button', { name: /refresh insights|up to date/i })).not.toBeInTheDocument();
  });

  it('opens "Finish setting up" when the server asks for AI consent', async () => {
    requirements.openRequirements.mockClear();
    const user = userEvent.setup();
    fetchMock.mockImplementation((url: string) => {
      if (url === '/api/ai/usage') return respond({ features: [] });
      if (url === '/api/ai/forecast') return respond(FORECAST);
      if (url === '/api/ai/insights') return respond({ error: 'x', code: 'AI_CONSENT_REQUIRED' }, 403);
      return respond({});
    });
    withSemesters([semester('s1', 100, 1, 3.2, 20)]);
    render(<InsightsPage />);
    await waitFor(() => expect(requirements.openRequirements).toHaveBeenCalledWith('ai'));
    await user.click(await screen.findByRole('tab', { name: 'Written Analysis' }));
    await user.click(await screen.findByRole('button', { name: /finish setting up/i }));
    expect(requirements.openRequirements).toHaveBeenCalledTimes(2);
  });

  it('opens the help entry for the active tab', async () => {
    const user = userEvent.setup();
    render(<InsightsPage />);
    expect(await screen.findByRole('button', { name: 'Help: Forecast' })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'What-If' }));
    await user.click(screen.getByRole('button', { name: 'Help: What-If' }));
    expect(await screen.findByRole('dialog', { name: 'What-If' })).toBeInTheDocument();
  });
});
