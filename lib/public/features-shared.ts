import type { Metadata } from 'next';
import type { PublicUsage } from './usage-public';
import type { UsageFeatureId } from '@/lib/usage/policy';
import { absoluteUrl, createPageMetadata } from '@/lib/seo/site';

/**
 * Shared data and helpers for the product pages (/features, the three
 * feature pages, /app and /app/download/ios). Copy lives in the page's own
 * features-*.ts file; this file holds what more than one page needs.
 */

/** Who can use AcadeMind and the result scanner. The contents sheet, the FAQ answers and the comparison table all read this. */
export const ADULT_FEATURE_VALUE = '18 and over';

/** Feature pages in the order the "Next feature" links follow. */
export const FEATURE_PAGES = [
  { href: '/features/result-scanner', name: 'Result scanner' },
  { href: '/features/ai-insights', name: 'AcadeMind' },
  { href: '/features/timetable', name: 'Timetable' },
] as const;

export type FeaturePageHref = (typeof FEATURE_PAGES)[number]['href'];

export interface FeatureFootLink {
  href: string;
  label: string;
}

const OTHER_ALWAYS: readonly FeatureFootLink[] = [
  { href: '/features#transcript', label: 'Transcripts' },
  { href: '/tools', label: 'Free tools' },
  { href: '/app', label: 'Android app' },
];

/** "Next feature" and "Other features" for a feature page (scanner → AcadeMind → timetable → scanner). */
export function featureFoot(current: FeaturePageHref): { next: FeatureFootLink; others: FeatureFootLink[] } {
  const index = FEATURE_PAGES.findIndex((page) => page.href === current);
  const next = FEATURE_PAGES[(index + 1) % FEATURE_PAGES.length];
  const after = FEATURE_PAGES[(index + 2) % FEATURE_PAGES.length];
  return {
    next: { href: next.href, label: next.name },
    others: [{ href: after.href, label: after.name }, ...OTHER_ALWAYS],
  };
}

export interface Crumb {
  name: string;
  path: string;
}

/** BreadcrumbList JSON-LD with absolute URLs. */
export function breadcrumbJsonLd(crumbs: readonly Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

/**
 * Page metadata with an absolute canonical. The route's own
 * opengraph-image.tsx supplies the Open Graph picture (file metadata wins
 * over the site default), and X falls back to og:image, so the default
 * image references are dropped here.
 */
export function productMetadata(options: { title: string; description: string; path: string; keywords?: string[] }): Metadata {
  const base = createPageMetadata(options);
  const { images: _ogImages, ...openGraph } = (base.openGraph ?? {}) as Record<string, unknown>;
  const { images: _twitterImages, ...twitter } = (base.twitter ?? {}) as Record<string, unknown>;
  void _ogImages;
  void _twitterImages;
  return { ...base, openGraph: openGraph as Metadata['openGraph'], twitter: twitter as Metadata['twitter'] };
}

/* ---------------------------------------------------------- live allowances */

/**
 * "{n} a day" style wording for a free daily allowance, from config/usage.
 * 0 means the admin paused the feature; a failed read gives numberless wording.
 */
export function dailyAllowance(
  usage: PublicUsage | null,
  feature: UsageFeatureId,
  wording: { count: (n: number) => string; paused?: string; unknown: string }
): string {
  if (!usage) return wording.unknown;
  const limit = usage.dailyLimits[feature];
  if (!Number.isFinite(limit)) return wording.unknown;
  if (limit <= 0) return wording.paused ?? 'Not available right now';
  return wording.count(limit);
}

/** True only when coins are switched on (and, with a feature, that feature's coin setting too). */
export function coinsOn(usage: PublicUsage | null, feature?: UsageFeatureId): boolean {
  if (!usage || !usage.coins.enabled) return false;
  if (!feature) return true;
  return usage.coins.features[feature].enabled;
}

/** "1 coin", "3 coins". */
export function coinWord(count: number): string {
  return `${count} ${count === 1 ? 'coin' : 'coins'}`;
}
