import type { Metadata } from 'next';
import { absoluteUrl, createPageMetadata, resolveSiteUrl, serializeJsonLd } from '@/lib/seo/site';

/**
 * Metadata and JSON-LD for the calculator, the tools hub and the four tools
 * (04-site-map-navigation-seo.md §6): canonical without parameters,
 * WebApplication + FAQPage + BreadcrumbList. Each route also has its own
 * opengraph-image.tsx, which takes priority over the default OG image.
 */

export function toolsMetadata(options: { title: string; description: string; path: string; keywords?: string[] }): Metadata {
  const base = createPageMetadata(options);
  const image = `${options.path}/opengraph-image`;
  return {
    ...base,
    twitter: { ...base.twitter, images: [image] },
  };
}

export function webApplicationJsonLd(options: { name: string; path: string; description: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: options.name,
    url: absoluteUrl(options.path),
    description: options.description,
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: 0, priceCurrency: 'NGN' },
    inLanguage: 'en-NG',
    publisher: { '@id': `${resolveSiteUrl()}/#organization` },
  };
}

export function breadcrumbJsonLd(items: readonly { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** One <script type="application/ld+json"> per object. */
export function JsonLd({ data }: { data: readonly unknown[] }) {
  return (
    <>
      {data.map((entry, index) => (
        <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(entry) }} />
      ))}
    </>
  );
}
