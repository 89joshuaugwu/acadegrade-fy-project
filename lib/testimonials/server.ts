import 'server-only';

import { adminDb } from '@/lib/firebase/admin';
import {
  DEFAULT_COUNT_THRESHOLD, PROOF_CONFIG_PATH, PUBLIC_TESTIMONIALS_COLLECTION, publicTestimonialView, readCountThreshold,
  type PublicTestimonial,
} from './testimonials';

const MAX_PUBLIC = 12;

const millis = (value: unknown) => {
  if (value instanceof Date) return value.getTime();
  const stamp = value as { toMillis?: () => number } | null | undefined;
  return typeof stamp?.toMillis === 'function' ? stamp.toMillis() : 0;
};

/**
 * Approved quotes for public pages, newest approval first. Never throws: any read
 * error returns [], so the proof section simply stays hidden.
 * Single-field query (no composite index needed); sorted in memory.
 */
export async function getApprovedTestimonials(limit = MAX_PUBLIC): Promise<PublicTestimonial[]> {
  try {
    const snapshot = await adminDb.collection(PUBLIC_TESTIMONIALS_COLLECTION).where('status', '==', 'approved').limit(100).get();
    return snapshot.docs
      .map((doc) => ({ approvedAt: millis(doc.data().approvedAt), view: publicTestimonialView(doc.id, doc.data()) }))
      .filter((row): row is { approvedAt: number; view: PublicTestimonial } => row.view !== null)
      .sort((a, b) => b.approvedAt - a.approvedAt)
      .slice(0, Math.max(0, limit))
      .map((row) => row.view);
  } catch {
    console.warn('[testimonials] could not read approved quotes');
    return [];
  }
}

/** The admin-set CountLine threshold (`config/proof.countThreshold`), default 100. Never throws. */
export async function getProofCountThreshold(): Promise<number> {
  try {
    const snapshot = await adminDb.collection(PROOF_CONFIG_PATH.collection).doc(PROOF_CONFIG_PATH.doc).get();
    return readCountThreshold(snapshot.data());
  } catch {
    return DEFAULT_COUNT_THRESHOLD;
  }
}
