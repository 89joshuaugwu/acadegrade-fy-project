'use client';

import { useEffect, useState } from 'react';

/**
 * Course-code autocomplete (A10) from the admin-managed `courseCatalog`
 * collection (readable by any signed-in user under firestore.rules).
 * One query per level and semester, cached in sessionStorage per
 * department/level/semester with the catalogue's revision when it has one.
 */

export interface CatalogSuggestion {
  code: string;
  title: string;
  units: number;
}

export interface CatalogCourseDoc {
  code?: unknown;
  title?: unknown;
  units?: unknown;
  department?: unknown;
  /** Older catalogue entries (types/course.ts CatalogCourse). */
  dept?: unknown;
  level?: unknown;
  semester?: unknown;
  revision?: unknown;
  updatedAt?: unknown;
  createdAt?: unknown;
}

export interface CatalogScope {
  department?: string | null;
  level: number;
  semester: number;
}

export type CatalogQuery = (level: number, semester: number) => Promise<CatalogCourseDoc[]>;

export const CATALOG_CACHE_PREFIX = 'acadegrade:course-catalog:v1:';
const MAX_SUGGESTIONS = 300;

const normalise = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

/** "csc401" and "CSC  401" both become "CSC 401". */
export function normaliseCatalogCode(code: string): string {
  const compact = code.toUpperCase().replace(/\s+/g, '');
  const match = /^([A-Z]+)(\d.*)$/.exec(compact);
  return match ? `${match[1]} ${match[2]}` : code.trim().toUpperCase().replace(/\s+/g, ' ');
}

function millis(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value instanceof Date) return value.getTime();
  if (value && typeof value === 'object') {
    const record = value as { toMillis?: () => number; seconds?: number };
    if (typeof record.toMillis === 'function') return record.toMillis();
    if (typeof record.seconds === 'number') return record.seconds * 1000;
  }
  return 0;
}

function cacheKey(scope: CatalogScope) {
  return `${CATALOG_CACHE_PREFIX}${normalise(scope.department ?? '')}:${scope.level}:${scope.semester}`;
}

function readCache(key: string): CatalogSuggestion[] | null {
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { items?: unknown };
    return Array.isArray(parsed.items) ? parsed.items as CatalogSuggestion[] : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, items: CatalogSuggestion[], revision: number | null) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify({ revision, fetchedAt: Date.now(), items }));
  } catch {
    // Session storage blocked: the next visit queries again.
  }
}

/** Builds the suggestion list: valid entries only, the student's department first, one per code. */
export function toSuggestions(docs: CatalogCourseDoc[], department?: string | null): CatalogSuggestion[] {
  const dept = normalise(department ?? '');
  const valid = docs.flatMap((doc) => {
    const code = typeof doc.code === 'string' ? normaliseCatalogCode(doc.code) : '';
    const title = typeof doc.title === 'string' ? doc.title.trim() : '';
    const units = Number(doc.units);
    if (!code || !title || !Number.isInteger(units) || units < 1 || units > 6) return [];
    const docDept = typeof doc.department === 'string' ? doc.department : typeof doc.dept === 'string' ? doc.dept : '';
    const own = dept !== '' && normalise(docDept) === dept;
    return [{ code, title, units, own }];
  });
  valid.sort((a, b) => Number(b.own) - Number(a.own) || a.code.localeCompare(b.code, undefined, { numeric: true }));
  const seen = new Set<string>();
  const result: CatalogSuggestion[] = [];
  for (const { code, title, units } of valid) {
    if (seen.has(code)) continue;
    seen.add(code);
    result.push({ code, title, units });
    if (result.length >= MAX_SUGGESTIONS) break;
  }
  return result;
}

async function defaultQuery(level: number, semester: number): Promise<CatalogCourseDoc[]> {
  const [{ queryCollection }, { where }] = await Promise.all([
    import('@/lib/firebase/firestore'),
    import('firebase/firestore'),
  ]);
  return queryCollection<CatalogCourseDoc>('courseCatalog', where('level', '==', level), where('semester', '==', semester));
}

export async function loadCourseCatalog(scope: CatalogScope, query: CatalogQuery = defaultQuery): Promise<CatalogSuggestion[]> {
  if (!Number.isFinite(scope.level) || !Number.isFinite(scope.semester)) return [];
  const key = cacheKey(scope);
  const cached = readCache(key);
  if (cached) return cached;
  try {
    const docs = await query(scope.level, scope.semester);
    const items = toSuggestions(docs, scope.department);
    const revision = docs.reduce((max, doc) => Math.max(max, Number(doc.revision) || 0, millis(doc.updatedAt), millis(doc.createdAt)), 0);
    writeCache(key, items, revision || null);
    return items;
  } catch {
    return []; // Autocomplete is optional; typing still works.
  }
}

/** Suggestions for a semester page; empty until loaded or when unavailable. */
export function useCourseCatalog(scope: CatalogScope | null): CatalogSuggestion[] {
  const [items, setItems] = useState<CatalogSuggestion[]>([]);
  const department = scope?.department ?? '';
  const level = scope?.level ?? NaN;
  const semester = scope?.semester ?? NaN;
  useEffect(() => {
    if (!Number.isFinite(level) || !Number.isFinite(semester)) return;
    let active = true;
    void loadCourseCatalog({ department, level, semester }).then((next) => {
      if (active) setItems(next);
    });
    return () => { active = false; };
  }, [department, level, semester]);
  return items;
}

/** Finds the catalogue entry for a typed code (spacing and case ignored). */
export function findByCode(catalog: readonly CatalogSuggestion[], code: string): CatalogSuggestion | undefined {
  const wanted = normaliseCatalogCode(code);
  return wanted ? catalog.find((course) => course.code === wanted) : undefined;
}

export function findByTitle(catalog: readonly CatalogSuggestion[], title: string): CatalogSuggestion | undefined {
  const wanted = normalise(title);
  return wanted ? catalog.find((course) => normalise(course.title) === wanted) : undefined;
}
