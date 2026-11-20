/**
 * The optional 404 picture, chosen by slot ('notfound') through the imagery
 * lane's lib/public/page-photos.ts, never by slug.
 *
 * The slot holds the owner's image (lib/public/page-photos.ts); when a slot is
 * empty the 404 shows its card alone. Filling or emptying the slot needs
 * no page change.
 */

import { photoFor } from '@/lib/public/page-photos';

export interface NotFoundPhoto {
  src: string;
  alt: string;
  creditId: string | null;
  /** Ready-made srcset strings, when the slot has them (page-photos.ts entries do). */
  avifSrcSet?: string;
  webpSrcSet?: string;
  /** CSS object-position for the focal point. */
  position?: string;
}

type Variants = Record<string, string> | Record<number, string>;

/** The smallest variant at least `min` px wide from a { width: url } map. */
function pickVariant(variants: unknown, min: number): string | null {
  if (!variants || typeof variants !== 'object') return null;
  const entries = Object.entries(variants as Variants)
    .map(([width, url]) => [Number(width), url] as const)
    .filter(([width, url]) => Number.isFinite(width) && typeof url === 'string')
    .sort((a, b) => a[0] - b[0]);
  if (!entries.length) return null;
  return (entries.find(([width]) => width >= min) ?? entries[entries.length - 1])[1] as string;
}

function resolveSrc(src: unknown): string | null {
  if (typeof src === 'string') return src;
  if (!src || typeof src !== 'object') return null;
  const record = src as Record<string, unknown>;
  for (const key of ['webp', 'avif', 'jpg', 'jpeg']) {
    const picked = pickVariant(record[key], 400);
    if (picked) return picked;
  }
  return pickVariant(record, 400);
}

/** Reads a slot's photo ({ src | variants, alt, creditId }); null when empty or not usable. */
export function readSlotPhoto(photo: unknown): NotFoundPhoto | null {
  if (!photo || typeof photo !== 'object') return null;
  const record = photo as Record<string, unknown>;
  const src = resolveSrc(record.src ?? record.files ?? record.variants);
  const alt = typeof record.alt === 'string' ? record.alt : typeof record.altText === 'string' ? record.altText : null;
  if (!src || !alt) return null;
  const photoOut: NotFoundPhoto = { src, alt, creditId: typeof record.creditId === 'string' ? record.creditId : null };
  if (typeof record.avifSrcSet === 'string' && record.avifSrcSet) photoOut.avifSrcSet = record.avifSrcSet;
  if (typeof record.webpSrcSet === 'string' && record.webpSrcSet) photoOut.webpSrcSet = record.webpSrcSet;
  if (typeof record.objectPosition === 'string' && record.objectPosition) photoOut.position = record.objectPosition;
  return photoOut;
}

/** The 'notfound' slot (owner decision 3); when empty, the 404 shows its card alone. */
export function notFoundPhoto(): NotFoundPhoto | null {
  return readSlotPhoto(photoFor('notfound'));
}
