import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpenCheck, KeyRound, Mail, ScanLine, ShieldCheck } from 'lucide-react';
import { EditorialHero, PublicPage, SectionIntro } from '@/components/marketing/PublicPage';
import { createPageMetadata } from '@/lib/seo/site';

export const metadata: Metadata = createPageMetadata({
  title: 'Support',
  description: 'Get help with your AcadeGrade account, academic records, result scanning, privacy, and common product questions.',
  path: '/support',
});

const supportAreas = [
  { icon: KeyRound, title: 'Account access', text: 'Sign-in, verification codes, password recovery, or completing registration.', hint: 'Include the email address on your account. Never send your password or OTP.' },
  { icon: BookOpenCheck, title: 'Results and records', text: 'Semester setup, course entry, calculations, transcript generation, or imported records.', hint: 'Include the affected session, semester, and course code where relevant.' },
  { icon: ScanLine, title: 'Result scanning', text: 'Upload issues, unreadable documents, missing rows, or extraction that needs correction.', hint: 'Describe the file type and issue. Remove unrelated personal information before attaching a document.' },
  { icon: ShieldCheck, title: 'Privacy and safety', text: 'Data access, account deletion, sharing controls, or a security concern.', hint: 'Use “Privacy” or “Security” in the subject so it can be triaged appropriately.' },
] as const;

export default function SupportPage() {
  return (
    <PublicPage>
      <EditorialHero
        eyebrow="AcadeGrade support"
        title="Tell us what is getting in your way."
        description="Start with the guidance below. If the issue persists, contact support with enough context for us to investigate without sharing sensitive credentials."
        primary={{ href: 'mailto:support@acadegrade.com?subject=AcadeGrade%20support%20request', label: 'Email support' }}
        secondary={{ href: '/features', label: 'Explore product guides' }}
        aside={<SupportPromise />}
      />

      <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <SectionIntro eyebrow="Choose a topic" title="Help us route your request." description="A clear subject and a few specific details are usually more useful than a long message." />
        <div className="mt-12 grid gap-px overflow-hidden rounded-[var(--radius-dialog)] border border-[var(--acade-border)] bg-[var(--acade-border)] md:grid-cols-2">
          {supportAreas.map(({ icon: Icon, title, text, hint }) => (
            <article key={title} className="bg-[var(--acade-surface)] p-6 sm:p-8">
              <Icon className="size-6 text-[var(--acade-primary)]" aria-hidden="true" />
              <h2 className="mt-7 font-[family-name:var(--font-bricolage)] text-2xl font-bold">{title}</h2>
              <p className="mt-3 leading-7 text-[var(--acade-text-muted)]">{text}</p>
              <p className="mt-6 border-t border-[var(--acade-border-subtle)] pt-5 text-sm leading-6 text-[var(--acade-text-faint)]">{hint}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-[var(--acade-border-subtle)] bg-[var(--acade-deep)]">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:px-8 lg:py-20">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.17em] text-[var(--acade-primary)]">Before you contact us</p>
            <h2 className="mt-4 font-[family-name:var(--font-bricolage)] text-3xl font-bold tracking-[-0.035em]">Quick recovery checks</h2>
          </div>
          <ul className="divide-y divide-[var(--acade-border-subtle)] border-y border-[var(--acade-border-subtle)]">
            <li className="py-5"><strong className="block text-[var(--acade-text)]">Verification code delayed?</strong><span className="mt-1 block text-sm leading-6 text-[var(--acade-text-muted)]">Check spam, confirm the email address, wait briefly, then request one new code.</span></li>
            <li className="py-5"><strong className="block text-[var(--acade-text)]">Calculation looks unfamiliar?</strong><span className="mt-1 block text-sm leading-6 text-[var(--acade-text-muted)]">Confirm the score mode, credit units, and grading scale for every course.</span></li>
            <li className="py-5"><strong className="block text-[var(--acade-text)]">Scanner missed a value?</strong><span className="mt-1 block text-sm leading-6 text-[var(--acade-text-muted)]">Use a clear, upright document and edit the extracted row before saving.</span></li>
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-7 rounded-[var(--radius-dialog)] border border-[var(--acade-border)] bg-[var(--acade-surface)] p-7 sm:p-9 md:flex-row md:items-center">
          <div><Mail className="size-6 text-[var(--acade-primary)]" aria-hidden="true" /><h2 className="mt-4 text-2xl font-bold">Still need help?</h2><p className="mt-2 text-[var(--acade-text-muted)]">Email support@acadegrade.com. We will use your message only to investigate and respond to your request.</p></div>
          <Link href="mailto:support@acadegrade.com?subject=AcadeGrade%20support%20request" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--acade-primary)] px-5 font-semibold text-[var(--acade-on-primary)] hover:bg-[var(--acade-primary-hover)]">Contact support <ArrowRight size={17} aria-hidden="true" /></Link>
        </div>
      </section>
    </PublicPage>
  );
}

function SupportPromise() {
  return (
    <aside className="rounded-[var(--radius-dialog)] border border-[var(--acade-border)] bg-[var(--acade-surface)] p-6 shadow-[var(--shadow-card)] sm:p-7">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--acade-primary)]">Safe support</p>
      <h2 className="mt-4 font-[family-name:var(--font-bricolage)] text-2xl font-bold">Keep credentials private.</h2>
      <p className="mt-4 leading-7 text-[var(--acade-text-muted)]">AcadeGrade support will never ask you to email your password, one-time verification code, or Firebase token.</p>
      <div className="mt-6 rounded-[var(--radius-control)] bg-[var(--acade-success-dim)] p-4 text-sm font-medium leading-6 text-[var(--acade-success)]">Share the error message, route, time, and steps that produced the issue instead.</div>
    </aside>
  );
}
