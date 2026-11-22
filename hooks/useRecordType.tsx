'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { resolveRecordType, type RecordType } from '@/types/records';

const RecordTypeContext = createContext<RecordType>('tertiary');

/**
 * Supplies what the account tracks (users/{uid}.recordType) to the student app.
 * The student layout passes the profile it already subscribes to, so there are
 * no extra reads. Missing or unknown values, and anything outside the provider,
 * read as tertiary: older accounts never change.
 */
export function RecordTypeProvider({ value, children }: { value: unknown; children: ReactNode }) {
  return <RecordTypeContext.Provider value={resolveRecordType(value)}>{children}</RecordTypeContext.Provider>;
}

export function useRecordType(): RecordType {
  return useContext(RecordTypeContext);
}
