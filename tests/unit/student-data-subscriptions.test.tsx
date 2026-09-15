import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  uid: 'student-1' as string | null,
  subscribeToDocument: vi.fn(),
  subscribeToCollection: vi.fn(),
  orderBy: vi.fn(() => ({ type: 'orderBy' })),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ uid: mocks.uid }),
}));

vi.mock('@/lib/firebase/firestore', () => ({
  subscribeToDocument: mocks.subscribeToDocument,
  subscribeToCollection: mocks.subscribeToCollection,
  updateDocument: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  orderBy: mocks.orderBy,
}));

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn() },
}));

import { useProfile } from '@/hooks/useProfile';
import { useSemesters } from '@/hooks/useSemesters';

describe('student data subscriptions', () => {
  beforeEach(() => {
    mocks.uid = 'student-1';
    mocks.subscribeToDocument.mockReset();
    mocks.subscribeToCollection.mockReset();
    mocks.orderBy.mockClear();
    mocks.subscribeToDocument.mockReturnValue(vi.fn());
    mocks.subscribeToCollection.mockReturnValue(vi.fn());
  });

  it('ends profile loading on a listener failure and can resubscribe', async () => {
    const { result } = renderHook(() => useProfile());
    const onError = mocks.subscribeToDocument.mock.calls[0][2] as (error: Error) => void;

    act(() => onError(new Error('profile offline')));

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toEqual(new Error('profile offline'));

    act(() => result.current.retry());

    await waitFor(() => expect(mocks.subscribeToDocument).toHaveBeenCalledTimes(2));
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('ends semester loading on a listener failure and can resubscribe', async () => {
    const { result } = renderHook(() => useSemesters());
    const onError = mocks.subscribeToCollection.mock.calls[0][2] as (error: Error) => void;

    act(() => onError(new Error('semesters offline')));

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toEqual(new Error('semesters offline'));

    act(() => result.current.retry());

    await waitFor(() => expect(mocks.subscribeToCollection).toHaveBeenCalledTimes(2));
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
  });
});
