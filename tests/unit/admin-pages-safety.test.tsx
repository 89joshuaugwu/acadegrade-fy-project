import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useAuth', () => {
  const user = { uid: 'admin-1', email: 'admin@example.com', getIdToken: async () => 'test-token' };
  return { useAuth: () => ({ user }) };
});
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
vi.mock('react-countup', () => ({ default: ({ end, decimals = 0 }: { end: number; decimals?: number }) => <span>{end.toFixed(decimals)}</span> }));
import AdminDashboardPage from '@/app/(admin)/admin/dashboard/page';
import AdminUsersPage from '@/app/(admin)/admin/users/page';
import AdminCoursesPage from '@/app/(admin)/admin/courses/page';
import AdminAnalyticsPage from '@/app/(admin)/admin/analytics/page';
import ApiAnalyticsPage from '@/app/(admin)/admin/api-analytics/page';

type Route = (url: string, init?: RequestInit) => { ok: boolean; body: unknown } | undefined;

function mockFetch(route: Route) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    const result = route(url, init) ?? { ok: true, body: {} };
    return { ok: result.ok, status: result.ok ? 200 : 500, json: async () => result.body } as Response;
  });
}
const writes = (fetchSpy: ReturnType<typeof mockFetch>) => fetchSpy.mock.calls.filter(([, init]) => init?.method && init.method !== 'GET');

const stats = {
  totalUsers: 2, avgCGPA: 3.9, avgPI: 3.8, activeThisWeek: 1,
  cgpaBuckets: { '3.5-4.0': 2 }, departmentBreakdown: [{ department: 'Computer Science', count: 2, avgCGPA: 3.9 }],
  signupChartData: [], degreeClassCounts: {},
};
const student = {
  uid: 'student-1', fullName: 'Ada Obi', email: 'ada@example.com', matric: 'CSC/21/001', department: 'Computer Science',
  currentLevel: 300, cgpa: 4.2, pi: 4.1, semesterCount: 5, disabled: false, createdAt: '2026-01-01T00:00:00.000Z',
};

describe('admin overview', () => {
  it('shows a retryable error instead of zero metrics when stats fail to load', async () => {
    const fetchSpy = mockFetch((url) => url === '/api/admin/stats' ? { ok: false, body: { error: 'down' } } : undefined);
    const user = userEvent.setup();
    render(<AdminDashboardPage />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/metrics are unavailable/i);
    expect(screen.queryByText('Total users')).not.toBeInTheDocument();
    await user.click(within(alert).getByRole('button', { name: /try again/i }));
    expect(fetchSpy.mock.calls.filter(([url]) => url === '/api/admin/stats')).toHaveLength(2);
  });

  it('keeps KPIs and signups, and leaves distribution charts and bulk resets out', async () => {
    const fetchSpy = mockFetch((url) => url === '/api/admin/stats' ? { ok: true, body: stats } : undefined);
    render(<AdminDashboardPage />);
    expect(await screen.findByText('Total users')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument();
    for (const label of ['Active this week', 'Average CGPA', 'Average PI']) expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'New signups' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /cgpa distribution/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /department/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reset/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /academic analytics/i })).toHaveAttribute('href', '/admin/analytics');
    expect(screen.getByRole('link', { name: /api health/i })).toHaveAttribute('href', '/admin/api-analytics');
    expect(writes(fetchSpy)).toHaveLength(0);
  });

  it('lists what needs attention, each linked to where it is fixed', async () => {
    mockFetch((url) => {
      if (url === '/api/admin/stats') return { ok: true, body: stats };
      if (url === '/api/admin/academic-catalog/suggestions') return { ok: true, body: { suggestions: [{ id: 'a', status: 'pending' }, { id: 'b', status: 'pending' }, { id: 'c', status: 'approved' }] } };
      if (url === '/api/admin/ai') return { ok: true, body: { providers: {}, config: null, secrets: [] } };
      if (url === '/api/admin/mobile-release') return { ok: true, body: { enabled: true, latestBuild: 20, minSupportedBuild: 15, allowIgnore: true } };
      if (url === '/api/admin/settings') return { ok: true, body: { settings: { maintenanceMode: true } } };
      if (url === '/api/admin/usage') return { ok: true, body: { policy: { coins: { enabled: true } } } };
      if (url === '/api/admin/ads/mobile') return { ok: true, body: { config: { enabled: true, testMode: false, rewardedEnabled: false, rewardedUnitId: '' } } };
      return undefined;
    });
    render(<AdminDashboardPage />);
    const list = await screen.findByRole('list', { name: 'Needs attention' });
    await waitFor(() => expect(within(list).getAllByRole('link')).toHaveLength(5));
    expect(within(list).getByRole('link', { name: /2 catalogue suggestions/i })).toHaveAttribute('href', '/admin/academic-catalog');
    expect(within(list).getByRole('link', { name: /ai is off/i })).toHaveAttribute('href', '/admin/ai');
    expect(within(list).getByRole('link', { name: /mandatory.*build 15/i })).toHaveAttribute('href', '/admin/mobile-release');
    expect(within(list).getByRole('link', { name: /maintenance mode is on/i })).toHaveAttribute('href', '/admin/settings?tab=access');
    expect(within(list).getByRole('link', { name: /coins are on.*rewarded ads are off/i })).toHaveAttribute('href', '/admin/ads?tab=admob');
  });

  it('says so when nothing needs attention', async () => {
    mockFetch((url) => {
      if (url === '/api/admin/stats') return { ok: true, body: stats };
      if (url === '/api/admin/academic-catalog/suggestions') return { ok: true, body: { suggestions: [] } };
      if (url === '/api/admin/ai') return { ok: true, body: { providers: {}, config: { source: 'managed', revision: 3, routes: {} }, secrets: [] } };
      if (url === '/api/admin/mobile-release') return { ok: true, body: { enabled: false } };
      if (url === '/api/admin/settings') return { ok: true, body: { settings: {} } };
      if (url === '/api/admin/usage') return { ok: true, body: { policy: { coins: { enabled: false } } } };
      return undefined;
    });
    render(<AdminDashboardPage />);
    expect(await screen.findByText('Nothing needs attention.')).toBeInTheDocument();
  });
});

describe('admin users', () => {
  it('shows a retryable error instead of an empty user list', async () => {
    mockFetch((url) => url === '/api/admin/users' ? { ok: false, body: {} } : undefined);
    render(<AdminUsersPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/users could not be loaded/i);
    expect(screen.queryByText('No users found.')).not.toBeInTheDocument();
  });

  it('labels search, summarises each row for small screens and confirms before disabling an account', async () => {
    const fetchSpy = mockFetch((url, init) => url === '/api/admin/users' && !init?.method ? { ok: true, body: { users: [student] } } : undefined);
    const user = userEvent.setup();
    render(<AdminUsersPage />);
    expect(await screen.findByRole('searchbox', { name: 'Search users' })).toBeInTheDocument();
    const row = screen.getByRole('button', { name: /Ada Obi/ });
    expect(row).toHaveAttribute('aria-expanded', 'false');
    expect(within(row).getByText(/Computer Science · 300L · CGPA 4\.20/)).toBeInTheDocument();
    await user.click(row);
    expect(row).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('heading', { level: 1, name: 'Users' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Disable sign-in…' }));
    const dialog = screen.getByRole('dialog', { name: 'Turn off sign-in for Ada Obi?' });
    expect(dialog).toHaveTextContent('They will be signed out of web and Android and cannot sign back in until you enable them. Their data is kept.');
    expect(writes(fetchSpy)).toHaveLength(0);
    await user.click(within(dialog).getByRole('button', { name: 'Disable sign-in' }));
    await waitFor(() => expect(writes(fetchSpy)).toHaveLength(1));
    expect(JSON.parse(String(writes(fetchSpy)[0][1]!.body))).toEqual({ action: 'disable', uid: 'student-1' });
  });
});

describe('admin course catalog', () => {
  const course = { id: 'csc301', code: 'CSC301', title: 'Data Structures', units: 3, department: 'Computer Science', level: 300, semester: 1 };

  it('shows a retryable error instead of an empty catalog', async () => {
    mockFetch((url) => url.startsWith('/api/admin/courses') ? { ok: false, body: {} } : undefined);
    render(<AdminCoursesPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/courses could not be loaded/i);
    expect(screen.queryByText('No courses in catalog yet.')).not.toBeInTheDocument();
  });

  it('edits in an accessible dialog with labelled fields and confirms deletion by course code', async () => {
    const fetchSpy = mockFetch((url, init) => url === '/api/admin/courses' && !init?.method ? { ok: true, body: { courses: [course] } } : undefined);
    const user = userEvent.setup();
    render(<AdminCoursesPage />);
    expect(await screen.findByRole('searchbox', { name: 'Search courses' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Legacy course list' })).toBeInTheDocument();
    expect(screen.getByText('No app reads this list. Course codes students share are created from their own semesters.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add course' }).className).not.toMatch(/danger/);
    await user.click(screen.getByRole('button', { name: 'Add course' }));
    const dialog = screen.getByRole('dialog', { name: 'Add new course' });
    expect(within(dialog).getByRole('combobox', { name: 'Level' })).toBeInTheDocument();
    expect(within(dialog).getByRole('combobox', { name: 'Semester' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    expect(screen.getByText(/Computer Science · 300L · 3 units/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete CSC301' }));
    const confirm = screen.getByRole('dialog', { name: /delete CSC301/i });
    expect(writes(fetchSpy)).toHaveLength(0);
    await user.click(within(confirm).getByRole('button', { name: /delete course/i }));
    await waitFor(() => expect(writes(fetchSpy)).toEqual([[`/api/admin/courses?id=csc301`, expect.objectContaining({ method: 'DELETE' })]]));
  });
});

describe('admin analytics', () => {
  it('shows a retryable error instead of empty charts when analytics fail', async () => {
    mockFetch((url) => url === '/api/admin/stats' ? { ok: false, body: {} } : undefined);
    render(<AdminAnalyticsPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/analytics are unavailable/i);
    expect(screen.getByRole('heading', { level: 1, name: 'Academic analytics' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Help: Academic analytics' })).toBeInTheDocument();
  });

  it('shows a retryable error when API analytics fail to load', async () => {
    mockFetch((url) => url.startsWith('/api/admin/api-analytics') ? { ok: false, body: {} } : undefined);
    render(<ApiAnalyticsPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/api health is unavailable/i);
    expect(screen.getByRole('heading', { level: 1, name: 'API health' })).toBeInTheDocument();
  });

  it('labels the range and auto-refresh controls once API analytics load', async () => {
    mockFetch((url) => url.startsWith('/api/admin/api-analytics') ? { ok: true, body: { totalCalls: 0, byCategory: {}, byProvider: {}, byEndpoint: {} } } : undefined);
    render(<ApiAnalyticsPage />);
    expect(await screen.findByRole('combobox', { name: 'Time range' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /auto-refresh/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/shows names and emails/i)).toBeInTheDocument();
  });
});
