import type { Firestore } from 'firebase-admin/firestore';

// Serial, transactional storage double: staged writes roll back on exceptions,
// and read-after-write is forbidden just as it is in Firestore.
export function rewardTestDb() {
  const docs = new Map<string, any>();
  let queue = Promise.resolve();
  let failedPath: string | undefined;
  const ref = (path: string) => ({ path, get: async () => snapshot(path), set: async (data: any) => { docs.set(path, data); } });
  const snapshot = (path: string) => ({ exists: docs.has(path), data: () => docs.get(path) });
  const db = {
    collection: (name: string) => ({ doc: (id: string) => ref(`${name}/${id}`) }),
    runTransaction: (work: (tx: any) => Promise<any>) => {
      const result = queue.then(async () => {
        const writes: (() => void)[] = [];
        const value = await work({
          get: async (r: { path: string }) => {
            if (writes.length) throw new Error('Firestore reads must precede writes');
            return snapshot(r.path);
          },
          set: (r: { path: string }, data: any, options?: { merge?: boolean }) => {
            if (r.path === failedPath) { failedPath = undefined; throw new Error('storage unavailable'); }
            writes.push(() => docs.set(r.path, options?.merge ? { ...docs.get(r.path), ...data } : data));
          },
          create: (r: { path: string }, data: any) => {
            if (docs.has(r.path)) throw new Error('already exists');
            writes.push(() => docs.set(r.path, data));
          },
        });
        writes.forEach(write => write());
        return value;
      });
      queue = result.then(() => undefined, () => undefined);
      return result;
    },
  };
  return { db: db as unknown as Firestore, docs, failNextWrite: (path: string) => { failedPath = path; } };
}
