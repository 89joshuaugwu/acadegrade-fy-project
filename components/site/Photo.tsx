import type { PagePhoto } from '@/lib/public/page-photos';
import { reveal } from '@/components/motion/Reveal';

interface PhotoProps {
  photo: PagePhoto;
  /** The real rendered width at each breakpoint, so phones pick a small file. */
  sizes: string;
  className?: string;
  imgClassName?: string;
  eager?: boolean;
}

/** One of the owner's colour images: AVIF, then WebP, with the slot's focal point. */
export function Photo({ photo, sizes, className, imgClassName, eager }: PhotoProps) {
  const priority = eager ?? photo.priority;
  return (
    <picture {...(priority ? {} : reveal('photo'))} className={className}>
      {photo.avifSrcSet ? <source type="image/avif" srcSet={photo.avifSrcSet} sizes={sizes} /> : null}
      {photo.webpSrcSet ? <source type="image/webp" srcSet={photo.webpSrcSet} sizes={sizes} /> : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.src}
        alt={photo.alt}
        width={photo.width}
        height={photo.height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : undefined}
        sizes={sizes}
        className={imgClassName}
        style={{ objectPosition: photo.objectPosition }}
      />
    </picture>
  );
}
