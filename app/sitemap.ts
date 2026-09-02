import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://acadegrade.vercel.app';

  // These are the public pages that should be indexed by search engines
  const routes = [
    '',
    '/about',
    '/calculator',
    '/login',
    '/register',
    '/forgot-password',
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : 0.8,
  }));
}
