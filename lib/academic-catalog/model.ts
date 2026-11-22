import type { AcademicCatalogAliases, AcademicCatalogNames, PublicAcademicCatalog } from './merge';

export type CatalogKind = 'university' | 'department' | 'programme';
export type CatalogStatus = 'active' | 'archived';

export interface CatalogEntry {
  id: string;
  kind: CatalogKind;
  name: string;
  status: CatalogStatus;
  source: 'default' | 'admin';
  /** Other names students type for this entry ("ESUT"). Additive; see ./aliases. */
  aliases?: string[];
}

export interface CatalogSnapshot {
  revision: number;
  entries: CatalogEntry[];
}

export type CatalogMutation =
  | { action: 'add'; kind: CatalogKind; name: string }
  | { action: 'edit'; id: string; name: string }
  | { action: 'archive' | 'restore'; id: string };

const FIELDS = [
  ['universities', 'university'],
  ['departments', 'department'],
  ['programmes', 'programme'],
] as const;

export function normalizeCatalogName(name: string): string {
  return name.trim().normalize('NFKC').replace(/\s+/g, ' ').toLocaleLowerCase('en');
}

export function checkedName(name: string): string {
  const clean = name.trim().replace(/\s+/g, ' ');
  if (clean.length < 2 || clean.length > 180 || /[<>\x00-\x1f]/.test(clean)) {
    throw new Error('Name must be 2–180 characters without markup or control characters.');
  }
  return clean;
}

export function createInitialCatalog(defaults: AcademicCatalogNames): CatalogSnapshot {
  return {
    revision: 1,
    entries: FIELDS.flatMap(([field, kind]) => defaults[field].map((name) => ({
      id: `${kind}:${normalizeCatalogName(name).replace(/[^a-z0-9]+/g, '-')}`,
      kind,
      name,
      status: 'active' as const,
      source: 'default' as const,
    }))),
  };
}

/** Aliases of active entries by kind and name (an additive response field; old APKs ignore it). */
function publicAliases(entries: CatalogEntry[]): AcademicCatalogAliases {
  const aliases = { universities: {}, departments: {}, programmes: {} } as Record<keyof AcademicCatalogAliases, Record<string, string[]>>;
  for (const [field, kind] of FIELDS) {
    for (const entry of entries) {
      if (entry.kind !== kind || entry.status !== 'active' || !Array.isArray(entry.aliases)) continue;
      const list = entry.aliases.filter((alias): alias is string => typeof alias === 'string' && alias.trim().length > 0);
      if (list.length) aliases[field][entry.name] = list;
    }
  }
  return aliases;
}

export function publicCatalog(snapshot: CatalogSnapshot): PublicAcademicCatalog {
  return {
    revision: snapshot.revision,
    universities: snapshot.entries.filter((entry) => entry.kind === 'university' && entry.status === 'active').map((entry) => entry.name),
    departments: snapshot.entries.filter((entry) => entry.kind === 'department' && entry.status === 'active').map((entry) => entry.name),
    programmes: snapshot.entries.filter((entry) => entry.kind === 'programme' && entry.status === 'active').map((entry) => entry.name),
    aliases: publicAliases(snapshot.entries),
  };
}

export function mutateCatalog(snapshot: CatalogSnapshot, mutation: CatalogMutation): CatalogSnapshot {
  const entries = snapshot.entries.map((entry) => ({ ...entry }));
  if (mutation.action === 'add' || mutation.action === 'edit') {
    const name = checkedName(mutation.name);
    const existing = mutation.action === 'edit' ? entries.find((entry) => entry.id === mutation.id) : undefined;
    if (mutation.action === 'edit' && !existing) throw new Error('Catalog entry not found.');
    const kind = mutation.action === 'add' ? mutation.kind : existing!.kind;
    if (entries.some((entry) => entry.kind === kind && entry.id !== existing?.id && normalizeCatalogName(entry.name) === normalizeCatalogName(name))) {
      throw new Error('This name already exists in the catalog.');
    }
    if (mutation.action === 'add') {
      entries.push({ id: crypto.randomUUID(), kind, name, status: 'active', source: 'admin' });
    } else {
      existing!.name = name;
    }
  } else {
    const existing = entries.find((entry) => entry.id === mutation.id);
    if (!existing) throw new Error('Catalog entry not found.');
    existing.status = mutation.action === 'archive' ? 'archived' : 'active';
  }
  return { revision: snapshot.revision + 1, entries };
}
