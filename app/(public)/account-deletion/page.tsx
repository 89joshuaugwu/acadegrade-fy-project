import type { Metadata } from 'next';
import Link from 'next/link';
import { Globe, Smartphone, Trash2 } from 'lucide-react';
import { LegalContact, legalLinkClass } from '@/components/marketing/LegalContact';
import { Placeholder } from '@/components/marketing/LegalPage';
import { EditorialHero, PublicPage } from '@/components/marketing/PublicPage';
import { createPageMetadata } from '@/lib/seo/site';
import { contactHref, getContactEmail } from '@/lib/site/contact';

export const metadata: Metadata = createPageMetadata({
  title: 'Delete your AcadeGrade account',
  description: 'How to delete your AcadeGrade account in the Android app or on the web, what is deleted, what may be kept for a short time, and how to ask for deletion if you cannot sign in.',
  path: '/account-deletion',
});

const DELETION_SUBJECT = 'Account deletion request';

const deleted = [
  'Your profile: name, email, matriculation number, institution, programme and profile photo',
  'All semesters, courses, scores and grades',
  'Saved AI analysis, forecasts and notifications',
  'Share links and course share codes you created',
  'Your coin balance and coin history',
  'Verification codes, sign-up records and rewarded-ad records linked to your account',
  'Request and security records linked to your account',
  'Your sign-in account itself',
] as const;

const sectionHeading = 'font-[family-name:var(--font-bricolage)] text-[clamp(1.75rem,3vw,2.5rem)] font-bold leading-[1.08] tracking-[-0.035em]';

export default async function AccountDeletionPage() {
  const email = await getContactEmail();

  return (
    <PublicPage>
      <EditorialHero
        title="Delete your AcadeGrade account"
        description="You can delete your AcadeGrade account and its records at any time, in the Android app or on the web. Deletion is permanent and cannot be undone."
        primary={{ href: '/settings', label: 'Go to Settings' }}
        secondary={{ href: contactHref(email, DELETION_SUBJECT), label: email ? 'Email a deletion request' : 'Get help from support' }}
      />

      <section aria-labelledby="how-title" className="mx-auto max-w-[1200px] px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8 lg:pb-24">
        <h2 id="how-title" className={sectionHeading}>How to delete your account</h2>
        <div className="mt-10 grid gap-2 md:grid-cols-2">
          <article aria-labelledby="android-title" className="rounded-[var(--radius-surface)] bg-[var(--acade-surface)] p-6 sm:p-8">
            <h3 id="android-title" className="flex items-center gap-3 font-[family-name:var(--font-bricolage)] text-2xl font-bold tracking-[-0.025em]">
              <Smartphone className="size-6 shrink-0 text-[var(--acade-primary)]" aria-hidden="true" />
              In the Android app
            </h3>
            <ol className="mt-4 list-decimal space-y-2 pl-6 text-[1.0625rem] leading-7">
              <li>Open AcadeGrade and sign in.</li>
              <li>Go to the Profile tab.</li>
              <li>Tap <strong>Delete Account</strong> and confirm.</li>
            </ol>
          </article>
          <article aria-labelledby="web-title" className="rounded-[var(--radius-surface)] bg-[var(--acade-surface)] p-6 sm:p-8">
            <h3 id="web-title" className="flex items-center gap-3 font-[family-name:var(--font-bricolage)] text-2xl font-bold tracking-[-0.025em]">
              <Globe className="size-6 shrink-0 text-[var(--acade-primary)]" aria-hidden="true" />
              On the web
            </h3>
            <ol className="mt-4 list-decimal space-y-2 pl-6 text-[1.0625rem] leading-7">
              <li><Link className={legalLinkClass} href="/login">Sign in</Link> to AcadeGrade.</li>
              <li>Open <strong>Settings</strong>.</li>
              <li>Under Danger Zone, choose <strong>Delete</strong>, type the confirmation and confirm with your password if asked.</li>
            </ol>
          </article>
        </div>
        <p className="mt-6 max-w-[68ch] text-[1.0625rem] leading-8 text-[var(--acade-text-muted)]">
          Want a copy first? Use <strong className="text-[var(--acade-text)]">Download my data</strong> in Settings → Privacy &amp; AI choices before you delete.
        </p>
      </section>

      <section aria-labelledby="what-title" className="bg-[var(--acade-deep)]">
        <div className="mx-auto grid max-w-[1200px] gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-24">
          <div>
            <h2 id="what-title" className={sectionHeading}>What is deleted</h2>
            <ul className="mt-6 space-y-3 text-[1.0625rem] leading-7">
              {deleted.map((item) => (
                <li key={item} className="flex gap-3">
                  <Trash2 className="mt-1 size-5 shrink-0 text-[var(--acade-danger)]" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 id="kept-title" className={sectionHeading}>What may be kept for a while, and why</h2>
            <ul className="mt-6 list-disc space-y-3 pl-6 text-[1.0625rem] leading-7">
              <li>A record that a deletion happened, without your user ID, so we can show the request was completed.</li>
              <li>Copies in backups, for <Placeholder>RETENTION PERIOD</Placeholder>, until they are overwritten.</li>
              <li>Request logs held by our hosting provider and by AI providers you used (some keep abuse-monitoring logs for up to 55 days), under their own retention rules.</li>
              <li>Your profile photo on our image service, where automatic removal is not available, for <Placeholder>RETENTION PERIOD</Placeholder>.</li>
              <li>Emails and push notifications that were already delivered to you.</li>
              <li>Information we must keep by law or to deal with fraud or a dispute, only for as long as needed.</li>
            </ul>
            <p className="mt-6 text-[1.0625rem] leading-7 text-[var(--acade-text-muted)]">Anyone who already opened or saved a share link may still have what they saw. The link itself stops working.</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="cannot-sign-in-title" className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="max-w-[68ch]">
          <h2 id="cannot-sign-in-title" className={sectionHeading}>Can&apos;t sign in?</h2>
          <p className="mt-5 text-[1.0625rem] leading-8">
            First try <Link className={legalLinkClass} href="/forgot-password">resetting your password</Link>. If you still can&apos;t get in, ask us to delete your account: contact <LegalContact email={email} subject={DELETION_SUBJECT} /> with the subject “Account deletion request” and the email address on your account.
          </p>
          <p className="mt-4 text-[1.0625rem] leading-8 text-[var(--acade-text-muted)]">
            We will confirm the request comes from the account holder before deleting anything, and complete it within <Placeholder>RESPONSE TIME — e.g., 21 days</Placeholder>. Never send us your password or a verification code.
          </p>
          <p className="mt-4 text-[1.0625rem] leading-8 text-[var(--acade-text-muted)]">
            More about your data and rights is in the <Link className={legalLinkClass} href="/privacy">Privacy notice</Link>.
          </p>
        </div>
      </section>
    </PublicPage>
  );
}
