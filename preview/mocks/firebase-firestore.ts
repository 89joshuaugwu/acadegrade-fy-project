/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Dev-only stand-in for the 'firebase/firestore' package (wired by next.config.ts when AG_UI_PREVIEW=1).
 * Preview OFF: every call goes to the real SDK, unchanged. Preview ON: calls use the in-memory store.
 */
import * as real from 'firebase/firestore';
import { PREVIEW, PreviewTimestamp } from '../runtime';
import * as store from '../store';
import '../fetch-shim';

export * from 'firebase/firestore';

const previewDb = { __preview: 'db', type: 'firestore', app: {} } as any;
const viaPreview = (v: unknown) => PREVIEW && (v === previewDb || store.isPreviewRef(v));

function joinPath(base: string, segments: string[]) {
  return [base, ...segments].filter(Boolean).join('/');
}

export const getFirestore: typeof real.getFirestore = ((...args: any[]) => (PREVIEW ? previewDb : (real.getFirestore as any)(...args))) as any;
export const initializeFirestore: typeof real.initializeFirestore = ((...args: any[]) => (PREVIEW ? previewDb : (real.initializeFirestore as any)(...args))) as any;

export const doc: typeof real.doc = ((parent: any, ...segments: string[]) => {
  if (!viaPreview(parent)) return (real.doc as any)(parent, ...segments);
  if (parent === previewDb) return store.docRef(joinPath('', segments));
  if (parent.__preview === 'collection') return segments.length ? store.docRef(joinPath(parent.path, segments)) : store.newDocRef(parent);
  return store.docRef(joinPath(parent.path, segments));
}) as any;

export const collection: typeof real.collection = ((parent: any, ...segments: string[]) => {
  if (!viaPreview(parent)) return (real.collection as any)(parent, ...segments);
  return store.collectionRef(parent === previewDb ? joinPath('', segments) : joinPath(parent.path, segments));
}) as any;

export const where: typeof real.where = ((field: any, op: any, value: any) =>
  PREVIEW ? store.constraint.where(String(field), op, value) : (real.where as any)(field, op, value)) as any;
export const orderBy: typeof real.orderBy = ((field: any, dir?: any) =>
  PREVIEW ? store.constraint.orderBy(String(field), dir) : (real.orderBy as any)(field, dir)) as any;
export const limit: typeof real.limit = ((n: number) => (PREVIEW ? store.constraint.limit(n) : (real.limit as any)(n))) as any;
export const query: typeof real.query = ((target: any, ...constraints: any[]) =>
  viaPreview(target) ? store.makeQuery(target, ...constraints) : (real.query as any)(target, ...constraints)) as any;

export const getDoc: typeof real.getDoc = (async (ref: any) => (viaPreview(ref) ? store.readDoc(ref) : (real.getDoc as any)(ref))) as any;
export const getDocFromServer = getDoc as unknown as typeof real.getDocFromServer;
export const getDocs: typeof real.getDocs = (async (q: any) => (viaPreview(q) ? store.readQuery(q) : (real.getDocs as any)(q))) as any;
export const getDocsFromServer = getDocs as unknown as typeof real.getDocsFromServer;

export const onSnapshot: typeof real.onSnapshot = ((target: any, ...rest: any[]) => {
  if (!viaPreview(target)) return (real.onSnapshot as any)(target, ...rest);
  const args = rest.filter((a) => !(a && typeof a === 'object' && 'includeMetadataChanges' in a));
  const observer = typeof args[0] === 'function' ? { next: args[0], error: args[1] } : args[0] ?? {};
  return store.listen(target, () => {
    try {
      observer.next?.(target.__preview === 'doc' ? store.readDoc(target) : store.readQuery(target));
    } catch (error) {
      observer.error?.(error);
    }
  });
}) as any;

export const setDoc: typeof real.setDoc = (async (ref: any, data: any, options?: any) => {
  if (!viaPreview(ref)) return (real.setDoc as any)(ref, data, options);
  store.writeDoc(ref, data, options?.merge ? 'merge' : 'set');
}) as any;
export const updateDoc: typeof real.updateDoc = (async (ref: any, dataOrField: any, ...more: any[]) => {
  if (!viaPreview(ref)) return (real.updateDoc as any)(ref, dataOrField, ...more);
  const data: Record<string, unknown> = typeof dataOrField === 'string' ? { [dataOrField]: more[0] } : dataOrField;
  if (typeof dataOrField === 'string') for (let i = 1; i + 1 < more.length; i += 2) data[more[i]] = more[i + 1];
  store.writeDoc(ref, data, 'update');
}) as any;
export const deleteDoc: typeof real.deleteDoc = (async (ref: any) => (viaPreview(ref) ? store.removeDoc(ref) : (real.deleteDoc as any)(ref))) as any;
export const addDoc: typeof real.addDoc = (async (col: any, data: any) => {
  if (!viaPreview(col)) return (real.addDoc as any)(col, data);
  const ref = store.newDocRef(col);
  store.writeDoc(ref, data, 'set');
  return ref;
}) as any;

export const writeBatch: typeof real.writeBatch = ((db: any) => {
  if (!viaPreview(db)) return (real.writeBatch as any)(db);
  const ops: (() => void)[] = [];
  const batch = {
    set: (ref: any, data: any, options?: any) => (ops.push(() => store.writeDoc(ref, data, options?.merge ? 'merge' : 'set')), batch),
    update: (ref: any, data: any) => (ops.push(() => store.writeDoc(ref, data, 'update')), batch),
    delete: (ref: any) => (ops.push(() => store.removeDoc(ref)), batch),
    commit: async () => ops.forEach((op) => op()),
  };
  return batch;
}) as any;

export const runTransaction: typeof real.runTransaction = (async (db: any, fn: any) => {
  if (!viaPreview(db)) return (real.runTransaction as any)(db, fn);
  const tx = {
    get: async (ref: any) => store.readDoc(ref),
    set: (ref: any, data: any, options?: any) => (store.writeDoc(ref, data, options?.merge ? 'merge' : 'set'), tx),
    update: (ref: any, data: any) => (store.writeDoc(ref, data, 'update'), tx),
    delete: (ref: any) => (store.removeDoc(ref), tx),
  };
  return fn(tx);
}) as any;

export const serverTimestamp: typeof real.serverTimestamp = (() => (PREVIEW ? store.transform.serverTimestamp() : real.serverTimestamp())) as any;
export const increment: typeof real.increment = ((n: number) => (PREVIEW ? store.transform.increment(n) : real.increment(n))) as any;
export const arrayUnion: typeof real.arrayUnion = ((...items: unknown[]) => (PREVIEW ? store.transform.arrayUnion(...items) : real.arrayUnion(...items))) as any;
export const arrayRemove: typeof real.arrayRemove = ((...items: unknown[]) => (PREVIEW ? store.transform.arrayRemove(...items) : real.arrayRemove(...items))) as any;
export const deleteField: typeof real.deleteField = (() => (PREVIEW ? store.transform.deleteField() : real.deleteField())) as any;

export const Timestamp = (PREVIEW ? PreviewTimestamp : real.Timestamp) as unknown as typeof real.Timestamp;
