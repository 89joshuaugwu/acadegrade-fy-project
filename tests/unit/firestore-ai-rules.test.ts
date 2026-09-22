import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('explicitly denies browser access to every private AI collection', () => {
  const rules = readFileSync('firestore.rules', 'utf8');
  for (const collection of ['_ai_runtime', '_ai_secrets', '_ai_audit']) {
    expect(rules).toContain(`match /${collection}/{document=**} {`);
    expect(rules).toContain(`match /${collection}/{document=**} {\n      allow read, write: if false;`);
  }
});
