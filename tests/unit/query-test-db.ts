import type { Firestore } from 'firebase-admin/firestore';

// In-memory Firestore double with nested paths, simple queries (==, in, >=, <,
// document-id ranges), ordering, limits, batches and serial transactions.
// Paths are full document paths such as `users/alice/semesters/s1`.
type Filter = { field: unknown; op: string; value: unknown };
type Order = { field: unknown; direction: 'asc' | 'desc' };

const isDocId = (field: unknown) => typeof field !== 'string';

export function queryTestDb() {
  const docs = new Map<string, any>();
  const writes: { op: 'set' | 'delete' | 'create' | 'update'; path: string }[] = [];
  let batchCommits = 0;

  const snapshot = (path: string) => ({
    id: path.split('/').at(-1)!,
    exists: docs.has(path),
    data: () => docs.get(path),
    ref: docRef(path),
  });

  function setDoc(path: string, data: any, options?: { merge?: boolean }) {
    writes.push({ op: 'set', path });
    docs.set(path, options?.merge ? { ...docs.get(path), ...data } : data);
  }
  function deleteDoc(path: string) {
    writes.push({ op: 'delete', path });
    docs.delete(path);
  }

  function docRef(path: string): any {
    return {
      path,
      id: path.split('/').at(-1),
      get: async () => snapshot(path),
      set: async (data: any, options?: { merge?: boolean }) => { setDoc(path, data, options); },
      create: async (data: any) => {
        if (docs.has(path)) throw new Error('already exists');
        writes.push({ op: 'create', path });
        docs.set(path, data);
      },
      update: async (data: any) => {
        if (!docs.has(path)) throw new Error('not found');
        writes.push({ op: 'update', path });
        docs.set(path, { ...docs.get(path), ...data });
      },
      delete: async () => { deleteDoc(path); },
      collection: (name: string) => collectionRef(`${path}/${name}`),
    };
  }

  function query(collection: string, filters: Filter[], orders: Order[], max?: number, after?: unknown[]): any {
    const run = () => {
      const depth = collection.split('/').length + 1;
      let rows = [...docs.keys()]
        .filter((key) => key.startsWith(`${collection}/`) && key.split('/').length === depth)
        .map((key) => ({ key, id: key.split('/').at(-1)!, data: docs.get(key) }));
      const value = (row: { id: string; data: any }, field: unknown) => (isDocId(field) ? row.id : row.data?.[field as string]);
      for (const filter of filters) {
        rows = rows.filter((row) => {
          const actual = value(row, filter.field);
          if (filter.op === '==') return actual === filter.value;
          if (filter.op === 'in') return (filter.value as unknown[]).includes(actual);
          if (filter.op === '>=') return actual !== undefined && (actual as any) >= (filter.value as any);
          if (filter.op === '<') return actual !== undefined && (actual as any) < (filter.value as any);
          if (filter.op === '<=') return actual !== undefined && (actual as any) <= (filter.value as any);
          throw new Error(`Unsupported operator ${filter.op}`);
        });
      }
      for (const order of [...orders].reverse()) {
        rows.sort((a, b) => {
          const left = value(a, order.field) as any;
          const right = value(b, order.field) as any;
          const result = left < right ? -1 : left > right ? 1 : 0;
          return order.direction === 'desc' ? -result : result;
        });
      }
      if (after && orders.length) {
        const index = rows.findIndex((row) => {
          const left = value(row, orders[0].field) as any;
          return orders[0].direction === 'desc' ? left < (after[0] as any) : left > (after[0] as any);
        });
        rows = index === -1 ? [] : rows.slice(index);
      }
      if (max !== undefined) rows = rows.slice(0, max);
      const result = rows.map((row) => snapshot(row.key));
      return { docs: result, empty: result.length === 0, size: result.length, forEach: (fn: (doc: any) => void) => result.forEach(fn) };
    };
    return {
      where: (field: unknown, op: string, value: unknown) => query(collection, [...filters, { field, op, value }], orders, max, after),
      orderBy: (field: unknown, direction: 'asc' | 'desc' = 'asc') => query(collection, filters, [...orders, { field, direction }], max, after),
      limit: (count: number) => query(collection, filters, orders, count, after),
      startAfter: (...values: unknown[]) => query(collection, filters, orders, max, values),
      get: async () => run(),
    };
  }

  let counter = 0;
  function collectionRef(path: string): any {
    return {
      ...query(path, [], []),
      doc: (id?: string) => docRef(`${path}/${id ?? `auto-${Date.now()}-${counter++}`}`),
      add: async (data: any) => {
        const ref = docRef(`${path}/auto-${Date.now()}-${counter++}`);
        await ref.set(data);
        return ref;
      },
    };
  }

  let queue = Promise.resolve();
  const db = {
    collection: (name: string) => collectionRef(name),
    batch: () => {
      const staged: (() => void)[] = [];
      return {
        delete: (ref: { path: string }) => { staged.push(() => deleteDoc(ref.path)); },
        set: (ref: { path: string }, data: any, options?: { merge?: boolean }) => { staged.push(() => setDoc(ref.path, data, options)); },
        commit: async () => {
          if (staged.length > 500) throw new Error('Batch exceeds 500 writes');
          batchCommits += 1;
          staged.forEach((write) => write());
        },
      };
    },
    runTransaction: (work: (tx: any) => Promise<any>) => {
      const result = queue.then(async () => {
        const staged: (() => void)[] = [];
        const value = await work({
          get: async (ref: { path: string }) => {
            if (staged.length) throw new Error('Firestore reads must precede writes');
            return snapshot(ref.path);
          },
          getAll: async (...refs: { path: string }[]) => {
            if (staged.length) throw new Error('Firestore reads must precede writes');
            return refs.map((ref) => snapshot(ref.path));
          },
          set: (ref: { path: string }, data: any, options?: { merge?: boolean }) => { staged.push(() => setDoc(ref.path, data, options)); },
          create: (ref: { path: string }, data: any) => {
            if (docs.has(ref.path)) throw new Error('already exists');
            staged.push(() => setDoc(ref.path, data));
          },
          delete: (ref: { path: string }) => { staged.push(() => deleteDoc(ref.path)); },
        });
        staged.forEach((write) => write());
        return value;
      });
      queue = result.then(() => undefined, () => undefined);
      return result;
    },
  };

  return {
    db: db as unknown as Firestore,
    docs,
    writes,
    batchCommits: () => batchCommits,
    paths: (prefix: string) => [...docs.keys()].filter((key) => key.startsWith(prefix)),
  };
}
