import 'server-only';

import { randomBytes } from 'node:crypto';
import { FieldPath, type DocumentData, type DocumentReference, type Firestore } from 'firebase-admin/firestore';
import { DEFAULT_CATALOG } from './defaults';
import { addAliasToEntry, removeAliasFromEntry } from './aliases';
import { createInitialCatalog, normalizeCatalogName, type CatalogEntry, type CatalogKind, type CatalogSnapshot } from './model';

/**
 * Admin "Assign": point a name students typed at an existing catalogue entry.
 * 1. A claim transaction checks the entry, adds the typed text as an alias,
 *    marks the suggestion and creates `_academic_catalog_assignments/{id}`.
 * 2. Profiles change in chunked transactions; each chunk also writes the inbox
 *    items and appends what it changed to the assignment, so nothing changes
 *    without a record. 3. Undo replays that record.
 */

export const ASSIGNMENTS = '_academic_catalog_assignments';
export const SUGGESTIONS = '_academic_catalog_suggestions';
/** Most profiles one Assign changes; run it again for the rest. */
export const MAX_ASSIGN_PROFILES = 1000;
/** Most profiles a scan reads (typed-names table and Assign). */
export const MAX_SCAN_PROFILES = 5000;
const CHUNK = 100;
const SCAN_PAGE = 500;
const UNDO_LEASE_MS = 5 * 60 * 1000;

export type ProfileField = 'university' | 'department' | 'programme';
export const PROFILE_FIELD: Record<CatalogKind, ProfileField> = { university: 'university', department: 'department', programme: 'programme' };

export class AssignError extends Error {}

const text = (value: unknown) => (typeof value === 'string' ? value : '');

/** The profile's value for a kind. `department` falls back to the legacy `dept` (R11: read only). */
export function profileValue(data: DocumentData | undefined, kind: CatalogKind): string {
  if (!data) return '';
  if (kind === 'department') return text(data.department).trim() || text(data.dept).trim();
  return text(data[PROFILE_FIELD[kind]]).trim();
}

/** "Chidi Okafor" -> "Chidi O."; never an email. */
export function shortDisplayName(data: DocumentData | undefined): string {
  const full = (text(data?.fullName) || text(data?.name)).trim().replace(/\s+/g, ' ');
  if (!full || full.includes('@')) return 'A student';
  const [first, ...rest] = full.split(' ');
  const last = rest.at(-1);
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
}

export type ProfileRow = { uid: string; university: string; department: string; programme: string };

/** Reads up to `max` profiles (academic fields only), in document-id pages. */
export async function scanAcademicProfiles(db: Firestore, max = MAX_SCAN_PROFILES): Promise<{ rows: ProfileRow[]; truncated: boolean }> {
  const rows: ProfileRow[] = [];
  let cursor: unknown = null;
  for (;;) {
    let query = db.collection('users').orderBy(FieldPath.documentId()).select('university', 'department', 'dept', 'programme').limit(Math.min(SCAN_PAGE, max - rows.length + 1));
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    for (const document of page.docs) {
      if (rows.length >= max) return { rows, truncated: true };
      const data = document.data();
      rows.push({ uid: document.id, university: profileValue(data, 'university'), department: profileValue(data, 'department'), programme: profileValue(data, 'programme') });
    }
    if (page.docs.length === 0 || page.docs.length < SCAN_PAGE) return { rows, truncated: false };
    cursor = page.docs.at(-1);
  }
}

function catalogFrom(document: { exists: boolean; data(): DocumentData | undefined }): CatalogSnapshot {
  const data = document.exists ? document.data() : undefined;
  return data && Number.isSafeInteger(data.revision) && Array.isArray(data.entries)
    ? { revision: data.revision, entries: data.entries as CatalogEntry[] }
    : createInitialCatalog(DEFAULT_CATALOG);
}

function activeEntry(entries: CatalogEntry[], id: string | undefined, kind: CatalogKind, label: string): CatalogEntry {
  const entry = entries.find((candidate) => candidate.id === id);
  if (!entry || entry.kind !== kind || entry.status !== 'active') throw new AssignError(`Choose an active ${label} from the catalogue.`);
  return entry;
}

export type AssignInput = {
  suggestionId?: string;
  kind?: CatalogKind;
  name?: string;
  entryId: string;
  departmentEntryId?: string;
  updateAll: boolean;
};

const ID = /^[A-Za-z0-9_:.-]{1,160}$/;
const KINDS: CatalogKind[] = ['university', 'department', 'programme'];

export function parseAssignInput(body: unknown): AssignInput {
  if (!body || typeof body !== 'object') throw new AssignError('Invalid assign request.');
  const value = body as Record<string, unknown>;
  if (typeof value.entryId !== 'string' || !ID.test(value.entryId)) throw new AssignError('Invalid assign request.');
  if (value.departmentEntryId !== undefined && (typeof value.departmentEntryId !== 'string' || !ID.test(value.departmentEntryId))) throw new AssignError('Invalid assign request.');
  if (value.updateAll !== undefined && typeof value.updateAll !== 'boolean') throw new AssignError('Invalid assign request.');
  const base = { entryId: value.entryId, departmentEntryId: value.departmentEntryId as string | undefined, updateAll: value.updateAll !== false };
  if (typeof value.suggestionId === 'string') {
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(value.suggestionId)) throw new AssignError('Invalid assign request.');
    return { ...base, suggestionId: value.suggestionId };
  }
  if (!KINDS.includes(value.kind as CatalogKind) || typeof value.name !== 'string' || !value.name.trim() || value.name.length > 180) {
    throw new AssignError('Invalid assign request.');
  }
  return { ...base, kind: value.kind as CatalogKind, name: value.name.trim() };
}

function notificationText(kind: CatalogKind, entryName: string, departmentName?: string) {
  if (kind === 'university') {
    return { title: 'Your university was updated', message: `We matched your university to ${entryName}. If that's not right, contact us from Help & support in Settings.` };
  }
  if (kind === 'programme') {
    return {
      title: 'Your programme was updated',
      message: departmentName
        ? `We matched your programme to ${entryName} and your department to ${departmentName}. You can change this in Settings.`
        : `We matched your programme to ${entryName}. You can change this in Settings.`,
    };
  }
  return { title: 'Your department was updated', message: `We matched your department to ${entryName}. You can change this in Settings.` };
}

type Change = { before: Partial<Record<ProfileField, string>>; notificationId: string };

export type AssignResult = {
  assignmentId: string;
  entryName: string;
  departmentName: string | null;
  changedCount: number;
  aliasAdded: boolean;
  aliasNote: string | null;
  truncated: boolean;
  changes: Record<string, Change>;
  suggestionIds: string[];
  typed: string;
  kind: CatalogKind;
};

type Rtdb = { ref(path: string): { transaction(update: (value: number | null) => number): Promise<unknown> } };

export async function assignTypedName(db: Firestore, rtdb: Rtdb, actorUid: string, input: AssignInput): Promise<AssignResult> {
  const catalogRef = db.collection('config').doc('academicCatalog');
  const assignmentId = `${Date.now()}-${randomBytes(6).toString('hex')}`;
  const assignmentRef = db.collection(ASSIGNMENTS).doc(assignmentId);
  const suggestionRef = input.suggestionId ? db.collection(SUGGESTIONS).doc(input.suggestionId) : null;

  // 1. Claim: validate, add the alias, mark the suggestion, open the record.
  const claim = await db.runTransaction(async (transaction) => {
    const catalogDocument = await transaction.get(catalogRef);
    const suggestionDocument = suggestionRef ? await transaction.get(suggestionRef) : null;
    let kind = input.kind;
    let typed = input.name ?? '';
    let suggestionUid: string | null = null;
    if (suggestionRef) {
      const suggestion = suggestionDocument?.exists ? suggestionDocument.data() : undefined;
      if (!suggestion) throw new AssignError('Suggestion not found.');
      if (suggestion.status !== 'pending') throw new AssignError('Suggestion already reviewed.');
      if (!KINDS.includes(suggestion.kind) || typeof suggestion.name !== 'string') throw new AssignError('Invalid suggestion.');
      kind = suggestion.kind as CatalogKind;
      typed = suggestion.name.trim();
      suggestionUid = typeof suggestion.uid === 'string' ? suggestion.uid : null;
    }
    if (!kind || !typed) throw new AssignError('Invalid assign request.');
    if (input.departmentEntryId && kind !== 'programme') throw new AssignError('Only a programme can also set a department.');

    const catalog = catalogFrom(catalogDocument);
    const entry = activeEntry(catalog.entries, input.entryId, kind, kind);
    const department = input.departmentEntryId ? activeEntry(catalog.entries, input.departmentEntryId, 'department', 'department') : null;
    let alias;
    try {
      alias = addAliasToEntry(catalog.entries, entry.id, typed);
    } catch (error) {
      throw new AssignError(error instanceof Error ? error.message : 'That alias cannot be added.');
    }
    const now = new Date();
    if (alias.added) transaction.set(catalogRef, { revision: catalog.revision + 1, entries: alias.entries });
    if (suggestionRef) {
      transaction.set(suggestionRef, { status: 'assigned', matchedEntryId: entry.id, assignmentId, reviewedBy: actorUid, reviewedAt: now }, { merge: true });
    }
    transaction.create(assignmentRef, {
      status: 'applying', kind, typed, normalizedTyped: normalizeCatalogName(typed),
      entryId: entry.id, entryName: entry.name,
      departmentEntryId: department?.id ?? null, departmentName: department?.name ?? null,
      aliasAdded: alias.added, alias: alias.alias,
      suggestionId: input.suggestionId ?? null, suggestionUid, otherSuggestionIds: [],
      updateAll: input.updateAll, actorUid, createdAt: now, changes: {}, changedCount: 0,
    });
    const aliasNote = alias.added ? null : alias.reason === 'cap' ? 'The entry already has the most aliases allowed, so this one was not added.' : null;
    return { kind, typed, suggestionUid, entry, department, aliasAdded: alias.added, aliasNote };
  });

  // 2. Who changes: everyone who typed this name, or only the suggesting student.
  const key = normalizeCatalogName(claim.typed);
  let targets: string[] = [];
  let truncated = false;
  if (input.updateAll) {
    const scan = await scanAcademicProfiles(db);
    const field = PROFILE_FIELD[claim.kind];
    targets = scan.rows.filter((row) => row[field] && normalizeCatalogName(row[field]) === key).map((row) => row.uid);
    truncated = scan.truncated;
  } else if (claim.suggestionUid) {
    targets = [claim.suggestionUid];
  }
  if (targets.length > MAX_ASSIGN_PROFILES) { targets = targets.slice(0, MAX_ASSIGN_PROFILES); truncated = true; }

  // 3. Chunked profile updates, each recorded in the same transaction.
  const { title } = notificationText(claim.kind, claim.entry.name);
  const field = PROFILE_FIELD[claim.kind];
  const changes: Record<string, Change> = {};
  for (let start = 0; start < targets.length; start += CHUNK) {
    const uids = targets.slice(start, start + CHUNK);
    await db.runTransaction(async (transaction) => {
      const refs = uids.map((uid) => db.collection('users').doc(uid));
      const [assignment, ...profiles] = await transaction.getAll(assignmentRef, ...refs);
      const recorded = { ...(assignment.data()?.changes ?? {}) } as Record<string, Change>;
      const now = new Date();
      profiles.forEach((profile, index) => {
        const data = profile.exists ? profile.data() : undefined;
        if (!data || normalizeCatalogName(profileValue(data, claim.kind)) !== key) return;
        const uid = uids[index];
        const update: Partial<Record<ProfileField, string>> = { [field]: claim.entry.name };
        const before: Partial<Record<ProfileField, string>> = { [field]: profileValue(data, claim.kind) };
        let departmentName: string | undefined;
        if (claim.department) {
          const current = profileValue(data, 'department');
          if (!current || normalizeCatalogName(current) === normalizeCatalogName(claim.department.name)) {
            update.department = claim.department.name;
            before.department = current;
            departmentName = claim.department.name;
          }
        }
        const notificationRef = db.collection(`notifications/${uid}/items`).doc();
        transaction.set(refs[index], update, { merge: true });
        transaction.set(notificationRef, {
          title, message: notificationText(claim.kind, claim.entry.name, departmentName).message,
          type: 'system', read: false, createdAt: now, actionUrl: '/settings',
        });
        recorded[uid] = { before, notificationId: notificationRef.id };
        changes[uid] = recorded[uid];
      });
      transaction.set(assignmentRef, { changes: recorded, changedCount: Object.keys(recorded).length }, { merge: true });
    });
  }

  // Unread badges (best effort, like the support reply path).
  await Promise.allSettled(Object.keys(changes).map((uid) => rtdb.ref(`notif_counts/${uid}/unread`).transaction((value) => (value || 0) + 1)));

  // 4. Other pending suggestions for the same name whose student was just updated.
  const otherSuggestionIds: string[] = [];
  const others = await db.collection(SUGGESTIONS).where('normalizedName', '==', key).get();
  const reviewedAt = new Date();
  for (const document of others.docs) {
    const data = document.data();
    if (document.id === input.suggestionId || data.kind !== claim.kind || data.status !== 'pending' || !changes[data.uid]) continue;
    await document.ref.set({ status: 'assigned', matchedEntryId: claim.entry.id, assignmentId, reviewedBy: actorUid, reviewedAt }, { merge: true });
    otherSuggestionIds.push(document.id);
  }
  await assignmentRef.set({ status: 'applied', appliedAt: new Date(), otherSuggestionIds, truncated }, { merge: true });

  return {
    assignmentId, entryName: claim.entry.name, departmentName: claim.department?.name ?? null,
    changedCount: Object.keys(changes).length, aliasAdded: claim.aliasAdded, aliasNote: claim.aliasNote,
    truncated, changes, typed: claim.typed, kind: claim.kind,
    suggestionIds: [...(input.suggestionId ? [input.suggestionId] : []), ...otherSuggestionIds],
  };
}

export type UndoResult = { assignmentId: string; restoredCount: number; keptCount: number; aliasRemoved: boolean };

export async function undoAssignment(db: Firestore, rtdb: Rtdb, actorUid: string, assignmentId: string): Promise<UndoResult & { record: DocumentData }> {
  if (!/^[A-Za-z0-9-]{1,64}$/.test(assignmentId)) throw new AssignError('Invalid undo request.');
  const assignmentRef = db.collection(ASSIGNMENTS).doc(assignmentId);

  // Claim: applied -> undoing (a stale "undoing" can be retried after the lease).
  const record = await db.runTransaction(async (transaction) => {
    const document = await transaction.get(assignmentRef);
    const data = document.exists ? document.data() : undefined;
    if (!data) throw new AssignError('That change was not found.');
    const stale = data.status === 'undoing' && Date.now() - Number(data.undoStartedAtMs ?? 0) > UNDO_LEASE_MS;
    if (data.status !== 'applied' && !stale) throw new AssignError(data.status === 'undone' ? 'That change was already undone.' : 'That change cannot be undone right now.');
    transaction.set(assignmentRef, { status: 'undoing', undoStartedAtMs: Date.now(), undoneBy: actorUid }, { merge: true });
    return data;
  });

  const kind = record.kind as CatalogKind;
  const field = PROFILE_FIELD[kind];
  const changes = (record.changes ?? {}) as Record<string, Change>;
  const uids = Object.keys(changes);
  const assigned = normalizeCatalogName(String(record.entryName ?? ''));
  const assignedDepartment = record.departmentName ? normalizeCatalogName(String(record.departmentName)) : null;
  let restoredCount = 0;
  let keptCount = 0;
  const unreadRemoved: string[] = [];

  for (let start = 0; start < uids.length; start += CHUNK) {
    const chunk = uids.slice(start, start + CHUNK);
    await db.runTransaction(async (transaction) => {
      const profileRefs = chunk.map((uid) => db.collection('users').doc(uid));
      const notificationRefs = chunk.map((uid) => db.collection(`notifications/${uid}/items`).doc(String(changes[uid].notificationId || 'missing')));
      const snapshots = await transaction.getAll(...profileRefs, ...notificationRefs);
      const profiles = snapshots.slice(0, chunk.length);
      const notifications = snapshots.slice(chunk.length);
      chunk.forEach((uid, index) => {
        const data = profiles[index].exists ? profiles[index].data() : undefined;
        const before = changes[uid].before ?? {};
        const restore: Partial<Record<ProfileField, string>> = {};
        if (data && normalizeCatalogName(profileValue(data, kind)) === assigned && typeof before[field] === 'string') restore[field] = before[field];
        if (data && assignedDepartment && typeof before.department === 'string'
          && normalizeCatalogName(profileValue(data, 'department')) === assignedDepartment) restore.department = before.department;
        if (restore[field] !== undefined) {
          transaction.set(profileRefs[index], restore, { merge: true });
          restoredCount += 1;
        } else {
          keptCount += 1;
        }
        if (notifications[index].exists) {
          if (notifications[index].data()?.read === false) unreadRemoved.push(uid);
          transaction.delete(notificationRefs[index]);
        }
      });
    });
  }
  await Promise.allSettled(unreadRemoved.map((uid) => rtdb.ref(`notif_counts/${uid}/unread`).transaction((value) => Math.max(0, (value || 0) - 1))));

  // The alias, only if this change added it and it is still there.
  let aliasRemoved = false;
  if (record.aliasAdded && typeof record.alias === 'string') {
    const catalogRef = db.collection('config').doc('academicCatalog');
    aliasRemoved = await db.runTransaction(async (transaction) => {
      const catalog = catalogFrom(await transaction.get(catalogRef));
      const result = removeAliasFromEntry(catalog.entries, String(record.entryId), record.alias);
      if (result.removed) transaction.set(catalogRef, { revision: catalog.revision + 1, entries: result.entries });
      return result.removed;
    });
  }

  // Suggestions this change resolved go back to the queue.
  const suggestionIds = [record.suggestionId, ...(Array.isArray(record.otherSuggestionIds) ? record.otherSuggestionIds : [])].filter((id): id is string => typeof id === 'string');
  for (const id of suggestionIds) {
    const ref = db.collection(SUGGESTIONS).doc(id) as DocumentReference;
    const current = (await ref.get()).data();
    if (current?.status === 'assigned' && current.assignmentId === assignmentId) {
      await ref.set({ ...current, status: 'pending', matchedEntryId: null, assignmentId: null, reviewedBy: null, reviewedAt: null });
    }
  }

  await assignmentRef.set({ status: 'undone', undoneAt: new Date(), restoredCount, keptCount }, { merge: true });
  return { assignmentId, restoredCount, keptCount, aliasRemoved, record };
}
