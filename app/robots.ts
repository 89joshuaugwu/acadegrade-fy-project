import { MetadataRoute } from 'next';
import { absoluteUrl, resolveSiteUrl } from '@/lib/seo/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/admin/',
        '/dashboard',
        '/insights',
        '/notifications',
        '/results',
        '/settings',
        '/transcript',
        '/login',
        '/register',
        '/forgot-password',
        // Not '/c/' or '/share/': those pages say noindex in their HTML, which crawlers
        // only see if they may fetch them, and X shows no card for a blocked URL.
        '/maintenance',
        '/offline',
      ],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
    host: resolveSiteUrl(),
  };
}
