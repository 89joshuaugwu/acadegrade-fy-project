'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from './useAuth';
import {
  deleteDocument,
  serverTimestamp,
  setDocument,
  subscribeToCollection,
  updateDocument,
} from '@/lib/firebase/firestore';
import type { Timetable } from '@/lib/timetable/engine';
import { newId, type TimetableDoc } from '@/lib/timetable/format';

export type { TimetableDoc };

interface TimetablesState {
  timetables: TimetableDoc[];
  loading: boolean;
  error: Error | null;
}

/** Live list of the signed-in student's timetables, newest first. */
export function useTimetables() {
  const { uid } = useAuth();
  const [state, setState] = useState<TimetablesState>({ timetables: [], loading: true, error: null });
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!uid) {
      setState({ timetables: [], loading: false, error: null });
      return;
    }
    setState((previous) => ({ ...previous, loading: true, error: null }));
    try {
      return subscribeToCollection<TimetableDoc>(
        `users/${uid}/timetables`,
        (docs) => {
          const sorted = [...docs]
            .map((d) => ({ ...d, events: Array.isArray(d.events) ? d.events : [] }))
            .sort((a, b) => (a.validity?.endsAt ?? '') < (b.validity?.endsAt ?? '') ? 1 : -1);
          setState({ timetables: sorted, loading: false, error: null });
        },
        (error) => setState((previous) => ({ ...previous, loading: false, error })),
      );
    } catch (error) {
      setState({ timetables: [], loading: false, error: error as Error });
    }
  }, [retryKey, uid]);

  const retry = useCallback(() => setRetryKey((k) => k + 1), []);

  const actions = useMemo(() => {
    const base = `users/${uid}/timetables`;
    return {
      /** Creates a timetable and returns its id. */
      async create(data: Omit<Timetable, 'status' | 'createdAt' | 'updatedAt'> & { status?: Timetable['status'] }) {
        if (!uid) throw new Error('Not signed in');
        const id = newId('tt');
        await setDocument(`${base}/${id}`, { ...data, status: data.status ?? 'active', createdAt: serverTimestamp() }, { merge: false });
        return id;
      },
      /** Writes only the fields given; events are replaced as one array. */
      async update(id: string, patch: Partial<Omit<Timetable, 'createdAt' | 'updatedAt'>>) {
        if (!uid) throw new Error('Not signed in');
        await updateDocument(`${base}/${id}`, patch as Record<string, unknown>);
      },
      async remove(id: string) {
        if (!uid) throw new Error('Not signed in');
        await deleteDocument(`${base}/${id}`);
      },
    };
  }, [uid]);

  return { ...state, retry, ...actions };
}
