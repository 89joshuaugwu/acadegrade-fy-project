import type { Metadata } from 'next';
import { envContactEmail, normalizeContactEmail } from '@/lib/site/contact-email';

export const SITE_NAME = 'AcadeGrade';
export const DEFAULT_SITE_URL = 'https://acadegrade.vercel.app';
export const SITE_DESCRIPTION =
  'Work out your GPA, CGPA and degree class from your result slip. Scan results, plan your next semester and share your transcript safely. Free on web and Android.';

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
  // The layout's "%s | AcadeGrade" template only reaches <title>, not og:title.
  const previewTitle = `${title} | ${SITE_NAME}`;

  return {
    title,
    description,
    keywords,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      locale: 'en_NG',
      siteName: SITE_NAME,
      title: previewTitle,
      description,
      url: canonical,
    },
    // No images here: each route's opengraph-image.tsx (or the nearest parent's)
    // supplies og:image with its width, height, alt and a cache-busting URL, and
    // X falls back to og:image when there is no twitter:image.
    twitter: {
      card: 'summary_large_image',
      title: previewTitle,
      description,
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
  '/features/timetable',
  '/app',
  '/app/download/ios',
  '/calculator',
  '/tools',
  '/tools/degree-class-checker',
  '/tools/required-gpa',
  '/tools/carry-over-impact',
  '/tools/weighted-average',
  '/about',
  '/support',
  '/privacy',
  '/terms',
  '/account-deletion',
] as const;

/**
 * Site JSON-LD. Pass `await getContactEmail()` from a server component to use
 * the admin-managed address; without it the env fallback is used, and the
 * `email` property is omitted when no address is configured.
 */
export function getSiteJsonLd(contactEmail: string | null = envContactEmail()) {
  const url = resolveSiteUrl();
  const email = normalizeContactEmail(contactEmail);

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': `${url}/#organization`,
      name: SITE_NAME,
      url,
      logo: absoluteUrl('/android-chrome-512x512.png'),
      ...(email ? { email } : {}),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${url}/#website`,
      name: SITE_NAME,
      url,
      inLanguage: 'en-NG',
      publisher: { '@id': `${url}/#organization` },
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
        'GPA, CGPA and Performance Index from your result slip',
        'Result slip scanning with review before save',
        'AcadeMind written analysis, forecast and what-if guidance',
        'Timetable with reminders',
        'Shareable transcripts with expiry and PIN',
      ],
    },
  ];
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
