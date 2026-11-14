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
    expect(rules()).toContain("function serverOwnedUserFields() {\n      return ['ageStatus', 'ageDeclaredAt', 'ageUpgradedAt', 'consents', 'lastActiveAt', 'fcmTopics', 'fcmTopicsTokensHash'];\n    }");
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

  it('share-code create checks the switch; clients may get a code but not list them', () => {
    const text = rules();
    const start = text.indexOf('match /shareCodes/{codeId} {');
    const block = text.slice(start, text.indexOf('// 7. Shared Transcripts', start));

    // Creating a code is refused while the admin has switched share_code off (admins always may).
    expect(block).toMatch(/allow create: if isAdmin\(\) \|\| \(isAuthenticated\(\) && platformFeatureEnabled\('share_code'\)\);/);
    expect(text).toContain("function platformFeatureEnabled(feature) {");
    expect(text).toContain("get(/databases/$(database)/documents/config/settings).data.get('disabledFeatures', [])");
    // The platform settings document may not exist yet: that must not lock everyone out.
    expect(text).toContain('!exists(/databases/$(database)/documents/config/settings)');

    // A single code can be fetched by a signed-in user; nobody can list every code.
    expect(block).toContain('allow get: if isAuthenticated();');
    expect(block).not.toMatch(/allow (read|list)\b/);

    // Importing still works: only the use counter may be updated by a non-admin.
    expect(block).toContain("hasOnly(['useCount'])");
  });

  it('denies every client read and write to the email verification status', () => {
    expect(rules()).toContain('match /_email_status/{document=**} {\n      allow read, write: if false;\n    }');
  });

  it('denies every client read and write to the daily job run records', () => {
    expect(rules()).toContain('match /_cron_runs/{document=**} {\n      allow read, write: if false;\n    }');
  });

  it('denies every client read and write to admin metrics and cron job cursors', () => {
    for (const collection of ['admin_metrics', '_cron_state', '_admin_grants', 'support_tickets']) {
      expect(rules()).toContain(`match /${collection}/{document=**} {\n      allow read, write: if false;\n    }`);
    }
  });

  it('lets signed-in students read published announcements only, and never write them', () => {
    expect(rules()).toContain("match /announcements/{announcementId} {\n      allow get, list: if isAuthenticated() && resource.data.status == 'published';\n      allow write: if false;\n    }");
  });

  it('denies every client read and write to legal document drafts and versions', () => {
    // Includes the versions subcollection: the public pages read it through the server only.
    expect(rules()).toContain('match /legal_documents/{document=**} {\n      allow read, write: if false;\n    }');
  });

  it('makes legal versions public-read and server-written', () => {
    expect(rules()).toContain('match /config/legal {\n      allow read: if true;\n      allow write: if false;\n    }');
  });

  it('keeps config/settings public-read for installed Android apps', () => {
    expect(rules()).toContain("match /config/settings {\n      allow read: if true;");
  });
});
