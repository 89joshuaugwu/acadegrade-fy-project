'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { subscribeToCollection } from '@/lib/firebase/firestore';
import { orderBy } from 'firebase/firestore';
import type { SemesterWithId, SemesterWithCourses } from '@/types/semester';

interface SemesterState {
  semesters: SemesterWithId[];
  loading: boolean;
  error: Error | null;
}

/**
 * Subscribe to user's semesters from Firestore with real-time updates.
 * Returns semesters sorted by level → semester number.
 */
export function useSemesters(): SemesterState {
  const { uid } = useAuth();
  const [state, setState] = useState<SemesterState>({
    semesters: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!uid) {
      setState({ semesters: [], loading: false, error: null });
      return;
    }

    const unsubscribe = subscribeToCollection<SemesterWithId>(
      `users/${uid}/semesters`,
      (semesters) => {
        const sorted = semesters.sort((a, b) => {
          if (a.level !== b.level) return a.level - b.level;
          return a.semester - b.semester;
        });
        setState({ semesters: sorted, loading: false, error: null });
      },
      orderBy('level', 'asc')
    );

    return unsubscribe;
  }, [uid]);

  return state;
}
