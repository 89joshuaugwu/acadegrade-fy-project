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
        '/copy-code',
      ],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
    host: resolveSiteUrl(),
  };
}
