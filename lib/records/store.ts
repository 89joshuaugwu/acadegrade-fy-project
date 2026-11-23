/**
 * Web client store for the Phase 2 record types: the pure shaping in
 * lib/records/shape.ts plus the client Firestore reads and writes. Not a shared
 * module (Android has its own lib/records/store.ts).
 */

import { setDocument, subscribeToDocument, updateDocument } from '@/lib/firebase/firestore';
import { parseStoredOlevelRecord, type OlevelRecord } from '@/lib/records/olevelRules';
import type { RecordType } from '@/types/records';
import {
  admissionPath,
  olevelPath,
  parseStoredAdmissionRecord,
  RecordSaveError,
  toAdmissionWrite,
  toOlevelWrite,
  type AdmissionRecord,
} from '@/lib/records/shape';

export * from '@/lib/records/shape';

export async function saveOlevelRecord(uid: string, record: OlevelRecord, currentYear: number = new Date().getFullYear()): Promise<void> {
  const result = toOlevelWrite(record, currentYear);
  if (!result.ok) throw new RecordSaveError(result.errors);
  await setDocument(olevelPath(uid), { ...result.data }, { merge: false });
}

export function subscribeOlevelRecord(uid: string, onData: (record: OlevelRecord | null) => void, onError?: (error: Error) => void): () => void {
  return subscribeToDocument<unknown>(olevelPath(uid), (raw) => onData(raw ? parseStoredOlevelRecord(raw) : null), onError);
}

export async function saveAdmissionRecord(uid: string, record: AdmissionRecord): Promise<void> {
  const result = toAdmissionWrite(record);
  if (!result.ok) throw new RecordSaveError(result.errors);
  await setDocument(admissionPath(uid), { ...result.data }, { merge: false });
}

export function subscribeAdmissionRecord(uid: string, onData: (record: AdmissionRecord | null) => void, onError?: (error: Error) => void): () => void {
  return subscribeToDocument<unknown>(admissionPath(uid), (raw) => onData(raw ? parseStoredAdmissionRecord(raw) : null), onError);
}

/** Switches what the account tracks. Only the field changes: no record of any type is deleted. */
export async function setRecordType(uid: string, recordType: RecordType): Promise<void> {
  await updateDocument(`users/${uid}`, { recordType });
}
