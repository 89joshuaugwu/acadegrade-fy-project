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

  it('leaves fcmTokens and fcmDevices client-written (E4 device list)', () => {
    const helper = rules().slice(rules().indexOf('function serverOwnedUserFields()'), rules().indexOf('function platformFeatureEnabled'));
    expect(helper).not.toContain('fcmDevices');
    expect(helper).not.toContain('fcmTokens');
  });

  it('forbids creating a profile that already carries them', () => {
    expect(usersBlock()).toContain('allow create: if (isOwner(userId) || isAdmin())\n        && !request.resource.data.keys().hasAny(serverOwnedUserFields())\n');
  });

  it('forbids updates that add, change or remove them, but keeps other profile edits', () => {
    expect(usersBlock()).toContain('allow update: if (isOwner(userId) || isAdmin())\n        && !request.resource.data.diff(resource.data).affectedKeys().hasAny(serverOwnedUserFields())\n');
  });

  it('keeps owner and admin reads and deletes', () => {
    expect(usersBlock()).toContain('allow read, delete: if isOwner(userId) || isAdmin();');
    expect(usersBlock()).not.toContain('allow read, write: if isOwner(userId) || isAdmin();\n      \n      // Subcollection');
  });
});

describe('users/{uid}/timetables (T1)', () => {
  it('lets the owner read and write their timetables and admins read them', () => {
    expect(rules()).toContain('match /timetables/{timetableId} {\n        allow read: if isOwner(userId) || isAdmin();\n        allow write: if isOwner(userId);\n      }');
    // Nested inside the users/{userId} block, so the owner check uses the profile id.
    const text = rules();
    const usersStart = text.indexOf('match /users/{userId} {');
    const analyticsStart = text.indexOf('// 2. Analytics Collection');
    const timetables = text.indexOf('match /timetables/{timetableId} {');
    expect(timetables).toBeGreaterThan(usersStart);
    expect(timetables).toBeLessThan(analyticsStart);
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
    expect(block).toContain("allow create: if isAdmin() || (isAuthenticated() && platformFeatureEnabled('share_code')");
    expect(text).toContain("function platformFeatureEnabled(feature) {");
    expect(text).toContain("get(/databases/$(database)/documents/config/settings).data.get('disabledFeatures', [])");
    // The platform settings document may not exist yet: that must not lock everyone out.
    expect(text).toContain('!exists(/databases/$(database)/documents/config/settings)');

    // A single code can be fetched by a signed-in user; nobody can list every code.
    // ... unless an admin disabled it (G7 moderation); a missing flag reads as enabled.
    expect(block).toContain("allow get: if isAuthenticated() && (resource == null || resource.data.get('disabled', false) != true);");
    expect(block).not.toMatch(/allow (read|list)\b/);

    // Importing still works: only the use counter may be updated by a non-admin.
    expect(block).toContain("hasOnly(['useCount'])");
  });

  it('share-code get of a code that does not exist is allowed, so the app can tell "not found" from denied', () => {
    // Android probes candidate codes with get() before creating one, and both apps show
    // "code not found" on import. Reading resource.data on a missing doc errors and denies.
    const text = rules();
    const block = text.slice(text.indexOf('match /shareCodes/{codeId} {'), text.indexOf('// 7. Shared Transcripts'));
    expect(block).toContain('resource == null ||');
    expect(block).not.toContain("allow get: if isAuthenticated() && resource.data.get('disabled', false) != true;");
  });

  it('share-code create must name the signed-in user as author (admins exempt)', () => {
    const text = rules();
    const block = text.slice(text.indexOf('match /shareCodes/{codeId} {'), text.indexOf('// 7. Shared Transcripts'));
    expect(block).toContain("&& request.resource.data.get('authorId', '') == request.auth.uid);");
  });

  it('share-code update by a non-admin may only add one to useCount', () => {
    const text = rules();
    const block = text.slice(text.indexOf('match /shareCodes/{codeId} {'), text.indexOf('// 7. Shared Transcripts'));
    expect(block).toContain("&& request.resource.data.useCount == resource.data.get('useCount', 0) + 1)");
    expect(block).toContain('|| isAdmin();');
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

  it('denies every client read and write to the deletion queue and testimonials (public redesign)', () => {
    for (const collection of ['_account_deletion_queue', 'public_testimonials']) {
      expect(rules()).toContain(`match /${collection}/{document=**} {\n      allow read, write: if false;\n    }`);
    }
    expect(rules()).toContain('match /config/proof {\n      allow read, write: if false;\n    }');
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

describe('users/{uid}.gradingScale (grading scales, phase 1)', () => {
  const helper = () => {
    const text = rules();
    return text.slice(text.indexOf('function validGradingScale(gs) {'), text.indexOf('// 1. Users Collection'));
  };

  it('allows only the five scale ids and the three known keys', () => {
    expect(helper()).toContain("gs.keys().hasAll(['id'])");
    expect(helper()).toContain("gs.keys().hasOnly(['id', 'custom', 'nceClasses'])");
    expect(helper()).toContain("gs.id in ['ng5', 'ng5-noE', 'nbte4', 'nce5', 'custom']");
    expect(helper()).toContain("(gs.id != 'custom' || 'custom' in gs)");
  });

  it('bounds a custom scale: 2-12 bands, 1-8 classes, top point 1-10, name up to 40', () => {
    const text = helper();
    expect(text).toContain("c.keys().hasOnly(['name', 'maxPoint', 'bands', 'classes'])");
    expect(text).toContain('c.bands is list && c.bands.size() >= 2 && c.bands.size() <= 12');
    expect(text).toContain('c.classes is list && c.classes.size() >= 1 && c.classes.size() <= 8');
    expect(text).toContain('c.maxPoint is number && c.maxPoint >= 1 && c.maxPoint <= 10');
    expect(text).toContain("(!('name' in c) || (c.name is string && c.name.size() <= 40))");
  });

  it('bounds NCE class boundaries to four numbers from above 0 to 5', () => {
    const text = helper();
    expect(text).toContain("n.keys().hasOnly(['distinction', 'credit', 'merit', 'pass'])");
    for (const key of ['distinction', 'credit', 'merit', 'pass']) {
      expect(text).toContain(`(!('${key}' in n) || validNceBoundary(n.${key}))`);
    }
    expect(text).toContain('return value is number && value > 0 && value <= 5;');
  });

  it('checks the shape on create and whenever an update touches it, leaving other edits alone', () => {
    expect(usersBlock()).toContain("&& (!('gradingScale' in request.resource.data) || validGradingScale(request.resource.data.gradingScale));");
    expect(usersBlock()).toContain("&& (!request.resource.data.diff(resource.data).affectedKeys().hasAny(['gradingScale'])\n          || !('gradingScale' in request.resource.data)\n          || validGradingScale(request.resource.data.gradingScale));");
  });
});

describe('Phase 2 record types: users/{uid}.recordType, olevel/current, admission/current', () => {
  const helpers = () => {
    const text = rules();
    return text.slice(text.indexOf('function validRecordType(value) {'), text.indexOf('// 1. Users Collection'));
  };
  const block = (name: string) => {
    const text = rules();
    const start = text.indexOf(`match /${name}/{docId} {`);
    return start === -1 ? '' : text.slice(start, text.indexOf('\n      }', start));
  };

  it('allows only the three record types, checked on create and whenever an update touches it', () => {
    expect(helpers()).toContain("return value in ['tertiary', 'olevel', 'admission'];");
    expect(usersBlock()).toContain("&& (!('recordType' in request.resource.data) || validRecordType(request.resource.data.recordType))");
    expect(usersBlock()).toContain("&& (!request.resource.data.diff(resource.data).affectedKeys().hasAny(['recordType'])\n          || !('recordType' in request.resource.data)\n          || validRecordType(request.resource.data.recordType))");
  });

  it('bounds an O-level record: two sittings, nine subjects each, known exams, grades and years', () => {
    const text = helpers();
    expect(text).toContain("d.keys().hasOnly(['schemaVersion', 'sittings', 'targetCourse', 'updatedAt'])");
    expect(text).toContain('d.sittings is list && d.sittings.size() <= 2');
    expect(text).toContain('validOlevelSittingAt(d.sittings, 0) && validOlevelSittingAt(d.sittings, 1)');
    expect(text).toContain("s.exam in ['waec', 'waec-gce', 'neco', 'neco-gce', 'nabteb']");
    expect(text).toContain('s.year is int && s.year >= 1988 && s.year <= 2100');
    expect(text).toContain('s.subjects is list && s.subjects.size() <= 9');
    for (let i = 0; i < 9; i += 1) expect(text).toContain(`validOlevelSubjectAt(s.subjects, ${i})`);
    expect(text).toContain("g in ['A1', 'B2', 'B3', 'C4', 'C5', 'C6', 'D7', 'E8', 'F9', 'AR']");
    expect(text).toContain('shortText(s.subjectId, 80) && shortText(s.name, 60)');
  });

  it('bounds an admission record: UTME 0-400, post-UTME within its maximum, known formulas, five grades', () => {
    const text = helpers();
    expect(text).toContain("d.keys().hasAll(['formula', 'olevelSource'])");
    expect(text).toContain("d.formula in ['utme-post', 'utme-olevel-post', 'custom']");
    expect(text).toContain('d.utme.score is int && d.utme.score >= 0 && d.utme.score <= 400');
    expect(text).toContain('d.postUtme.max is int && d.postUtme.max >= 1 && d.postUtme.max <= 400');
    expect(text).toContain('d.postUtme.score is number && d.postUtme.score >= 0 && d.postUtme.score <= d.postUtme.max');
    expect(text).toContain("d.pointTable in ['four-to-two', 'six-to-one', 'ten-to-five', 'custom']");
    expect(text).toContain('d.olevelGrades is list && d.olevelGrades.size() <= 5');
    for (let i = 0; i < 5; i += 1) expect(text).toContain(`validAdmissionGradeAt(d.olevelGrades, ${i})`);
  });

  it('keeps an optional target aggregate (0-100) and a post-UTME total saved before the score', () => {
    const text = helpers();
    expect(text).toContain("d.keys().hasOnly(['schemaVersion', 'utme', 'postUtme', 'formula', 'weights', 'pointTable', 'customPoints', 'olevelSource', 'olevelGrades', 'school', 'course', 'target', 'updatedAt'])");
    expect(text).toContain("(!('target' in d) || (d.target is number && d.target >= 0 && d.target <= 100))");
    expect(text).toContain("d.postUtme.keys().hasAll(['max'])");
    expect(text).toContain("(!('score' in d.postUtme) || (d.postUtme.score is number && d.postUtme.score >= 0 && d.postUtme.score <= d.postUtme.max))");
  });

  it.each(['olevel', 'admission'])('users/{uid}/%s: one "current" document, owner writes, admin reads', (name) => {
    const text = block(name);
    expect(text).toContain('allow read: if isOwner(userId) || isAdmin();');
    expect(text).toContain("docId == 'current'");
    expect(text).toContain('allow delete: if isOwner(userId);');
    expect(text).not.toContain('allow write');
    // Nested inside users/{userId}, before the end of that block.
    expect(rules().indexOf(`match /${name}/{docId} {`)).toBeGreaterThan(rules().indexOf('match /users/{userId} {'));
    expect(rules().indexOf(`match /${name}/{docId} {`)).toBeLessThan(rules().indexOf('// 2. Analytics Collection'));
  });

  it('validates the shape on every create and update', () => {
    expect(block('olevel')).toContain("allow create, update: if isOwner(userId) && docId == 'current' && validOlevelRecord(request.resource.data);");
    expect(block('admission')).toContain("allow create, update: if isOwner(userId) && docId == 'current' && validAdmissionRecord(request.resource.data);");
  });
});

describe('academic catalogue (server-only)', () => {
  it('denies clients the catalogue suggestions and Assign records', () => {
    for (const collection of ['_academic_catalog_suggestions', '_academic_catalog_assignments']) {
      expect(rules()).toContain(`match /${collection}/{document=**} {\n      allow read, write: if false;\n    }`);
    }
  });

  it('serves the managed catalogue only through /api/academic-catalog', () => {
    expect(rules()).toContain('match /config/academicCatalog {\n      allow read, write: if false;\n    }');
  });
});
