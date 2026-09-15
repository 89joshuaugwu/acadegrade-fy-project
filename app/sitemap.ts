import { MetadataRoute } from 'next';
import { absoluteUrl, PUBLIC_SITEMAP_ROUTES } from '@/lib/seo/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_SITEMAP_ROUTES.map((route) => ({
    url: absoluteUrl(route),
    lastModified: new Date(),
    changeFrequency: route === '/' ? 'weekly' : 'monthly',
    priority: route === '/' ? 1 : route.startsWith('/features') ? 0.9 : 0.7,
  }));
}
