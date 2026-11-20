import type { Metadata } from 'next';
import Link from 'next/link';
import { ClosingBand, PageHero } from '@/components/site/ui';
import { AuthAction } from '@/components/site/product/AuthAction';
import {
  ContentsIndex, FEATURES_DASHBOARD, FEATURES_REGISTER, FeatureGrid, FeaturesHeroCards, PrivacySection, SmallThings, ToolsStrip, TranscriptSection,
} from '@/components/site/product/features';
import { GoldLink, JsonLd } from '@/components/site/product/shared';
import { CLOSE_COPY, FEATURES_COPY } from '@/lib/public/features-overview';
import { breadcrumbJsonLd, productMetadata } from '@/lib/public/features-shared';
import { DEFAULT_SCALE } from '@/lib/public/scales';

export const metadata: Metadata = productMetadata({
  title: FEATURES_COPY.title,
  description: FEATURES_COPY.description,
  path: '/features',
  keywords: [...FEATURES_COPY.keywords],
});

const FEATURES_BREADCRUMB = [
  { name: 'Home', path: '/' },
  { name: 'Features', path: '/features' },
] as const;

/**
 * /features, brand v2 (docs/brand-v2/BUILD_V2.md; content from
 * docs/public-redesign/pages/features.md). The layout provides header, main
 * and footer. Anchors kept for links from home and the contents index:
 * #record, #scanner, #academind, #timetable, #planning, #transcript,
 * #sharing, #privacy.
 */
export default function FeaturesPage() {
  return (
    <div className="ag-site">
      <JsonLd data={breadcrumbJsonLd(FEATURES_BREADCRUMB)} />
      <PageHero
        titleId="features-title"
        title={`${FEATURES_COPY.h1[0]} ${FEATURES_COPY.h1[1]}`}
        sentence={FEATURES_COPY.sentence}
        actions={
          <>
            <AuthAction {...FEATURES_REGISTER} signedIn={FEATURES_DASHBOARD} size="lg" />
            {FEATURES_COPY.heroLinks.map((link) => (
              <Link key={link.href} href={link.href} className="ag-focus rounded text-[1rem] font-medium text-white underline decoration-white/30 underline-offset-[6px] transition hover:decoration-ag-gold">
                {link.label}
              </Link>
            ))}
            <p className="basis-full text-[0.9375rem] text-ag-mist-night">For Nigerian universities, on the {DEFAULT_SCALE.line.replace('Nigerian university ', '')}.</p>
          </>
        }
        aside={<FeaturesHeroCards />}
      />
      <ContentsIndex />
      <FeatureGrid />
      <TranscriptSection />
      <SmallThings />
      <PrivacySection />
      <ToolsStrip />
      <ClosingBand
        title={`${CLOSE_COPY.headline[0]} ${CLOSE_COPY.headline[1]}`}
        actions={
          <>
            <AuthAction {...FEATURES_REGISTER} signedIn={FEATURES_DASHBOARD} variant="night" size="lg" />
            <GoldLink href="/tools">Explore the free tools</GoldLink>
          </>
        }
      />
    </div>
  );
}
