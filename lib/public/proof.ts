import 'server-only';
import { unstable_cache } from 'next/cache';
import { adminDb } from '@/lib/firebase/admin';
import { getApprovedTestimonials, getProofCountThreshold } from '@/lib/testimonials/server';
import {
  PROOF_MIN_TESTIMONIALS,
  SAMPLE_COUNT,
  SAMPLE_TESTIMONIALS,
  type PublicCount,
  type PublicProof,
  type PublicTestimonial,
} from './home-data-types';

export * from './home-data-types';

/**
 * Server read of the public proof: approved quotes (lib/testimonials/server.ts,
 * which validates them and drops anything not approved or not consented) and
 * the student count from `admin_metrics/latest` against the admin threshold
 * (`config/proof.countThreshold`, default 100). Fails closed: any error, too
 * few quotes or a count under the threshold hides that part. Real quotes and
 * numbers only; samples appear only in a preview (isProofPreviewDeployment
 * here, or the ProofPreviewGate island for signed-in admins).
 */

export const PROOF_REVALIDATE_SECONDS = 300;
export const PROOF_CACHE_TAG = 'public-proof';

/** Testimonials to show, or null when fewer than three approved quotes exist. */
export function selectTestimonials(items: readonly (PublicTestimonial | null)[]): PublicTestimonial[] | null {
  const shown = items.filter((item): item is PublicTestimonial => Boolean(item));
  return shown.length >= PROOF_MIN_TESTIMONIALS ? shown : null;
}

/** The count to show, or null under the threshold or when the metrics are unusable. */
export function selectCount(metrics: Record<string, unknown> | undefined, threshold: number): PublicCount | null {
  const students = metrics?.totalUsers;
  if (typeof students !== 'number' || !Number.isFinite(students) || students < threshold) return null;
  const universities = metrics?.universityCount;
  return {
    students: Math.floor(students),
    universities: typeof universities === 'number' && Number.isFinite(universities) && universities > 0 ? Math.floor(universities) : null,
  };
}

async function readCount(): Promise<PublicCount | null> {
  try {
    const [metrics, threshold] = await Promise.all([adminDb.collection('admin_metrics').doc('latest').get(), getProofCountThreshold()]);
    return selectCount(metrics.data(), threshold);
  } catch {
    return null;
  }
}

const readStoredProof = unstable_cache(
  async (): Promise<Omit<PublicProof, 'preview'>> => {
    const [quotes, count] = await Promise.all([getApprovedTestimonials(), readCount()]);
    return { testimonials: selectTestimonials(quotes), count };
  },
  ['public-proof'],
  { revalidate: PROOF_REVALIDATE_SECONDS, tags: [PROOF_CACHE_TAG] }
);

/** Real proof only. Never throws; a storage outage hides both parts. */
export async function readPublicProof(): Promise<PublicProof> {
  try {
    const stored = await readStoredProof();
    return { ...stored, preview: false };
  } catch {
    return { testimonials: null, count: null, preview: false };
  }
}

/** True on Vercel preview deployments, where the owner may see the sample layout. */
export function isProofPreviewDeployment(env: Record<string, string | undefined> = process.env): boolean {
  return env.VERCEL_ENV === 'preview';
}

/** The sample proof for previews: SAMPLE quotes and a SAMPLE count, both marked. */
export function sampleProof(): PublicProof {
  return { testimonials: SAMPLE_TESTIMONIALS.map((item) => ({ ...item })), count: { ...SAMPLE_COUNT }, preview: true };
}

/**
 * What a page should render: real proof, or the samples on a preview
 * deployment. Signed-in admins in production see samples through the
 * ProofPreviewGate client island instead (it checks ?preview=proof and
 * verifies the admin with /api/admin/verify).
 */
export async function resolvePublicProof(env: Record<string, string | undefined> = process.env): Promise<PublicProof> {
  if (isProofPreviewDeployment(env)) return sampleProof();
  return readPublicProof();
}
