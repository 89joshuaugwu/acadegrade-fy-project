import type { AcademicCatalogNames } from './merge';

export interface AcademicProfileNames {
  university: string;
  department: string;
  programme: string;
}

export type AcademicSuggestion = { kind: keyof AcademicProfileNames; name: string };

const fields = [
  ['university', 'universities'],
  ['department', 'departments'],
  ['programme', 'programmes'],
] as const;

function normalize(name: string) {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

export function missingAcademicNames(profile: AcademicProfileNames, catalog: AcademicCatalogNames): AcademicSuggestion[] {
  return fields.flatMap(([kind, plural]) => {
    const name = profile[kind].trim();
    if (!name || catalog[plural].some((candidate) => normalize(candidate) === normalize(name))) return [];
    return [{ kind, name }];
  });
}
