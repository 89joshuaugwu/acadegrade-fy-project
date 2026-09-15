import type { Metadata } from 'next';

export const SITE_NAME = 'AcadeGrade';
export const DEFAULT_SITE_URL = 'https://acadegrade.vercel.app';
export const SITE_DESCRIPTION =
  'Track university results, calculate CGPA and Performance Index, scan result slips, and turn your academic record into practical insights.';

type SiteEnvironment = {
  [key: string]: string | undefined;
  NEXT_PUBLIC_SITE_URL?: string;
  SITE_URL?: string;
  VERCEL_PROJECT_PRODUCTION_URL?: string;
};

function normalizeOrigin(candidate: string): string {
  const withProtocol = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
  const url = new URL(withProtocol);
  return url.origin;
}

export function resolveSiteUrl(environment: SiteEnvironment = process.env as SiteEnvironment): string {
  const candidate =
    environment.NEXT_PUBLIC_SITE_URL?.trim() ||
    environment.SITE_URL?.trim() ||
    environment.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    DEFAULT_SITE_URL;

  try {
    return normalizeOrigin(candidate);
  } catch {
    return DEFAULT_SITE_URL;
  }
}

export function absoluteUrl(path = '/', environment?: SiteEnvironment): string {
  const origin = resolveSiteUrl(environment);
  if (!path || path === '/') return origin;
  return new URL(path.replace(/^\/+/, ''), `${origin}/`).toString().replace(/\/$/, '');
}

interface PageMetadataOptions {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
}

export function createPageMetadata({
  title,
  description,
  path,
  keywords,
}: PageMetadataOptions): Metadata {
  const canonical = absoluteUrl(path);

  return {
    title,
    description,
    keywords,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      locale: 'en_NG',
      siteName: SITE_NAME,
      title,
      description,
      url: canonical,
      images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: `${SITE_NAME} — ${title}` }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/opengraph-image'],
    },
  };
}

export const NO_INDEX_METADATA: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export const PUBLIC_SITEMAP_ROUTES = [
  '/',
  '/features',
  '/features/result-scanner',
  '/features/ai-insights',
  '/calculator',
  '/about',
  '/support',
  '/privacy',
  '/terms',
] as const;

export function getSiteJsonLd() {
  const url = resolveSiteUrl();

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': `${url}/#organization`,
      name: SITE_NAME,
      url,
      logo: absoluteUrl('/android-chrome-512x512.png'),
      email: 'support@acadegrade.com',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      '@id': `${url}/#web-app`,
      name: SITE_NAME,
      url,
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web, Android',
      description: SITE_DESCRIPTION,
      isAccessibleForFree: true,
      publisher: { '@id': `${url}/#organization` },
      featureList: [
        'CGPA and Performance Index tracking',
        'Result slip scanning with review before save',
        'Academic trends and AI-assisted insights',
        'Shareable academic transcripts',
      ],
    },
  ];
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
