import { Suspense } from 'react';
import { fireEvent } from '@testing-library/react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CourseInput } from '@/types/course';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  getDocument: vi.fn(),
  queryCollection: vi.fn(),
  commit: vi.fn(),
  gradeTableProps: null as null | Record<string, unknown>,
  router: null as null | { push: unknown; replace: unknown },
}));
mocks.router = { push: mocks.push, replace: mocks.replace };

vi.mock('next/navigation', () => ({ useRouter: () => mocks.router }));
const authValue = { user: { uid: 'student-1', getIdToken: () => Promise.resolve('t') } };
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => authValue }));
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => ({ profile: { fullName: 'Ada', department: 'Computer Science' } }) }));
vi.mock('@/hooks/usePlatformSettings', () => ({ usePlatformSettings: () => ({ isFeatureDisabled: () => false }) }));
vi.mock('@/lib/firebase/firestore', () => ({
  getDocument: mocks.getDocument,
  queryCollection: mocks.queryCollection,
  setDocument: vi.fn(),
  updateDocument: vi.fn(),
}));
vi.mock('@/lib/firebase/semester', () => ({ commitSemesterRecord: mocks.commit }));
const fs = vi.hoisted(() => ({ updateDoc: vi.fn(), doc: vi.fn((...segments: unknown[]) => ({ path: segments.slice(1).join('/') })) }));
vi.mock('@/lib/firebase/client', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({ increment: (n: number) => ({ increment: n }), updateDoc: fs.updateDoc, doc: fs.doc, where: (...args: unknown[]) => ({ where: args }) }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/components/onboarding/ResultsTour', () => ({ ResultsTour: () => null }));
vi.mock('@/components/ai/FeatureCredits', () => ({ FeatureCredits: () => null }));
const openRequirementsMock = vi.hoisted(() => vi.fn());
vi.mock('@/lib/consent/requirements', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/consent/requirements')>()),
  openRequirements: openRequirementsMock,
}));
vi.mock('@/components/cgpa/GradeTable', () => ({
  GradeTable: (props: Record<string, unknown>) => {
    mocks.gradeTableProps = props;
    return <div>Grade table</div>;
  },
}));

import SemesterDetailPage from '@/app/(student)/results/[semesterId]/page';
import { loadDraft, saveDraft } from '@/lib/drafts';
import toast from 'react-hot-toast';

async function renderPage() {
  const params = Promise.resolve({ semesterId: 'semester-1' });
  await act(async () => {
    render(<Suspense fallback={null}><SemesterDetailPage params={params} /></Suspense>);
  });
}

describe('semester detail results entry', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    mocks.gradeTableProps = null;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
    mocks.getDocument.mockResolvedValue({ id: 'semester-1', label: 'First Semester', level: 300, semester: 1, session: '2025/2026' });
    mocks.queryCollection.mockImplementation((path: string) => Promise.resolve(path === 'courseCatalog'
      ? [{ code: 'CSC 301', title: 'Data Structures', units: 3, department: 'Computer Science', level: 300, semester: 1 }]
      : []));
    mocks.commit.mockResolvedValue(undefined);
  });

  it('enables drafts for this user and semester and passes catalogue suggestions', async () => {
    await renderPage();
    await screen.findByText('Grade table');
    expect(mocks.gradeTableProps?.draft).toEqual({ uid: 'student-1', semesterId: 'semester-1' });
    expect(screen.getByRole('button', { name: /^Help:/ })).toBeInTheDocument();
    await waitFor(() => expect(mocks.gradeTableProps?.catalog).toEqual([{ code: 'CSC 301', title: 'Data Structures', units: 3 }]));
    expect(mocks.queryCollection).toHaveBeenCalledWith('courseCatalog', expect.anything(), expect.anything());
  });

  it('clears the draft after a successful save', async () => {
    saveDraft('student-1', 'semester-1', [{ code: 'CSC 301', title: 'Data Structures', units: 3, caScore: 20, examScore: 40 }]);
    await renderPage();
    await screen.findByText('Grade table');
    const onSave = mocks.gradeTableProps!.onSave as (courses: CourseInput[]) => Promise<void>;
    await act(async () => {
      await onSave([{ code: 'CSC 301', title: 'Data Structures', units: 3, caScore: 20, examScore: 40 }]);
    });
    expect(mocks.commit).toHaveBeenCalled();
    expect(loadDraft('student-1', 'semester-1')).toBeNull();
  });

  it('keeps the draft when saving fails', async () => {
    mocks.commit.mockRejectedValue(new Error('offline'));
    saveDraft('student-1', 'semester-1', [{ code: 'CSC 301', title: 'Data Structures', units: 3, caScore: 20, examScore: 40 }]);
    await renderPage();
    await screen.findByText('Grade table');
    const onSave = mocks.gradeTableProps!.onSave as (courses: CourseInput[]) => Promise<void>;
    await act(async () => {
      await onSave([{ code: 'CSC 301', title: 'Data Structures', units: 3, caScore: 20, examScore: 40 }]);
    });
    expect(loadDraft('student-1', 'semester-1')).not.toBeNull();
  });

  function usage(age: { status: string; aiAllowed: boolean; aiConsent: boolean | null } | null, ok = true) {
    vi.stubGlobal('fetch', vi.fn((url: string) => Promise.resolve(url === '/api/ai/usage'
      ? { ok, json: async () => (age ? { age } : {}) }
      : { ok: true, json: async () => ({}) })));
  }

  it('tells an under-18 student why scanning is unavailable instead of a blank space', async () => {
    usage({ status: 'minor', aiAllowed: false, aiConsent: null });
    await renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Import Result Slip' }));
    expect(await screen.findByText(/AI features and result scanning are for users 18 and over/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Scan with camera')).not.toBeInTheDocument();
  });

  it('asks a student who has not finished setting up to do so', async () => {
    usage({ status: 'unknown', aiAllowed: false, aiConsent: null });
    await renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Import Result Slip' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Finish setting up' }));
    expect(openRequirementsMock).toHaveBeenCalledWith('ai');
    expect(screen.queryByLabelText('Choose image or PDF')).not.toBeInTheDocument();
  });

  it('keeps the scanner when AI is allowed or eligibility cannot be checked', async () => {
    usage(null, false);
    await renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Import Result Slip' }));
    expect(await screen.findByLabelText('Scan with camera')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Finish setting up' })).not.toBeInTheDocument();
  });

  it('opens calculator rows for review when arriving from the handoff', async () => {
    window.history.pushState({}, '', '/results/semester-1?from=calculator');
    await renderPage();
    await screen.findByText('Grade table');
    expect(mocks.gradeTableProps?.restoreDraftOnMount).toBe(true);
    expect(screen.getByText(/from the calculator/i)).toBeInTheDocument();
    window.history.pushState({}, '', '/');
  });

  it('does not auto-apply drafts on a normal visit', async () => {
    await renderPage();
    await screen.findByText('Grade table');
    expect(mocks.gradeTableProps?.restoreDraftOnMount).toBe(false);
  });

  it('import by course code increments useCount with only the useCount field and shows no error', async () => {
    mocks.getDocument.mockImplementation((path: string) => Promise.resolve(path === 'shareCodes/ABC123'
      ? { code: 'ABC123', courses: [{ code: 'CSC 301', title: 'Data Structures', units: 3 }] }
      : { id: 'semester-1', label: 'First Semester', level: 300, semester: 1, session: '2025/2026' }));
    fs.updateDoc.mockResolvedValue(undefined);
    await renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /Import Code/ }));
    fireEvent.change(await screen.findByPlaceholderText('Enter 6-character code'), { target: { value: 'ABC123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Import Courses' }));

    await waitFor(() => expect(fs.updateDoc).toHaveBeenCalledTimes(1));
    expect(fs.updateDoc.mock.calls[0][0]).toEqual({ path: 'shareCodes/ABC123' });
    expect(fs.updateDoc.mock.calls[0][1]).toEqual({ useCount: { increment: 1 } });
    expect(toast.error).not.toHaveBeenCalled();
    expect(mocks.gradeTableProps?.importRequest).toMatchObject({ rows: [{ code: 'CSC 301' }] });
  });

  it('a failed use-count write never turns a successful import into an error', async () => {
    mocks.getDocument.mockImplementation((path: string) => Promise.resolve(path === 'shareCodes/ABC123'
      ? { code: 'ABC123', courses: [{ code: 'CSC 301', title: 'Data Structures', units: 3 }] }
      : { id: 'semester-1', label: 'First Semester', level: 300, semester: 1, session: '2025/2026' }));
    fs.updateDoc.mockRejectedValue(new Error('permission-denied'));
    await renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /Import Code/ }));
    fireEvent.change(await screen.findByPlaceholderText('Enter 6-character code'), { target: { value: 'ABC123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Import Courses' }));

    await waitFor(() => expect(fs.updateDoc).toHaveBeenCalled());
    expect(toast.error).not.toHaveBeenCalled();
  });});
