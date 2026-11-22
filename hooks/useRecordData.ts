'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { OlevelRecord } from '@/lib/records/olevelRules';
import {
  subscribeAdmissionRecord,
  subscribeOlevelRecord,
  type AdmissionRecord,
} from '@/lib/records/store';

export interface RecordState<T> {
  /** Null until the student saves something. */
  data: T | null;
  loading: boolean;
  error: Error | null;
}

function useRecordSubscription<T>(
  subscribe: (uid: string, onData: (value: T | null) => void, onError: (error: Error) => void) => () => void,
  enabled: boolean,
): RecordState<T> {
  const { uid } = useAuth();
  const [state, setState] = useState<RecordState<T>>({ data: null, loading: true, error: null });

  useEffect(() => {
    if (!uid || !enabled) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    setState((previous) => ({ ...previous, loading: true, error: null }));
    return subscribe(
      uid,
      (data) => setState({ data, loading: false, error: null }),
      (error) => setState((previous) => ({ ...previous, loading: false, error })),
    );
  }, [uid, enabled, subscribe]);

  return state;
}

/** users/{uid}/olevel/current, live. */
export function useOlevelRecord(enabled = true): RecordState<OlevelRecord> {
  return useRecordSubscription(subscribeOlevelRecord, enabled);
}

/** users/{uid}/admission/current, live. */
export function useAdmissionRecord(enabled = true): RecordState<AdmissionRecord> {
  return useRecordSubscription(subscribeAdmissionRecord, enabled);
}
