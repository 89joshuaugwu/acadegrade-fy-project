import type { SemesterWithId } from '@/types/semester';

/**
 * Where a share-code link imports into: the latest semester still in progress
 * (list is sorted by level, then semester). Null when every semester is complete.
 */
export function pickImportTarget(semesters: readonly SemesterWithId[]): SemesterWithId | null {
  for (let index = semesters.length - 1; index >= 0; index -= 1) {
    if (!semesters[index].isComplete) return semesters[index];
  }
  return null;
}
