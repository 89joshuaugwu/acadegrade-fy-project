/* eslint-disable @typescript-eslint/no-explicit-any */
/** Dev-only stand-in for 'firebase/database' (only the unread-notification counter uses it). */
import * as real from 'firebase/database';
import { PREVIEW } from '../runtime';
import { rtdbSeed } from '../fixtures/firestore';

export * from 'firebase/database';

const previewRtdb = { __preview: 'rtdb' } as any;
const isPreview = (v: any) => PREVIEW && (v === previewRtdb || v?.__preview === 'rtdb-ref');

export const getDatabase: typeof real.getDatabase = ((...args: any[]) => (PREVIEW ? previewRtdb : (real.getDatabase as any)(...args))) as any;
export const ref: typeof real.ref = ((db: any, path?: string) =>
  PREVIEW && db === previewRtdb ? ({ __preview: 'rtdb-ref', key: path, path } as any) : real.ref(db, path)) as any;
export const onValue: typeof real.onValue = ((r: any, cb: any, ...rest: any[]) => {
  if (!isPreview(r)) return (real.onValue as any)(r, cb, ...rest);
  const t = setTimeout(() => cb({ val: () => rtdbSeed()[String(r.path)] ?? null, exists: () => String(r.path) in rtdbSeed(), key: r.key }), 40);
  return () => clearTimeout(t);
}) as any;
export const off: typeof real.off = ((r: any, ...rest: any[]) => (isPreview(r) ? undefined : (real.off as any)(r, ...rest))) as any;
export const set: typeof real.set = ((r: any, v: unknown) => (isPreview(r) ? Promise.resolve() : real.set(r, v))) as any;
export const update: typeof real.update = ((r: any, v: any) => (isPreview(r) ? Promise.resolve() : real.update(r, v))) as any;
