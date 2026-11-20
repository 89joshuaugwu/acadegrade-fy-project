/**
 * Shared shapes for the public proof sections (testimonials and the count).
 * Free of server imports so client islands and tests can use them. Storage,
 * validation and the threshold live in lib/testimonials (server fixes lane);
 * the SAMPLE quotes live in lib/public/proof-samples.ts.
 */
import { DEFAULT_COUNT_THRESHOLD, MIN_APPROVED_TO_SHOW, type PublicTestimonial as StoredPublicTestimonial } from '@/lib/testimonials/testimonials';
import { PROOF_SAMPLE_TESTIMONIALS } from './proof-samples';

export { DEFAULT_COUNT_THRESHOLD };

/** The section shows only with at least this many approved quotes. */
export const PROOF_MIN_TESTIMONIALS = MIN_APPROVED_TO_SHOW;

/** A quote as a public page may show it; `sample` marks the admin-preview fixtures. */
export type PublicTestimonial = StoredPublicTestimonial & { sample?: boolean };

export interface PublicCount {
  students: number;
  /** Universities represented, when the metrics job records it (`admin_metrics/latest.universityCount`). */
  universities: number | null;
  sample?: boolean;
}

export interface PublicProof {
  /** Null hides the whole section (fewer than three approved quotes or a failed read). */
  testimonials: PublicTestimonial[] | null;
  /** Null shows the fallback fact instead of a number. */
  count: PublicCount | null;
  /** True when sample content is being shown (admin or preview deployment). */
  preview: boolean;
}

/** The SAMPLE quotes from home.md §5.6, marked as samples. Admin preview only. */
export const SAMPLE_TESTIMONIALS: readonly PublicTestimonial[] = PROOF_SAMPLE_TESTIMONIALS.map((item) => ({ ...item, sample: true }));

/** SAMPLE count for the admin preview only. */
export const SAMPLE_COUNT: PublicCount = { students: 1240, universities: 38, sample: true };

/** The non-numeric fact shown while the real count is below the threshold. */
export const COUNT_FALLBACK_FACT = 'Built for the 5-point scale used across Nigerian universities';
