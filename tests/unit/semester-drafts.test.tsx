import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DRAFT_DEBOUNCE_MS,
  clearDraft,
  clearUserDrafts,
  draftKey,
  draftDiffers,
  loadDraft,
  saveDraft,
} from '@/lib/drafts/semester-drafts';
import { GradeTable } from '@/components/cgpa/GradeTable';
import type { CourseInput } from '@/types/course';

const saved: CourseInput = { id: 'c1', code: 'CSC 401', title: 'Compilers', units: 3, caScore: 20, examScore: 50 };

beforeEach(() => localStorage.clear());
afterEach(() => vi.useRealTimers());

describe('semester drafts storage', () => {
  it('saves, loads and clears a draft per user and semester', () => {
    saveDraft('u1', 's1', [saved]);
    expect(loadDraft('u1', 's1')?.courses).toEqual([saved]);
    expect(loadDraft('u2', 's1')).toBeNull();
    expect(loadDraft('u1', 's2')).toBeNull();
    clearDraft('u1', 's1');
    expect(loadDraft('u1', 's1')).toBeNull();
  });

  it('clears every draft for one user on sign-out and keeps other users', () => {
    saveDraft('u1', 's1', [saved]);
    saveDraft('u1', 's2', [saved]);
    saveDraft('u2', 's1', [saved]);
    localStorage.setItem('unrelated', 'x');
    clearUserDrafts('u1');
    expect(loadDraft('u1', 's1')).toBeNull();
    expect(loadDraft('u1', 's2')).toBeNull();
    expect(loadDraft('u2', 's1')).not.toBeNull();
    expect(localStorage.getItem('unrelated')).toBe('x');
  });

  it('ignores corrupt drafts and never throws when storage is blocked', () => {
    localStorage.setItem(draftKey('u1', 's1'), '{not json');
    expect(loadDraft('u1', 's1')).toBeNull();
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(() => saveDraft('u1', 's1', [saved])).not.toThrow();
    setItem.mockRestore();
  });

  it('compares only the fields a student edits', () => {
    expect(draftDiffers([{ ...saved, localId: 'x' }], [saved])).toBe(false);
    expect(draftDiffers([{ ...saved, caScore: 21 }], [saved])).toBe(true);
    expect(draftDiffers([saved, saved], [saved])).toBe(true);
  });
});

describe('GradeTable drafts', () => {
  it('autosaves unsaved edits after a pause, never before', () => {
    vi.useFakeTimers();
    render(<GradeTable editable initialCourses={[saved]} draft={{ uid: 'u1', semesterId: 's1' }} />);
    fireEvent.change(screen.getAllByLabelText('Course 1 exam score out of 70')[0], { target: { value: '60' } });
    expect(loadDraft('u1', 's1')).toBeNull();
    act(() => { vi.advanceTimersByTime(DRAFT_DEBOUNCE_MS); });
    expect(loadDraft('u1', 's1')?.courses[0]).toMatchObject({ code: 'CSC 401', examScore: 60 });
  });

  it('offers to restore unsaved changes on return', () => {
    saveDraft('u1', 's1', [{ ...saved, examScore: 66 }]);
    render(<GradeTable editable initialCourses={[saved]} draft={{ uid: 'u1', semesterId: 's1' }} />);
    expect(screen.getByRole('region', { name: 'Restore unsaved changes?' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
    expect(screen.getAllByLabelText('Course 1 exam score out of 70')[0]).toHaveValue(66);
    expect(screen.queryByRole('region', { name: 'Restore unsaved changes?' })).not.toBeInTheDocument();
  });

  it('discarding removes the draft and keeps the saved scores', () => {
    saveDraft('u1', 's1', [{ ...saved, examScore: 66 }]);
    render(<GradeTable editable initialCourses={[saved]} draft={{ uid: 'u1', semesterId: 's1' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(loadDraft('u1', 's1')).toBeNull();
    expect(screen.getAllByLabelText('Course 1 exam score out of 70')[0]).toHaveValue(50);
  });

  it('drops a draft that matches what is already saved', () => {
    saveDraft('u1', 's1', [saved]);
    render(<GradeTable editable initialCourses={[saved]} draft={{ uid: 'u1', semesterId: 's1' }} />);
    expect(screen.queryByRole('region', { name: 'Restore unsaved changes?' })).not.toBeInTheDocument();
    expect(loadDraft('u1', 's1')).toBeNull();
  });
});
