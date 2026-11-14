import { renderHook, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const firestore = vi.hoisted(() => ({
  setDocument: vi.fn(),
  updateDocument: vi.fn(),
  deleteDocument: vi.fn(),
}));
vi.mock('@/lib/firebase/firestore', () => firestore);

import { SemesterPreview } from '@/components/cgpa/SemesterPreview';
import { useClearDraftsOnSignOut } from '@/lib/drafts';
import { loadExpectedGrades, previewStorageKey } from '@/lib/planning/semesterPreviewStore';

const semesters = [
  { id: 'sem-1', gpa: 4, pi: 4, creditLoaded: 18 },
  { id: 'sem-2', gpa: 4, pi: 3.25, creditLoaded: 3 },
];
const graded = { id: 'c1', code: 'CSC 401', title: 'Compilers', units: 3, caScore: 20, examScore: 45 };
const awaiting = { id: 'c2', code: 'CSC 499', title: 'Project', units: 3, caScore: 22, examScore: null, isAR: true };

describe('SemesterPreview card (A3.3)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.values(firestore).forEach((fn) => fn.mockReset());
  });
  afterEach(() => window.localStorage.clear());

  it('card hidden without AR rows; nothing written to Firestore', async () => {
    const { container, unmount } = render(
      <SemesterPreview uid="u1" semesterId="sem-2" courses={[graded]} semesters={semesters} />,
    );
    expect(container).toBeEmptyDOMElement();
    unmount();

    const user = userEvent.setup();
    render(<SemesterPreview uid="u1" semesterId="sem-2" courses={[graded, awaiting]} semesters={semesters} />);
    const card = screen.getByRole('region', { name: 'Preview expected grades' });
    expect(within(card).getByText('Preview only: never saved to your record')).toBeInTheDocument();

    const picker = within(card).getByRole('combobox', { name: 'Expected grade for CSC 499' });
    expect(picker).toHaveValue('');
    await user.selectOptions(picker, 'A');

    // (4*3 + 5*3) / 6 = 4.50 scenario GPA; official stays 4.00.
    expect(within(card).getByTestId('preview-official-gpa')).toHaveTextContent('4.00');
    expect(within(card).getByTestId('preview-scenario-gpa')).toHaveTextContent('4.50');

    // Saved on this device only.
    expect(loadExpectedGrades('u1', 'sem-2')).toEqual({ c2: 'A' });
    expect(firestore.setDocument).not.toHaveBeenCalled();
    expect(firestore.updateDocument).not.toHaveBeenCalled();
    expect(firestore.deleteDocument).not.toHaveBeenCalled();
  });

  it('restores stored guesses and clears them on sign-out', () => {
    window.localStorage.setItem(previewStorageKey('u1', 'sem-2'), JSON.stringify({ c2: 'B', junk: 'Z' }));
    render(<SemesterPreview uid="u1" semesterId="sem-2" courses={[graded, awaiting]} semesters={semesters} />);
    expect(screen.getByRole('combobox', { name: 'Expected grade for CSC 499' })).toHaveValue('B');

    const { rerender } = renderHook(({ uid }) => useClearDraftsOnSignOut(uid), { initialProps: { uid: 'u1' as string | null } });
    rerender({ uid: null });
    expect(window.localStorage.getItem(previewStorageKey('u1', 'sem-2'))).toBeNull();
  });
});
