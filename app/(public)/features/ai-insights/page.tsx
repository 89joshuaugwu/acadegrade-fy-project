import type { Metadata } from 'next';
import { faqPageJsonLd } from '@/components/public/Accordion';
import { ClosingBand, PageHero, TextLinkV2, Trail } from '@/components/site/ui';
import { AuthAction } from '@/components/site/product/AuthAction';
import { DataInPlainWords, FreeEveryDay, GuidanceSection, MindChat, WhatItTellsYou } from '@/components/site/product/academind';
import { FeatureFoot, GoldLink, JsonLd } from '@/components/site/product/shared';
import { ACADEMIND_COPY, CLOSE, DATA_QA } from '@/lib/public/features-academind';
import { breadcrumbJsonLd, productMetadata } from '@/lib/public/features-shared';
import { readPublicUsage } from '@/lib/public/usage-public';

export const revalidate = 300;

/** The URL stays /features/ai-insights (existing links and search results); the page is AcadeMind. */
export const metadata: Metadata = productMetadata({
  title: ACADEMIND_COPY.title,
  description: ACADEMIND_COPY.description,
  path: '/features/ai-insights',
  keywords: [...ACADEMIND_COPY.keywords],
});

const REGISTER = { href: '/register', label: 'Create your free record' };
const OPEN = { href: '/insights', label: 'Open AcadeMind' };

/** /features/ai-insights, brand v2 (content: docs/public-redesign/pages/features-academind.md). Live allowances come from config/usage. */
export default async function AcadeMindPage() {
  const usage = await readPublicUsage();
  return (
    <div className="ag-site">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Features', path: '/features' },
            { name: 'AcadeMind', path: '/features/ai-insights' },
          ]),
          faqPageJsonLd(DATA_QA),
        ]}
      />
      <PageHero
        titleId="academind-title"
        trail={<Trail items={[{ label: 'Features', href: '/features' }, { label: 'AcadeMind' }]} />}
        title={`${ACADEMIND_COPY.h1[0]} ${ACADEMIND_COPY.h1[1]}`}
        sentence={ACADEMIND_COPY.sentence}
        actions={
          <>
            <AuthAction {...REGISTER} signedIn={OPEN} size="lg" />
            <TextLinkV2 href="#free-uses" onDark>
              Free uses each day
            </TextLinkV2>
            <TextLinkV2 href="#data" onDark>
              How your data is handled
            </TextLinkV2>
          </>
        }
        aside={<MindChat />}
      />
      <WhatItTellsYou usage={usage} />
      <GuidanceSection />
      <FreeEveryDay usage={usage} />
      <DataInPlainWords />
      <FeatureFoot current="/features/ai-insights" />
      <ClosingBand
        title={CLOSE.heading}
        actions={
          <>
            <AuthAction {...REGISTER} signedIn={OPEN} variant="night" size="lg" />
            <GoldLink href="/calculator">Try the calculator first</GoldLink>
          </>
        }
      />
    </div>
  );
}
