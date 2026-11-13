import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('denies every client read and write to the server-owned coin wallet collections', () => {
  const rules = readFileSync('firestore.rules', 'utf8').replace(/\r\n/g, '\n');
  for (const collection of ['_coin_wallets', '_coin_ledger', '_coin_requests']) {
    expect(rules).toContain(`match /${collection}/{document=**} {\n      allow read, write: if false;\n    }`);
  }
});
