import type { CatalogEntry, CatalogKind, CatalogSnapshot } from './model';

// No runtime imports: scripts/sync-academic-catalog.mjs loads this file directly with Node.
// The normaliser must match normalizeCatalogName in ./model.

/** Most aliases one entry may carry (the public catalogue stays small). */
export const MAX_ALIASES_PER_ENTRY = 20;
const MIN_LENGTH = 2;
const MAX_LENGTH = 80;

const normalize = (name: string) => name.trim().normalize('NFKC').replace(/\s+/g, ' ').toLocaleLowerCase('en');

export class AliasConflictError extends Error {}

/** Alias text as stored: NFKC, trimmed, single spaces. Throws on bad input. */
export function cleanAlias(value: string): string {
  const clean = String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ');
  if (clean.length < MIN_LENGTH || clean.length > MAX_LENGTH || /[<>\x00-\x1f]/.test(clean)) {
    throw new Error(`An alias must be ${MIN_LENGTH}–${MAX_LENGTH} characters without markup.`);
  }
  return clean;
}

function aliasesOf(entry: CatalogEntry): string[] {
  return Array.isArray(entry.aliases) ? entry.aliases.filter((alias): alias is string => typeof alias === 'string') : [];
}

export type AddAliasResult = { entries: CatalogEntry[]; added: boolean; alias: string; reason?: 'matches-name' | 'already-there' | 'cap' };

/**
 * Adds `alias` to one entry (copy-on-write). Additive and idempotent: an alias the
 * entry already has, or its own name, is skipped, and so is anything past the cap.
 * An alias that is another same-kind entry's name or alias throws AliasConflictError.
 */
export function addAliasToEntry(entries: CatalogEntry[], entryId: string, rawAlias: string): AddAliasResult {
  const alias = cleanAlias(rawAlias);
  const key = normalize(alias);
  const index = entries.findIndex((entry) => entry.id === entryId);
  if (index === -1) throw new Error('Catalog entry not found.');
  const target = entries[index];
  const clash = entries.find((entry) => entry.id !== entryId && entry.kind === target.kind
    && (normalize(entry.name) === key || aliasesOf(entry).some((other) => normalize(other) === key)));
  if (clash) throw new AliasConflictError(`“${alias}” is already used for ${clash.name}.`);
  if (normalize(target.name) === key) return { entries, added: false, alias, reason: 'matches-name' };
  const current = aliasesOf(target);
  if (current.some((other) => normalize(other) === key)) return { entries, added: false, alias, reason: 'already-there' };
  if (current.length >= MAX_ALIASES_PER_ENTRY) return { entries, added: false, alias, reason: 'cap' };
  const next = entries.map((entry) => ({ ...entry }));
  next[index] = { ...target, aliases: [...current, alias] };
  return { entries: next, added: true, alias };
}

/** Removes an alias from one entry (normalised compare, copy-on-write). */
export function removeAliasFromEntry(entries: CatalogEntry[], entryId: string, alias: string): { entries: CatalogEntry[]; removed: boolean } {
  const key = normalize(alias);
  const index = entries.findIndex((entry) => entry.id === entryId);
  if (index === -1) return { entries, removed: false };
  const current = aliasesOf(entries[index]);
  const kept = current.filter((other) => normalize(other) !== key);
  if (kept.length === current.length) return { entries, removed: false };
  const next = entries.map((entry) => ({ ...entry }));
  next[index] = { ...entries[index], aliases: kept };
  return { entries: next, removed: true };
}

/** Normalised names and aliases of the active entries of one kind. */
export function knownNameKeys(entries: readonly CatalogEntry[], kind: CatalogKind): Set<string> {
  const keys = new Set<string>();
  for (const entry of entries) {
    if (entry.kind !== kind || entry.status !== 'active') continue;
    keys.add(normalize(entry.name));
    for (const alias of aliasesOf(entry)) keys.add(normalize(alias));
  }
  return keys;
}

export type AliasSeeds = Record<'universities' | 'departments' | 'programmes', Readonly<Record<string, readonly string[]>>>;
type SeedRow = { kind: CatalogKind; name: string; alias: string };

const SEED_FIELDS = [
  ['universities', 'university'],
  ['departments', 'department'],
  ['programmes', 'programme'],
] as const;

/**
 * Adds bundled alias seeds (lib/utils/academic-data.ts ACADEMIC_ALIASES) to the
 * entries with those names. Never removes or renames anything; conflicts and names
 * the catalogue does not have are reported, not forced.
 */
export function seedAliases(snapshot: CatalogSnapshot, seeds: AliasSeeds): {
  snapshot: CatalogSnapshot;
  added: SeedRow[];
  skipped: (SeedRow & { reason: 'no-entry' | 'conflict' | 'cap' | 'invalid' })[];
} {
  let entries = snapshot.entries;
  const added: SeedRow[] = [];
  const skipped: (SeedRow & { reason: 'no-entry' | 'conflict' | 'cap' | 'invalid' })[] = [];
  for (const [field, kind] of SEED_FIELDS) {
    for (const [name, aliases] of Object.entries(seeds[field] ?? {})) {
      const entry = entries.find((candidate) => candidate.kind === kind && normalize(candidate.name) === normalize(name));
      for (const alias of aliases) {
        if (!entry) { skipped.push({ kind, name, alias, reason: 'no-entry' }); continue; }
        try {
          const result = addAliasToEntry(entries, entry.id, alias);
          if (result.added) { entries = result.entries; added.push({ kind, name: entry.name, alias: result.alias }); }
          else if (result.reason === 'cap') skipped.push({ kind, name, alias, reason: 'cap' });
        } catch (error) {
          skipped.push({ kind, name, alias, reason: error instanceof AliasConflictError ? 'conflict' : 'invalid' });
        }
      }
    }
  }
  if (added.length === 0) return { snapshot, added, skipped };
  return { snapshot: { revision: snapshot.revision + 1, entries }, added, skipped };
}
