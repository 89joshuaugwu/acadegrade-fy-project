import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/dashboard', '/insights', '/transcript', '/settings'],
    },
    sitemap: 'https://acadegrade.com/sitemap.xml',
  };
}
