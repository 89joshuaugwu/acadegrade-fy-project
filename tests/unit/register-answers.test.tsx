import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'next-themes';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getDocument: vi.fn(),
  toastError: vi.fn(),
  user: {
    uid: 'google-user',
    email: 'ada@example.com',
    displayName: 'Ada Example',
    providerData: [{ providerId: 'google.com' }],
    getIdToken: async () => 'id-token',
  },
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mocks.user, uid: mocks.user.uid, loading: false, error: null }) }));
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => ({ profile: null, loading: false }) }));
vi.mock('@/lib/firebase/auth', () => ({ getIdToken: vi.fn(), signInWithEmail: vi.fn(), signInWithGoogle: vi.fn() }));
vi.mock('@/lib/firebase/firestore', () => ({ getDocument: mocks.getDocument }));
vi.mock('@/lib/academic-catalog/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/academic-catalog/client')>();
  return { ...actual, loadAcademicCatalog: async () => actual.DEFAULT_ACADEMIC_CATALOG };
});
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: mocks.toastError } }));
vi.mock('@/components/ui/MobileAppDownload', () => ({ MobileAppDownload: () => null }));

import RegisterPage from '@/app/(public)/register/page';

const DRAFT_KEY = 'acadegrade:registration-draft:v2';

function resumeAtRecordSetup() {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
    step: 3,
    values: {
      authMethod: 'google',
      fullName: 'Ada Example',
      matric: '2022/000001',
      email: 'ada@example.com',
      university: 'University of Lagos',
      department: 'Computer Science',
      programme: 'B.Sc. Computer Science',
      courseDuration: 4,
      currentLevel: 200,
      entrySession: '2024/2025',
      recordMode: 'fromScratch',
      // Old drafts that carried an agreement must not pre-tick it.
      termsAccepted: true,
      aiConsent: true,
    },
  }));
}

function finalizeBody(fetchMock: ReturnType<typeof vi.fn>) {
  const call = fetchMock.mock.calls.find(([url]) => url === '/api/auth/register/finalize');
  return call ? JSON.parse(String((call[1] as RequestInit).body)) : null;
}

describe('Registration answers', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sessionStorage.clear();
    mocks.getDocument.mockReset();
    mocks.getDocument.mockImplementation(async (path: string) => (
      path === 'config/legal' ? { termsVersion: '2026-12-01', privacyVersion: '2026-11-20' } : null
    ));
    // Never reaches the live backend: the finalize endpoint is answered here.
    fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({}) }) as Response);
    vi.stubGlobal('fetch', fetchMock);
    resumeAtRecordSetup();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function renderAtRecordSetup() {
    render(<ThemeProvider attribute="class" defaultTheme="system"><RegisterPage /></ThemeProvider>);
    return screen.findByRole('radiogroup', { name: 'How old are you?' }, { timeout: 8000 });
  }

  it('starts every agreement unticked, even when an old draft had them', async () => {
    await renderAtRecordSetup();

    expect(screen.getByRole('radio', { name: "I'm 18 or older" })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: "I'm under 18" })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /i agree to the terms and privacy notice/i })).not.toBeChecked();
  });

  it('blocks account creation until the age and terms are answered', async () => {
    const user = userEvent.setup();
    await renderAtRecordSetup();

    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText('Choose your age group to continue')).toBeInTheDocument();
    expect(screen.getByText('Agree to the Terms and Privacy notice to continue')).toBeInTheDocument();
    expect(finalizeBody(fetchMock)).toBeNull();
  });

  it('sends an adult’s answers with the server legal versions on the existing finalize call', async () => {
    const user = userEvent.setup();
    await renderAtRecordSetup();

    await user.click(screen.getByRole('radio', { name: "I'm 18 or older" }));
    await user.click(screen.getByRole('checkbox', { name: /allow acadegrade to send my results/i }));
    await user.click(screen.getByRole('checkbox', { name: /i agree to the terms and privacy notice/i }));
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(finalizeBody(fetchMock)).not.toBeNull());
    const body = finalizeBody(fetchMock);
    expect(body.answers).toEqual({
      age: 'adult',
      terms: { version: '2026-12-01' },
      privacy: { version: '2026-11-20' },
      aiConsent: true,
    });
    expect(body.profile.university).toBe('University of Lagos');
  });

  it('sends a minor’s answers without any AI consent', async () => {
    const user = userEvent.setup();
    mocks.getDocument.mockImplementation(async () => { throw new Error('offline'); });
    await renderAtRecordSetup();

    await user.click(screen.getByRole('radio', { name: "I'm under 18" }));
    expect(screen.getByText(/ai features and result scanning are for users 18 and over/i)).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /i agree to the terms and privacy notice/i }));
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(finalizeBody(fetchMock)).not.toBeNull());
    expect(finalizeBody(fetchMock).answers).toEqual({
      age: 'minor',
      terms: { version: '2026-11-13' },
      privacy: { version: '2026-11-13' },
    });
  });
});
