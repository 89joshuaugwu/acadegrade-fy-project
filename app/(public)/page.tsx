import type { Metadata } from 'next';
import '@/components/site/site.css';
import { ProofPreviewGate } from '@/components/public/ProofPreviewGate';
import {
  AndroidSection,
  ClosingSection,
  FaqSection,
  FeaturesSection,
  FounderSection,
  Hero,
  ScaleSection,
  StorySection,
  VoicesSection,
} from '@/components/site/home/sections';
import { HOME_DESCRIPTION, HOME_TITLE, homeJsonLd } from '@/lib/public/home';
import { resolvePublicProof, sampleProof } from '@/lib/public/proof';
import { getContactEmail } from '@/lib/site/contact';
import { SITE_NAME, absoluteUrl, resolveSiteUrl, serializeJsonLd } from '@/lib/seo/site';

/** Home, brand v2 "Gold hour" (docs/brand-v2/DESIGN.md). The layout provides header, main and footer. */

const canonical = absoluteUrl('/');

export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  alternates: { canonical },
  openGraph: {
    type: 'website',
    locale: 'en_NG',
    siteName: SITE_NAME,
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: canonical,
  },
  twitter: { card: 'summary_large_image', title: HOME_TITLE, description: HOME_DESCRIPTION },
};

export default async function HomePage() {
  const [contactEmail, proof] = await Promise.all([getContactEmail().catch(() => null), resolvePublicProof()]);
  const samples = sampleProof().testimonials;

  return (
    <div className="ag-site">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(homeJsonLd(resolveSiteUrl(), contactEmail)) }} />
      <Hero />
      <ScaleSection />
      <FeaturesSection />
      <StorySection />
      <AndroidSection />
      {proof.testimonials ? (
        <VoicesSection testimonials={proof.testimonials} />
      ) : samples ? (
        <ProofPreviewGate>
          <VoicesSection testimonials={samples} />
        </ProofPreviewGate>
      ) : null}
      <FounderSection />
      <FaqSection />
      <ClosingSection />
    </div>
  );
}
