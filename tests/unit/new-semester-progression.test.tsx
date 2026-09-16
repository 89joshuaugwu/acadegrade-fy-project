import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SemesterWithId } from '@/types/semester';

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  setDocument: vi.fn(),
  queryCollection: vi.fn(),
  semesters: [] as SemesterWithId[],
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), replace: mocks.replace }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { uid: 'student-1' } }),
}));

vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({
    profile: {
      uid: 'student-1',
      entrySession: '2022/2023',
      currentSession: '2022/2023',
      courseDuration: 4,
      currentLevel: 400,
    },
  }),
}));

vi.mock('@/hooks/useSemesters', () => ({
  useSemesters: () => ({ semesters: mocks.semesters, loading: false, error: null }),
}));

vi.mock('@/lib/firebase/firestore', () => ({
  queryCollection: mocks.queryCollection,
  setDocument: mocks.setDocument,
}));

vi.mock('@/components/onboarding/ResultsTour', () => ({ ResultsTour: () => null }));

import NewSemesterPage from '@/app/(student)/results/new/page';

function semester(level: number, number: 1 | 2): SemesterWithId {
  return {
    id: `semester-${level}-${number}`,
    label: `${level}L Semester ${number}`,
    session: `${2022 + level / 100 - 1}/${2023 + level / 100 - 1}`,
    level,
    semester: number,
    gpa: 0,
    pi: 0,
    creditLoaded: 0,
    isComplete: true,
  } as SemesterWithId;
}

const throughFinalFirst = [
  semester(100, 1), semester(100, 2),
  semester(200, 1), semester(200, 2),
  semester(300, 1), semester(300, 2),
  semester(400, 1),
];

describe('new semester progression', () => {
  beforeEach(() => {
    mocks.semesters = throughFinalFirst;
    mocks.queryCollection.mockResolvedValue(throughFinalFirst);
    mocks.setDocument.mockResolvedValue(undefined);
  });

  it('creates only the remaining final semester with a stable slot id', async () => {
    const user = userEvent.setup();
    render(<NewSemesterPage />);

    await user.click(screen.getByRole('button', { name: 'Create 400L Second Semester' }));

    expect(mocks.setDocument).toHaveBeenCalledWith(
      'users/student-1/semesters/slot_400_2',
      expect.objectContaining({
        level: 400,
        semester: 2,
        session: '2025/2026',
      })
    );
    expect(mocks.replace).toHaveBeenCalledWith('/results/slot_400_2');
  });

  it('does not write when the slot appeared during the pre-create re-read', async () => {
    const user = userEvent.setup();
    mocks.queryCollection.mockResolvedValue([...throughFinalFirst, semester(400, 2)]);
    render(<NewSemesterPage />);

    await user.click(screen.getByRole('button', { name: 'Create 400L Second Semester' }));

    expect(mocks.setDocument).not.toHaveBeenCalled();
  });
});
