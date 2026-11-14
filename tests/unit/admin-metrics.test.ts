import { describe, expect, it } from 'vitest';
import { CGPA_BUCKET_KEYS, bucketKeyFor } from '@/lib/admin/metrics';
import { DEGREE_CLASS_BANDS } from '@/lib/cgpa/academicRules';

describe('CGPA buckets', () => {
  it('has ten half-point buckets from 0.0-0.5 to 4.5-5.0', () => {
    expect(CGPA_BUCKET_KEYS).toHaveLength(10);
    expect(CGPA_BUCKET_KEYS[0]).toBe('0.0-0.5');
    expect(CGPA_BUCKET_KEYS[9]).toBe('4.5-5.0');
  });

  it('bucketKeyFor puts each class minimum in an existing bucket', () => {
    for (const band of DEGREE_CLASS_BANDS) {
      expect(CGPA_BUCKET_KEYS).toContain(bucketKeyFor(band.minCGPA));
    }
    expect(bucketKeyFor(2.4)).toBe('2.0-2.5');
    expect(bucketKeyFor(4.5)).toBe('4.5-5.0');
    expect(bucketKeyFor(3.5)).toBe('3.5-4.0');
  });

  it('clamps out-of-range and invalid values', () => {
    expect(bucketKeyFor(5)).toBe('4.5-5.0');
    expect(bucketKeyFor(7)).toBe('4.5-5.0');
    expect(bucketKeyFor(-1)).toBe('0.0-0.5');
    expect(bucketKeyFor(Number.NaN)).toBe('0.0-0.5');
  });
});
