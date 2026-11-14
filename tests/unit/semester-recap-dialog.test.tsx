import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  queryCollection: vi.fn(),
  updateDocument: vi.fn(),
  profile: {} as Record<string, unknown>,
  disabled: new Set<string>(),
  eligibility: null as null | Record<string, unknown>,
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { uid: 'u1', getIdToken: () => Promise.resolve('token') } }),
}));
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => ({ profile: mocks.profile, loading: false }) }));
vi.mock('@/hooks/usePlatformSettings', () => ({
  usePlatformSettings: () => ({ isFeatureDisabled: (id: string) => mocks.disabled.has(id) }),
}));
vi.mock('@/lib/firebase/firestore', () => ({
  queryCollection: mocks.queryCollection,
  updateDocument: mocks.updateDocument,
}));
vi.mock('firebase/firestore', () => ({ serverTimestamp: () => 'SERVER_TIME' }));

import { SemesterRecapLauncher } from '@/components/dashboard/SemesterRecapDialog';

const semesters = [
  { id: 's1', label: 'Year 1 First Semester', gpa: 2, pi: 2, creditLoaded: 18, isComplete: true, level: 100, semester: 1 },
  { id: 's2', label: 'Year 1 Second Semester', gpa: 5, pi: 5, creditLoaded: 18, isComplete: true, level: 100, semester: 2 },
] as never[];

function setRecapParam(id: string | null) {
  window.history.replaceState({}, '', id ? `/results?recap=${id}` : '/results');
}

describe('SemesterRecapLauncher', () => {
  beforeEach(() => {
    mocks.queryCollection.mockReset().mockResolvedValue([{ id: 'c1', code: 'CSC 102', title: 'Programming', units: 3, caScore: 25, examScore: 50, totalScore: 75 }]);
    mocks.updateDocument.mockReset().mockResolvedValue(undefined);
    mocks.profile = { ageStatus: 'adult', consents: { ai: { granted: true } } };
    mocks.disabled = new Set();
    mocks.eligibility = { status: 'adult', aiAllowed: true, aiConsent: true };
    vi.stubGlobal('fetch', vi.fn(async () => (mocks.eligibility
      ? new Response(JSON.stringify({ age: mocks.eligibility }), { status: 200 })
      : new Response('{}', { status: 500 }))));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    setRecapParam(null);
  });

  it('shown once (recapShownAt written)', async () => {
    const user = userEvent.setup();
    setRecapParam('s2');
    const { unmount } = render(<SemesterRecapLauncher semesters={semesters} />);
    const dialog = await screen.findByRole('dialog', { name: /Semester recap/ });
    expect(dialog).toHaveTextContent('Year 1 Second Semester');
    expect(dialog).toHaveTextContent('CSC 102');
    expect(await screen.findByRole('link', { name: /Get a Written Analysis/ })).toHaveAttribute('href', '/insights?tab=analysis');

    await user.click(screen.getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(mocks.updateDocument).toHaveBeenCalledWith('users/u1/semesters/s2', { recapShownAt: 'SERVER_TIME' }));
    expect(screen.queryByRole('dialog', { name: /Semester recap/ })).not.toBeInTheDocument();
    // The query parameter is removed so a refresh does not reopen it.
    expect(window.location.search).toBe('');
    unmount();

    // Already shown: never opens again, nothing written.
    mocks.updateDocument.mockClear();
    setRecapParam('s2');
    render(<SemesterRecapLauncher semesters={[semesters[0], { ...(semesters[1] as object), recapShownAt: { seconds: 1 } }] as never[]} />);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByRole('dialog', { name: /Semester recap/ })).not.toBeInTheDocument();
    expect(mocks.updateDocument).not.toHaveBeenCalled();
  });

  it('AI link hidden for minors and declined consent', async () => {
    setRecapParam('s2');
    mocks.eligibility = { status: 'minor', aiAllowed: false, aiConsent: null };
    mocks.profile = { ageStatus: 'minor' };
    const minor = render(<SemesterRecapLauncher semesters={semesters} />);
    await screen.findByRole('dialog', { name: /Semester recap/ });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByRole('link', { name: /Written Analysis/ })).not.toBeInTheDocument();
    minor.unmount();

    // Declined consent, with the server check unavailable: still hidden.
    setRecapParam('s2');
    mocks.eligibility = null;
    mocks.profile = { ageStatus: 'adult', consents: { ai: { granted: false } } };
    render(<SemesterRecapLauncher semesters={semesters} />);
    await screen.findByRole('dialog', { name: /Semester recap/ });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByRole('link', { name: /Written Analysis/ })).not.toBeInTheDocument();
  });
});
