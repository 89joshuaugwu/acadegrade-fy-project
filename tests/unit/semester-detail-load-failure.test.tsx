import { Suspense } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  router: null as null | { push: ReturnType<typeof vi.fn>; replace: ReturnType<typeof vi.fn> },
  getDocument: vi.fn(),
  queryCollection: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => mocks.router,
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { uid: 'student-1', getIdToken: vi.fn() } }),
}));

vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({ profile: { fullName: 'Ada Student' } }),
}));

vi.mock('@/hooks/usePlatformSettings', () => ({
  usePlatformSettings: () => ({ isFeatureDisabled: () => false }),
}));

vi.mock('@/lib/firebase/firestore', () => ({
  getDocument: mocks.getDocument,
  queryCollection: mocks.queryCollection,
  setDocument: vi.fn(),
  updateDocument: vi.fn(),
}));

vi.mock('@/lib/firebase/semester', () => ({
  commitSemesterRecord: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  increment: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: { error: mocks.toastError, success: vi.fn() },
}));

vi.mock('@/components/cgpa/GradeTable', () => ({
  GradeTable: () => <div>Grade table</div>,
}));

vi.mock('@/components/onboarding/ResultsTour', () => ({
  ResultsTour: () => null,
}));

import SemesterDetailPage from '@/app/(student)/results/[semesterId]/page';

async function renderPage() {
  const params = Promise.resolve({ semesterId: 'semester-1' });
  await act(async () => {
    render(
      <Suspense fallback={<p>Resolving semester</p>}>
        <SemesterDetailPage params={params} />
      </Suspense>
    );
  });
}

describe('semester detail load failure', () => {
  beforeEach(() => {
    mocks.push.mockReset();
    mocks.replace.mockReset();
    mocks.getDocument.mockReset();
    mocks.queryCollection.mockReset();
    mocks.toastError.mockReset();
    mocks.router = { push: mocks.push, replace: mocks.replace };
  });

  it('shows recovery actions and retries the unchanged semester reads', async () => {
    const user = userEvent.setup();
    mocks.getDocument
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({
        id: 'semester-1',
        label: 'First Semester',
        level: 300,
        semester: 1,
        session: '2025/2026',
      });
    mocks.queryCollection.mockResolvedValue([]);

    await renderPage();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Semester could not be loaded');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to Results' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Back to Results' }));
    expect(mocks.push).toHaveBeenCalledWith('/results');

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(screen.getByText('Grade table')).toBeInTheDocument());
    expect(mocks.getDocument).toHaveBeenCalledTimes(2);
    expect(mocks.getDocument).toHaveBeenLastCalledWith(
      'users/student-1/semesters/semester-1'
    );
    expect(mocks.queryCollection).toHaveBeenCalledWith(
      'users/student-1/semesters/semester-1/courses'
    );
  });
});
