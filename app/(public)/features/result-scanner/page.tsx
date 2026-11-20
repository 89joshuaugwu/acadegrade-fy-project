import type { Metadata } from 'next';
import { readHomeMedia } from '@/components/public/home/home-media';
import { ClosingBand, PageHero, TextLinkV2, Trail } from '@/components/site/ui';
import { AuthAction } from '@/components/site/product/AuthAction';
import { CheckSection, HowAScanGoes, ScannerHeroPicture, SlipDataSection, WaysIn } from '@/components/site/product/scanner';
import { FeatureFoot, GoldLink, JsonLd } from '@/components/site/product/shared';
import { SCANNER_COPY } from '@/lib/public/features-scanner';
import { breadcrumbJsonLd, productMetadata } from '@/lib/public/features-shared';
import { readPublicUsage } from '@/lib/public/usage-public';

export const revalidate = 300;

export const metadata: Metadata = productMetadata({
  title: SCANNER_COPY.title,
  description: SCANNER_COPY.description,
  path: '/features/result-scanner',
  keywords: [...SCANNER_COPY.keywords],
});

const REGISTER = { href: '/register', label: 'Create your free record' };
const RESULTS = { href: '/results', label: 'Open your results' };

/**
 * /features/result-scanner, brand v2 (docs/brand-v2/BUILD_V2.md; content from
 * docs/public-redesign/pages/features-result-scanner.md). Live allowances
 * come from config/usage; the scan video renders only when
 * config/about.scanVideoUrl is set.
 */
export default async function ResultScannerPage() {
  const [usage, media] = await Promise.all([readPublicUsage(), readHomeMedia()]);
  return (
    <div className="ag-site">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Features', path: '/features' },
          { name: 'Result scanner', path: '/features/result-scanner' },
        ])}
      />
      <PageHero
        titleId="scanner-title"
        trail={<Trail items={[{ label: 'Features', href: '/features' }, { label: 'Result scanner' }]} />}
        title={`${SCANNER_COPY.h1[0]} ${SCANNER_COPY.h1[1]}`}
        sentence={SCANNER_COPY.sentence}
        actions={
          <>
            <AuthAction {...REGISTER} signedIn={RESULTS} size="lg" />
            <TextLinkV2 href="/features" onDark>
              See all features
            </TextLinkV2>
          </>
        }
        aside={<ScannerHeroPicture />}
      />
      <HowAScanGoes videoUrl={media.scanVideoUrl} />
      <CheckSection />
      <WaysIn usage={usage} />
      <SlipDataSection usage={usage} />
      <FeatureFoot current="/features/result-scanner" />
      <ClosingBand
        title={SCANNER_COPY.close}
        actions={
          <>
            <AuthAction {...REGISTER} signedIn={RESULTS} variant="night" size="lg" />
            <GoldLink href="/calculator">Try the calculator first</GoldLink>
          </>
        }
      />
    </div>
  );
}
