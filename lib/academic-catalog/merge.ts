export type AcademicAliasLists = Readonly<Record<string, readonly string[]>>;

export interface AcademicCatalogAliases {
  universities: AcademicAliasLists;
  departments: AcademicAliasLists;
  programmes: AcademicAliasLists;
}

export interface AcademicCatalogNames {
  universities: string[];
  departments: string[];
  programmes: string[];
  /** Other names per entry, for alias-aware search. Optional: older servers send none. */
  aliases?: AcademicCatalogAliases;
}

export interface PublicAcademicCatalog extends AcademicCatalogNames {
  revision: number;
}

export interface AcademicCatalogDefaults {
  universities: readonly string[] | string[];
  departments: readonly string[] | string[];
  programmes: readonly string[] | string[];
  aliases?: AcademicCatalogAliases;
}

const KINDS = ['universities', 'departments', 'programmes'] as const;
const MAX_ALIASES = 20;

function mergeNames(bundled: readonly string[], managed: unknown): string[] {
  if (!Array.isArray(managed)) return [...bundled];
  const names: string[] = [];
  const seen = new Set<string>();
  const canonical = new Map(bundled.map((name) => [name.trim().toLocaleLowerCase(), name]));
  for (const candidate of managed) {
    if (typeof candidate !== 'string') continue;
    const name = candidate.trim();
    const key = name.toLocaleLowerCase();
    if (name.length < 2 || name.length > 180 || seen.has(key)) continue;
    seen.add(key);
    names.push(canonical.get(key) ?? name);
  }
  return names;
}

function aliasList(map: unknown, name: string): unknown[] {
  if (!map || typeof map !== 'object' || !Object.prototype.hasOwnProperty.call(map, name)) return [];
  const list = (map as Record<string, unknown>)[name];
  return Array.isArray(list) ? list : [];
}

/** Live aliases first, then bundled seeds, deduped (case-insensitive) and bounded, for listed names only. */
export function mergeAliases(names: readonly string[], remote: unknown, bundled: unknown): AcademicAliasLists {
  const merged: Record<string, string[]> = {};
  for (const name of names) {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const alias of [...aliasList(remote, name), ...aliasList(bundled, name)]) {
      if (typeof alias !== 'string') continue;
      const clean = alias.trim();
      const key = clean.toLocaleLowerCase();
      if (clean.length < 2 || clean.length > 80 || seen.has(key) || list.length >= MAX_ALIASES) continue;
      seen.add(key);
      list.push(clean);
    }
    if (list.length) merged[name] = list;
  }
  return merged;
}

export function mergeCatalogWithDefaults(
  remote: Partial<PublicAcademicCatalog> | null | undefined,
  defaults: AcademicCatalogDefaults,
): AcademicCatalogNames {
  if (!remote || !Number.isSafeInteger(remote.revision) || !KINDS.every((kind) => Array.isArray(remote[kind]))) {
    return defaults as AcademicCatalogNames;
  }
  const names = Object.fromEntries(KINDS.map((kind) => [
    kind,
    mergeNames(defaults[kind], remote?.[kind]),
  ])) as unknown as AcademicCatalogNames;
  const remoteAliases = remote.aliases && typeof remote.aliases === 'object' ? remote.aliases : undefined;
  if (!remoteAliases && !defaults.aliases) return names;
  names.aliases = Object.fromEntries(KINDS.map((kind) => [
    kind,
    mergeAliases(names[kind], remoteAliases?.[kind], defaults.aliases?.[kind]),
  ])) as unknown as AcademicCatalogAliases;
  return names;
}
