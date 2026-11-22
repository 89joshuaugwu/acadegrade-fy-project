import { ACADEMIC_ALIASES } from '@/lib/utils/academic-data';
import { searchAcademicNames } from '@/lib/utils/academic-search';
import type { CatalogEntry } from './model';

const spaced = (value: string) => value.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Pre-fills the Assign split for a programme typed with its department
 * ("B.Sc Computer Science" -> programme "Bachelor of Science (B.Sc.)" and
 * department "Computer Science"). Only active entries; the admin confirms.
 */
export function suggestProgrammeSplit(typed: string, entries: readonly CatalogEntry[]): { programmeId?: string; departmentId?: string } {
  const text = ` ${spaced(typed)} `;
  let department: CatalogEntry | undefined;
  for (const entry of entries) {
    if (entry.kind !== 'department' || entry.status !== 'active') continue;
    const name = spaced(entry.name);
    if (name && text.includes(` ${name} `) && (!department || name.length > spaced(department.name).length)) department = entry;
  }
  const rest = department ? text.replace(` ${spaced(department.name)} `, ' ').trim() : text.trim();
  const programmes = entries.filter((entry) => entry.kind === 'programme' && entry.status === 'active');
  const aliases: Record<string, readonly string[]> = {};
  for (const entry of programmes) aliases[entry.name] = [...(entry.aliases ?? []), ...(ACADEMIC_ALIASES.programmes[entry.name] ?? [])];
  const [programmeName] = rest ? searchAcademicNames(programmes.map((entry) => entry.name), rest, aliases, 1) : [];
  const programme = programmes.find((entry) => entry.name === programmeName);
  return { ...(programme ? { programmeId: programme.id } : {}), ...(department ? { departmentId: department.id } : {}) };
}
