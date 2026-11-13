import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const authState = vi.hoisted(() => ({
  value: {
    user: { uid: 'u1', getIdToken: () => Promise.resolve('token-1') },
    uid: 'u1',
    loading: false,
    error: null,
  } as Record<string, unknown>,
}));
const profileState = vi.hoisted(() => ({ value: { profile: {} as Record<string, unknown> } }));

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => authState.value }));
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => profileState.value }));

import { RequirementsGate, openRequirements } from '@/components/requirements';
import { AI_SKIP_MS, RECHECK_MS, aiSkipKey } from '@/lib/consent/requirements';

type Item = { id: string; blocking: 'app' | 'ai' | 'none'; version?: string; title: string; description: string };

const TERMS: Item = { id: 'terms', blocking: 'app', version: 't-2', title: 'Terms of Use', description: 'Accept the terms.' };
const PRIVACY: Item = { id: 'privacy', blocking: 'app', version: 'p-2', title: 'Privacy Policy', description: 'Review privacy.' };
const AGE: Item = { id: 'age', blocking: 'ai', title: 'How old are you?', description: 'Asked once.' };
const AI: Item = { id: 'ai_consent', blocking: 'ai', version: 'a-1', title: 'Allow AI processing?', description: 'Server wording.' };
const MARKETING: Item = { id: 'marketing_consent', blocking: 'none', title: 'Product news by email', description: 'Optional.' };

function json(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
}

/** A fake requirements endpoint: GET returns `pending`; POST removes answered items. */
function serveRequirements(initial: Item[]) {
  let pending = [...initial];
  const posts: unknown[] = [];
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (url === '/api/user/requirements' && (!init || !init.method || init.method === 'GET')) {
      return json({ items: pending, checkedAt: Date.now() });
    }
    if (url === '/api/user/requirements' && init?.method === 'POST') {
      const { answers } = JSON.parse(String(init.body));
      posts.push(answers);
      pending = pending.filter((item) => {
        if (item.id === 'age') return !answers.age;
        if (item.id === 'terms') return !answers.terms;
        if (item.id === 'privacy') return !answers.privacy;
        if (item.id === 'ai_consent') return answers.aiConsent === undefined;
        if (item.id === 'marketing_consent') return answers.marketingConsent === undefined;
        return true;
      });
      return json({ items: pending, checkedAt: Date.now() });
    }
    return Promise.reject(new Error(`unexpected ${url}`));
  });
  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, posts, setPending: (next: Item[]) => { pending = next; } };
}

beforeEach(() => {
  localStorage.clear();
  profileState.value = { profile: {} };
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('RequirementsGate: updated terms', () => {
  it('blocks with one "I agree" that accepts both current versions', async () => {
    const server = serveRequirements([TERMS, PRIVACY]);
    render(<RequirementsGate />);

    const dialog = await screen.findByRole('dialog', { name: 'Updated terms' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('link', { name: /Terms of Use/ })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: /Privacy Policy/ })).toHaveAttribute('href', '/privacy');
    expect(screen.queryByRole('button', { name: /close|skip/i })).not.toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('dialog', { name: 'Updated terms' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'I agree' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(server.posts).toEqual([{ terms: { version: 't-2' }, privacy: { version: 'p-2' } }]);
    expect(server.fetchMock.mock.calls[0][1]).toMatchObject({ headers: { Authorization: 'Bearer token-1' } });
  });

  it('lets the student continue if saving the agreement fails (fail open)', async () => {
    const server = serveRequirements([TERMS]);
    server.fetchMock.mockImplementation((url: string, init?: RequestInit) => (
      init?.method === 'POST' ? Promise.reject(new TypeError('offline')) : json({ items: [TERMS], checkedAt: 1 })
    ));
    render(<RequirementsGate />);
    fireEvent.click(await screen.findByRole('button', { name: 'I agree' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not save/i);
    fireEvent.click(screen.getByRole('button', { name: 'Continue for now' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('RequirementsGate: fail open', () => {
  it('shows nothing when the endpoint is missing', async () => {
    const fetchMock = vi.fn(() => json({ error: 'Not found' }, 404));
    vi.stubGlobal('fetch', fetchMock);
    render(<RequirementsGate />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows nothing when offline', async () => {
    const fetchMock = vi.fn(() => Promise.reject(new TypeError('Failed to fetch')));
    vi.stubGlobal('fetch', fetchMock);
    render(<RequirementsGate />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows nothing for a malformed body', async () => {
    const fetchMock = vi.fn(() => json({ nope: true }));
    vi.stubGlobal('fetch', fetchMock);
    render(<RequirementsGate />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('RequirementsGate: finish setting up', () => {
  it('asks age neutrally, then AI consent, then optional email news (off by default)', async () => {
    const server = serveRequirements([AGE, AI, MARKETING]);
    render(<RequirementsGate />);

    await screen.findByRole('dialog', { name: 'Finish setting up' });
    const adult = screen.getByRole('radio', { name: "I'm 18 or older" });
    const minor = screen.getByRole('radio', { name: "I'm under 18" });
    expect(adult.className).toBe(minor.className);
    expect(adult).not.toBeChecked();
    expect(minor).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();

    fireEvent.click(adult);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText(
      'Allow AcadeGrade to send your results and scanned slips to AI providers (Google Gemini, Groq, OpenRouter) to generate analysis and scans?'
    )).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Allow' }));

    const news = await screen.findByRole('switch', { name: /email/i });
    expect(news).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(server.posts).toEqual([{ age: 'adult' }, { aiConsent: true }, { marketingConsent: false }]);
  });

  it('records "Not now" as a declined AI consent', async () => {
    const server = serveRequirements([AI]);
    render(<RequirementsGate />);
    fireEvent.click(await screen.findByRole('button', { name: 'Not now' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(server.posts).toEqual([{ aiConsent: false }]);
  });

  it('explains the under-18 limits after a minor answers', async () => {
    const server = serveRequirements([AGE]);
    render(<RequirementsGate />);
    await screen.findByRole('dialog', { name: 'Finish setting up' });
    fireEvent.click(screen.getByRole('radio', { name: "I'm under 18" }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText(/AI features and result scanning are for users 18 and over/)).toBeInTheDocument();
    expect(server.posts).toEqual([{ age: 'minor' }]);
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('remembers "Skip for now" for 7 days on this device', async () => {
    serveRequirements([AGE, AI]);
    const first = render(<RequirementsGate />);
    fireEvent.click(await screen.findByRole('button', { name: 'Skip for now' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const stored = Number(localStorage.getItem(aiSkipKey('u1')));
    expect(stored).toBeGreaterThan(Date.now() - 1000);
    first.unmount();

    render(<RequirementsGate />);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    localStorage.setItem(aiSkipKey('u1'), String(Date.now() - AI_SKIP_MS - 1));
    render(<RequirementsGate />);
    expect(await screen.findByRole('dialog', { name: 'Finish setting up' })).toBeInTheDocument();
  });

  it('still works when localStorage throws', async () => {
    serveRequirements([AGE]);
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    render(<RequirementsGate />);
    fireEvent.click(await screen.findByRole('button', { name: 'Skip for now' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    getItem.mockRestore();
    setItem.mockRestore();
  });

  it('renders unknown requirement ids generically', async () => {
    serveRequirements([{ id: 'new_thing', blocking: 'ai', title: 'Confirm your faculty', description: 'A new question.' }]);
    render(<RequirementsGate />);
    expect(await screen.findByText('Confirm your faculty')).toBeInTheDocument();
    expect(screen.getByText('A new question.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not open for optional-only items', async () => {
    serveRequirements([MARKETING]);
    render(<RequirementsGate />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('openRequirements', () => {
  it("opens the AI steps on demand even after a skip, offering consent to someone who said 'Not now'", async () => {
    profileState.value = { profile: { ageStatus: 'adult', consents: { ai: { granted: false } } } };
    localStorage.setItem(aiSkipKey('u1'), String(Date.now()));
    const server = serveRequirements([]);
    render(<RequirementsGate />);
    await waitFor(() => expect(server.fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    act(() => openRequirements('ai'));
    fireEvent.click(await screen.findByRole('button', { name: 'Allow' }));
    await waitFor(() => expect(server.posts).toEqual([{ aiConsent: true }]));
  });

  it('can be opened again in the same session after declining', async () => {
    profileState.value = { profile: { ageStatus: 'adult', consents: { ai: { granted: false } } } };
    const server = serveRequirements([]);
    render(<RequirementsGate />);
    await waitFor(() => expect(server.fetchMock).toHaveBeenCalledTimes(1));

    act(() => openRequirements('ai'));
    fireEvent.click(await screen.findByRole('button', { name: 'Not now' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    act(() => openRequirements('ai'));
    expect(await screen.findByRole('button', { name: 'Allow' })).toBeInTheDocument();
  });

  it('tells a minor why AI is unavailable instead of asking for consent', async () => {
    profileState.value = { profile: { ageStatus: 'minor' } };
    serveRequirements([]);
    render(<RequirementsGate />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    act(() => openRequirements('ai'));
    expect(await screen.findByText(/AI features and result scanning are for users 18 and over/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Allow' })).not.toBeInTheDocument();
  });
});

describe('rechecking', () => {
  it('rechecks on focus only after 6 hours', async () => {
    const server = serveRequirements([]);
    const now = vi.spyOn(Date, 'now');
    const start = 1_800_000_000_000;
    now.mockReturnValue(start);
    render(<RequirementsGate />);
    await waitFor(() => expect(server.fetchMock).toHaveBeenCalledTimes(1));

    now.mockReturnValue(start + RECHECK_MS - 1);
    act(() => { window.dispatchEvent(new Event('focus')); });
    expect(server.fetchMock).toHaveBeenCalledTimes(1);

    server.setPending([TERMS]);
    now.mockReturnValue(start + RECHECK_MS + 1);
    act(() => { window.dispatchEvent(new Event('focus')); });
    expect(await screen.findByRole('dialog', { name: 'Updated terms' })).toBeInTheDocument();
    expect(server.fetchMock).toHaveBeenCalledTimes(2);
  });
});
