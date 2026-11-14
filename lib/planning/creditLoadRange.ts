/**
 * A7: the student's usual units per semester, stored as users/{uid}.creditLoadRange.
 * Client-written, so every reader re-checks it: integers 1-60 with min <= max.
 */

export interface CreditLoadRange {
  min: number;
  max: number;
}

export const CREDIT_LOAD_MIN = 1;
export const CREDIT_LOAD_MAX = 60;

const isUnitCount = (value: unknown): value is number => (
  typeof value === 'number' && Number.isInteger(value) && value >= CREDIT_LOAD_MIN && value <= CREDIT_LOAD_MAX
);

/** The stored range when it is valid; null for a missing or malformed value (older accounts have none). */
export function readCreditLoadRange(value: unknown): CreditLoadRange | null {
  if (!value || typeof value !== 'object') return null;
  const { min, max } = value as Record<string, unknown>;
  if (!isUnitCount(min) || !isUnitCount(max) || min > max) return null;
  return { min, max };
}

/**
 * Checks the two Settings inputs. Both blank means "no range" (null). Returns an
 * error message the form can show, or the range to save.
 */
export function parseCreditLoadInputs(minText: string, maxText: string): { range: CreditLoadRange | null } | { error: string } {
  const minRaw = minText.trim();
  const maxRaw = maxText.trim();
  if (!minRaw && !maxRaw) return { range: null };
  if (!minRaw || !maxRaw) return { error: 'Enter both the fewest and the most units, or leave both empty.' };
  const min = Number(minRaw);
  const max = Number(maxRaw);
  if (!isUnitCount(min) || !isUnitCount(max)) {
    return { error: `Units must be whole numbers from ${CREDIT_LOAD_MIN} to ${CREDIT_LOAD_MAX}.` };
  }
  if (min > max) return { error: 'The fewest units cannot be more than the most units.' };
  return { range: { min, max } };
}
