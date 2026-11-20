import type { Metadata } from 'next';
import { PageHero, TextLinkV2, Trail } from '@/components/site/ui';
import { AuthAwareButton } from '@/components/site/company/AuthAwareButton';
import { JsonLd } from '@/components/site/company/JsonLd';
import {
  AboutClose,
  AboutFacts,
  CommitmentsSection,
  FounderSection,
  MissionSection,
  NotSection,
  WorkingSection,
  WriteSection,
} from '@/components/site/company/about';
import { getAboutContent } from '@/lib/about/server';
import { ABOUT_HEADLINE_DISPLAY_MAX, FOUNDER_LINKS, OPERATOR_NAME, aboutWorkingSheet, coverLists, posterLines } from '@/lib/public/about';
import { photoFor } from '@/lib/public/page-photos';
import { readPublicUsage } from '@/lib/public/usage-public';
import { absoluteUrl, createPageMetadata, resolveSiteUrl } from '@/lib/seo/site';
import { getContactEmail } from '@/lib/site/contact';

export const metadata: Metadata = createPageMetadata({
  title: 'About',
  description: 'Who runs AcadeGrade, how your GPA, CGPA, PI and degree class are worked out, what happens to your data, and how to reach us. Made in Enugu State, Nigeria.',
  path: '/about',
});

// The four text fields are edited in Admin > Settings > Public site (config/about),
// read on the server through getAboutContent() (cached, tag `site-about`).
export const revalidate = 300;

/** About, brand v2 "Gold hour" (docs/brand-v2/DESIGN.md). The layout provides header, main and footer. */
export default async function AboutPage() {
  const [about, email, usage] = await Promise.all([getAboutContent(), getContactEmail(), readPublicUsage()]);
  const site = resolveSiteUrl();
  const sheet = aboutWorkingSheet();
  const longHeadline = about.headline.length > ABOUT_HEADLINE_DISPLAY_MAX;

  return (
    <div className="ag-site">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'AboutPage',
          name: 'About AcadeGrade',
          description: about.platformDescription,
          url: absoluteUrl('/about'),
          inLanguage: 'en-NG',
          about: { '@id': `${site}/#organization` },
          mainEntity: {
            '@type': 'Organization',
            '@id': `${site}/#organization`,
            name: 'AcadeGrade',
            url: site,
            founder: { '@type': 'Person', name: OPERATOR_NAME, sameAs: FOUNDER_LINKS.map((link) => link.href) },
            address: { '@type': 'PostalAddress', addressRegion: 'Enugu', addressCountry: 'NG' },
          },
        }}
      />

      <PageHero
        titleId="about-title"
        trail={<Trail items={[{ label: 'Home', href: '/' }, { label: 'About' }]} />}
        title={
          longHeadline ? (
            <span data-headline="long" className="block text-[2.125rem] leading-[1.06] sm:text-[2.75rem] lg:text-[3.125rem]">
              {about.headline}
            </span>
          ) : (
            <span data-headline="display">{about.headline}</span>
          )
        }
        sentence={about.platformDescription}
        actions={
          <>
            <AuthAwareButton href="/register" label="Start your free record" />
            <TextLinkV2 href="/calculator" onDark className="text-[1rem]">
              Try the calculator first
            </TextLinkV2>
          </>
        }
        aside={<AboutFacts />}
      />
      <MissionSection mission={about.mission} photo={photoFor('about.intro')} lists={coverLists()} />
      <FounderSection />
      <WorkingSection groups={sheet.groups} />
      <CommitmentsSection trustStatement={about.trustStatement} />
      <NotSection lines={posterLines({ coinsEnabled: usage?.coins.enabled === true })} />
      <WriteSection email={email} />
      <AboutClose />
    </div>
  );
}
