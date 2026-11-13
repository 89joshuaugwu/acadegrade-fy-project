import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpenCheck, KeyRound, Mail, ScanLine, ShieldCheck } from 'lucide-react';
import { EditorialHero, PublicPage, SectionIntro } from '@/components/marketing/PublicPage';
import { createPageMetadata } from '@/lib/seo/site';
import { contactHref, getContactEmail } from '@/lib/site/contact';

export const metadata: Metadata = createPageMetadata({
  title: 'Support',
  description: 'Get help with your AcadeGrade account, academic records, result scanning, privacy, and common product questions.',
  path: '/support',
});

const SUPPORT_SUBJECT = 'AcadeGrade support request';

const supportAreas = [
  { icon: KeyRound, title: 'Account access', text: 'Sign-in, verification codes, password recovery, or completing registration.', hint: 'Include the email address on your account. Never send your password or OTP.' },
  { icon: BookOpenCheck, title: 'Results and records', text: 'Semester setup, course entry, calculations, transcript generation, or imported records.', hint: 'Include the affected session, semester, and course code where relevant.' },
  { icon: ScanLine, title: 'Result scanning', text: 'Upload issues, unreadable documents, missing rows, or extraction that needs correction.', hint: 'Describe the file type and issue. Remove unrelated personal information before attaching a document.' },
  { icon: ShieldCheck, title: 'Privacy and safety', text: 'Data access, account deletion, sharing controls, or a security concern.', hint: 'Use “Privacy” or “Security” in the subject so it can be triaged appropriately.' },
] as const;

const inlineLink = 'font-semibold text-[var(--acade-primary)] underline underline-offset-4';

export default async function SupportPage() {
  const email = await getContactEmail();

  return (
    <PublicPage>
      <EditorialHero
        title="Tell us what is getting in your way."
        description="Start with the guidance below. If the issue persists, contact support with enough context for us to investigate without sharing sensitive credentials."
        primary={email ? { href: contactHref(email, SUPPORT_SUBJECT), label: 'Email support' } : { href: '/features', label: 'Explore product guides' }}
        secondary={email ? { href: '/features', label: 'Explore product guides' } : undefined}
        aside={<SupportPromise />}
      />

      <section aria-labelledby="support-topics-title" className="mx-auto max-w-[1200px] px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8 lg:pb-28">
        <SectionIntro id="support-topics-title" title="Help us route your request." description="A clear subject and a few specific details are usually more useful than a long message." />
        <div className="mt-12 grid gap-2 md:grid-cols-2">
          {supportAreas.map(({ icon: Icon, title, text, hint }) => (
            <article key={title} className="flex flex-col rounded-[var(--radius-surface)] bg-[var(--acade-surface)] p-6 sm:p-8">
              <h3 className="flex items-center gap-3 font-[family-name:var(--font-bricolage)] text-2xl font-bold tracking-[-0.025em]">
                <Icon className="size-6 shrink-0 text-[var(--acade-primary)]" aria-hidden="true" />
                {title}
              </h3>
              <p className="mt-3 text-[1.0625rem] leading-7 text-[var(--acade-text-muted)]">{text}</p>
              <p className="mt-6 rounded-[var(--radius-control)] bg-[var(--acade-overlay)] px-4 py-3 text-[0.9375rem] leading-6 text-[var(--acade-text)] md:mt-auto">{hint}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="recovery-title" className="bg-[var(--acade-deep)]">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-16 sm:px-6 lg:grid-cols-12 lg:gap-16 lg:px-8 lg:py-24">
          <h2 id="recovery-title" className="font-[family-name:var(--font-bricolage)] text-[clamp(2rem,3.4vw,2.75rem)] font-bold leading-[1.06] tracking-[-0.04em] lg:col-span-5">Quick recovery checks</h2>
          <dl className="grid gap-7 lg:col-span-7">
            <div><dt className="text-lg font-semibold text-[var(--acade-text)]">Verification code delayed?</dt><dd className="mt-1 text-[1.0625rem] leading-7 text-[var(--acade-text-muted)]">Check spam, confirm the email address, wait briefly, then request one new code.</dd></div>
            <div><dt className="text-lg font-semibold text-[var(--acade-text)]">Calculation looks unfamiliar?</dt><dd className="mt-1 text-[1.0625rem] leading-7 text-[var(--acade-text-muted)]">Confirm the score mode, credit units, and grading scale for every course.</dd></div>
            <div><dt className="text-lg font-semibold text-[var(--acade-text)]">Scanner missed a value?</dt><dd className="mt-1 text-[1.0625rem] leading-7 text-[var(--acade-text-muted)]">Use a clear, upright document and edit the extracted row before saving.</dd></div>
            <div>
              <dt className="text-lg font-semibold text-[var(--acade-text)]">Want your data or to delete your account?</dt>
              <dd className="mt-1 text-[1.0625rem] leading-7 text-[var(--acade-text-muted)]">
                Download your data from Settings → Privacy &amp; AI choices. To delete your account, follow the steps on the{' '}
                <Link href="/account-deletion" className={inlineLink}>account deletion page</Link>. The{' '}
                <Link href="/privacy" className={inlineLink}>privacy notice</Link> explains your other rights.
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section aria-labelledby="still-need-help-title" className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="flex flex-col justify-between gap-7 rounded-[var(--radius-dialog)] bg-[var(--acade-primary)] p-7 text-[var(--acade-on-primary)] sm:p-10 md:flex-row md:items-center lg:p-14">
          <div>
            <h2 id="still-need-help-title" className="font-[family-name:var(--font-bricolage)] text-[clamp(1.75rem,3vw,2.5rem)] font-bold leading-[1.1] tracking-[-0.035em]">Still need help?</h2>
            {email ? (
              <p className="mt-3 max-w-[52ch] text-[1.0625rem] leading-7 opacity-90">Email {email}. We will use your message only to investigate and respond to your request.</p>
            ) : (
              <p className="mt-3 max-w-[52ch] text-[1.0625rem] leading-7 opacity-90">Our support email address will be published on this page. Until then, the guidance above covers the most common problems.</p>
            )}
          </div>
          {email ? (
            <a href={contactHref(email, SUPPORT_SUBJECT)} className="marketing-press group inline-flex min-h-14 shrink-0 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--acade-surface)] px-6 font-semibold text-[var(--acade-text)] hover:bg-[var(--acade-overlay)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acade-on-primary)]"><Mail size={18} aria-hidden="true" /> Contact support <ArrowRight size={17} className="transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" /></a>
          ) : null}
        </div>
      </section>
    </PublicPage>
  );
}

function SupportPromise() {
  return (
    <aside aria-labelledby="safe-support-title" className="rounded-[var(--radius-dialog)] bg-[var(--acade-surface)] p-6 sm:p-8">
      <ShieldCheck className="size-7 text-[var(--acade-success)]" aria-hidden="true" />
      <h2 id="safe-support-title" className="mt-5 font-[family-name:var(--font-bricolage)] text-2xl font-bold tracking-[-0.025em]">Keep credentials private.</h2>
      <p className="mt-3 text-[1.0625rem] leading-7 text-[var(--acade-text-muted)]">AcadeGrade support will never ask you to email your password, one-time verification code, or Firebase token.</p>
      <p className="mt-6 rounded-[var(--radius-control)] bg-[var(--acade-success-dim)] p-4 text-[0.9375rem] font-medium leading-6 text-[var(--acade-success)]">Share the error message, route, time, and steps that produced the issue instead.</p>
    </aside>
  );
}
