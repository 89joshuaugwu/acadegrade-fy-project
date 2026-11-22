#!/usr/bin/env node
// Adds bundled academic names (lib/utils/academic-data.ts) that are missing from the
// live managed catalog (Firestore config/academicCatalog). Once that document exists,
// web and Android show only its names, so new bundled names need this sync to appear.
//
// Dry run (default, read-only):  node scripts/sync-academic-catalog.mjs
// Write the additions:           node scripts/sync-academic-catalog.mjs --apply
//
// Needs FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in the
// environment or in .env.local. Existing entries (including archived and admin ones)
// are never changed. Requires Node 22.18+ (runs the .ts sources with type stripping).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { ACADEMIC_DEPARTMENTS, ACADEMIC_PROGRAMMES, NIGERIAN_UNIVERSITIES } from '../lib/utils/academic-data.ts';
import { addMissingDefaultEntries } from '../lib/academic-catalog/sync.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apply = process.argv.includes('--apply');

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[match[1]] = value;
  }
}

loadEnvFile(path.join(root, '.env.local'));
const { FIREBASE_PROJECT_ID: projectId, FIREBASE_CLIENT_EMAIL: clientEmail, FIREBASE_PRIVATE_KEY: rawKey } = process.env;
if (!projectId || !clientEmail || !rawKey) {
  console.error('Missing Firebase Admin credentials (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY).');
  process.exit(1);
}

const db = getFirestore(initializeApp({ credential: cert({ projectId, clientEmail, privateKey: rawKey.replace(/\\n/g, '\n') }) }));
const reference = db.collection('config').doc('academicCatalog');
const defaults = { universities: NIGERIAN_UNIVERSITIES, departments: ACADEMIC_DEPARTMENTS, programmes: ACADEMIC_PROGRAMMES };

function plan(document) {
  const data = document.exists ? document.data() : undefined;
  if (!data || !Number.isSafeInteger(data.revision) || !Array.isArray(data.entries)) return null;
  return addMissingDefaultEntries({ revision: data.revision, entries: data.entries }, defaults);
}

const report = (result, verb) => {
  console.log(`${verb} ${result.added.length} name(s); revision -> ${result.snapshot.revision}`);
  for (const { kind, name } of result.added) console.log(`  + ${kind}: ${name}`);
};

const current = await reference.get();
const preview = plan(current);
if (!preview) {
  console.log('config/academicCatalog does not exist yet; clients already use the bundled list. Nothing to do.');
  process.exit(0);
}
if (preview.added.length === 0) {
  console.log(`Catalog (revision ${preview.snapshot.revision}) already has every bundled name. Nothing to do.`);
  process.exit(0);
}
if (!apply) {
  report(preview, 'Dry run: would add');
  console.log('Re-run with --apply to write these additions.');
  process.exit(0);
}

const applied = await db.runTransaction(async (transaction) => {
  const result = plan(await transaction.get(reference));
  if (result && result.added.length > 0) transaction.set(reference, result.snapshot);
  return result;
});
const now = new Date();
await db.collection('_admin_audit').doc(`${now.getTime()}-sync-academic-catalog`).create({
  actorUid: null,
  actorEmail: 'script:sync-academic-catalog',
  action: 'academicCatalog.syncDefaults',
  target: 'config/academicCatalog',
  summary: `Added ${applied?.added.length ?? 0} bundled name(s)`,
  before: { revision: current.data().revision },
  after: { revision: applied?.snapshot.revision ?? null, added: (applied?.added ?? []).slice(0, 50) },
  createdAt: now,
  createdAtMs: now.getTime(),
}).catch(() => console.warn('Audit entry not written.'));
report(applied, 'Added');
process.exit(0);
