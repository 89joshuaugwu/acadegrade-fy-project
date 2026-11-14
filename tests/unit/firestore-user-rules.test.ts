import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const rules = () => readFileSync('firestore.rules', 'utf8').replace(/\r\n/g, '\n');
const usersBlock = () => {
  const text = rules();
  const start = text.indexOf('match /users/{userId} {');
  const end = text.indexOf('match /semesters/{semesterId}', start);
  return text.slice(start, end);
};

describe('users/{uid} rules: server-owned age and consent fields', () => {
  it('lists every server-owned field once in a shared helper', () => {
    expect(rules()).toContain("function serverOwnedUserFields() {\n      return ['ageStatus', 'ageDeclaredAt', 'ageUpgradedAt', 'consents'];\n    }");
  });

  it('forbids creating a profile that already carries them', () => {
    expect(usersBlock()).toContain('allow create: if (isOwner(userId) || isAdmin())\n        && !request.resource.data.keys().hasAny(serverOwnedUserFields());');
  });

  it('forbids updates that add, change or remove them, but keeps other profile edits', () => {
    expect(usersBlock()).toContain('allow update: if (isOwner(userId) || isAdmin())\n        && !request.resource.data.diff(resource.data).affectedKeys().hasAny(serverOwnedUserFields());');
  });

  it('keeps owner and admin reads and deletes', () => {
    expect(usersBlock()).toContain('allow read, delete: if isOwner(userId) || isAdmin();');
    expect(usersBlock()).not.toContain('allow read, write: if isOwner(userId) || isAdmin();\n      \n      // Subcollection');
  });
});

describe('new server-only collections and config/legal', () => {
  it('denies every client read and write to the admin audit log and AI feedback', () => {
    for (const collection of ['_admin_audit', '_ai_feedback']) {
      expect(rules()).toContain(`match /${collection}/{document=**} {\n      allow read, write: if false;\n    }`);
    }
  });

  it('denies every client read and write to the daily job run records', () => {
    expect(rules()).toContain('match /_cron_runs/{document=**} {\n      allow read, write: if false;\n    }');
  });

  it('makes legal versions public-read and server-written', () => {
    expect(rules()).toContain('match /config/legal {\n      allow read: if true;\n      allow write: if false;\n    }');
  });

  it('keeps config/settings public-read for installed Android apps', () => {
    expect(rules()).toContain("match /config/settings {\n      allow read: if true;");
  });
});
