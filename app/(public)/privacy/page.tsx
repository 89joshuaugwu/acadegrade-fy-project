import type { Metadata } from 'next';
import { JsonLd } from '@/components/site/company/JsonLd';
import { LegalPage, PUBLIC_LEGAL_LINK_CLASS, legalReadingMinutes } from '@/components/marketing/LegalPage';
import { parseLegalMarkup } from '@/lib/legal/markup';
import { renderLegalSections } from '@/lib/legal/render';
import { getPublishedLegal } from '@/lib/legal/server';
import { formatLegalDate } from '@/lib/legal/versions';
import { absoluteUrl, createPageMetadata, resolveSiteUrl } from '@/lib/seo/site';
import { getContactEmail } from '@/lib/site/contact';

export const metadata: Metadata = createPageMetadata({
  title: 'Privacy notice',
  description: 'What AcadeGrade collects, why, the lawful basis for each use, AI providers, international transfers, retention, ads and cookies, under-18 rules and your rights.',
  path: '/privacy',
});

// The text is edited in Admin > Legal documents. A publish refreshes this page at once;
// otherwise it re-reads at most every 5 minutes.
export const revalidate = 300;

const RELATED = [
  { href: '/terms', label: 'Terms of use' },
  { href: '/account-deletion', label: 'Delete your account' },
  { href: '/support', label: 'Support' },
] as const;

export default async function PrivacyPage() {
  const [email, legal] = await Promise.all([getContactEmail(), getPublishedLegal('privacy')]);
  const { sections } = parseLegalMarkup(legal.body);
  const site = resolveSiteUrl();
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: legal.title,
          url: absoluteUrl('/privacy'),
          dateModified: legal.effectiveDate,
          inLanguage: 'en-NG',
          isPartOf: { '@type': 'WebSite', name: 'AcadeGrade', url: site },
          publisher: { '@id': `${site}/#organization` },
        }}
      />
      <LegalPage
        title={legal.title}
        summary={legal.summary}
        version={legal.version}
        effectiveDate={formatLegalDate(legal.effectiveDate)}
        changeNote={legal.changeNote ?? ''}
        readingMinutes={legalReadingMinutes(legal.body)}
        documentName="Privacy notice"
        related={RELATED}
        cookieChoices
        printAddress={`${site.replace(/^https?:\/\//, '')}/privacy`}
        sections={renderLegalSections(sections, email, { linkClassName: PUBLIC_LEGAL_LINK_CLASS, externalLinksInNewTab: false })}
      />
    </>
  );
}
