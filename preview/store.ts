/**
 * In-memory Firestore stand-in for the UI preview (dev only). Paths are full document paths
 * ("users/u1/semesters/s1"). Writes change memory and notify listeners, so screens react as they would live.
 */
import { PreviewTimestamp } from './runtime';
import { firestoreSeed } from './fixtures/firestore';

type Data = Record<string, unknown>;

export interface PreviewDocRef {
  __preview: 'doc';
  path: string;
  id: string;
  parent: PreviewCollectionRef;
  type: 'document';
}
export interface PreviewCollectionRef {
  __preview: 'collection';
  path: string;
  id: string;
  type: 'collection';
}
type Constraint =
  | { kind: 'where'; field: string; op: string; value: unknown }
  | { kind: 'orderBy'; field: string; dir: 'asc' | 'desc' }
  | { kind: 'limit'; n: number };
export interface PreviewQuery {
  __preview: 'query';
  path: string;
  constraints: Constraint[];
  type: 'query';
}

const docs = new Map<string, Data>();
let seeded = false;
type Listener = { target: PreviewDocRef | PreviewQuery | PreviewCollectionRef; fire: () => void };
const listeners = new Set<Listener>();
const reads: string[] = [];
if (typeof window !== 'undefined') {
  // Debug handle for the browser console: window.__agPreviewStore.
  (window as unknown as Record<string, unknown>).__agPreviewStore = { docs, listeners, reads, seeded: () => seeded };
}

function ensureSeeded() {
  if (seeded) return;
  seeded = true;
  for (const [path, data] of Object.entries(firestoreSeed())) docs.set(path, data as Data);
}

let autoId = 0;
const clean = (p: string) => p.replace(/^\/+|\/+$/g, '');

export function docRef(path: string): PreviewDocRef {
  const p = clean(path);
  const parts = p.split('/');
  const id = parts[parts.length - 1];
  return { __preview: 'doc', path: p, id, parent: collectionRef(parts.slice(0, -1).join('/')), type: 'document' };
}
export function collectionRef(path: string): PreviewCollectionRef {
  const p = clean(path);
  return { __preview: 'collection', path: p, id: p.split('/').pop() ?? p, type: 'collection' };
}
export function newDocRef(collection: PreviewCollectionRef): PreviewDocRef {
  autoId += 1;
  return docRef(`${collection.path}/preview-${Date.now().toString(36)}-${autoId}`);
}
export function isPreviewRef(value: unknown): value is PreviewDocRef | PreviewCollectionRef | PreviewQuery {
  return typeof value === 'object' && value !== null && '__preview' in value;
}

export const constraint = {
  where: (field: string, op: string, value: unknown): Constraint => ({ kind: 'where', field, op, value }),
  orderBy: (field: string, dir: 'asc' | 'desc' = 'asc'): Constraint => ({ kind: 'orderBy', field, dir }),
  limit: (n: number): Constraint => ({ kind: 'limit', n }),
};
export function makeQuery(target: PreviewCollectionRef | PreviewQuery, ...more: unknown[]): PreviewQuery {
  const base = target.__preview === 'query' ? target.constraints : [];
  return { __preview: 'query', path: target.path, constraints: [...base, ...(more.filter(Boolean) as Constraint[])], type: 'query' };
}

function getField(data: Data, field: string): unknown {
  return field.split('.').reduce<unknown>((acc, key) => (acc && typeof acc === 'object' ? (acc as Data)[key] : undefined), data);
}
function comparable(v: unknown): number | string | boolean | null {
  if (v instanceof PreviewTimestamp) return v.toMillis();
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') return v;
  return v == null ? null : JSON.stringify(v);
}
function matches(data: Data, c: Extract<Constraint, { kind: 'where' }>): boolean {
  const left = getField(data, c.field);
  const a = comparable(left);
  const b = comparable(c.value);
  switch (c.op) {
    case '==': return a === b;
    case '!=': return a !== b;
    case '<': return a !== null && b !== null && a < b;
    case '<=': return a !== null && b !== null && a <= b;
    case '>': return a !== null && b !== null && a > b;
    case '>=': return a !== null && b !== null && a >= b;
    case 'in': return Array.isArray(c.value) && c.value.map(comparable).includes(a);
    case 'not-in': return Array.isArray(c.value) && !c.value.map(comparable).includes(a);
    case 'array-contains': return Array.isArray(left) && left.map(comparable).includes(b);
    case 'array-contains-any': return Array.isArray(left) && Array.isArray(c.value) && left.some((x) => (c.value as unknown[]).map(comparable).includes(comparable(x)));
    default: return true;
  }
}

export interface Snap {
  id: string;
  ref: PreviewDocRef;
  exists: () => boolean;
  data: () => Data | undefined;
  get: (field: string) => unknown;
  metadata: { hasPendingWrites: boolean; fromCache: boolean };
}
function snap(path: string): Snap {
  const ref = docRef(path);
  const value = docs.get(ref.path);
  return {
    id: ref.id,
    ref,
    exists: () => value !== undefined,
    data: () => (value === undefined ? undefined : structuredCloneSafe(value)),
    get: (field) => (value === undefined ? undefined : getField(value, field)),
    metadata: { hasPendingWrites: false, fromCache: false },
  };
}
function structuredCloneSafe(value: Data): Data {
  // Keep PreviewTimestamp instances (structuredClone would turn them into plain objects).
  const out: Data = {};
  for (const [k, v] of Object.entries(value)) {
    if (v instanceof PreviewTimestamp || v === null || typeof v !== 'object') out[k] = v;
    else if (Array.isArray(v)) out[k] = v.map((x) => (x && typeof x === 'object' && !(x instanceof PreviewTimestamp) ? structuredCloneSafe(x as Data) : x));
    else out[k] = structuredCloneSafe(v as Data);
  }
  return out;
}

export function readDoc(ref: PreviewDocRef): Snap {
  ensureSeeded();
  reads.push(`doc ${ref.path}`);
  return snap(ref.path);
}

export interface QuerySnap {
  docs: Snap[];
  size: number;
  empty: boolean;
  forEach: (fn: (s: Snap) => void) => void;
  docChanges: () => { type: 'added'; doc: Snap }[];
  metadata: { hasPendingWrites: boolean; fromCache: boolean };
}
export function readQuery(target: PreviewCollectionRef | PreviewQuery): QuerySnap {
  ensureSeeded();
  reads.push(`query ${target.path}`);
  const q = target.__preview === 'query' ? target : makeQuery(target);
  const depth = q.path.split('/').length + 1;
  let rows = [...docs.keys()].filter((p) => p.startsWith(`${q.path}/`) && p.split('/').length === depth);
  for (const c of q.constraints) if (c.kind === 'where') rows = rows.filter((p) => matches(docs.get(p) as Data, c));
  const orders = q.constraints.filter((c): c is Extract<Constraint, { kind: 'orderBy' }> => c.kind === 'orderBy');
  if (orders.length) {
    rows.sort((x, y) => {
      for (const o of orders) {
        const a = comparable(getField(docs.get(x) as Data, o.field));
        const b = comparable(getField(docs.get(y) as Data, o.field));
        if (a === b) continue;
        if (a === null) return 1;
        if (b === null) return -1;
        return (a < b ? -1 : 1) * (o.dir === 'desc' ? -1 : 1);
      }
      return 0;
    });
  }
  const lim = q.constraints.find((c): c is Extract<Constraint, { kind: 'limit' }> => c.kind === 'limit');
  if (lim) rows = rows.slice(0, lim.n);
  const list = rows.map(snap);
  return {
    docs: list,
    size: list.length,
    empty: list.length === 0,
    forEach: (fn) => list.forEach(fn),
    docChanges: () => list.map((d) => ({ type: 'added' as const, doc: d })),
    metadata: { hasPendingWrites: false, fromCache: false },
  };
}

/* Field transforms (serverTimestamp, increment, arrayUnion, arrayRemove, deleteField). */
export interface Transform {
  __previewTransform: 'serverTimestamp' | 'increment' | 'arrayUnion' | 'arrayRemove' | 'deleteField';
  value?: unknown;
}
export const transform = {
  serverTimestamp: (): Transform => ({ __previewTransform: 'serverTimestamp' }),
  increment: (n: number): Transform => ({ __previewTransform: 'increment', value: n }),
  arrayUnion: (...items: unknown[]): Transform => ({ __previewTransform: 'arrayUnion', value: items }),
  arrayRemove: (...items: unknown[]): Transform => ({ __previewTransform: 'arrayRemove', value: items }),
  deleteField: (): Transform => ({ __previewTransform: 'deleteField' }),
};
function isTransform(v: unknown): v is Transform {
  return typeof v === 'object' && v !== null && '__previewTransform' in v;
}
function applyValue(previous: unknown, next: unknown): unknown {
  if (!isTransform(next)) {
    if (next && typeof next === 'object' && !Array.isArray(next) && !(next instanceof PreviewTimestamp) && !(next instanceof Date)) {
      const base = previous && typeof previous === 'object' && !Array.isArray(previous) ? { ...(previous as Data) } : {};
      for (const [k, v] of Object.entries(next as Data)) setPath(base, [k], v);
      return base;
    }
    return next instanceof Date ? PreviewTimestamp.fromDate(next) : next;
  }
  switch (next.__previewTransform) {
    case 'serverTimestamp': return PreviewTimestamp.now();
    case 'increment': return (typeof previous === 'number' ? previous : 0) + Number(next.value ?? 0);
    case 'arrayUnion': {
      const list = Array.isArray(previous) ? [...previous] : [];
      for (const item of next.value as unknown[]) if (!list.some((x) => JSON.stringify(x) === JSON.stringify(item))) list.push(item);
      return list;
    }
    case 'arrayRemove': {
      const drop = (next.value as unknown[]).map((x) => JSON.stringify(x));
      return (Array.isArray(previous) ? previous : []).filter((x) => !drop.includes(JSON.stringify(x)));
    }
    default: return undefined;
  }
}
function setPath(target: Data, keys: string[], value: unknown) {
  const [head, ...rest] = keys;
  if (rest.length === 0) {
    if (isTransform(value) && value.__previewTransform === 'deleteField') delete target[head];
    else target[head] = applyValue(target[head], value);
    return;
  }
  const child = target[head] && typeof target[head] === 'object' ? { ...(target[head] as Data) } : {};
  setPath(child, rest, value);
  target[head] = child;
}

export function writeDoc(ref: PreviewDocRef, data: Data, mode: 'set' | 'merge' | 'update') {
  ensureSeeded();
  const base: Data = mode === 'set' ? {} : { ...(docs.get(ref.path) ?? {}) };
  for (const [key, value] of Object.entries(data)) {
    if (mode === 'update') setPath(base, key.split('.'), value);
    else setPath(base, [key], value);
  }
  docs.set(ref.path, base);
  notify();
}
export function removeDoc(ref: PreviewDocRef) {
  ensureSeeded();
  docs.delete(ref.path);
  notify();
}

export function listen(target: PreviewDocRef | PreviewQuery | PreviewCollectionRef, fire: () => void): () => void {
  const entry = { target, fire };
  listeners.add(entry);
  setTimeout(fire, 60);
  return () => listeners.delete(entry);
}
let pending = false;
function notify() {
  if (pending) return;
  pending = true;
  setTimeout(() => {
    pending = false;
    for (const l of listeners) l.fire();
  }, 0);
}
