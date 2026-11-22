import type { AcademicCatalogNames } from './merge';
import type { CatalogEntry, CatalogKind, CatalogSnapshot } from './model';

// No runtime imports: scripts/sync-academic-catalog.mjs loads this file directly with Node.
// The normaliser and id scheme must match normalizeCatalogName/createInitialCatalog in ./model.
const normalize = (name: string) => name.trim().normalize('NFKC').replace(/\s+/g, ' ').toLocaleLowerCase('en');
const defaultId = (kind: CatalogKind, name: string) => `${kind}:${normalize(name).replace(/[^a-z0-9]+/g, '-')}`;

const FIELDS = [
  ['universities', 'university'],
  ['departments', 'department'],
  ['programmes', 'programme'],
] as const;

/**
 * Adds bundled default names that a stored catalog does not know about yet.
 * Existing entries (including archived and admin ones) are never changed, so an
 * archived name is not restored. New entries are placed alphabetically among
 * their kind, because pickers show the catalog in stored order.
 */
export function addMissingDefaultEntries(
  snapshot: CatalogSnapshot,
  defaults: AcademicCatalogNames,
): { snapshot: CatalogSnapshot; added: { kind: CatalogKind; name: string }[] } {
  const entries: CatalogEntry[] = [...snapshot.entries];
  const added: { kind: CatalogKind; name: string }[] = [];
  for (const [field, kind] of FIELDS) {
    for (const name of defaults[field]) {
      const key = normalize(name);
      const id = defaultId(kind, name);
      if (entries.some((entry) => entry.kind === kind && (normalize(entry.name) === key || entry.id === id))) continue;
      const entry: CatalogEntry = { id, kind, name, status: 'active', source: 'default' };
      let insertAt = -1;
      let lastOfKind = -1;
      entries.forEach((candidate, index) => {
        if (candidate.kind !== kind) return;
        lastOfKind = index;
        if (insertAt === -1 && candidate.name.localeCompare(name, 'en') > 0) insertAt = index;
      });
      entries.splice(insertAt !== -1 ? insertAt : lastOfKind !== -1 ? lastOfKind + 1 : entries.length, 0, entry);
      added.push({ kind, name });
    }
  }
  if (added.length === 0) return { snapshot, added };
  return { snapshot: { revision: snapshot.revision + 1, entries }, added };
}
