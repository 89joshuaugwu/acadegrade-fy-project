import { serializeJsonLd } from '@/lib/seo/site';

/** Structured data for one page, escaped for a <script> element. */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
