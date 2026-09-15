'use client';

import { useCallback, useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { subscribeToCollection } from '@/lib/firebase/firestore';
import { orderBy } from 'firebase/firestore';
import type { SemesterWithId, SemesterWithCourses } from '@/types/semester';

interface SemesterState {
  semesters: SemesterWithId[];
  loading: boolean;
  error: Error | null;
  retry: () => void;
}

/**
 * Subscribe to user's semesters from Firestore with real-time updates.
 * Returns semesters sorted by level → semester number.
 */
export function useSemesters(): SemesterState {
  const { uid } = useAuth();
  const [state, setState] = useState<Omit<SemesterState, 'retry'>>({
    semesters: [],
    loading: true,
    error: null,
  });
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!uid) {
      setState({ semesters: [], loading: false, error: null });
      return;
    }

    setState((previous) => ({ ...previous, loading: true, error: null }));

    const unsubscribe = subscribeToCollection<SemesterWithId>(
      `users/${uid}/semesters`,
      (semesters) => {
        const sorted = semesters.sort((a, b) => {
          if (a.level !== b.level) return a.level - b.level;
          return a.semester - b.semester;
        });
        setState({ semesters: sorted, loading: false, error: null });
      },
      (subscriptionError) => {
        setState((previous) => ({
          ...previous,
          loading: false,
          error: subscriptionError,
        }));
      },
      orderBy('level', 'asc')
    );

    return unsubscribe;
  }, [retryKey, uid]);

  const retry = useCallback(() => {
    setRetryKey((key) => key + 1);
  }, []);

  return { ...state, retry };
}
