import type { Metadata } from 'next';
import { LegalPage } from '@/components/marketing/LegalPage';
import { parseLegalMarkup } from '@/lib/legal/markup';
import { renderLegalSections } from '@/lib/legal/render';
import { getPublishedLegal } from '@/lib/legal/server';
import { formatLegalDate } from '@/lib/legal/versions';
import { createPageMetadata } from '@/lib/seo/site';
import { getContactEmail } from '@/lib/site/contact';

export const metadata: Metadata = createPageMetadata({
  title: 'Terms of use',
  description: 'The rules for using AcadeGrade: eligibility and the under-18 rule, unofficial records, AI output, coins, acceptable use, account deletion, changes and governing law.',
  path: '/terms',
});

// The text is edited in Admin > Legal documents. A publish refreshes this page at once;
// otherwise it re-reads at most every 5 minutes.
export const revalidate = 300;

export default async function TermsPage() {
  const [email, legal] = await Promise.all([getContactEmail(), getPublishedLegal('terms')]);
  const { sections } = parseLegalMarkup(legal.body);
  return (
    <LegalPage
      title={legal.title}
      summary={legal.summary}
      version={legal.version}
      effectiveDate={formatLegalDate(legal.effectiveDate)}
      sections={renderLegalSections(sections, email)}
    />
  );
}
