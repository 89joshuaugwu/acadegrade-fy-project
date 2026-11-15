import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useParams: () => ({ shareId: 'abc123abc123' }) }));
vi.mock('@/components/layout/Navbar', () => ({ Navbar: () => <header /> }));
vi.mock('@/components/layout/PublicShell', () => ({ PublicFooter: () => <footer /> }));
vi.mock('@/components/cgpa/CGPAArc', () => ({ CGPAArc: () => <div data-testid="cgpa-arc" /> }));
vi.mock('jspdf-autotable', () => ({ default: vi.fn() }));
vi.mock('jspdf', () => ({ default: class {} }));

import ShareTranscriptPage from '@/app/(public)/share/[shareId]/page';
import { fetchSharedTranscript } from '@/lib/share/viewer';

const record = (overrides: Record<string, unknown> = {}) => ({
  studentName: 'Ada Example',
  matric: '2022/000001',
  department: 'Computer Science',
  programme: 'B.Sc. Computer Science',
  currentLevel: '300',
  showPhoto: false,
  cgpa: 4,
  pi: 3.4,
  totalCredits: 4,
  semesters: [{
    id: 's1', label: '100L First Semester', session: '2022/2023', level: 100, semester: 1, gpa: 4, pi: 3.4, creditLoaded: 4,
    courses: [{ id: 'c1', code: 'GST 111', title: 'Communication in English', units: 4, totalScore: 68, grade: 'B', gradePoint: 4 }],
  }],
  ...overrides,
});

type Reply = { status: number; body: unknown; headers?: Record<string, string> };
function respond({ status, body, headers = {} }: Reply) {
  return { ok: status >= 200 && status < 300, status, headers: new Headers(headers), json: async () => body } as Response;
}

/** The server double: wants PIN 4821, answers with the given replies otherwise. */
function serveWithPin(onWrong: Reply = { status: 401, body: { code: 'PIN_INCORRECT', error: 'That PIN is not right.' } }) {
  const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    const pin = new Headers(init?.headers).get('X-Share-Pin');
    if (!pin) return respond({ status: 401, body: { code: 'PIN_REQUIRED', error: 'This link needs a PIN.' } });
    if (pin === '4821') return respond({ status: 200, body: { transcript: record(), expiresAt: '2026-12-01T00:00:00.000Z' } });
    return respond(onWrong);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchSharedTranscript', () => {
  it('sends the PIN only in the X-Share-Pin header, never in the URL', async () => {
    const fetchMock = serveWithPin();
    await fetchSharedTranscript('abc123abc123', '4821');
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('/api/transcript/share?id=abc123abc123');
    expect(String(url)).not.toContain('4821');
    expect(new Headers(init?.headers).get('X-Share-Pin')).toBe('4821');
    expect(init?.body).toBeUndefined();
  });

  it('maps server answers to viewer states', async () => {
    const cases: Array<[Reply, string]> = [
      [{ status: 401, body: { code: 'PIN_REQUIRED' } }, 'pin-required'],
      [{ status: 401, body: { code: 'PIN_INCORRECT' } }, 'pin-incorrect'],
      [{ status: 429, body: { code: 'PIN_LOCKED', retryAfterSeconds: 1200 } }, 'locked'],
      [{ status: 410, body: { error: 'This shared transcript has expired' } }, 'unavailable'],
      [{ status: 404, body: { error: 'Transcript not found or expired' } }, 'unavailable'],
      [{ status: 500, body: { error: 'x' } }, 'error'],
    ];
    for (const [reply, expected] of cases) {
      vi.stubGlobal('fetch', vi.fn(async () => respond(reply)));
      expect((await fetchSharedTranscript('abc')).status).toBe(expected);
    }
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    expect((await fetchSharedTranscript('abc')).status).toBe('error');
  });
});

describe('PIN-protected share page', () => {
  it('asks for the PIN, then shows the record after the right PIN', async () => {
    const user = userEvent.setup();
    const fetchMock = serveWithPin();
    render(<ShareTranscriptPage />);

    expect(await screen.findByRole('heading', { name: /needs a pin/i })).toBeInTheDocument();
    const input = screen.getByLabelText(/^pin$/i);
    expect(input).toHaveAttribute('type', 'password');
    expect(input).not.toHaveAttribute('name');
    await user.type(input, '4821');
    await user.click(screen.getByRole('button', { name: /view transcript/i }));

    expect(await screen.findByText('Communication in English')).toBeInTheDocument();
    for (const [url] of fetchMock.mock.calls) expect(String(url)).not.toContain('4821');
    expect(window.location.href).not.toContain('4821');
    expect(document.body.innerHTML).not.toContain('4821');
  });

  it('says when the PIN is wrong, clears the field and does not repeat the PIN', async () => {
    const user = userEvent.setup();
    serveWithPin();
    render(<ShareTranscriptPage />);

    const input = await screen.findByLabelText(/^pin$/i);
    await user.type(input, '9137');
    await user.click(screen.getByRole('button', { name: /view transcript/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/not right/i);
    expect(screen.getByLabelText(/^pin$/i)).toHaveValue('');
    expect(document.body.innerHTML).not.toContain('9137');
  });

  it('checks the PIN format before asking the server', async () => {
    const user = userEvent.setup();
    const fetchMock = serveWithPin();
    render(<ShareTranscriptPage />);

    await user.type(await screen.findByLabelText(/^pin$/i), '12');
    await user.click(screen.getByRole('button', { name: /view transcript/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/4 to 6 digits/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('explains a locked link and stops further tries', async () => {
    const user = userEvent.setup();
    serveWithPin({ status: 429, body: { code: 'PIN_LOCKED', retryAfterSeconds: 3600 }, headers: { 'Retry-After': '3600' } });
    render(<ShareTranscriptPage />);

    await user.type(await screen.findByLabelText(/^pin$/i), '1111');
    await user.click(screen.getByRole('button', { name: /view transcript/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/too many wrong pins/i);
    expect(screen.getByRole('alert')).toHaveTextContent(/60 minutes/i);
    expect(screen.getByRole('button', { name: /view transcript/i })).toBeDisabled();
  });

  it('shows the expired screen for an expired or unknown link, as before', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respond({ status: 404, body: { error: 'Transcript not found or expired' } })));
    render(<ShareTranscriptPage />);
    expect(await screen.findByRole('heading', { name: /link expired/i })).toBeInTheDocument();
  });
});

describe('summary share page', () => {
  it('shows semester totals and no course rows', async () => {
    const summary = record({
      shareLevel: 'summary',
      semesters: [{ id: 's1', label: '100L First Semester', session: '2022/2023', level: 100, semester: 1, gpa: 4, pi: 3.4, creditLoaded: 4, courses: [] }],
    });
    vi.stubGlobal('fetch', vi.fn(async () => respond({ status: 200, body: { transcript: summary, expiresAt: '2026-12-01T00:00:00.000Z' } })));
    render(<ShareTranscriptPage />);

    expect(await screen.findByText(/summary only/i)).toBeInTheDocument();
    expect(screen.getByText('100L First Semester')).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Exam' })).not.toBeInTheDocument();
    expect(screen.queryByText(/valid for 30 days/i)).not.toBeInTheDocument();
  });

  it('tolerates a semester with no courses field at all', async () => {
    const bare = record({ semesters: [{ id: 's1', label: '100L First Semester', session: '2022/2023', level: 100, semester: 1, gpa: 4, pi: 3.4, creditLoaded: 4 }] });
    vi.stubGlobal('fetch', vi.fn(async () => respond({ status: 200, body: { transcript: bare } })));
    render(<ShareTranscriptPage />);
    expect(await screen.findByText(/100L First Semester/)).toBeInTheDocument();
  });
});
