// Alias-aware search for the university, department and programme pickers.
// Byte-identical in acadegrade-web (lib/utils/academic-search.ts) and
// acadegrade-mobile (lib/data/academic-search.ts): pure, no imports, erasable
// TypeScript only, so Node can run it directly in either repo's tests.

/** Catalogue name -> other names students use for it ("ESUT", "UNILAG"). */
export type AcademicAliasMap = Readonly<Record<string, readonly string[]>>;

/** Lower case, accents and punctuation removed, single spaces. */
function spaced(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function aliasesFor(aliases: AcademicAliasMap | undefined, name: string): readonly unknown[] {
  if (!aliases || typeof aliases !== 'object' || !Object.prototype.hasOwnProperty.call(aliases, name)) return [];
  const list = aliases[name];
  return Array.isArray(list) ? list : [];
}

/**
 * Names matching what the student typed, best first:
 * 0. the query is the name itself, or one of the entry's aliases ("ESUT");
 * 1. the name starts with the query;
 * 2. an alias starts with the query, or the query starts with an alias word
 *    ("ESUT Agbani" finds ESUT);
 * 3. the name or an alias contains the query, ignoring spaces and punctuation
 *    ("bsc" finds "Bachelor of Science (B.Sc.)").
 * An empty query returns the list as is. Order within a rank keeps the list order.
 */
export function searchAcademicNames(
  names: readonly string[],
  query: string,
  aliases?: AcademicAliasMap,
  max: number = Number.POSITIVE_INFINITY,
): string[] {
  const words = spaced(query);
  const compact = words.replace(/ /g, '');
  if (!compact) return names.slice(0, max);
  const ranked: string[][] = [[], [], [], []];
  for (const name of names) {
    if (typeof name !== 'string') continue;
    const nameWords = spaced(name);
    let rank = nameWords === words ? 0 : nameWords.startsWith(words) ? 1 : nameWords.replace(/ /g, '').includes(compact) ? 3 : 4;
    for (const alias of rank === 0 ? [] : aliasesFor(aliases, name)) {
      if (typeof alias !== 'string') continue;
      const aliasWords = spaced(alias);
      if (!aliasWords) continue;
      if (aliasWords === words) { rank = 0; break; }
      if (aliasWords.startsWith(words) || words.startsWith(`${aliasWords} `)) rank = Math.min(rank, 2);
      else if (aliasWords.replace(/ /g, '').includes(compact)) rank = Math.min(rank, 3);
    }
    if (rank < 4) ranked[rank].push(name);
  }
  return ranked.flat().slice(0, max);
}
