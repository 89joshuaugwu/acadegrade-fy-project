export interface AcademicCatalogNames {
  universities: string[];
  departments: string[];
  programmes: string[];
}

export interface PublicAcademicCatalog extends AcademicCatalogNames {
  revision: number;
}

const KINDS = ['universities', 'departments', 'programmes'] as const;

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

export function mergeCatalogWithDefaults(
  remote: Partial<PublicAcademicCatalog> | null | undefined,
  defaults: AcademicCatalogNames,
): AcademicCatalogNames {
  if (!remote || !Number.isSafeInteger(remote.revision) || !KINDS.every((kind) => Array.isArray(remote[kind]))) {
    return defaults;
  }
  return Object.fromEntries(KINDS.map((kind) => [
    kind,
    mergeNames(defaults[kind], remote?.[kind]),
  ])) as unknown as AcademicCatalogNames;
}
