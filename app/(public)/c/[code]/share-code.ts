import 'server-only';

import { adminDb } from '@/lib/firebase/admin';
import { getPlatformSettings } from '@/lib/platform/settings-server';
import { normaliseImportCode } from '../import-link';

export interface SharedCourse {
  code: string;
  title: string;
  units: number;
}

export type ShareCodeLookup =
  | { status: 'ok'; code: string; courses: SharedCourse[] }
  | { status: 'invalid' }
  | { status: 'not_found' }
  | { status: 'paused' }
  | { status: 'unavailable' };

const MAX_COURSES = 100;

/** Keeps only code, title and units; everything else on the document stays private. */
function publicCourses(value: unknown): SharedCourse[] {
  if (!Array.isArray(value)) return [];
  const courses: SharedCourse[] = [];
  for (const row of value) {
    if (courses.length >= MAX_COURSES) break;
    if (!row || typeof row !== 'object') continue;
    const { code, title, units } = row as Record<string, unknown>;
    if (typeof code !== 'string' || !code.trim()) continue;
    const unitCount = Number(units);
    courses.push({
      code: code.trim().slice(0, 16),
      title: typeof title === 'string' ? title.trim().slice(0, 140) : '',
      units: Number.isInteger(unitCount) && unitCount >= 0 && unitCount <= 6 ? unitCount : 0,
    });
  }
  return courses;
}

/**
 * Reads shareCodes/{CODE} for the public /c/[code] page. Invalid codes never
 * reach Firestore. The share_code switch hides every list; a code an admin has
 * disabled reads as not found.
 */
export async function loadSharedCourseList(rawCode: string): Promise<ShareCodeLookup> {
  const code = normaliseImportCode(rawCode);
  if (!code) return { status: 'invalid' };

  const settings = await getPlatformSettings();
  if (settings.disabledFeatures.includes('share_code')) return { status: 'paused' };

  try {
    const snapshot = await adminDb.collection('shareCodes').doc(code).get();
    const data = snapshot.exists ? snapshot.data() : undefined;
    if (!data || data.disabled === true) return { status: 'not_found' };
    const courses = publicCourses(data.courses);
    if (courses.length === 0) return { status: 'not_found' };
    return { status: 'ok', code, courses };
  } catch {
    return { status: 'unavailable' };
  }
}
