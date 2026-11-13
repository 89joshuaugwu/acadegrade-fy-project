import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const downloads = vi.hoisted(() => ({ calls: [] as Array<{ name: string; text: string; type: string }> }));
vi.mock('@/lib/export/build', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/export/build')>();
  return {
    ...actual,
    downloadText: (name: string, text: string, type: string) => { downloads.calls.push({ name, text, type }); },
  };
});
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

import { PrivacyChoices } from '@/components/privacy/PrivacyChoices';
import { MINOR_NOTICE } from '@/lib/consent/requirements';
import { readDiscreetMode, setDiscreetMode } from '@/lib/discreet';

const readers = {
  queryCollection: vi.fn((path: string) => Promise.resolve(
    path === 'users/u1/semesters' ? [{ id: 's1', label: 'First', level: 100, semester: 1, session: '2024/2025' }]
      : path === 'users/u1/semesters/s1/courses' ? [{ id: 'c1', code: 'MTH 101', title: 'Algebra', units: 3, caScore: 20, examScore: 40, totalScore: 60, grade: 'B', gradePoint: 4 }]
        : []
  )) as never,
  getDocument: vi.fn().mockResolvedValue(null) as never,
};

function json(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
}

function setup(profile: Record<string, unknown>) {
  const fetchMock = vi.fn((url: string) => json(url === '/api/user/age' ? { ageStatus: 'adult', aiAllowed: false } : { items: [], checkedAt: 1 }));
  vi.stubGlobal('fetch', fetchMock);
  render(<PrivacyChoices uid="u1" profile={profile} getToken={() => Promise.resolve('tok')} readers={readers} />);
  return fetchMock;
}

const bodyOf = (call: unknown[]) => JSON.parse(String((call[1] as RequestInit).body));
/** The POST calls only (the section also GETs the recorded answers on mount). */
const posts = (fetchMock: { mock: { calls: unknown[][] } }) => fetchMock.mock.calls.filter((call) => (call[1] as RequestInit | undefined)?.method === 'POST');

beforeEach(() => {
  localStorage.clear();
  downloads.calls = [];
});
afterEach(() => {
  vi.unstubAllGlobals();
  act(() => setDiscreetMode(false));
});

describe('PrivacyChoices', () => {
  it('is the #privacy section with Terms and Privacy links and Cookie choices', () => {
    setup({ ageStatus: 'adult' });
    const section = screen.getByRole('region', { name: 'Privacy & AI choices' });
    expect(section).toHaveAttribute('id', 'privacy');
    expect(within(section).getByRole('link', { name: 'Terms of Use' })).toHaveAttribute('href', '/terms');
    expect(within(section).getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy');
    expect(within(section).getByRole('button', { name: 'Cookie choices' })).toBeInTheDocument();
  });

  it('lets an adult withdraw AI consent', async () => {
    const fetchMock = setup({ ageStatus: 'adult', consents: { ai: { granted: true } } });
    const ai = screen.getByRole('switch', { name: /AI analysis and result scanning/ });
    expect(ai).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(ai);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/user/requirements', expect.objectContaining({ method: 'POST' })));
    expect(bodyOf(posts(fetchMock)[0])).toEqual({ answers: { aiConsent: false } });
    await waitFor(() => expect(ai).toHaveAttribute('aria-checked', 'false'));
  });

  it('takes its initial state from the recorded answers the server returns', async () => {
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => json(init?.method === 'POST'
      ? { items: [], current: { ageStatus: 'adult', aiConsent: false, marketingConsent: true }, checkedAt: 2 }
      : { items: [], current: { ageStatus: 'adult', aiConsent: true, marketingConsent: null }, checkedAt: 1 }));
    vi.stubGlobal('fetch', fetchMock);
    render(<PrivacyChoices uid="u1" profile={{}} getToken={() => Promise.resolve('tok')} readers={readers} />);
    const ai = screen.getByRole('switch', { name: /AI analysis and result scanning/ });
    await waitFor(() => expect(ai).toHaveAttribute('aria-checked', 'true'));
    expect(fetchMock).toHaveBeenCalledWith('/api/user/requirements', expect.objectContaining({ headers: { Authorization: 'Bearer tok' } }));
    expect(screen.queryByRole('button', { name: 'Confirm age' })).not.toBeInTheDocument();

    fireEvent.click(ai);
    // The POST response is the new truth: AI off, product news on.
    await waitFor(() => expect(ai).toHaveAttribute('aria-checked', 'false'));
    await waitFor(() => expect(screen.getByRole('switch', { name: /product news/i })).toHaveAttribute('aria-checked', 'true'));
  });

  it('turns product emails on (off by default)', async () => {
    const fetchMock = setup({ ageStatus: 'adult' });
    const email = screen.getByRole('switch', { name: /product news/i });
    expect(email).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(email);
    await waitFor(() => expect(posts(fetchMock)).toHaveLength(1));
    expect(bodyOf(posts(fetchMock)[0])).toEqual({ answers: { marketingConsent: true } });
  });

  it('reverts a switch and explains when saving fails', async () => {
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => (init?.method === 'POST'
      ? json({ error: 'AI features are available only to users aged 18 or over.', code: 'AGE_RESTRICTED' }, 403)
      : json({ items: [], checkedAt: 1 })));
    vi.stubGlobal('fetch', fetchMock);
    render(<PrivacyChoices uid="u1" profile={{ ageStatus: 'adult', consents: { ai: { granted: false } } }} getToken={() => Promise.resolve('tok')} readers={readers} />);
    const ai = screen.getByRole('switch', { name: /AI analysis and result scanning/ });
    fireEvent.click(ai);
    expect(await screen.findByText('AI features are available only to users aged 18 or over.')).toBeInTheDocument();
    expect(ai).toHaveAttribute('aria-checked', 'false');
  });

  it('shows minors the under-18 notice, no AI switch, and "I\'ve turned 18" with confirmation', async () => {
    const fetchMock = setup({ ageStatus: 'minor' });
    expect(screen.getByText(MINOR_NOTICE)).toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: /AI analysis/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: "I've turned 18" }));
    const dialog = await screen.findByRole('dialog', { name: 'Confirm you are 18 or older' });
    expect(posts(fetchMock)).toHaveLength(0);
    fireEvent.click(within(dialog).getByRole('button', { name: "Yes, I'm 18 or older" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/user/age', expect.objectContaining({ method: 'POST' })));
    expect(bodyOf(posts(fetchMock)[0])).toEqual({ status: 'adult' });
  });

  it('does not offer "I\'ve turned 18" to adults', () => {
    setup({ ageStatus: 'adult' });
    expect(screen.queryByRole('button', { name: "I've turned 18" })).not.toBeInTheDocument();
    expect(screen.queryByText(MINOR_NOTICE)).not.toBeInTheDocument();
  });

  it('toggles discreet mode on this device', () => {
    setup({ ageStatus: 'adult' });
    fireEvent.click(screen.getByRole('switch', { name: /Discreet mode/ }));
    expect(readDiscreetMode()).toBe(true);
  });

  it('warns about shared devices before downloading the JSON and CSV', async () => {
    setup({ ageStatus: 'adult', fullName: 'Ada', fcmTokens: ['x'] });
    fireEvent.click(screen.getByRole('button', { name: 'Download my data' }));
    const dialog = await screen.findByRole('dialog', { name: 'Download your data' });
    expect(within(dialog).getByText(/shared or public device/i)).toBeInTheDocument();
    expect(downloads.calls).toHaveLength(0);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Download files' }));
    await waitFor(() => expect(downloads.calls).toHaveLength(2));
    const [jsonFile, csvFile] = downloads.calls;
    expect(jsonFile.name).toMatch(/^acadegrade-data-\d{4}-\d{2}-\d{2}\.json$/);
    const parsed = JSON.parse(jsonFile.text);
    expect(parsed.profile.fullName).toBe('Ada');
    expect(parsed.profile.fcmTokens).toBeUndefined();
    expect(parsed.semesters[0].courses[0].code).toBe('MTH 101');
    expect(csvFile.name).toMatch(/\.csv$/);
    expect(csvFile.text).toContain('MTH 101');
  });
});
