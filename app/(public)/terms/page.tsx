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
  title: 'Terms of use',
  description: 'The rules for using AcadeGrade: who can use it, the under-18 rule, unofficial records, AI output, coins, acceptable use, deletion, changes and governing law.',
  path: '/terms',
});

// The text is edited in Admin > Legal documents. A publish refreshes this page at once;
// otherwise it re-reads at most every 5 minutes.
export const revalidate = 300;

const RELATED = [
  { href: '/privacy', label: 'Privacy notice' },
  { href: '/account-deletion', label: 'Delete your account' },
  { href: '/support', label: 'Support' },
] as const;

export default async function TermsPage() {
  const [email, legal] = await Promise.all([getContactEmail(), getPublishedLegal('terms')]);
  const { sections } = parseLegalMarkup(legal.body);
  const site = resolveSiteUrl();
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: legal.title,
          url: absoluteUrl('/terms'),
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
        documentName="Terms of use"
        related={RELATED}
        printAddress={`${site.replace(/^https?:\/\//, '')}/terms`}
        sections={renderLegalSections(sections, email, { linkClassName: PUBLIC_LEGAL_LINK_CLASS, externalLinksInNewTab: false })}
      />
    </>
  );
}
