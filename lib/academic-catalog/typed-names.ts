import 'server-only';

import { createHash } from 'node:crypto';
import type { DocumentData, Firestore } from 'firebase-admin/firestore';
import { knownNameKeys } from './aliases';
import { PROFILE_FIELD, SUGGESTIONS, scanAcademicProfiles, shortDisplayName, type ProfileRow } from './assign-server';
import { DEFAULT_CATALOG } from './defaults';
import { createInitialCatalog, normalizeCatalogName, type CatalogEntry, type CatalogKind } from './model';

/**
 * "Names typed by students": distinct university / department / programme values
 * on profiles that are not catalogue names or aliases. Counts only; a student list
 * (display names, never emails) is fetched on demand for one name.
 */

export const MAX_TYPED_ROWS = 200;
export const MAX_STUDENTS_LISTED = 50;
const CACHE_MS = 60_000;
const KINDS: CatalogKind[] = ['university', 'department', 'programme'];

export type TypedNameRow = { kind: CatalogKind; name: string; normalizedName: string; count: number };

export function computeTypedNames(rows: readonly ProfileRow[], entries: readonly CatalogEntry[], ignored: ReadonlySet<string>): TypedNameRow[] {
  const result: TypedNameRow[] = [];
  for (const kind of KINDS) {
    const known = knownNameKeys(entries, kind);
    const groups = new Map<string, Map<string, number>>();
    for (const row of rows) {
      const value = row[PROFILE_FIELD[kind]].trim().replace(/\s+/g, ' ');
      if (!value) continue;
      const key = normalizeCatalogName(value);
      if (known.has(key) || ignored.has(`${kind}|${key}`)) continue;
      const spellings = groups.get(key) ?? new Map<string, number>();
      spellings.set(value, (spellings.get(value) ?? 0) + 1);
      groups.set(key, spellings);
    }
    for (const [key, spellings] of groups) {
      let name = '';
      let best = 0;
      let count = 0;
      for (const [spelling, times] of spellings) {
        count += times;
        if (times > best) { best = times; name = spelling; }
      }
      result.push({ kind, name, normalizedName: key, count });
    }
  }
  return result
    .sort((left, right) => right.count - left.count || KINDS.indexOf(left.kind) - KINDS.indexOf(right.kind) || left.name.localeCompare(right.name, 'en'))
    .slice(0, MAX_TYPED_ROWS);
}

export function ignoredSuggestionId(kind: CatalogKind, normalizedName: string): string {
  return `ignored-${createHash('sha256').update(`${kind}:${normalizedName}`).digest('hex').slice(0, 40)}`;
}

async function loadEntries(db: Firestore): Promise<CatalogEntry[]> {
  const document = await db.collection('config').doc('academicCatalog').get();
  const data = document.exists ? document.data() : undefined;
  return data && Number.isSafeInteger(data.revision) && Array.isArray(data.entries)
    ? data.entries as CatalogEntry[]
    : createInitialCatalog(DEFAULT_CATALOG).entries;
}

async function loadIgnored(db: Firestore): Promise<Set<string>> {
  const snapshot = await db.collection(SUGGESTIONS).where('status', '==', 'ignored').limit(2000).get();
  return new Set(snapshot.docs.map((document) => {
    const data = document.data();
    return `${data.kind}|${data.normalizedName}`;
  }));
}

export type TypedNamesReport = { rows: TypedNameRow[]; scanned: number; truncated: boolean; generatedAt: string };

let cache: { at: number; report: TypedNamesReport; profiles: ProfileRow[] } | null = null;

/** Drop the cached report (after Assign, Undo, Ignore or a catalogue change). */
export function invalidateTypedNamesCache() {
  cache = null;
}

async function cached(db: Firestore) {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache;
  const [scan, entries, ignored] = await Promise.all([scanAcademicProfiles(db), loadEntries(db), loadIgnored(db)]);
  const report = { rows: computeTypedNames(scan.rows, entries, ignored), scanned: scan.rows.length, truncated: scan.truncated, generatedAt: new Date().toISOString() };
  cache = { at: Date.now(), report, profiles: scan.rows };
  return cache;
}

export async function loadTypedNames(db: Firestore): Promise<TypedNamesReport> {
  return (await cached(db)).report;
}

/** Up to 50 students who typed this name, as "Chidi O." with their uid (for the admin user drawer). */
export async function studentsWhoTyped(db: Firestore, kind: CatalogKind, name: string): Promise<{ students: { uid: string; displayName: string }[]; total: number }> {
  const key = normalizeCatalogName(name);
  const { profiles } = await cached(db);
  const uids = profiles.filter((row) => row[PROFILE_FIELD[kind]] && normalizeCatalogName(row[PROFILE_FIELD[kind]]) === key).map((row) => row.uid);
  const shown = uids.slice(0, MAX_STUDENTS_LISTED);
  const documents = shown.length ? await db.getAll(...shown.map((uid) => db.collection('users').doc(uid))) : [];
  return {
    total: uids.length,
    students: documents.map((document, index) => ({ uid: shown[index], displayName: shortDisplayName(document.data() as DocumentData | undefined) })),
  };
}
