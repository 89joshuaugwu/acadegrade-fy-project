/**
 * AcadeGrade O-level subject catalogue: the common WAEC, NECO and NABTEB
 * subjects with the short names students type ("Eng Lang", "F/Maths", "CRK").
 *
 * This file is byte-identical in acadegrade-web/lib/records/olevelSubjects.ts
 * and acadegrade-mobile/lib/records/olevelSubjects.ts. Both repos run the
 * shared fixture tests/fixtures/olevel-rules.json against it. Keep it pure:
 * no imports, no platform APIs, erasable TypeScript only.
 *
 * Ids are stable storage keys (users/{uid}/olevel/current rows). Never rename
 * one; add an alias instead. A name that is not in the catalogue is stored as
 * `custom:<normalised name>` so it still combines across two sittings.
 */

export interface OlevelSubject {
  id: string;
  name: string;
  aliases: readonly string[];
}

export const ENGLISH_ID = 'english';
export const MATHEMATICS_ID = 'mathematics';
export const CUSTOM_SUBJECT_PREFIX = 'custom:';

/** Most common first (the picker shows this order for an empty search). */
export const OLEVEL_SUBJECTS: readonly OlevelSubject[] = [
  { id: ENGLISH_ID, name: 'English Language', aliases: ['English', 'Eng', 'Eng Lang', 'Eng Language', 'English Lang', 'Use of English'] },
  { id: MATHEMATICS_ID, name: 'Mathematics', aliases: ['Maths', 'Math', 'General Mathematics', 'General Maths', 'Gen Maths', 'Core Mathematics', 'Core Maths'] },
  { id: 'biology', name: 'Biology', aliases: ['Bio'] },
  { id: 'chemistry', name: 'Chemistry', aliases: ['Chem'] },
  { id: 'physics', name: 'Physics', aliases: ['Phy', 'Phys'] },
  { id: 'further-mathematics', name: 'Further Mathematics', aliases: ['Further Maths', 'F Maths', 'F/Maths', 'Further Math', 'Add Maths', 'Additional Mathematics'] },
  { id: 'agricultural-science', name: 'Agricultural Science', aliases: ['Agric', 'Agric Science', 'Agriculture', 'Agricultural Sci'] },
  { id: 'economics', name: 'Economics', aliases: ['Econs', 'Econ'] },
  { id: 'geography', name: 'Geography', aliases: ['Geo', 'Geog'] },
  { id: 'government', name: 'Government', aliases: ['Govt', 'Gov'] },
  { id: 'literature-in-english', name: 'Literature in English', aliases: ['Literature', 'Lit', 'Lit in Eng', 'Lit in English', 'Literature in Eng'] },
  { id: 'civic-education', name: 'Civic Education', aliases: ['Civic', 'Civic Edu', 'Civics'] },
  { id: 'commerce', name: 'Commerce', aliases: ['Comm'] },
  { id: 'financial-accounting', name: 'Financial Accounting', aliases: ['Accounting', 'Accounts', 'Fin Acc', 'Fin Accounting', 'Principles of Accounts', 'Book Keeping', 'Bookkeeping'] },
  { id: 'christian-religious-studies', name: 'Christian Religious Studies', aliases: ['CRS', 'CRK', 'Christian Religious Knowledge', 'Bible Knowledge'] },
  { id: 'islamic-studies', name: 'Islamic Studies', aliases: ['IRS', 'IRK', 'Islamic Religious Studies', 'Islamic Religious Knowledge'] },
  { id: 'history', name: 'History', aliases: ['Hist'] },
  { id: 'computer-studies', name: 'Computer Studies', aliases: ['Computer', 'Computer Science', 'ICT', 'Information Technology', 'Information and Communication Technology'] },
  { id: 'data-processing', name: 'Data Processing', aliases: ['Data Proc'] },
  { id: 'technical-drawing', name: 'Technical Drawing', aliases: ['Tech Drawing', 'TD'] },
  { id: 'yoruba', name: 'Yoruba', aliases: ['Yoruba Language'] },
  { id: 'igbo', name: 'Igbo', aliases: ['Igbo Language'] },
  { id: 'hausa', name: 'Hausa', aliases: ['Hausa Language'] },
  { id: 'french', name: 'French', aliases: ['French Language'] },
  { id: 'arabic', name: 'Arabic', aliases: ['Arabic Language'] },
  { id: 'foods-and-nutrition', name: 'Foods and Nutrition', aliases: ['Food and Nutrition', 'Foods & Nutrition', 'Food & Nutrition'] },
  { id: 'home-management', name: 'Home Management', aliases: ['Home Economics', 'Home Econs'] },
  { id: 'visual-art', name: 'Visual Art', aliases: ['Fine Art', 'Fine Arts', 'Visual Arts', 'Art'] },
  { id: 'music', name: 'Music', aliases: [] },
  { id: 'physical-education', name: 'Physical Education', aliases: ['PE', 'Physical and Health Education', 'PHE'] },
  { id: 'health-education', name: 'Health Education', aliases: ['Health Science'] },
  { id: 'marketing', name: 'Marketing', aliases: [] },
  { id: 'office-practice', name: 'Office Practice', aliases: [] },
  { id: 'insurance', name: 'Insurance', aliases: [] },
  { id: 'store-management', name: 'Store Management', aliases: ['Store Keeping'] },
  { id: 'salesmanship', name: 'Salesmanship', aliases: [] },
  { id: 'tourism', name: 'Tourism', aliases: [] },
  { id: 'animal-husbandry', name: 'Animal Husbandry', aliases: [] },
  { id: 'fisheries', name: 'Fisheries', aliases: ['Fishery'] },
  { id: 'catering-craft', name: 'Catering Craft Practice', aliases: ['Catering', 'Catering Craft'] },
  { id: 'garment-making', name: 'Garment Making', aliases: ['Clothing and Textiles'] },
  { id: 'basic-electricity', name: 'Basic Electricity', aliases: ['Electricity'] },
  { id: 'basic-electronics', name: 'Basic Electronics', aliases: ['Electronics'] },
  { id: 'building-construction', name: 'Building Construction', aliases: ['Building'] },
  { id: 'auto-mechanics', name: 'Auto Mechanics', aliases: ['Auto Mechanical Work', 'Motor Vehicle Mechanics'] },
  { id: 'woodwork', name: 'Woodwork', aliases: ['Wood Work', 'Carpentry and Joinery'] },
  { id: 'metalwork', name: 'Metalwork', aliases: ['Metal Work'] },
  { id: 'applied-electricity', name: 'Applied Electricity', aliases: [] },
  { id: 'dyeing-and-bleaching', name: 'Dyeing and Bleaching', aliases: [] },
  { id: 'photography', name: 'Photography', aliases: [] },
];

/** Lower case, "&" as "and", separators as spaces, other punctuation dropped, spaces collapsed. */
export function normaliseSubjectKey(name: string): string {
  if (typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[\/\-_,()+]/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

let lookup: Map<string, OlevelSubject> | null = null;
function subjectLookup(): Map<string, OlevelSubject> {
  if (lookup) return lookup;
  const map = new Map<string, OlevelSubject>();
  for (const subject of OLEVEL_SUBJECTS) {
    for (const key of [subject.id, subject.name, ...subject.aliases].map(normaliseSubjectKey)) {
      if (key && !map.has(key)) map.set(key, subject);
    }
  }
  lookup = map;
  return map;
}

/** The catalogue subject for a typed name, id or alias, or null. */
export function findOlevelSubject(name: string): OlevelSubject | null {
  const key = normaliseSubjectKey(name);
  if (!key) return null;
  return subjectLookup().get(key) ?? null;
}

/** The storage id for a typed name: a catalogue id, `custom:<key>`, or '' for a blank name. */
export function subjectIdFor(name: string): string {
  const key = normaliseSubjectKey(name);
  if (!key) return '';
  const subject = subjectLookup().get(key);
  return subject ? subject.id : CUSTOM_SUBJECT_PREFIX + key;
}

/**
 * Picker search. Ranks an exact name/alias first, then names starting with the
 * query, aliases starting with it, words starting with it, then anything
 * containing it; ties keep catalogue order. An empty query lists the catalogue.
 */
export function searchOlevelSubjects(query: string, limit: number = 8): OlevelSubject[] {
  const max = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 8;
  const q = normaliseSubjectKey(query);
  if (!q) return OLEVEL_SUBJECTS.slice(0, max);
  const ranked: { subject: OlevelSubject; rank: number; order: number }[] = [];
  OLEVEL_SUBJECTS.forEach((subject, order) => {
    const name = normaliseSubjectKey(subject.name);
    const aliases = subject.aliases.map(normaliseSubjectKey);
    const all = [name, ...aliases];
    let rank = -1;
    if (all.includes(q)) rank = 0;
    else if (name.startsWith(q)) rank = 1;
    else if (aliases.some((alias) => alias.startsWith(q))) rank = 2;
    else if (all.some((text) => text.split(' ').some((word) => word.startsWith(q)))) rank = 3;
    else if (all.some((text) => text.includes(q))) rank = 4;
    if (rank >= 0) ranked.push({ subject, rank, order });
  });
  ranked.sort((a, b) => a.rank - b.rank || a.order - b.order);
  return ranked.slice(0, max).map((entry) => entry.subject);
}
