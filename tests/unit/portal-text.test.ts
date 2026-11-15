import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parsePortalText } from '@/lib/import/portalText';

/**
 * The same fixture runs in acadegrade-mobile/tests/portal-text.test.mjs.
 * Both suites pin this hash so the two copies cannot drift apart.
 */
const FIXTURE_SHA256 = '648004945a95384a8e77e24a0b885a8cdb7ce897fc46938d4b39d1e445566c68';

const raw = readFileSync(path.join(process.cwd(), 'tests/fixtures/portal-text.json'), 'utf8');
const fixture = JSON.parse(raw) as { cases: { name: string; input: string; expected: unknown }[] };

describe('portal text fixture', () => {
  it('matches the pinned hash', () => {
    expect(createHash('sha256').update(raw).digest('hex')).toBe(FIXTURE_SHA256);
  });

  for (const c of fixture.cases) {
    it(c.name, () => {
      expect(parsePortalText(c.input)).toEqual(c.expected);
    });
  }

  it('never throws on garbage', () => {
    for (const bad of [undefined, null, 42, {}, '\u0000￿', 'A'.repeat(300000)]) {
      expect(() => parsePortalText(bad as unknown as string)).not.toThrow();
    }
  });
});
