/** Half-point CGPA histogram buckets used by the admin stats and analytics pages. */
export const CGPA_BUCKET_COUNT = 10;

const bucketLabel = (index: number) => `${(index * 0.5).toFixed(1)}-${((index + 1) * 0.5).toFixed(1)}`;

export const CGPA_BUCKET_KEYS: readonly string[] = Array.from({ length: CGPA_BUCKET_COUNT }, (_, index) => bucketLabel(index));

/** The bucket a CGPA falls in. Out-of-range or invalid values are clamped. */
export function bucketKeyFor(cgpa: number): string {
  const value = Number.isFinite(cgpa) ? cgpa : 0;
  const index = Math.min(Math.max(Math.floor(value / 0.5), 0), CGPA_BUCKET_COUNT - 1);
  return bucketLabel(index);
}
