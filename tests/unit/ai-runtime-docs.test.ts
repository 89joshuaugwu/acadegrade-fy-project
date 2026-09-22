import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('documents the root key, managed activation, rotation, and emergency disable', () => {
  const guide = readFileSync('docs/AI_RUNTIME_BOOTSTRAP.md', 'utf8');
  expect(guide).toContain('AI_CONFIG_MASTER_KEY');
  expect(guide).toContain('managed');
  expect(guide).toContain('rotation');
  expect(guide).toContain('emergency disable');
  expect(guide).toContain('Do not store provider keys in config/settings');
});
