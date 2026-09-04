import type { User } from '@/types/user';

/**
 * Firebase Authentication and an AcadeGrade student profile are separate
 * records. A user is allowed into student pages only after the academic
 * profile has been finalized.
 *
 * Older, valid profiles pre-date `setupComplete`, so they are recognized by
 * their required identity and academic fields. An explicit `false` always
 * means setup is incomplete.
 */
export function isStudentProfileComplete(candidate: unknown): candidate is User {
  if (!candidate || typeof candidate !== 'object') return false;

  const profile = candidate as Partial<User>;
  if (profile.setupComplete === false) return false;

  const requiredText = [
    profile.fullName,
    profile.email,
    profile.matric,
    profile.university,
    profile.department,
    profile.programme,
    profile.entrySession || profile.currentSession,
  ];

  return requiredText.every(
    (value) => typeof value === 'string' && value.trim().length > 0
  ) && typeof profile.currentLevel === 'number' && profile.currentLevel >= 100;
}
